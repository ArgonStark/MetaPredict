export function MarketStatus({ status }: { status: number }) {
  const config = {
    0: { label: "Active", color: "bg-green", textColor: "text-green" },
    1: {
      label: "Awaiting Settlement",
      color: "bg-yellow",
      textColor: "text-yellow",
    },
    2: { label: "Settled", color: "bg-cyan", textColor: "text-cyan" },
  }[status] ?? { label: "Unknown", color: "bg-muted", textColor: "text-muted" };

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${config.color}`} />
      <span className={`text-xs font-medium ${config.textColor}`}>
        {config.label}
      </span>
    </span>
  );
}

export function ResolutionSourceBadge({ source }: { source: string }) {
  const labels: Record<string, string> = {
    ai_search: "AI Search",
    polymarket_volume: "Polymarket Volume",
    polymarket_traders: "Polymarket Traders",
    kalshi_markets: "Kalshi Markets",
    polymarket_kalshi_data: "Polymarket + Kalshi",
  };

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-accent/10 text-accent border border-accent/20">
      {labels[source] ?? source}
    </span>
  );
}

export function MarketTypeBadge({ type }: { type: number }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-cyan/10 text-cyan border border-cyan/20">
      {type === 0 ? "Binary" : "Multi-choice"}
    </span>
  );
}
