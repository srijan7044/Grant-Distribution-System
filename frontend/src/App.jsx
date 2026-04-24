import React, { useEffect, useMemo, useState } from "react";
import {
  getAddress,
  getNetworkDetails,
  requestAccess,
  setAllowed,
} from "@stellar/freighter-api";
import {
  CONTRACT_ID,
  SOROBAN_RPC_URL,
  fetchContractEvents,
  invokeContractRead,
  invokeContractWrite,
  normalizeGrant,
  toScAddress,
  toScI128,
  toScU32,
} from "./soroban";

const WALLET_MODES = {
  FREIGHTER: "freighter",
  READ_ONLY: "read-only",
};

const INITIAL_FORM = {
  creator: "",
  id: "",
  amount: "",
  applicant: "",
  grantIdForApply: "",
  admin: "",
  grantIdForApprove: "",
  grantIdForLookup: "",
};

function parseId(value) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) return null;
  return parsed;
}

function parseAmount(value) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return null;
  return parsed;
}

function errorText(error) {
  return error instanceof Error ? error.message : String(error);
}

function isMissingGrantError(text, grantId) {
  if (!text) return false;
  const normalized = text.toLowerCase();
  const hasVmTrap =
    normalized.includes("unreachablecodereached") ||
    normalized.includes("error(wasmvm, invalidaction)");
  const hasGetGrantHint =
    normalized.includes("get_grant") ||
    normalized.includes(`data:${grantId}`) ||
    normalized.includes("vm call trapped");
  return hasVmTrap && hasGetGrantHint;
}

function friendlyError(action, grantId, rawText) {
  if (grantId !== null && isMissingGrantError(rawText, grantId)) {
    return `Grant ${grantId} does not exist on-chain yet. Create it first, then run ${action}.`;
  }

  if (rawText.includes("Freighter") && rawText.includes("sign")) {
    return "Freighter signature was rejected or unavailable. Unlock Freighter and approve the request.";
  }

  if (rawText.includes("Transaction did not succeed")) {
    return "Transaction failed on-chain. Verify wallet network (testnet), input values, and contract state.";
  }

  return rawText.length > 280 ? `${rawText.slice(0, 280)}...` : rawText;
}

function classifyErrorType(rawText) {
  const normalized = rawText.toLowerCase();
  if (
    normalized.includes("invalid input") ||
    normalized.includes("valid grant id")
  ) {
    return "Validation Error";
  }
  if (normalized.includes("freighter") || normalized.includes("wallet")) {
    return "Wallet Error";
  }
  if (
    normalized.includes("vm call trapped") ||
    normalized.includes("transaction failed on-chain")
  ) {
    return "Contract Error";
  }
  return "Network Error";
}

function truncateMiddle(value, size = 20) {
  if (!value || value.length <= size) return value;
  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}

