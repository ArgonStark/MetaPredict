"use client";

import { useReadContract, useReadContracts } from "wagmi";
import { useAccount } from "wagmi";
import { MARKET_ABI, CONTRACTS } from "@/config/contracts";
import { baseSepolia } from "wagmi/chains";

const contractAddress = CONTRACTS.baseSepolia.metaPredictionMarket;
const chainId = baseSepolia.id;

export function useMarket(marketId: number) {
  const { address } = useAccount();

  const {
    data: marketRaw,
    isLoading: isLoadingMarket,
    refetch: refetchMarket,
  } = useReadContract({
    address: contractAddress,
    abi: MARKET_ABI,
    functionName: "markets",
    args: [BigInt(marketId)],
    chainId,
  });

  const { data: options, isLoading: isLoadingOptions } = useReadContract({
    address: contractAddress,
    abi: MARKET_ABI,
    functionName: "getMarketOptions",
    args: [BigInt(marketId)],
    chainId,
  });

  const optionCount = options ? options.length : 2;

  const stakeContracts = Array.from({ length: optionCount }, (_, i) => ({
    address: contractAddress,
    abi: MARKET_ABI,
    functionName: "getOutcomeStake" as const,
    args: [BigInt(marketId), i] as const,
    chainId,
  }));

  const userStakeContracts = address
    ? Array.from({ length: optionCount }, (_, i) => ({
        address: contractAddress,
        abi: MARKET_ABI,
        functionName: "getUserStake" as const,
        args: [BigInt(marketId), address, i] as const,
        chainId,
      }))
    : [];

  const { data: stakesRaw, refetch: refetchStakes } = useReadContracts({
    contracts: stakeContracts,
    query: { enabled: optionCount > 0 },
  });

  const { data: userStakesRaw, refetch: refetchUserStakes } = useReadContracts({
    contracts: userStakeContracts,
    query: { enabled: !!address && optionCount > 0 },
  });

  const { data: hasClaimed } = useReadContract({
    address: contractAddress,
    abi: MARKET_ABI,
    functionName: "claimed",
    args: address ? [BigInt(marketId), address] : undefined,
    chainId,
    query: { enabled: !!address },
  });

  let market = null;
  if (marketRaw) {
    const r = marketRaw as [
      string,
      number,
      bigint,
      string,
      number,
      number,
      bigint,
      string,
    ];
    market = {
      id: marketId,
      question: r[0],
      marketType: r[1],
      deadline: r[2],
      resolutionSource: r[3],
      status: r[4],
      winningOutcome: r[5],
      totalPool: r[6],
      creator: r[7],
    };
  }

  const outcomeStakes: bigint[] = [];
  if (stakesRaw) {
    for (const s of stakesRaw) {
      outcomeStakes.push(
        s.status === "success" ? (s.result as bigint) : 0n
      );
    }
  }

  const userStakes: bigint[] = [];
  if (userStakesRaw) {
    for (const s of userStakesRaw) {
      userStakes.push(
        s.status === "success" ? (s.result as bigint) : 0n
      );
    }
  }

  const refetch = () => {
    refetchMarket();
    refetchStakes();
    refetchUserStakes();
  };

  return {
    market,
    options: (options as string[]) ?? [],
    outcomeStakes,
    userStakes,
    hasClaimed: hasClaimed as boolean | undefined,
    isLoading: isLoadingMarket || isLoadingOptions,
    refetch,
  };
}
