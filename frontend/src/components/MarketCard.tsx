"use client";

import Link from "next/link";
import { formatUnits } from "viem";
import { MarketData } from "@/hooks/useMarkets";
import {
  MarketStatus,
  MarketTypeBadge,
  ResolutionSourceBadge,
} from "./MarketStatus";

function Countdown({ deadline }: { deadline: bigint }) {
  const now = BigInt(Math.floor(Date.now() / 1000));
  const diff = deadline - now;

  if (diff <= 0n) return <span className="text-muted text-xs">Expired</span>;

  const seconds = Number(diff);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0)
    return (
      <span className="font-mono text-xs text-foreground">
        {days}d {hours}h
      </span>
    );
  if (hours > 0)
    return (
      <span className="font-mono text-xs text-yellow">
        {hours}h {minutes}m
      </span>
    );
  return (
    <span className="font-mono text-xs text-red">{minutes}m</span>
  );
}

export function MarketCard({ market }: { market: MarketData }) {
  const poolFormatted = Number(
    formatUnits(market.totalPool, 6)
  ).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <Link href={`/market/${market.id}`}>
      <div className="glass rounded-xl p-5 transition-all duration-200 hover:glow-accent hover:border-border-glow cursor-pointer animate-fade-in group">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <MarketTypeBadge type={market.marketType} />
            <ResolutionSourceBadge source={market.resolutionSource} />
          </div>
          <MarketStatus status={market.status} />
        </div>

        <h3 className="text-base font-semibold mb-4 leading-snug group-hover:text-accent transition-colors line-clamp-2">
          {market.question}
        </h3>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1">
            <span className="text-muted">Pool:</span>
            <span className="font-mono font-semibold text-cyan">
              ${poolFormatted}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted">Ends:</span>
            <Countdown deadline={market.deadline} />
          </div>
        </div>
      </div>
    </Link>
  );
}
