#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# MetaPredict — Tenderly Virtual TestNet Deployment Script
# Deploys MetaPredictionMarket to a Tenderly Virtual TestNet (Base mainnet fork)
# and creates sample markets with test predictions.
# ============================================================================

# ── Configuration ───────────────────────────────────────────────────────────

TENDERLY_RPC="${TENDERLY_RPC:-https://virtual.rpc.tenderly.co/ArgonStark/project/private/metapredict/1712f137-c280-4b06-bcef-7da592b6e90e}"
USDC_ADDRESS="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"           # Base mainnet USDC
CRE_FORWARDER="0x82300bd7c3958625581cc2f77bc6464dcecdf3e5"          # Chainlink CRE forwarder
USDC_MINT_AMOUNT="0x3B9ACA00"                                        # 1000 USDC (6 decimals)
USDC_APPROVE_AMOUNT="1000000000"                                     # 1000 USDC
CONTRACT_DIR="$(cd "$(dirname "$0")/../contracts/evm" && pwd)"

# ── Resolve private key ────────────────────────────────────────────────────

if [ -z "${CRE_ETH_PRIVATE_KEY:-}" ]; then
  ENV_FILE="$(dirname "$0")/../.env"
  if [ -f "$ENV_FILE" ]; then
    echo "Loading .env from $ENV_FILE"
    set -a; source "$ENV_FILE"; set +a
  else
    echo "ERROR: CRE_ETH_PRIVATE_KEY not set and no .env found" >&2
    exit 1
  fi
fi

WALLET=$(cast wallet address --private-key "$CRE_ETH_PRIVATE_KEY")
echo "Wallet: $WALLET"
echo "RPC:    $TENDERLY_RPC"
echo ""

# ── Step 1: Mint USDC ──────────────────────────────────────────────────────

echo "━━━ Step 1: Minting 1000 USDC to $WALLET ━━━"
MINT_TX=$(curl -s -X POST "$TENDERLY_RPC" \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"method\":\"tenderly_setErc20Balance\",\"params\":[\"$USDC_ADDRESS\",\"$WALLET\",\"$USDC_MINT_AMOUNT\"],\"id\":1}" \
  | grep -o '"result":"[^"]*"' | cut -d'"' -f4)
echo "Mint TX: $MINT_TX"

BALANCE=$(cast call "$USDC_ADDRESS" "balanceOf(address)(uint256)" "$WALLET" --rpc-url "$TENDERLY_RPC")
echo "USDC Balance: $BALANCE"
echo ""

# ── Step 2: Deploy Contract ────────────────────────────────────────────────

echo "━━━ Step 2: Deploying MetaPredictionMarket ━━━"
DEPLOY_OUTPUT=$(cd "$CONTRACT_DIR" && forge create \
  --broadcast \
  --private-key "$CRE_ETH_PRIVATE_KEY" \
  --rpc-url "$TENDERLY_RPC" \
  src/MetaPredictionMarket.sol:MetaPredictionMarket \
  --constructor-args "$USDC_ADDRESS" "$CRE_FORWARDER" \
  2>&1)

CONTRACT=$(echo "$DEPLOY_OUTPUT" | grep "Deployed to:" | awk '{print $3}')
DEPLOY_TX=$(echo "$DEPLOY_OUTPUT" | grep "Transaction hash:" | awk '{print $3}')
echo "Contract:  $CONTRACT"
echo "Deploy TX: $DEPLOY_TX"
echo ""

if [ -z "$CONTRACT" ]; then
  echo "ERROR: Deployment failed" >&2
  echo "$DEPLOY_OUTPUT" >&2
  exit 1
fi

# ── Step 3: Approve USDC ───────────────────────────────────────────────────

echo "━━━ Step 3: Approving USDC for contract ━━━"
APPROVE_TX=$(cast send "$USDC_ADDRESS" \
  "approve(address,uint256)" "$CONTRACT" "$USDC_APPROVE_AMOUNT" \
  --rpc-url "$TENDERLY_RPC" \
  --private-key "$CRE_ETH_PRIVATE_KEY" \
  --json | grep -o '"transactionHash":"[^"]*"' | cut -d'"' -f4)
