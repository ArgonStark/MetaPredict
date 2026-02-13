"use client";

import Link from "next/link";
import { useMarkets } from "@/hooks/useMarkets";
import { MarketCard } from "@/components/MarketCard";
import { StatsBar } from "@/components/StatsBar";

export default function HomePage() {
  const { markets, isLoading } = useMarkets();

  const activeMarkets = markets.filter((m) => m.status === 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero */}
      <section className="text-center mb-16 animate-fade-in">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 mb-6">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="text-xs font-medium text-accent">
            Live on Base Sepolia
          </span>
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 leading-tight">
          <span className="text-gradient">MetaPredict</span>
        </h1>
        <p className="text-lg sm:text-xl text-muted max-w-2xl mx-auto mb-8">
          The prediction market for prediction markets. Bet on the future of
          Polymarket, Kalshi, and the platforms shaping onchain forecasting.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/markets"
            className="px-6 py-3 rounded-lg bg-accent hover:bg-accent-dim text-white font-semibold transition-all glow-accent"
          >
            Explore Markets
          </Link>
          <Link
            href="/create"
            className="px-6 py-3 rounded-lg border border-border hover:border-accent/50 text-foreground font-semibold transition-all"
          >
            Create Market
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="mb-12">
        <StatsBar />
      </section>

      {/* How It Works */}
      <section className="mb-16 animate-fade-in">
        <h2 className="text-xl font-bold text-center mb-8">How It Works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
          {[
            {
              emoji: "\uD83C\uDFAF",
              title: "Create Market",
              description:
                "Ask a question about prediction market platforms like Polymarket or Kalshi",
            },
            {
              emoji: "\uD83D\uDCB0",
              title: "Make Predictions",
              description:
                "Bet USDC on your predicted outcome \u2014 Yes/No or multi-choice",
            },
            {
              emoji: "\uD83E\uDD16",
              title: "AI Settlement",
              description:
                "Chainlink CRE fetches data from Polymarket & Kalshi APIs, then AI determines the outcome",
            },
            {
              emoji: "\uD83C\uDFC6",
              title: "Claim Winnings",
              description:
                "Winners automatically receive their share of the pool",
            },
          ].map((step, i) => (
            <div key={i} className="relative flex flex-col items-center">
              {/* Connecting line */}
              {i < 3 && (
                <div className="hidden lg:block absolute top-10 left-[calc(50%+40px)] w-[calc(100%-80px)] h-px bg-gradient-to-r from-accent/40 to-cyan/40" />
              )}
              <div className="glass rounded-xl p-5 text-center w-full hover:glow-accent transition-all group">
                <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-accent/15 border border-accent/30 text-accent text-xs font-bold mb-3">
                  {i + 1}
                </div>
                <div className="text-3xl mb-3">{step.emoji}</div>
                <h3 className="font-semibold text-sm mb-2 group-hover:text-accent transition-colors">
                  {step.title}
                </h3>
                <p className="text-xs text-muted leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Active Markets */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Active Markets</h2>
          <Link
            href="/markets"
            className="text-sm text-accent hover:text-accent-dim transition-colors"
          >
            View all &rarr;
          </Link>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass rounded-xl p-5 animate-pulse">
                <div className="h-4 bg-border rounded w-24 mb-3" />
                <div className="h-5 bg-border rounded w-full mb-2" />
                <div className="h-5 bg-border rounded w-3/4 mb-4" />
                <div className="h-4 bg-border rounded w-32" />
              </div>
            ))}
          </div>
        ) : activeMarkets.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center">
            <p className="text-muted mb-4">No active markets yet.</p>
            <Link
              href="/create"
              className="text-accent hover:text-accent-dim transition-colors"
            >
              Create the first one &rarr;
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeMarkets.slice(0, 6).map((market) => (
              <MarketCard key={market.id} market={market} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
