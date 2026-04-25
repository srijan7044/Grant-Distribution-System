Hi everyone, Name:Srijan Ray

# Grant Distribution System

A Soroban smart contract workspace Frontend for decentralized grant management on Stellar.

<img width="1844" height="1180" alt="image" src="https://github.com/user-attachments/assets/b4fc4632-bce2-4566-ac77-3e8d344f5b79" />

#New Catagories have introduced for good user-experience.
<img width="1911" height="450" alt="image" src="https://github.com/user-attachments/assets/d3f7883b-2856-4eec-a683-288e08681b19" />

#Update Light Theme and Dark Theme introduced.

<img width="1897" height="1095" alt="image" src="https://github.com/user-attachments/assets/fa549ee8-75c3-4641-9f52-c431d4f4c832" />

# Contract Address Page (DashBoard)

A Soroban smart contract workspace for decentralized grant management on Stellar.

![Project Banner](image.png)

## Trnsactions are made Possible

<img width="1416" height="866" alt="image" src="https://github.com/user-attachments/assets/d486af41-8091-4c83-afdc-52b374a99c36" />

## the proof and record

<img width="1515" height="473" alt="image" src="https://github.com/user-attachments/assets/617e5fd2-0a72-4148-b035-bf7a50c1682a" />

## Overview

This project implements a grant lifecycle on-chain:

- Create a grant with an ID and amount
- Apply to an existing grant
- Approve a grant application
- Read grant state from contract storage

The contract uses Soroban authentication for critical actions and persists grant data in contract instance storage.

## Workspace Structure

```text
Grant-Distribution_System/
├── Cargo.toml                    # Workspace config
├── README.md                     # Project documentation
├── contracts/
│   └── hello-world/
│       ├── Cargo.toml            # Contract crate config
│       ├── Makefile              # Build helpers
│       └── src/
│           ├── lib.rs            # Grant contract implementation
│           └── test.rs           # Unit tests (needs alignment with current contract API)
├── frontend/                      # React dashboard (Vite)
│   ├── package.json
│   ├── index.html
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       └── styles.css
└── target/                       # Build artifacts
```

## Smart Contract API

The contract is implemented in `contracts/hello-world/src/lib.rs`.

### Data Model

`Grant` structure:

- `id: u32`
- `creator: Address`
- `amount: i128`
- `recipient: Option<Address>`
- `approved: bool`

### Methods

- `create_grant(env, creator, id, amount)`
  - Requires creator auth
  - Adds or updates a grant in storage

- `apply(env, applicant, grant_id)`
  - Requires applicant auth
  - Sets applicant as recipient for the selected grant

- `approve(env, admin, grant_id)`
  - Requires admin auth
  - Marks selected grant as approved

- `get_grant(env, grant_id) -> Grant`
  - Returns grant details

## Deployed Contract