echo "Approve TX: $APPROVE_TX"
echo ""

# ── Step 4: Create Markets ─────────────────────────────────────────────────

EXPIRY=$(date -v+5m +%s 2>/dev/null || date -d "+5 months" +%s)

echo "━━━ Step 4: Creating sample markets ━━━"

# Market 0 — ai_search
echo "Creating Market 0 (ai_search)..."
M0_TX=$(cast send "$CONTRACT" \
  "createBinaryMarket(string,uint256,string)" \
  "Will Polymarket launch their own token before end of 2026?" \
  "$EXPIRY" "ai_search" \
  --rpc-url "$TENDERLY_RPC" \
  --private-key "$CRE_ETH_PRIVATE_KEY" \
  --json | grep -o '"transactionHash":"[^"]*"' | cut -d'"' -f4)
echo "Market 0 TX: $M0_TX"

# Market 1 — polymarket_volume
echo "Creating Market 1 (polymarket_volume)..."
M1_TX=$(cast send "$CONTRACT" \
  "createBinaryMarket(string,uint256,string)" \
  "Will Polymarket weekly volume exceed 1 billion USD?" \
  "$EXPIRY" "polymarket_volume" \
  --rpc-url "$TENDERLY_RPC" \
  --private-key "$CRE_ETH_PRIVATE_KEY" \
  --json | grep -o '"transactionHash":"[^"]*"' | cut -d'"' -f4)
echo "Market 1 TX: $M1_TX"
echo ""

# ── Step 5: Place Predictions ──────────────────────────────────────────────

echo "━━━ Step 5: Placing predictions ━━━"

# Predict YES on Market 0 — 1 USDC
echo "Predicting YES on Market 0 (1 USDC)..."
P0_TX=$(cast send "$CONTRACT" \
  "predict(uint256,uint8,uint256)" 0 0 1000000 \
  --rpc-url "$TENDERLY_RPC" \
  --private-key "$CRE_ETH_PRIVATE_KEY" \
  --json | grep -o '"transactionHash":"[^"]*"' | cut -d'"' -f4)
echo "Prediction 0 TX: $P0_TX"

# Predict NO on Market 1 — 2 USDC
echo "Predicting NO on Market 1 (2 USDC)..."
P1_TX=$(cast send "$CONTRACT" \
  "predict(uint256,uint8,uint256)" 1 1 2000000 \
  --rpc-url "$TENDERLY_RPC" \
  --private-key "$CRE_ETH_PRIVATE_KEY" \
  --json | grep -o '"transactionHash":"[^"]*"' | cut -d'"' -f4)
echo "Prediction 1 TX: $P1_TX"
echo ""

# ── Summary ─────────────────────────────────────────────────────────────────

CONTRACT_BALANCE=$(cast call "$USDC_ADDRESS" "balanceOf(address)(uint256)" "$CONTRACT" --rpc-url "$TENDERLY_RPC")
WALLET_BALANCE=$(cast call "$USDC_ADDRESS" "balanceOf(address)(uint256)" "$WALLET" --rpc-url "$TENDERLY_RPC")
MARKET_COUNT=$(cast call "$CONTRACT" "nextMarketId()(uint256)" --rpc-url "$TENDERLY_RPC")

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              MetaPredict — Deployment Complete              ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║ Contract:         $CONTRACT"
echo "║ Markets created:  $MARKET_COUNT"
echo "║ Contract USDC:    $CONTRACT_BALANCE"
echo "║ Wallet USDC:      $WALLET_BALANCE"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║ Transaction Hashes:                                        ║"
echo "║  Deploy:       $DEPLOY_TX"
echo "║  Approve:      $APPROVE_TX"
echo "║  Market 0:     $M0_TX"
echo "║  Market 1:     $M1_TX"
echo "║  Predict 0:    $P0_TX"
echo "║  Predict 1:    $P1_TX"
echo "╚══════════════════════════════════════════════════════════════╝"
