import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { baseSepolia } from "wagmi/chains";
import { http } from "wagmi";
import { tenderlyVirtualTestnet } from "./chains";

export const config = getDefaultConfig({
  appName: "MetaPredict",
  projectId: "metapredict-local-dev",
  chains: [baseSepolia, tenderlyVirtualTestnet],
  transports: {
    [baseSepolia.id]: http("https://sepolia.base.org"),
    [tenderlyVirtualTestnet.id]: http(
      "https://virtual.rpc.tenderly.co/ArgonStark/project/public/metapredict"
    ),
  },
  ssr: true,
});
