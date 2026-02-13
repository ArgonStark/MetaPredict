"use client";

import { useMarkets, MarketData } from "@/hooks/useMarkets";
import { formatUnits } from "viem";

export function StatsBar() {
  const { markets, marketCount, isLoading } = useMarkets();

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="glass rounded-xl p-4 animate-pulse">
            <div className="h-4 bg-border rounded w-20 mb-2" />
            <div className="h-8 bg-border rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  const totalVolume = markets.reduce(
    (sum: bigint, m: MarketData) => sum + m.totalPool,
    0n
  );
  const settled = markets.filter((m: MarketData) => m.status === 2).length;

  const stats = [
    { label: "Total Markets", value: marketCount.toString() },
    {
      label: "Total Volume",
      value: `$${Number(formatUnits(totalVolume, 6)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    },
    { label: "Settled", value: settled.toString() },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="glass rounded-xl p-4 text-center transition-all hover:glow-accent"
        >
          <p className="text-xs text-muted uppercase tracking-wider mb-1">
            {stat.label}
          </p>
          <p className="text-2xl font-bold font-mono text-gradient">
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}
