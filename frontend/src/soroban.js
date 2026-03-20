import {
  Address,
  BASE_FEE,
  Contract,
  Networks,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  scValToNative,
} from "@stellar/stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";

export const CONTRACT_ID =
  "CCKSIDB6N2EA3D3UMJFIPQIFRJHPCS7WD6UDLTUGY4DZBV7TBOVBLBJX";
export const SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";
export const NETWORK_PASSPHRASE = Networks.TESTNET;

const contract = new Contract(CONTRACT_ID);
const server = new rpc.Server(SOROBAN_RPC_URL);

function buildContractTx(account, method, args) {
  return new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(120)
    .build();
}

function unwrapSimulation(simulation) {
  if (rpc.Api.isSimulationError(simulation)) {
    throw new Error(simulation.error || "Simulation failed.");
  }
  return simulation;
}

export function toScAddress(address) {
  return Address.fromString(address).toScVal();
}

export function toScU32(value) {
  return nativeToScVal(value, { type: "u32" });
}

export function toScI128(value) {
  return nativeToScVal(BigInt(value), { type: "i128" });
}

export async function invokeContractRead(sourceAddress, method, args) {
  const account = await server.getAccount(sourceAddress);
  const tx = buildContractTx(account, method, args);
  const simulation = unwrapSimulation(await server.simulateTransaction(tx));

  if (!simulation.result) {
    return null;
  }

  return scValToNative(simulation.result.retval);
}

export async function invokeContractWrite(sourceAddress, method, args) {
  const account = await server.getAccount(sourceAddress);
  const tx = buildContractTx(account, method, args);
  const prepared = await server.prepareTransaction(tx);

  const signed = await signTransaction(prepared.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
    address: sourceAddress,
  });

  if (signed.error || !signed.signedTxXdr) {
    throw new Error(
      signed.error?.message || "Freighter could not sign transaction.",
    );
  }

  const signedTx = TransactionBuilder.fromXDR(
    signed.signedTxXdr,
    NETWORK_PASSPHRASE,
  );

  const submission = await server.sendTransaction(signedTx);
  if (submission.status === "ERROR") {
    throw new Error(
      submission.errorResultXdr || "Transaction submission failed.",
    );
  }

  const finalStatus = await server.pollTransaction(submission.hash);
  if (finalStatus.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
    throw new Error(
      `Transaction did not succeed. Status: ${finalStatus.status}`,
    );
  }

  return finalStatus;
}

function stringifyAddress(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value?.toString === "function") return value.toString();
  return String(value);
}

function toSafeNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toDisplayAmount(value) {
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "number") return String(value);
  return value ? String(value) : "0";
}

export function normalizeGrant(rawGrant) {
  if (!rawGrant) return null;

  let value = rawGrant;
  if (value instanceof Map) {
    value = Object.fromEntries(value.entries());
  }

  if (Array.isArray(value)) {
    const [id, creator, amount, recipient, approved] = value;
    return {
      id: toSafeNumber(id),
      creator: stringifyAddress(creator) || "",
      amount: toDisplayAmount(amount),
      recipient: stringifyAddress(recipient),
      approved: Boolean(approved),
    };
  }

  return {
    id: toSafeNumber(value.id),
    creator: stringifyAddress(value.creator) || "",
    amount: toDisplayAmount(value.amount),
    recipient: stringifyAddress(value.recipient),
    approved: Boolean(value.approved),
  };
}
