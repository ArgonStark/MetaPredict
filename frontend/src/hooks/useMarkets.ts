"use client";

import { useReadContract, useReadContracts } from "wagmi";
import { MARKET_ABI, CONTRACTS } from "@/config/contracts";
import { baseSepolia } from "wagmi/chains";

export interface MarketData {
  id: number;
  question: string;
  marketType: number;
  deadline: bigint;
  resolutionSource: string;
  status: number;
  winningOutcome: number;
  totalPool: bigint;
  creator: string;
}

const contractAddress = CONTRACTS.baseSepolia.metaPredictionMarket;
const chainId = baseSepolia.id;

export function useMarkets() {
  const {
    data: nextMarketId,
    isLoading: isLoadingCount,
    error: countError,
  } = useReadContract({
    address: contractAddress,
    abi: MARKET_ABI,
    functionName: "nextMarketId",
    chainId,
  });

  const marketCount = nextMarketId ? Number(nextMarketId) : 0;

  const marketContracts = Array.from({ length: marketCount }, (_, i) => ({
    address: contractAddress,
    abi: MARKET_ABI,
    functionName: "markets" as const,
    args: [BigInt(i)] as const,
    chainId,
  }));

  const {
    data: marketsRaw,
    isLoading: isLoadingMarkets,
    error: marketsError,
    refetch,
  } = useReadContracts({
    contracts: marketContracts,
    query: { enabled: marketCount > 0 },
  });

  const markets: MarketData[] = [];
  if (marketsRaw) {
    for (let i = 0; i < marketsRaw.length; i++) {
      const result = marketsRaw[i];
      if (result.status === "success" && result.result) {
        const r = result.result as [
          string,
          number,
          bigint,
          string,
          number,
          number,
          bigint,
          string,
        ];
        markets.push({
          id: i,
          question: r[0],
          marketType: r[1],
          deadline: r[2],
          resolutionSource: r[3],
          status: r[4],
          winningOutcome: r[5],
          totalPool: r[6],
          creator: r[7],
        });
      }
    }
  }

  return {
    markets,
    marketCount,
    isLoading: isLoadingCount || isLoadingMarkets,
    error: countError || marketsError,
    refetch,
  };
}
