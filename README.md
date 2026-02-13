# 🔮 MetaPredict

**The Prediction Market for Prediction Markets**

[![Chainlink CRE](https://img.shields.io/badge/Chainlink-CRE-375BD2?logo=chainlink&logoColor=white)](https://chain.link)
[![Base](https://img.shields.io/badge/Base-Sepolia-0052FF?logo=coinbase&logoColor=white)](https://base.org)
[![Solidity](https://img.shields.io/badge/Solidity-^0.8.19-363636?logo=solidity)](https://soliditylang.org)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Tenderly](https://img.shields.io/badge/Tenderly-Virtual_TestNet-7B3FE4)](https://tenderly.co)

> Built for **Chainlink Convergence Hackathon 2026**

📹 **Demo Video**: [Coming Soon]

---

## 🎯 Overview

MetaPredict is a **meta prediction market** — users create and bet on prediction markets *about prediction market platforms* themselves. Questions like "Will Polymarket launch their own token?", "Will Kalshi exceed $500M monthly volume?", or "Which prediction market will launch a token first?" are settled automatically using **Chainlink CRE** workflows that fetch real data from Polymarket & Kalshi APIs, then use **AI (Google Gemini)** to determine outcomes.

**Why it's unique:** While prediction markets let you bet on real-world events, MetaPredict lets you bet on the *prediction market industry itself* — creating a recursive, meta layer on top of the ecosystem. Markets are settled with verifiable, AI-powered analysis of real platform data, not manual resolution.

**Use cases:**
- Token launches & airdrops from prediction market platforms
- Platform volume & growth milestones
- Feature launches, partnerships, and regulatory outcomes
- Cross-platform comparisons (Polymarket vs Kalshi vs Azuro)

---

## 🏗️ Architecture

```
                          ┌─────────────────────────────────────────────────────┐
                          │              Chainlink CRE Workflow                 │
                          │                                                     │
                          │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
                          │  │ Polymarket│  │  Kalshi   │  │ OpenRouter       │  │
                          │  │ Gamma API │  │   API     │  │ (Gemini 2.0     │  │
                          │  └────┬─────┘  └────┬──────┘  │  Flash + Search) │  │
                          │       │              │         └────────┬─────────┘  │
                          │       └──────┬───────┘                 │            │
                          │              ▼                         │            │
                          │     ┌────────────────┐                 │            │
                          │     │ Data Aggregation├────────────────┘            │
                          │     └───────┬────────┘                             │
                          │             │  AI determines winning outcome        │
                          └─────────────┼──────────────────────────────────────┘
                                        │
    ┌──────────┐    ┌──────────────┐    │    ┌───────────────────────────────┐
    │          │    │   Next.js    │    ▼    │     MetaPredictionMarket      │
    │  Users   ├───►│  Frontend    ├────────►│     Smart Contract (Base)     │
    │          │    │  (wagmi v2)  │◄────────│     USDC-based betting        │
    └──────────┘    └──────────────┘         └───────────────────────────────┘
```

### Flow

1. **Create** — A user creates a prediction market with a question, deadline, and resolution source
2. **Predict** — Users bet USDC on their predicted outcome (Yes/No or multi-choice)
3. **Trigger** — After the deadline, anyone calls `requestSettlement()`, emitting a `SettlementRequested` event
4. **Settle** — Chainlink CRE picks up the event, fetches real data from Polymarket & Kalshi APIs, sends it to Google Gemini for AI analysis, and writes the result onchain
5. **Claim** — Winners claim their proportional share of the USDC pool (minus 2% protocol fee)

---

## 🔗 Chainlink CRE Integration

> **This is the core of MetaPredict.** Chainlink CRE orchestrates the entire settlement pipeline — from event detection to AI analysis to onchain finalization.

### Workflow Files

- **Main workflow**: [`settlement-workflow/main.ts`](settlement-workflow/main.ts) ⭐
- **Staging config**: [`settlement-workflow/config.staging.json`](settlement-workflow/config.staging.json)
- **Production config**: [`settlement-workflow/config.production.json`](settlement-workflow/config.production.json)

### CRE Workflow Steps

```
SettlementRequested event
        │
        ▼
┌─ EVM Log Trigger ──────────────────────────────┐
│  Listens for SettlementRequested(uint256)       │
│  on MetaPredictionMarket contract               │
└────────────────────┬───────────────────────────┘
                     ▼
┌─ EVM Read ─────────────────────────────────────┐
│  Reads market data from contract:               │
│  • question, options, resolutionSource          │
│  Routes to appropriate data sources             │
└────────────────────┬───────────────────────────┘
                     ▼
┌─ HTTP Fetch (conditional) ─────────────────────┐
│  Based on resolutionSource routing:             │
│  • Polymarket Gamma API → events & markets      │
│  • Kalshi API → markets & trades                │
│  • ai_search → skip API, use web search only    │
└────────────────────┬───────────────────────────┘
                     ▼
┌─ AI Analysis (OpenRouter + Gemini 2.0 Flash) ──┐
│  Sends market question + fetched data to AI     │
│  • ai_search mode: Gemini with web search       │
│    grounding for news/announcement questions     │
│  • data mode: Gemini analyzes API data to        │
│    determine if threshold/condition is met       │
│  Returns: winning outcome index (0-based)       │
└────────────────────┬───────────────────────────┘
                     ▼
┌─ Report & EVM Write ──────────────────────────┐
│  Encodes (marketId, winningOutcome) as report   │
│  Signed report delivered to contract via        │
│  Chainlink forwarder → onReport() callback      │
│  Market is settled onchain                      │
└────────────────────────────────────────────────┘
```

### Key CRE Features Used

- **EVM Log Trigger** — Automatically starts workflow when `SettlementRequested` is emitted
- **EVM Read** — Reads market state directly from the contract
- **HTTP Compute** — Fetches external API data with consensus aggregation
- **Custom Compute** — AI-powered resolution logic with conditional data source routing
- **EVM Write** — Settles the market onchain through a signed, verified report

---

## 🧠 Smart Resolution Source Routing

MetaPredict uses a **dynamic routing system** that selects the right data sources based on the question type. Each market has a `resolutionSource` field that determines how the CRE workflow fetches and analyzes data:

| Resolution Source | Data Fetched | Best For |
|---|---|---|
| `ai_search` | AI web search (Gemini grounding) | News, announcements, token launches |
| `polymarket_volume` | Polymarket events & markets API | Volume-based questions |
| `polymarket_traders` | Polymarket trader & market data | User growth questions |
| `kalshi_markets` | Kalshi markets & trades API | Kalshi-specific questions |
| `polymarket_kalshi_data` | Both Polymarket + Kalshi APIs | Cross-platform comparisons |

This makes the system **modular** — adding new data sources (e.g., Azuro, Drift) requires only adding a new route in the CRE workflow, not modifying the contract.

---

## 📊 Data Sources

| Source | API | Data |
|---|---|---|
| **Polymarket** | Gamma API (`/events`, `/markets`) | Top events by volume, market prices, liquidity, 24h volume |
| **Kalshi** | REST API (`/markets`, `/trades`) | Open markets, recent trades, open interest, volume |
| **OpenRouter** | Chat Completions API | Google Gemini 2.0 Flash with web search grounding |

---

## 🖥️ Frontend

- **Next.js 16** + **wagmi v2** + **RainbowKit** for wallet connection
- Dark cyberpunk UI with glass morphism, glow effects, gradient accents
- **Features:**
  - Browse & filter markets (active, settled, pending)
  - Create binary or multi-choice markets with resolution source selection
  - Place USDC predictions with automatic approval flow
  - Settlement status indicator with visual timeline
  - Claim winnings after settlement
  - Responsive design

---

## 📝 Smart Contracts

**Contract**: [`contracts/evm/src/MetaPredictionMarket.sol`](contracts/evm/src/MetaPredictionMarket.sol)

### Deployed Addresses

| Network | Contract | USDC |
|---|---|---|
| **Base Sepolia** | `0xB5d15e699606feF7b93b29C04c489DCe16236673` | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| **Tenderly Virtual TestNet** | `0x3CeE04482438d2474e364aAC75DA54156535be8a` | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |

### Key Functions

| Function | Description |
|---|---|
| `createBinaryMarket(question, deadline, resolutionSource)` | Create a Yes/No market |
| `createMultiChoiceMarket(question, options, deadline, resolutionSource)` | Create a multi-choice market (2–6 options) |
| `predict(marketId, outcome, amount)` | Bet USDC on an outcome |
| `requestSettlement(marketId)` | Trigger CRE settlement (after deadline) |
| `onReport(metadata, report)` | CRE callback — settles market onchain |
| `claimWinnings(marketId)` | Claim proportional USDC payout |

- **USDC-based** — all bets and payouts in USDC (6 decimals)
- **2% protocol fee** on settled market pools
- **Chainlink CRE forwarder** — only the authorized forwarder can call `onReport()`

---

## 🧪 Tenderly Virtual TestNet

### Why Tenderly?

Testing CRE workflows against **real Base mainnet state** — real USDC contract, real protocol data — without spending real funds. This validates that our settlement workflow works correctly with production data before mainnet deployment.

### How It Solves Problems

Virtual TestNets eliminate the gap between testnet and mainnet behavior. Our CRE workflow fetches real Polymarket & Kalshi data and settles markets on a **fork of Base mainnet**, proving the system works with real-world state. The USDC contract at `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` is the *actual* Base mainnet USDC — balances are set via `tenderly_setErc20Balance` for testing.

### Deployment Proof

[**Explorer →**](https://dashboard.tenderly.co/explorer/vnet/be257a29-c286-4262-aefc-1aadf4061729/transactions)

| Action | Transaction Hash |
|---|---|
| Deploy Contract | `0xdcc77a2072c8d91bd9cd96875e17021128540677b61cf95bf81cf24fb559eabe` |
| Create Market 0 (`ai_search`) | `0xaf37106653e1d66aa60cbc2c03e4b726c6ad5ddca58264a0a7a6420299915ffd` |
| Create Market 1 (`polymarket_volume`) | `0x8afdc04ab2fc893b1f6711b671129f935d5f468306e1b68f6cf5bed6427cad5f` |
| Predict YES on Market 0 (1 USDC) | `0x521af484201707d7ce49bd454cd253416a1addf4fd7aeff4b2a46e1678960902` |
| Predict NO on Market 1 (2 USDC) | `0xcea75feb454b0c7c0f1787504ffb8c133f77339e79653f321c705e90f0298ad9` |

### Automated Deployment

```bash
# Deploy to Tenderly Virtual TestNet with one command
./scripts/deploy-tenderly.sh
```

The script mints USDC, deploys the contract, creates sample markets, and places test predictions — all automated.

---

## 🚀 Getting Started

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) (forge, cast)
- [Bun](https://bun.sh) (for CRE workflow)
- [Node.js 18+](https://nodejs.org) (for frontend)
- [Chainlink CRE CLI](https://docs.chain.link/cre)

### Setup

```bash
# Clone
git clone https://github.com/ArgonStark/MetaPredict.git
cd MetaPredict

# Smart Contracts
cd contracts/evm
forge build

# CRE Workflow
cd ../../settlement-workflow
bun install

# Simulate CRE workflow
cre workflow simulate settlement-workflow --target staging-settings

# Frontend
cd ../frontend
npm install
npm run dev
```

### Environment Variables

Create a `.env` file in the project root:

```env
CRE_ETH_PRIVATE_KEY=0x...       # Deployer private key
GEMINI_API_KEY_VAR=...           # Google Gemini API key (via OpenRouter)
OPENROUTER_API_KEY_VAR=...       # OpenRouter API key
```

---

## 📁 Project Structure

```
MetaPredict/
├── contracts/evm/                # Solidity smart contracts (Foundry)
│   ├── src/
│   │   ├── MetaPredictionMarket.sol   # Main contract
│   │   └── interfaces/IReceiver.sol   # CRE receiver interface
│   └── foundry.toml
├── settlement-workflow/          # Chainlink CRE workflow
│   ├── main.ts                   # Workflow logic (⭐ MAIN CRE FILE)
│   ├── config.staging.json       # CRE staging config
│   └── config.production.json    # CRE production config
├── frontend/                     # Next.js frontend
│   └── src/
│       ├── app/                  # Pages (home, markets, market detail, create)
│       ├── components/           # UI components
│       ├── hooks/                # wagmi hooks (useMarkets, useMarket, usePrediction)
│       ├── config/               # Contract addresses, ABI, chain config
│       └── providers/            # Web3Provider (wagmi + RainbowKit)
├── scripts/
│   └── deploy-tenderly.sh        # Automated Tenderly deployment
└── README.md
```

---

## 🔑 Key Files for Chainlink CRE

| File | Description |
|---|---|
| [`settlement-workflow/main.ts`](settlement-workflow/main.ts) | CRE workflow — EVM triggers, HTTP fetches, AI integration, EVM write |
| [`settlement-workflow/config.staging.json`](settlement-workflow/config.staging.json) | CRE workflow configuration (Base Sepolia) |
| [`settlement-workflow/config.production.json`](settlement-workflow/config.production.json) | CRE production configuration |
| [`contracts/evm/src/MetaPredictionMarket.sol`](contracts/evm/src/MetaPredictionMarket.sol) | Smart contract with `onReport()` CRE forwarder integration |

---

## 🏆 Hackathon Tracks

| Track | How MetaPredict Fits |
|---|---|
| **Prediction Markets** | AI-powered prediction market with automated settlement via real platform data |
| **CRE & AI** | Full CRE workflow: EVM trigger → HTTP fetch → AI analysis (Gemini) → EVM write |
| **Tenderly Virtual TestNets** | Deployed & tested on Virtual TestNet against real Base mainnet state |

---

## 👥 Team

Built by [ArgonStark](https://github.com/ArgonStark)

---

## 📄 License

MIT
