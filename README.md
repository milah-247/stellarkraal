# 🐄 StellarKraal

> **Where tradition meets the blockchain.**  
> A decentralized livestock-backed micro lending protocol on Stellar. Tokenize cattle, goats and sheep as RWAs on Soroban and unlock USDC loans without a bank account.

![Stellar](https://img.shields.io/badge/Stellar-Soroban-7C3AED?style=for-the-badge&logo=stellar&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-Smart_Contracts-orange?style=for-the-badge&logo=rust&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js&logoColor=white)
![USDC](https://img.shields.io/badge/Stablecoin-USDC-2775CA?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-In_Development-yellow?style=for-the-badge)

---

##  Table of Contents

- [The Problem](#-the-problem)
- [The Solution](#-the-solution)
- [How It Works](#-how-it-works)
- [Architecture](#-architecture)
- [Smart Contracts](#-smart-contracts)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Contract Deployment](#-contract-deployment)
- [Oracle Setup](#-oracle-setup)
- [Frontend Setup](#-frontend-setup)
- [Running Tests](#-running-tests)
- [User Roles](#-user-roles)
- [Loan Parameters](#-loan-parameters)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

##  The Problem

Over **500 million smallholder farmers** across Africa and Asia own livestock — cattle, goats, and sheep — worth thousands of dollars. Yet they cannot access a single dollar of credit against these animals because:

- Traditional banks do not recognise livestock as collateral
- Formal credit history does not exist for rural farmers
- Loan applications take weeks and require documents farmers don't have
- Predatory local lenders charge 40–100% APR with no transparency

The wealth is real. The animals are real. The financing gap is devastating.

---

##  The Solution

**StellarKraal** takes its name from the traditional African livestock enclosure (*kraal*) — where farmers have proven ownership of animals for centuries.

StellarKraal brings that same proof of ownership **on-chain**, giving farmers access to the global DeFi economy for the first time:

1. A verified vet registers and inspects the animal
2. The animal is tokenized as an NFT (RWA) on Stellar via RFID tag
3. The farmer deposits the NFT as collateral into a Soroban escrow
4. The farmer receives a USDC loan instantly — no bank, no paperwork
5. On repayment, the NFT is returned to the farmer's wallet
6. On default, the NFT is liquidated to repay the lending pool

---

##  How It Works

```
FARMER                    STELLARKRAAL                   LENDER
  │                            │                            │
  │── Register animal ────────►│                            │
  │   (RFID + vet cert)        │                            │
  │                            │◄─── Deposit USDC ─────────│
  │◄── Livestock NFT minted ───│                            │
  │                            │                            │
  │── Deposit NFT as ─────────►│                            │
  │   collateral               │                            │
  │                            │                            │
  │◄── Receive USDC loan ──────│                            │
  │    (up to 60% LTV)         │                            │
  │                            │                            │
  │── Repay principal ────────►│                            │
  │   + 8% APR interest        │                            │
  │                            │──── Yield distributed ────►│
  │◄── NFT returned ───────────│                            │
```

---

##  Architecture

StellarKraal is built across 4 layers:

```
┌─────────────────────────────────────────────────────────┐
│                   NEXT.JS 14 FRONTEND                   │
│         Farmer | Lender | Vet | Marketplace             │
└────────────────────────┬────────────────────────────────┘
                         │  @stellar/stellar-sdk
                         │  @stellar/freighter-api
┌────────────────────────▼────────────────────────────────┐
│                  SOROBAN CONTRACTS (Rust)                │
│  kraal_nft │ kraal_lending_pool │ kraal_oracle           │
│  kraal_liquidation                                       │
└────────────────────────┬────────────────────────────────┘
                         │  py-stellar-base
┌────────────────────────▼────────────────────────────────┐
│              ORACLE / RFID BRIDGE (Python)              │
│      rfid_listener │ price_oracle │ health_monitor      │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│           OFF-CHAIN LAYER (PostgreSQL + IPFS)           │
│     Animal metadata │ Loan records │ Oracle updates     │
└─────────────────────────────────────────────────────────┘
```

---

##  Smart Contracts

StellarKraal deploys 4 Soroban contracts written in Rust:

### `kraal_nft`
Mints and manages livestock NFTs as unique Stellar assets. Each NFT represents one verified animal tied to its RFID tag.

| Function | Description |
|----------|-------------|
| `mint()` | Mint a new livestock NFT for a verified animal |
| `verify()` | Vet signs off on animal health and identity |
| `update_health_status()` | Oracle updates animal health on-chain |
| `transfer_ownership()` | Transfer NFT between addresses |
| `burn()` | Burn NFT on animal death or liquidation |

### `kraal_lending_pool`
Core lending engine. Manages the USDC pool, loan lifecycle, and interest accrual.

| Function | Description |
|----------|-------------|
| `deposit()` | Lenders fund the USDC pool |
| `withdraw()` | Lenders exit their position |
| `borrow()` | Farmer opens a loan against NFT collateral |
| `repay()` | Full or partial loan repayment |
| `liquidate()` | Liquidate a defaulted position |
| `get_loan()` | Query a loan position by ID |
| `get_pool_stats()` | TVL, utilization rate, APY |

### `kraal_oracle`
Receives off-chain RFID and market price data and makes it available to other contracts.

| Function | Description |
|----------|-------------|
| `update_price()` | Oracle pushes new livestock market value |
| `update_health()` | Oracle pushes animal health status |
| `get_current_value()` | Get latest verified animal value |
| `is_data_fresh()` | Returns false if data is older than 48 hours |

### `kraal_liquidation`
Monitors loan positions and executes liquidations when triggered.

| Function | Description |
|----------|-------------|
| `check_liquidatable()` | Returns true if position meets liquidation criteria |
| `execute_liquidation()` | Liquidator triggers and executes liquidation |
| `distribute_proceeds()` | Waterfall: pool repayment → liquidator bonus → farmer |
| `get_liquidatable_loans()` | Returns all currently liquidatable loan IDs |

### Error Constants

All contracts share a unified `KraalError` enum — no raw integer error codes:

```rust
pub enum KraalError {
    InsufficientCollateral    = 1,
    LoanNotFound              = 2,
    AlreadyRepaid             = 3,
    NotDefaulted              = 4,
    StaleOracleData           = 5,
    UnauthorizedVet           = 6,
    AnimalDeceased            = 7,
    LTVExceeded               = 8,
    PoolInsufficientLiquidity = 9,
    UnauthorizedOracle        = 10,
    InvalidKraalId            = 11,
    LoanStillActive           = 12,
    GracePeriodActive         = 13,
    ZeroAmountNotAllowed      = 14,
}
```

---

##  Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contracts | Rust + Soroban SDK |
| Blockchain | Stellar Mainnet / Testnet |
| Frontend | Next.js 14 (App Router) + TypeScript |
| Wallet | Freighter (@stellar/freighter-api) |
| Stellar SDK | @stellar/stellar-sdk, soroban-client |
| Stablecoin | USDC on Stellar |
| Oracle Bridge | Python + py-stellar-base |
| Database | PostgreSQL + Prisma ORM |
| File Storage | IPFS (animal photos + vet certificates) |
| Auth | Stellar keypair + SEP-0030 Passkey |
| Testing | Rust unit tests + Stellar Testnet |

---

##  Project Structure

```
stellarkraal/
├── contracts/
│   ├── kraal_nft/
│   │   ├── src/lib.rs
│   │   └── Cargo.toml
│   ├── kraal_lending_pool/
│   │   ├── src/lib.rs
│   │   └── Cargo.toml
│   ├── kraal_oracle/
│   │   ├── src/lib.rs
│   │   └── Cargo.toml
│   └── kraal_liquidation/
│       ├── src/lib.rs
│       └── Cargo.toml
├── oracle/
│   ├── rfid_listener.py
│   ├── price_oracle.py
│   ├── health_monitor.py
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── farmer/
│   │   │   ├── register/
│   │   │   ├── kraal/
│   │   │   ├── borrow/
│   │   │   └── loans/
│   │   ├── lender/
│   │   │   ├── deposit/
│   │   │   └── portfolio/
│   │   ├── vet/
│   │   │   └── verify/
│   │   └── market/
│   ├── components/
│   │   ├── KraalCard.tsx
│   │   ├── LoanCalculator.tsx
│   │   ├── RepaymentTimer.tsx
│   │   ├── KraalPoolStats.tsx
│   │   ├── WalletConnect.tsx
│   │   ├── OracleStatus.tsx
│   │   ├── KraalMap.tsx
│   │   └── HealthBadge.tsx
│   ├── lib/
│   │   ├── stellar.ts
│   │   ├── soroban.ts
│   │   ├── freighter.ts
│   │   └── kraal-utils.ts
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── models/
│   │   └── services/
│   └── prisma/schema.prisma
├── .stellar/
├── Stellar.toml
└── README.md
```

---

##  Getting Started

### Prerequisites

```bash
# Rust + Soroban
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown
cargo install --locked soroban-cli

# Stellar CLI
cargo install stellar-cli

# Node.js 18+
node --version

# Python 3.10+
python3 --version

# PostgreSQL
psql --version
```

### Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/stellarkraal.git
cd stellarkraal
```

### Environment Variables

```bash
cp .env.example .env
```

```env
# Stellar
STELLAR_NETWORK=testnet
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
NETWORK_PASSPHRASE="Test SDF Network ; September 2015"

# Contract Addresses (after deployment)
KRAAL_NFT_CONTRACT_ID=
KRAAL_LENDING_POOL_CONTRACT_ID=
KRAAL_ORACLE_CONTRACT_ID=
KRAAL_LIQUIDATION_CONTRACT_ID=

# Oracle Keypair
ORACLE_SECRET_KEY=
ORACLE_PUBLIC_KEY=

# Admin Keypair
ADMIN_SECRET_KEY=
ADMIN_PUBLIC_KEY=

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/stellarkraal

# IPFS
IPFS_API_URL=https://api.pinata.cloud
IPFS_API_KEY=
IPFS_SECRET_KEY=
```

---

## 🔗 Contract Deployment

```bash
cd contracts

# Build all contracts
cargo build --target wasm32-unknown-unknown --release

# Deploy kraal_nft
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/kraal_nft.wasm \
  --source ADMIN_SECRET_KEY \
  --network testnet

# Deploy kraal_lending_pool
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/kraal_lending_pool.wasm \
  --source ADMIN_SECRET_KEY \
  --network testnet

# Deploy kraal_oracle
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/kraal_oracle.wasm \
  --source ADMIN_SECRET_KEY \
  --network testnet

# Deploy kraal_liquidation
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/kraal_liquidation.wasm \
  --source ADMIN_SECRET_KEY \
  --network testnet
```

Save the returned contract IDs to your `.env` file.

---

##  Oracle Setup

```bash
cd oracle

# Install dependencies
pip install -r requirements.txt

# Start RFID listener
python3 rfid_listener.py

# Start price oracle (runs every 24 hours)
python3 price_oracle.py

# Start health monitor REST API
python3 health_monitor.py
```

---

## 💻 Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

Install the [Freighter wallet browser extension](https://freighter.app) and switch to **Testnet** to interact with the app.

---

##  Running Tests

### Soroban Contract Tests

```bash
cd contracts

# Run all contract tests
cargo test

# Run tests for a specific contract
cargo test -p kraal_lending_pool
cargo test -p kraal_nft
cargo test -p kraal_oracle
cargo test -p kraal_liquidation

# Run with output
cargo test -- --nocapture
```

### Test Coverage (25 tests across 4 contracts)

| Contract | Tests |
|----------|-------|
| kraal_nft | 6 tests |
| kraal_lending_pool | 10 tests |
| kraal_oracle | 5 tests |
| kraal_liquidation | 4 tests |

---

## 👥 User Roles

### 🧑‍🌾 Farmer
- Register a kraal and onboard via Freighter wallet
- Submit animals for vet verification with RFID + photo
- Deposit verified livestock NFT as collateral
- Borrow USDC up to 60% of animal market value
- Repay loan and recover NFT

### 💰 Lender
- Deposit USDC into the StellarKraal lending pool
- Earn 8% APR yield from farmer loan interest
- Withdraw liquidity at any time (subject to utilization)
- Monitor portfolio via lender dashboard

### 🩺 Vet
- Register as a verified vet (whitelisted by admin)
- Inspect animals and submit health attestations on-chain
- Earn attestation fee per verified animal
- Update health status via vet portal

### ⚡ Liquidator
- Monitor open loan positions for liquidation eligibility
- Execute liquidations on defaulted positions
- Earn 5% liquidator bonus on collateral value

---

## 📊 Loan Parameters

| Parameter | Value |
|-----------|-------|
| Max LTV | 60% of livestock market value |
| Interest Rate | 8% APR (simple interest) |
| Loan Durations | 30 / 60 / 90 days |
| Liquidation Threshold | 80% LTV |
| Grace Period | 7 days after due date |
| Liquidator Bonus | 5% of collateral value |
| Protocol Fee | 1% of interest to treasury |
| Oracle Freshness | 48 hour maximum data age |

---

## 🗺️ Roadmap

### Phase 1 — Contracts ✅
- [x] `kraal_nft` — livestock NFT minting and verification
- [x] `kraal_lending_pool` — borrow, repay, deposit, withdraw
- [x] `kraal_oracle` — RFID + price feed bridge
- [x] `kraal_liquidation` — automated liquidation engine
- [x] 25 Rust unit tests
- [x] Stellar Testnet deployment

### Phase 2 — Oracle Layer 🔄
- [ ] RFID listener service
- [ ] FAO price feed integration
- [ ] Vet health submission REST API
- [ ] End-to-end oracle → Soroban test

### Phase 3 — Frontend 🔄
- [ ] Freighter wallet integration
- [ ] Farmer registration + animal tokenization flow
- [ ] Borrow flow with live LTV calculator
- [ ] Lender deposit + APY dashboard
- [ ] Vet verification portal
- [ ] Livestock marketplace

### Phase 4 — Mainnet 🔜
- [ ] Smart contract security audit
- [ ] Liquidation stress tests
- [ ] Mainnet deployment
- [ ] Mobile app (React Native)
- [ ] Kiswahili + Hindi i18n support

---

## 🤝 Contributing

Contributions are welcome. Please open an issue before submitting a PR.

```bash
# Fork the repo
# Create your feature branch
git checkout -b feat/your-feature-name

# Commit your changes
git commit -m "feat: add your feature"

# Push to your branch
git push origin feat/your-feature-name

# Open a Pull Request
```

Please follow:
- [Conventional Commits](https://www.conventionalcommits.org/)
- `KraalError` enum for all contract errors (no raw integers)
- Checks-effects-interactions pattern in all Soroban contracts
- Mobile-first, jargon-free UI on all farmer-facing pages

---

## 📄 License

MIT License — see [LICENSE](./LICENSE) for details.

---

## 🙏 Acknowledgements

- [Stellar Development Foundation](https://stellar.org) — network infrastructure and Soroban
- [Freighter](https://freighter.app) — wallet integration
- [FAO](https://www.fao.org) — livestock price data
- [IPFS / Pinata](https://pinata.cloud) — decentralized animal record storage

---

<div align="center">

**Built on Stellar. Built for farmers.**

⭐ Star this repo if StellarKraal matters to you

[Website](#) · [Docs](#) · [Twitter](#) · [Discord](#)

</div>
