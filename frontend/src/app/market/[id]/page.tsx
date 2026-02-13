"use client";

import { use } from "react";
import { formatUnits } from "viem";
import { useMarket } from "@/hooks/useMarket";
import { useSettlement, useClaim } from "@/hooks/usePrediction";
import { useAccount } from "wagmi";
import { PredictionForm } from "@/components/PredictionForm";
import {
  MarketStatus,
  MarketTypeBadge,
  ResolutionSourceBadge,
} from "@/components/MarketStatus";

function MarketDetailInner({ marketId }: { marketId: number }) {
  const { isConnected } = useAccount();
  const {
    market,
    options,
    outcomeStakes,
    userStakes,
    hasClaimed,
    isLoading,
    refetch,
  } = useMarket(marketId);
  const { handleRequestSettlement, isRequesting, settlementError } =
    useSettlement(marketId);
  const { handleClaim, isClaiming, claimError } = useClaim(marketId);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="glass rounded-xl p-8 animate-pulse space-y-4">
          <div className="h-6 bg-border rounded w-48" />
          <div className="h-8 bg-border rounded w-full" />
          <div className="h-8 bg-border rounded w-3/4" />
          <div className="h-40 bg-border rounded" />
        </div>
      </div>
    );
  }

  if (!market) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="glass rounded-xl p-12 text-center">
          <p className="text-muted">Market not found.</p>
        </div>
      </div>
    );
  }

  const deadlineDate = new Date(Number(market.deadline) * 1000);
  const isExpired = Date.now() / 1000 > Number(market.deadline);
  const poolFormatted = Number(formatUnits(market.totalPool, 6)).toLocaleString(
    "en-US",
    { minimumFractionDigits: 2, maximumFractionDigits: 2 }
  );

  const userTotalStake = userStakes.reduce((a, b) => a + b, 0n);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div className="animate-fade-in">
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <MarketTypeBadge type={market.marketType} />
              <ResolutionSourceBadge source={market.resolutionSource} />
              <MarketStatus status={market.status} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold leading-snug">
              {market.question}
            </h1>
          </div>

          {/* Outcome Distribution */}
          <div className="glass rounded-xl p-5 space-y-3 animate-fade-in">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted">
              Outcome Distribution
            </h3>
            {options.map((option, i) => {
              const stake = outcomeStakes[i] ?? 0n;
              const percentage =
                market.totalPool > 0n
                  ? Number((stake * 10000n) / market.totalPool) / 100
                  : 0;
              const isWinner =
                market.status === 2 && i === market.winningOutcome;

              return (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span
                      className={`font-medium ${isWinner ? "text-green" : ""}`}
                    >
                      {isWinner && "\u2713 "}
                      {option}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-muted text-xs">
                        $
                        {Number(formatUnits(stake, 6)).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                      <span
                        className={`font-mono text-sm font-semibold ${isWinner ? "text-green" : "text-accent"}`}
                      >
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-border overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${isWinner ? "bg-green" : "bg-accent"}`}
                      style={{ width: `${Math.max(percentage, 1)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Prediction Form — only for open markets */}
          {market.status === 0 && !isExpired && (
            <PredictionForm
              marketId={marketId}
              options={options}
              outcomeStakes={outcomeStakes}
              totalPool={market.totalPool}
              onSuccess={refetch}
            />
          )}

          {/* Request Settlement */}
          {market.status === 0 && isExpired && isConnected && (
            <div className="glass rounded-xl p-5 text-center space-y-3">
              <p className="text-sm text-muted">
                This market has passed its deadline and can be settled.
              </p>
              <button
                onClick={handleRequestSettlement}
                disabled={isRequesting}
                className="px-6 py-3 rounded-lg bg-yellow/90 hover:bg-yellow text-black font-semibold text-sm transition-all disabled:opacity-50"
              >
                {isRequesting ? "Requesting..." : "Request Settlement"}
              </button>
              {settlementError && (
                <p className="text-xs text-red">
                  {settlementError.message?.slice(0, 100)}
                </p>
              )}
            </div>
          )}

          {/* Claim Winnings */}
          {market.status === 2 &&
            isConnected &&
            !hasClaimed &&
            userTotalStake > 0n && (
              <div className="glass rounded-xl p-5 text-center space-y-3 glow-accent">
                <p className="text-sm font-medium">
                  This market has been settled. You can claim your winnings!
                </p>
                <button
                  onClick={handleClaim}
                  disabled={isClaiming}
                  className="px-6 py-3 rounded-lg bg-green hover:bg-green/90 text-black font-semibold text-sm transition-all disabled:opacity-50"
                >
                  {isClaiming ? "Claiming..." : "Claim Winnings"}
                </button>
                {claimError && (
                  <p className="text-xs text-red">
                    {claimError.message?.slice(0, 100)}
                  </p>
                )}
              </div>
            )}

          {market.status === 2 && hasClaimed && (
            <div className="glass rounded-xl p-5 text-center">
              <p className="text-sm text-green">
                You have already claimed your winnings from this market.
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="glass rounded-xl p-5 space-y-4 animate-fade-in">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted">
              Market Info
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Total Pool</span>
                <span className="font-mono font-semibold text-cyan">
                  ${poolFormatted}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Deadline</span>
                <span className="font-mono text-xs">
                  {deadlineDate.toLocaleDateString()}{" "}
                  {deadlineDate.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Market ID</span>
                <span className="font-mono text-xs">#{marketId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Type</span>
                <span className="text-xs">
                  {market.marketType === 0 ? "Binary" : "Multi-choice"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Source</span>
                <span className="text-xs font-mono">
                  {market.resolutionSource}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Status</span>
                <MarketStatus status={market.status} />
              </div>
              {market.status === 2 && (
                <div className="flex justify-between">
                  <span className="text-muted">Winner</span>
                  <span className="text-green font-semibold text-xs">
                    {options[market.winningOutcome] ?? "\u2014"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Your Position */}
          {isConnected && userTotalStake > 0n && (
            <div className="glass rounded-xl p-5 space-y-3 animate-fade-in">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted">
                Your Position
              </h3>
              <div className="space-y-2">
                {options.map((option, i) => {
                  const stake = userStakes[i] ?? 0n;
                  if (stake === 0n) return null;
                  return (
                    <div key={i} className="flex justify-between text-sm">
                      <span>{option}</span>
                      <span className="font-mono text-accent">
                        $
                        {Number(formatUnits(stake, 6)).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-border pt-2 flex justify-between text-sm font-semibold">
                <span>Total</span>
                <span className="font-mono text-cyan">
                  $
                  {Number(formatUnits(userTotalStake, 6)).toLocaleString(
                    "en-US",
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                  )}
                </span>
              </div>
            </div>
          )}

          <div className="glass rounded-xl p-5 animate-fade-in">
            <p className="text-xs text-muted leading-relaxed">
              Creator:{" "}
              <span className="font-mono">
                {market.creator.slice(0, 6)}...{market.creator.slice(-4)}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MarketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const marketId = parseInt(id, 10);

  if (isNaN(marketId)) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="glass rounded-xl p-12 text-center">
          <p className="text-muted">Invalid market ID.</p>
        </div>
      </div>
    );
  }

  return <MarketDetailInner marketId={marketId} />;
}
