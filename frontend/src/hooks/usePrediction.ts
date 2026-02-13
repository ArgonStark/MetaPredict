"use client";

import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { useAccount } from "wagmi";
import { MARKET_ABI, ERC20_ABI, CONTRACTS } from "@/config/contracts";
import { baseSepolia } from "wagmi/chains";
import { parseUnits } from "viem";

const contractAddress = CONTRACTS.baseSepolia.metaPredictionMarket;
const usdcAddress = CONTRACTS.baseSepolia.usdc;
const chainId = baseSepolia.id;

export function usePrediction(marketId: number) {
  const { address } = useAccount();

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: usdcAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, contractAddress] : undefined,
    chainId,
    query: { enabled: !!address },
  });

  const { data: usdcBalance } = useReadContract({
    address: usdcAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId,
    query: { enabled: !!address },
  });

  const {
    writeContract: approve,
    data: approveTxHash,
    isPending: isApproving,
    error: approveError,
  } = useWriteContract();

  const { isLoading: isWaitingApprove, isSuccess: approveConfirmed } =
    useWaitForTransactionReceipt({
      hash: approveTxHash,
    });

  const {
    writeContract: predict,
    data: predictTxHash,
    isPending: isPredicting,
    error: predictError,
  } = useWriteContract();

  const { isLoading: isWaitingPredict, isSuccess: predictConfirmed } =
    useWaitForTransactionReceipt({
      hash: predictTxHash,
    });

  const handleApprove = (amount: string) => {
    const parsedAmount = parseUnits(amount, 6);
    approve({
      address: usdcAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [contractAddress, parsedAmount],
      chainId,
    });
  };

  const handlePredict = (outcome: number, amount: string) => {
    const parsedAmount = parseUnits(amount, 6);
    predict({
      address: contractAddress,
      abi: MARKET_ABI,
      functionName: "predict",
      args: [BigInt(marketId), outcome, parsedAmount],
      chainId,
    });
  };

  const needsApproval = (amount: string): boolean => {
    if (!allowance) return true;
    try {
      const parsedAmount = parseUnits(amount, 6);
      return (allowance as bigint) < parsedAmount;
    } catch {
      return true;
    }
  };

  return {
    allowance: allowance as bigint | undefined,
    usdcBalance: usdcBalance as bigint | undefined,
    handleApprove,
    handlePredict,
    needsApproval,
    refetchAllowance,
    isApproving: isApproving || isWaitingApprove,
    approveConfirmed,
    isPredicting: isPredicting || isWaitingPredict,
    predictConfirmed,
    approveError,
    predictError,
    approveTxHash,
    predictTxHash,
  };
}

export function useSettlement(marketId: number) {
  const {
    writeContract: requestSettlement,
    data: settlementTxHash,
    isPending: isRequesting,
    error: settlementError,
  } = useWriteContract();

  const { isLoading: isWaitingSettlement, isSuccess: settlementConfirmed } =
    useWaitForTransactionReceipt({ hash: settlementTxHash });

  const handleRequestSettlement = () => {
    requestSettlement({
      address: contractAddress,
      abi: MARKET_ABI,
      functionName: "requestSettlement",
      args: [BigInt(marketId)],
      chainId,
    });
  };

  return {
    handleRequestSettlement,
    isRequesting: isRequesting || isWaitingSettlement,
    settlementConfirmed,
    settlementError,
    settlementTxHash,
  };
}

export function useClaim(marketId: number) {
  const {
    writeContract: claimWinnings,
    data: claimTxHash,
    isPending: isClaiming,
    error: claimError,
  } = useWriteContract();

  const { isLoading: isWaitingClaim, isSuccess: claimConfirmed } =
    useWaitForTransactionReceipt({ hash: claimTxHash });

  const handleClaim = () => {
    claimWinnings({
      address: contractAddress,
      abi: MARKET_ABI,
      functionName: "claimWinnings",
      args: [BigInt(marketId)],
      chainId,
    });
  };

  return {
    handleClaim,
    isClaiming: isClaiming || isWaitingClaim,
    claimConfirmed,
    claimError,
    claimTxHash,
  };
}