export default function App() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "light";
    const savedTheme = window.localStorage.getItem("gds-theme");
    if (savedTheme === "dark" || savedTheme === "light") {
      return savedTheme;
    }
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches
      ? "dark"
      : "light";
  });
  const [form, setForm] = useState(INITIAL_FORM);
  const [walletMode, setWalletMode] = useState(WALLET_MODES.FREIGHTER);
  const [customAddress, setCustomAddress] = useState("");
  const [grants, setGrants] = useState({});
  const [selectedGrant, setSelectedGrant] = useState(null);
  const [message, setMessage] = useState(
    "Connect Freighter to invoke the contract on Stellar testnet.",
  );
  const [activity, setActivity] = useState([]);
  const [walletAddress, setWalletAddress] = useState("");
  const [walletStatus, setWalletStatus] = useState(
    "Wallet not connected. Requires Freighter.",
  );
  const [txState, setTxState] = useState({
    stage: "idle",
    action: "-",
    hash: "",
    updatedAt: "",
  });
  const [liveEvents, setLiveEvents] = useState([]);
  const [busy, setBusy] = useState(false);

  const grantList = useMemo(() => {
    const entries = Object.values(grants);
    entries.sort((a, b) => a.id - b.id);
    return entries;
  }, [grants]);

  const stats = useMemo(() => {
    const total = grantList.length;
    const approved = grantList.filter((grant) => grant.approved).length;
    const pending = total - approved;
    const totalAmount = grantList.reduce(
      (sum, grant) => sum + Number(grant.amount || 0),
      0,
    );
    return { total, approved, pending, totalAmount };
  }, [grantList]);

  const suggestedGrantId = useMemo(() => {
    if (grantList.length === 0) return 1;
    return Math.max(...grantList.map((grant) => grant.id)) + 1;
  }, [grantList]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("gds-theme", theme);
  }, [theme]);

  useEffect(() => {
    let ignore = false;

    async function loadEvents() {
      try {
        const events = await fetchContractEvents({ limit: 8 });
        if (ignore) return;

        const normalized = events
          .slice()
          .reverse()
          .map((event) => ({
            id:
              event.id || event.pagingToken || `${event.ledger}-${event.type}`,
            ledger: event.ledger,
            type: event.type || "contract",
            topics: event.topic ? JSON.stringify(event.topic) : "-",
            value: event.value ? JSON.stringify(event.value) : "-",
          }));

        setLiveEvents(normalized);
      } catch {
        // Ignore transient RPC failures for live event polling.
      }
    }

    loadEvents();
    const timer = window.setInterval(loadEvents, 12000);

    return () => {
      ignore = true;
      window.clearInterval(timer);
    };
  }, []);

  function log(text) {
    const timestamp = new Date().toLocaleTimeString();
    setActivity((prev) => [`${timestamp}  ${text}`, ...prev].slice(0, 14));
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function hydrateActorFields(address) {
    setForm((prev) => ({
      ...prev,
      creator: address,
      applicant: address,
      admin: address,
    }));
  }

  function setTxStage(stage, action, hash = "") {
    setTxState({
      stage,
      action,
      hash,
      updatedAt: new Date().toLocaleTimeString(),
    });
  }

  function fillGrantIdFields(grantIdValue) {
    const next = String(grantIdValue);
    setForm((prev) => ({
      ...prev,
      id: next,
      grantIdForApply: next,
      grantIdForApprove: next,
      grantIdForLookup: next,
    }));
  }

  function useSuggestedGrantId() {
    fillGrantIdFields(suggestedGrantId);
    setMessage(
      `Suggestion applied: grant id ${suggestedGrantId} copied to all forms.`,
    );
    log(`Suggested grant id ${suggestedGrantId} applied`);
  }

  function useSelectedGrantId() {
    if (!selectedGrant) {
      setMessage("Load a grant first, then you can reuse its ID in all forms.");
      return;
    }
    fillGrantIdFields(selectedGrant.id);
    setMessage(`Selected grant id ${selectedGrant.id} copied to all forms.`);
    log(`Selected grant id ${selectedGrant.id} applied to all forms`);
  }

  function clearGrantIdFields() {
    setForm((prev) => ({
      ...prev,
      id: "",
      grantIdForApply: "",
      grantIdForApprove: "",
      grantIdForLookup: "",
    }));
    setMessage("Grant ID fields cleared.");
    log("Grant ID fields cleared");
  }

  async function connectWallet() {
    setBusy(true);
    try {
      if (walletMode === WALLET_MODES.READ_ONLY) {
        const trimmed = customAddress.trim();
        if (!trimmed.startsWith("G") || trimmed.length < 20) {
          throw new Error(
            "Provide a valid Stellar public key for read-only mode.",
          );
        }

        setWalletAddress(trimmed);
        hydrateActorFields(trimmed);
        setWalletStatus(`Read-only wallet set: ${trimmed}`);
        setMessage(
          "Read-only mode enabled. You can run get_grant and view events.",
        );
        log(`Read-only wallet selected: ${trimmed}`);
        return;
      }

      const allow = await setAllowed();
      if (allow.error) {
        throw new Error(
          allow.error.message || "Permission not granted in Freighter.",
        );
      }

      const access = await requestAccess();
      let nextAddress = access.address;

      if (!nextAddress) {
        const currentAddress = await getAddress();
        if (currentAddress.error) {
          throw new Error(
            currentAddress.error.message ||
              "Freighter did not return an address.",
          );
        }
        nextAddress = currentAddress.address;
      }

      if (!nextAddress) {
        throw new Error(
          "Could not get wallet address. Unlock Freighter and approve this site.",
        );
      }

      const net = await getNetworkDetails();
      const networkNote =
        net.network?.toLowerCase() === "testnet"
          ? ""
          : " Warning: Freighter is not on Testnet.";

      setWalletAddress(nextAddress);
      hydrateActorFields(nextAddress);
      setWalletStatus(`Connected: ${nextAddress}${networkNote}`);
      setMessage("Wallet connected. You can now invoke contract methods.");
      log(`Freighter connected for ${nextAddress}`);
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      setWalletStatus(
        `Connection failed: ${text}. If Freighter is installed, unlock it and allow localhost access.`,
      );
      setMessage(`Wallet connection failed: ${text}`);
    } finally {
      setBusy(false);
    }
  }

  function ensureWallet() {
    if (!walletAddress) {
      setMessage("Connect Freighter first.");
      return false;
    }
    return true;
  }

  function ensureSignerWallet() {
    if (walletMode !== WALLET_MODES.FREIGHTER) {
      setMessage(
        "This action requires Freighter signing. Switch wallet mode to Freighter.",
      );
      return false;
    }
    return true;
  }

  async function fetchGrantById(grantId) {
    const raw = await invokeContractRead(walletAddress, "get_grant", [
      toScU32(grantId),
    ]);
    const normalized = normalizeGrant(raw);

    if (!normalized) {
      return null;
    }

    setGrants((prev) => ({
      ...prev,
      [normalized.id]: normalized,
    }));
    setSelectedGrant(normalized);
    return normalized;
  }

  async function createGrant(event) {
    event.preventDefault();

    const id = parseId(form.id);
    const amount = parseAmount(form.amount);

    if (!ensureWallet() || !ensureSignerWallet()) return;
    if (id === null || amount === null) {
      setMessage("Validation Error: grant id and amount are required.");
      return;
    }

    setBusy(true);
    setTxStage("pending", "create_grant");
    try {
      const tx = await invokeContractWrite(walletAddress, "create_grant", [
        toScAddress(walletAddress),
        toScU32(id),
        toScI128(amount),
      ]);
      await fetchGrantById(id);
      setMessage(`Grant ${id} created on-chain.`);
      setTxStage("success", "create_grant", tx.hash);
      log(`create_grant executed on-chain for grant ${id}`);
    } catch (error) {
      const text = friendlyError("create_grant", id, errorText(error));
      const type = classifyErrorType(text);
      setMessage(`${type}: create_grant failed: ${text}`);
      setTxStage("error", "create_grant");
      log(`create_grant failed for grant ${id}`);
    } finally {
      setBusy(false);
    }
  }

  async function applyForGrant(event) {
    event.preventDefault();
    const grantId = parseId(form.grantIdForApply);

    if (!ensureWallet() || !ensureSignerWallet()) return;
    if (grantId === null) {
      setMessage("Validation Error: grant id is required.");
      return;
    }

    setBusy(true);
    setTxStage("pending", "apply");
    try {
      try {
        await fetchGrantById(grantId);
      } catch (prefetchError) {
        const text = friendlyError("apply", grantId, errorText(prefetchError));
        setMessage(text);
        log(`apply blocked: grant ${grantId} not ready`);
        return;
      }

      const tx = await invokeContractWrite(walletAddress, "apply", [
        toScAddress(walletAddress),
        toScU32(grantId),
      ]);
      await fetchGrantById(grantId);
      setMessage(`Applied to grant ${grantId} on-chain.`);
      setTxStage("success", "apply", tx.hash);
      log(`apply executed on-chain for grant ${grantId}`);
    } catch (error) {
      const text = friendlyError("apply", grantId, errorText(error));
      const type = classifyErrorType(text);
      setMessage(`${type}: apply failed: ${text}`);
      setTxStage("error", "apply");
      log(`apply failed for grant ${grantId}`);
    } finally {
      setBusy(false);
    }
  }

  async function approveGrant(event) {
    event.preventDefault();
    const grantId = parseId(form.grantIdForApprove);

    if (!ensureWallet() || !ensureSignerWallet()) return;
    if (grantId === null) {
      setMessage("Validation Error: grant id is required.");
      return;
    }

    setBusy(true);
    setTxStage("pending", "approve");
    try {
      try {
        await fetchGrantById(grantId);
      } catch (prefetchError) {
        const text = friendlyError(
          "approve",
          grantId,
          errorText(prefetchError),
        );
        setMessage(text);
        log(`approve blocked: grant ${grantId} not ready`);
        return;
      }

      const tx = await invokeContractWrite(walletAddress, "approve", [
        toScAddress(walletAddress),
        toScU32(grantId),
      ]);
      await fetchGrantById(grantId);
      setMessage(`Grant ${grantId} approved on-chain.`);
      setTxStage("success", "approve", tx.hash);
      log(`approve executed on-chain for grant ${grantId}`);
    } catch (error) {
      const text = friendlyError("approve", grantId, errorText(error));
      const type = classifyErrorType(text);
      setMessage(`${type}: approve failed: ${text}`);
      setTxStage("error", "approve");
      log(`approve failed for grant ${grantId}`);
    } finally {
      setBusy(false);
    }
  }

  async function getGrant(event) {
    event.preventDefault();
    const grantId = parseId(form.grantIdForLookup);

    if (!ensureWallet()) return;
    if (grantId === null) {
      setMessage("Validation Error: enter a valid grant id for lookup.");
      return;
    }

    setBusy(true);
    setTxStage("pending", "get_grant");
    try {
      const found = await fetchGrantById(grantId);
      if (!found) {
        setMessage(`Grant ${grantId} not found.`);
        setTxStage("error", "get_grant");
        return;
      }
      setMessage(`Loaded grant ${grantId} from chain.`);
      setTxStage("success", "get_grant");
      log(`get_grant simulated successfully for grant ${grantId}`);
    } catch (error) {
      const text = friendlyError("get_grant", grantId, errorText(error));
      const type = classifyErrorType(text);
      setMessage(`${type}: get_grant failed: ${text}`);
      setTxStage("error", "get_grant");
      log(`get_grant failed for grant ${grantId}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-shell">
      <div className="mesh" aria-hidden="true" />
      <header className="hero">
        <button
          type="button"
          className="theme-switcher"
          onClick={() =>
            setTheme((prev) => (prev === "dark" ? "light" : "dark"))
          }
          aria-label="Toggle theme"
        >
          {theme === "dark" ? "Light Theme" : "Dark Theme"}
        </button>
        <p className="eyebrow">Soroban Contract Frontend</p>
        <h1>Grant Distribution Dashboard</h1>
        <p className="subcopy">
          Interactive React interface for create_grant, apply, approve, and
          get_grant, integrated to Soroban testnet using your deployed contract.
        </p>
        <div className="hero-meta">
          <p className="pill">Contract: {CONTRACT_ID}</p>
          <p className="pill">RPC: {SOROBAN_RPC_URL}</p>
          <p className="pill">Network: Stellar Testnet</p>
          <p className="pill">
            {walletAddress ? "Wallet Connected" : "Wallet Offline"}
          </p>
        </div>
        <p className="subcopy">{walletStatus}</p>
        <div className="wallet-bar">
          <label>
            Wallet Mode
            <select
              value={walletMode}
              onChange={(event) => setWalletMode(event.target.value)}
              disabled={busy}
            >
              <option value={WALLET_MODES.FREIGHTER}>
                Freighter (signing)
              </option>
              <option value={WALLET_MODES.READ_ONLY}>Read-only address</option>
            </select>
          </label>

          {walletMode === WALLET_MODES.READ_ONLY && (
            <label>
              Public Key
              <input
                value={customAddress}
                onChange={(event) => setCustomAddress(event.target.value)}
                placeholder="G..."
              />
            </label>
          )}

          <button
            className="cta-button"
            type="button"
            onClick={connectWallet}
            disabled={busy}
          >
            {walletMode === WALLET_MODES.FREIGHTER
              ? walletAddress
                ? "Reconnect Freighter"
                : "Connect Freighter Wallet"
              : "Set Read-only Wallet"}
          </button>
        </div>
      </header>

      <section className="stat-grid" aria-label="Grant statistics">
        <article className="stat-card">
          <p>Total Grants</p>
          <h3>{stats.total}</h3>
        </article>
        <article className="stat-card">
          <p>Approved</p>
          <h3>{stats.approved}</h3>
        </article>
        <article className="stat-card">
          <p>Pending</p>
          <h3>{stats.pending}</h3>
        </article>
        <article className="stat-card">
          <p>Total Value</p>
          <h3>{stats.totalAmount}</h3>
        </article>
      </section>

      <main className="grid">
        <section className="panel">
          <h2>Create Grant</h2>
          <form onSubmit={createGrant}>
            <label>
              Creator Address
              <input
                name="creator"
                value={form.creator}
                onChange={updateField}
                readOnly
                placeholder="G..."
              />
            </label>
            <label>
              Grant ID
              <input
                name="id"
                value={form.id}
                onChange={updateField}
                inputMode="numeric"
                placeholder="1"
              />
            </label>
            <label>
              Amount
              <input
                name="amount"
                value={form.amount}
                onChange={updateField}
                inputMode="numeric"
                placeholder="1000"
              />
            </label>
            <button type="submit" disabled={busy}>
              Run create_grant
            </button>
          </form>
        </section>

        <section className="panel">
          <h2>Apply for Grant</h2>
          <form onSubmit={applyForGrant}>
            <label>
              Applicant Address
              <input
                name="applicant"
                value={form.applicant}
                onChange={updateField}
                readOnly
                placeholder="G..."
              />
            </label>
            <label>
              Grant ID
              <input
                name="grantIdForApply"
                value={form.grantIdForApply}
                onChange={updateField}
                inputMode="numeric"
                placeholder="1"
              />
            </label>
            <button type="submit" disabled={busy}>
              Run apply
            </button>
          </form>
        </section>

        <section className="panel">
          <h2>Approve Grant</h2>
          <form onSubmit={approveGrant}>
            <label>
              Admin Address
              <input
                name="admin"
                value={form.admin}
                onChange={updateField}
                readOnly
                placeholder="G..."
              />
            </label>
            <label>
              Grant ID
              <input
                name="grantIdForApprove"
                value={form.grantIdForApprove}
                onChange={updateField}
                inputMode="numeric"
                placeholder="1"
              />
            </label>
            <button type="submit" disabled={busy}>
              Run approve
            </button>
          </form>
        </section>

        <section className="panel">
          <h2>Get Grant</h2>
          <form onSubmit={getGrant}>
            <label>
              Grant ID
              <input
                name="grantIdForLookup"
                value={form.grantIdForLookup}
                onChange={updateField}
                inputMode="numeric"
                placeholder="1"
              />
            </label>
            <button type="submit" disabled={busy}>
              Run get_grant
            </button>
          </form>

          <div className="grant-card">
            <h3>Selected Grant</h3>
            {!selectedGrant && <p>No grant loaded.</p>}
            {selectedGrant && (
              <ul>
                <li>ID: {selectedGrant.id}</li>
                <li>Creator: {selectedGrant.creator}</li>
                <li>Amount: {selectedGrant.amount}</li>
                <li>Recipient: {selectedGrant.recipient ?? "None"}</li>
                <li>Approved: {selectedGrant.approved ? "Yes" : "No"}</li>
              </ul>
            )}
          </div>
        </section>

        <section className="panel wide">
          <h2>Grant Registry</h2>
          {grantList.length === 0 && (
            <p className="muted">No grants in local state.</p>
          )}
          {grantList.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Creator</th>
                    <th>Amount</th>
                    <th>Recipient</th>
                    <th>Approved</th>
                  </tr>
                </thead>
                <tbody>
                  {grantList.map((grant) => (
                    <tr key={grant.id}>
                      <td data-label="ID">{grant.id}</td>
                      <td data-label="Creator">{grant.creator}</td>
                      <td data-label="Amount">{grant.amount}</td>
                      <td data-label="Recipient">{grant.recipient ?? "-"}</td>
                      <td data-label="Approved">
                        {grant.approved ? "Yes" : "No"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel side status-panel">
          <h2>Status</h2>
          <p className="status">{message}</p>

          <h3>Transaction Monitor</h3>
          <p className={`tx-badge tx-${txState.stage}`}>
            {txState.stage.toUpperCase()} - {txState.action}
          </p>
          <ul className="tx-list">
            <li>Updated: {txState.updatedAt || "-"}</li>
            <li>Hash: {txState.hash ? truncateMiddle(txState.hash) : "-"}</li>
          </ul>

          <h3>Recent Activity</h3>
          <ul className="activity-log">
            {activity.length === 0 && <li>No activity yet.</li>}
            {activity.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>

        <section className="panel wide">
          <h2>Live Contract Events</h2>
          <p className="muted">
            Auto-refreshing from testnet every 12 seconds for deployed contract
            events.
          </p>
          <ul className="event-list">
            {liveEvents.length === 0 && <li>No events yet.</li>}
            {liveEvents.map((event) => (
              <li key={event.id}>
                <strong>Ledger {event.ledger}</strong> | {event.type}
                <br />
                Topics: {event.topics}
                <br />
                Value: {event.value}
              </li>
            ))}
          </ul>
        </section>

        <section className="panel side tool-panel">
          <h2>Smart ID Assistant</h2>
          <p className="muted">
            Keep all grant forms in sync to avoid ID mismatch errors.
          </p>
          <div className="quick-tools">
            <p>
              Suggested Next ID: <strong>{suggestedGrantId}</strong>
            </p>
            <div className="tool-actions">
              <button
                type="button"
                onClick={useSuggestedGrantId}
                disabled={busy}
              >
                Use Suggested ID
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={useSelectedGrantId}
                disabled={busy}
              >
                Use Selected Grant ID
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={clearGrantIdFields}
                disabled={busy}
              >
                Clear ID Fields
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
