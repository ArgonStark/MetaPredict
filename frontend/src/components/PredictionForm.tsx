"use client";

import { useState, useEffect } from "react";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";
import { usePrediction } from "@/hooks/usePrediction";

interface PredictionFormProps {
  marketId: number;
  options: string[];
  outcomeStakes: bigint[];
  totalPool: bigint;
  onSuccess: () => void;
}

export function PredictionForm({
  marketId,
  options,
  outcomeStakes,
  totalPool,
  onSuccess,
}: PredictionFormProps) {
  const { isConnected } = useAccount();
  const [selectedOutcome, setSelectedOutcome] = useState<number>(0);
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"input" | "approving" | "predicting">(
    "input"
  );

  const {
    handleApprove,
    handlePredict,
    needsApproval,
    refetchAllowance,
    isApproving,
    approveConfirmed,
    isPredicting,
    predictConfirmed,
    approveError,
    predictError,
    usdcBalance,
  } = usePrediction(marketId);

  useEffect(() => {
    if (approveConfirmed && step === "approving") {
      refetchAllowance();
      setStep("predicting");
      handlePredict(selectedOutcome, amount);
    }
  }, [approveConfirmed]);

  useEffect(() => {
    if (predictConfirmed && step === "predicting") {
      setStep("input");
      setAmount("");
      onSuccess();
    }
  }, [predictConfirmed]);

  const handleSubmit = () => {
    if (!amount || parseFloat(amount) <= 0) return;
    if (needsApproval(amount)) {
      setStep("approving");
      handleApprove(amount);
    } else {
      setStep("predicting");
      handlePredict(selectedOutcome, amount);
    }
  };

  if (!isConnected) {
    return (
      <div className="glass rounded-xl p-5">
        <p className="text-center text-muted">
          Connect your wallet to make a prediction
        </p>
      </div>
    );
  }

  const balanceFormatted = usdcBalance
    ? Number(formatUnits(usdcBalance, 6)).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "0.00";

  return (
    <div className="glass rounded-xl p-5 space-y-4">
      <h3 className="font-semibold text-sm uppercase tracking-wider text-muted">
        Make a Prediction
      </h3>

      <div className="space-y-2">
        {options.map((option, i) => {
          const stake = outcomeStakes[i] ?? 0n;
          const percentage =
            totalPool > 0n ? Number((stake * 100n) / totalPool) : 0;

          return (
            <button
              key={i}
              onClick={() => setSelectedOutcome(i)}
              className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                selectedOutcome === i
                  ? "border-accent bg-accent/10 glow-accent"
                  : "border-border hover:border-border-glow bg-card"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    selectedOutcome === i
                      ? "border-accent"
                      : "border-muted"
                  }`}
                >
                  {selectedOutcome === i && (
                    <span className="w-2 h-2 rounded-full bg-accent" />
                  )}
                </span>
                <span className="font-medium text-sm">{option}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted">
                  ${Number(formatUnits(stake, 6)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <div className="w-12 h-1.5 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="font-mono text-xs text-accent w-8 text-right">
                  {percentage}%
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs text-muted">Amount (USDC)</label>
          <span className="text-xs text-muted">
            Balance: ${balanceFormatted}
          </span>
        </div>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
            className="w-full bg-card border border-border rounded-lg px-4 py-3 font-mono text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 placeholder-muted/50"
          />
          <button
            onClick={() => {
              if (usdcBalance)
                setAmount(formatUnits(usdcBalance, 6));
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-accent hover:text-accent-dim transition-colors"
          >
            MAX
          </button>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={
          !amount ||
          parseFloat(amount) <= 0 ||
          isApproving ||
          isPredicting
        }
        className="w-full py-3 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-accent hover:bg-accent-dim text-white glow-accent"
      >
        {isApproving
          ? "Approving USDC..."
          : isPredicting
            ? "Placing Prediction..."
            : needsApproval(amount || "0")
              ? "Approve & Predict"
              : "Predict"}
      </button>

      {(approveError || predictError) && (
        <p className="text-xs text-red text-center">
          {(approveError || predictError)?.message?.slice(0, 100)}
        </p>
      )}
    </div>
  );
}