- Network: Stellar Soroban
- Contract ID: `CATPXZOYKHSICJXRQXIYEZWZXAQEZIJ4DH2UFX4QTQAP6LYSAYXQNB7H`
- Explorer Link(Contract Address): [Stellar Contract Explorer(Contract Address)](https://lab.stellar.org/r/testnet/contract/CATPXZOYKHSICJXRQXIYEZWZXAQEZIJ4DH2UFX4QTQAP6LYSAYXQNB7H)

## Tech Stack

- Rust (Edition 2021)
- Soroban SDK (`23`)
- Stellar/Soroban smart contracts

## Prerequisites

Install the following:

- Rust toolchain (via `rustup`)
- `wasm32v1-none` target
- Soroban CLI (recommended for deployment and invocation)

## Build and Test

From workspace root:

```bash
cargo build --release
cargo test
```

To build only the contract crate:

```bash
cargo build -p hello-world --release
```

## Frontend (React)

The React dashboard is in `frontend/` and includes UI flows for:

- `create_grant`
- `apply`
- `approve`
- `get_grant`

Run locally:

```bash
cd frontend
npm install
npm run dev
```

Build frontend:

```bash
cd frontend
npm run build
```

## Notes

- Current test file in `contracts/hello-world/src/test.rs` references a hello-world API and should be updated to match the grant contract methods.
- `target/` contains generated build outputs and should not be edited manually.

## Suggested Next Improvements

- Enforce role-based admin checks for approval
- Validate duplicate grant IDs and missing grants gracefully
- Support multiple applicants per grant
- Add deadlines, metadata, and category support
- Integrate token transfer flow for payout

## License

MIT License

---

## Latest Updates

This section is added to record the latest upgrades completed in this project.

### Level 2 Progress Summary

- Multi-wallet support added in frontend:
  - Freighter mode (signing transactions)
  - Read-only public address mode
- Smart contract calls from frontend are fully integrated:
  - `create_grant`
  - `apply`
  - `approve`
  - `get_grant`
- Transaction monitor added:
  - Pending / Success / Error status
  - Last update time
  - Transaction hash preview
- Real-time contract event integration added:
  - Testnet event polling every 12 seconds
  - Live contract event feed shown in dashboard
- Error handling improved with user-friendly messages:
  - Validation errors
  - Wallet-related errors
  - Contract execution errors
  - Network/other fallback errors

### UI/UX Enhancements Completed

- Modern dashboard styling refresh
- Dark theme + Light theme toggle
- Improved readability for:
  - Selected Grant card in dark mode
  - Placeholder/input text in dark mode
  - Long wallet addresses/hashes (no overflow)
- Mobile responsive layout improvements:
  - Better spacing and panel behavior
  - Table-to-card transformation on small screens
  - Touch-friendly inputs/buttons
- Additional right-side utility feature added:
  - Smart ID Assistant
  - Auto-fill grant ID fields
  - Reuse selected grant ID
  - Clear ID fields quickly

### Deployed Contract (Testnet)

- Contract ID: `CATPXZOYKHSICJXRQXIYEZWZXAQEZIJ4DH2UFX4QTQAP6LYSAYXQNB7H`
- Explorer: https://lab.stellar.org/r/testnet/contract/CATPXZOYKHSICJXRQXIYEZWZXAQEZIJ4DH2UFX4QTQAP6LYSAYXQNB7H

### Recent Meaningful Commits

- `833390a` feat: add multi-wallet flow, tx monitor, and live contract events
- `69df64a` style: polish wallet monitor and responsive event dashboard
- `c7c7a35` feat: implement suggested grant ID functionality and enhance UI components

---

## For Level 3 - Orange Belt Submission.

### Overview

This project is upgraded as a complete end-to-end mini-dApp with loading states, basic caching, tests, and documentation.

### Level 3 Requirements Coverage

- Mini-dApp fully functional: Yes
- Minimum 3 tests passing: Yes (4 tests passing)
- README complete: Updated with Level 3 section
- Demo video recorded: Add your link below
- Minimum 3+ meaningful commits: Yes (see commit list below)

### What Is Implemented

- Loading states and progress indicators:
  - Busy-state buttons
  - Transaction monitor (idle/pending/success/error)
- Basic caching implementation:
  - In-memory grant registry cache using React state
- Smart contract integration:
  - Read/write calls from frontend to deployed Soroban contract on testnet
- Real-time synchronization:
  - Contract event polling and live event feed in UI
- Multi-wallet experience:
  - Freighter mode (signing)
  - Read-only address mode

### Test Output (3+ tests passing)

Latest test run summary:

```text
Test Files  1 passed (1)
Tests       4 passed (4)
```

Screenshot placeholder (required for submission):

- Add screenshot here: `docs/test-output.png`

### Required Submission Info

- Live demo link (Vercel/Netlify/etc):
  - Add link: `https://your-live-demo-url`
- Demo video link (1-minute full flow):
  - Add link: `https://your-demo-video-url`
- Deployed contract address:
  - `CATPXZOYKHSICJXRQXIYEZWZXAQEZIJ4DH2UFX4QTQAP6LYSAYXQNB7H`
- Verifiable transaction hash (contract call):
  - Add hash: `REPLACE_WITH_TX_HASH`
  - Explorer template: `https://stellar.expert/explorer/testnet/tx/REPLACE_WITH_TX_HASH`

### 3+ Meaningful Commits

- `833390a` feat: add multi-wallet flow, tx monitor, and live contract events
- `69df64a` style: polish wallet monitor and responsive event dashboard
- `c7c7a35` feat: implement suggested grant ID functionality and enhance UI components

## Level 4 - Advanced Patterns + Production Readiness

This level adds inter-contract behavior, tokenized grant lifecycle support, production CI/CD automation, and mobile-ready UX.

### Advanced Contract Patterns Implemented

- Inter-contract calls:
  - `fund_grant` calls Soroban token contract `transfer` to move creator funds into escrow (current grant contract).
  - `disburse_grant` calls Soroban token contract `transfer` to pay approved recipient from escrow.
- Tokenized grant lifecycle:
  - `create_token_grant(env, creator, id, token_contract, amount)`
  - `fund_grant(env, creator, grant_id)`
  - `disburse_grant(env, admin, grant_id)`
- Structured contract errors (`GrantError`) for safer production handling.
- Event emission added for every major lifecycle transition (`create`, `tcreate`, `apply`, `fund`, `approve`, `disb`).

### Production CI/CD

GitHub Actions pipeline added in `.github/workflows/ci.yml` with:

- Rust contract checks:
  - `cargo test --workspace --all-targets`
  - `cargo build -p hello-world --release`
- Frontend checks:
  - `npm ci`
  - `npm run test`
  - `npm run build`

Badge placeholder (replace OWNER/REPO):

```md
![CI](https://github.com/srijan7044/Grant-Distribution-System/actions/workflows/ci.yml/badge.svg)
```

### Error Tracking (Production)

Sentry is integrated in the frontend for runtime and operation-level error reporting.

- Package used: `@sentry/react`
- Initialization file: `frontend/src/monitoring.js`
- Startup hook: `frontend/src/main.jsx`
- Action-level reporting: `frontend/src/App.jsx`

Set environment values before deploy:

```bash
# frontend/.env
VITE_SENTRY_DSN=YOUR_SENTRY_DSN
VITE_APP_ENV=production
```

Template file included:

- `frontend/.env.example`

If `VITE_SENTRY_DSN` is empty, monitoring stays disabled automatically.

### Performance Optimization

Frontend build optimization added in `frontend/vite.config.js`:

- Source maps enabled for production debugging
- Vendor chunk splitting:
  - `stellar-vendor` for Stellar SDK + Freighter API
  - `sentry-vendor` for monitoring SDK
  - `react-vendor` for React runtime
- Chunk warning threshold raised to `900` after split optimization
- Chunk warning threshold raised to `1100` after split optimization

### Mobile Responsive

- Dashboard remains responsive on mobile with stacked panels, touch-friendly actions, and table-to-card conversion.
- Required screenshot placeholder:
  - Add mobile screenshot path: `docs/mobile-responsive-view.png`

### Submission Checklist Mapping

- Inter-contract call working: Implemented (`fund_grant`, `disburse_grant`)
- Custom token or pool deployed (if used): Tokenized grant flow supported (record deployed token address below)
- CI/CD running: Implemented via GitHub Actions workflow
- Mobile responsive: Implemented in frontend CSS and layout
- Minimum 8+ meaningful commits: Ensure before submission (`git log --oneline`)

### Required README Evidence (Fill Before Submission)

- Public GitHub repository:
  - `https://github.com/srijan7044/Grant-Distribution-System.git`
- Live demo link (Vercel/Netlify/etc):
  - `https://REPLACE_WITH_LIVE_DEMO_URL`
- Screenshot: mobile responsive view:
  - <img width="492" height="915" alt="Screenshot 2026-04-25 161629" src="https://github.com/user-attachments/assets/08029766-654c-48a5-b15d-f7f91363e01d" />

- Screenshot or badge: CI/CD pipeline running:
  - Badge above, or save the attached CI screenshot as `docs/ci-pipeline-running.png`
  - <img width="1918" height="1044" alt="Screenshot 2026-04-25 165324" src="https://github.com/user-attachments/assets/029e990b-0b6c-4366-a2de-24d33b58bf59" />

- Screenshot: Sentry issue dashboard (recommended proof for error tracking):
  - `docs/sentry-issue-sample.png`
- Contract address and transaction hash for inter-contract flow:
  - Grant contract address: `REPLACE_WITH_CURRENT_CONTRACT_ADDRESS`
  - Inter-contract tx hash (`fund_grant` or `disburse_grant`): `REPLACE_WITH_TX_HASH`
- Token address (if custom token used):
  - `REPLACE_WITH_TOKEN_OR_POOL_ADDRESS`

### Suggested Verification Commands

```bash
# workspace root
cargo test --workspace --all-targets
cargo build -p hello-world --release

# frontend
cd frontend
npm test
npm run build
```
