export const CONTRACTS = {
  baseSepolia: {
    metaPredictionMarket: "0xB5d15e699606feF7b93b29C04c489DCe16236673" as const,
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const,
  },
  tenderlyVirtualTestnet: {
    metaPredictionMarket: "0x3CeE04482438d2474e364aAC75DA54156535be8a" as const,
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const,
  },
} as const;

export const USDC_DECIMALS = 6;

export const MARKET_ABI = [
  {
    type: "function",
    name: "nextMarketId",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "markets",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "question", type: "string" },
      { name: "marketType", type: "uint8" },
      { name: "deadline", type: "uint256" },
      { name: "resolutionSource", type: "string" },
      { name: "status", type: "uint8" },
      { name: "winningOutcome", type: "uint8" },
      { name: "totalPool", type: "uint256" },
      { name: "creator", type: "address" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMarketOptions",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [{ name: "", type: "string[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getOutcomeStake",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "outcome", type: "uint8" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getUserStake",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "user", type: "address" },
      { name: "outcome", type: "uint8" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "claimed",
    inputs: [
      { name: "", type: "uint256" },
      { name: "", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "createBinaryMarket",
    inputs: [
      { name: "question", type: "string" },
      { name: "deadline", type: "uint256" },
      { name: "resolutionSource", type: "string" },
    ],
    outputs: [{ name: "marketId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "createMultiChoiceMarket",
    inputs: [
      { name: "question", type: "string" },
      { name: "options", type: "string[]" },
      { name: "deadline", type: "uint256" },
      { name: "resolutionSource", type: "string" },
    ],
    outputs: [{ name: "marketId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "predict",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "outcome", type: "uint8" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "requestSettlement",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claimWinnings",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "MarketCreated",
    inputs: [
      { name: "marketId", type: "uint256", indexed: true },
      { name: "question", type: "string", indexed: false },
      { name: "marketType", type: "uint8", indexed: false },
      { name: "deadline", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "PredictionPlaced",
    inputs: [
      { name: "marketId", type: "uint256", indexed: true },
      { name: "user", type: "address", indexed: true },
      { name: "outcome", type: "uint8", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "SettlementRequested",
    inputs: [{ name: "marketId", type: "uint256", indexed: true }],
  },
  {
    type: "event",
    name: "MarketSettled",
    inputs: [
      { name: "marketId", type: "uint256", indexed: true },
      { name: "winningOutcome", type: "uint8", indexed: false },
    ],
  },
] as const;

export const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;
