import { defineChain } from "viem";
import { baseSepolia } from "wagmi/chains";

export const tenderlyVirtualTestnet = defineChain({
  id: 8453,
  name: "Tenderly Virtual TestNet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        "https://virtual.rpc.tenderly.co/ArgonStark/project/public/metapredict",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Tenderly Explorer",
      url: "https://virtual.rpc.tenderly.co",
    },
  },
});

export { baseSepolia };
