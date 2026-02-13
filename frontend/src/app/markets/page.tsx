"use client";

import { useState, useMemo } from "react";
import { useMarkets, MarketData } from "@/hooks/useMarkets";
import { MarketCard } from "@/components/MarketCard";

type Filter = "all" | "active" | "settled" | "pending";
type Sort = "newest" | "pool" | "ending";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "pending", label: "Awaiting Settlement" },
  { value: "settled", label: "Settled" },
];

const SORTS: { value: Sort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "pool", label: "Most Pool" },
  { value: "ending", label: "Ending Soon" },
];

export default function MarketsPage() {
  const { markets, isLoading } = useMarkets();
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("newest");

  const filtered = useMemo(() => {
    let result: MarketData[] = [...markets];

    if (filter === "active") result = result.filter((m) => m.status === 0);
    else if (filter === "pending") result = result.filter((m) => m.status === 1);
    else if (filter === "settled") result = result.filter((m) => m.status === 2);

    if (sort === "newest") result.sort((a, b) => b.id - a.id);
    else if (sort === "pool")
      result.sort((a, b) => Number(b.totalPool - a.totalPool));
    else if (sort === "ending")
      result.sort((a, b) => Number(a.deadline - b.deadline));

    return result;
  }, [markets, filter, sort]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold">Markets</h1>

        <div className="flex items-center gap-3">
          {/* Filters */}
          <div className="flex items-center gap-1 bg-card rounded-lg p-1 border border-border">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filter === f.value
                    ? "bg-accent/15 text-accent"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="bg-card border border-border rounded-lg px-3 py-1.5 text-xs font-medium text-muted focus:outline-none focus:border-accent [color-scheme:dark]"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass rounded-xl p-5 animate-pulse">
              <div className="h-4 bg-border rounded w-24 mb-3" />
              <div className="h-5 bg-border rounded w-full mb-2" />
              <div className="h-5 bg-border rounded w-3/4 mb-4" />
              <div className="h-4 bg-border rounded w-32" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <p className="text-muted">No markets found with this filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      )}
    </div>
  );
}
