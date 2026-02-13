"use client";

import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { MARKET_ABI, CONTRACTS } from "@/config/contracts";
import { baseSepolia } from "wagmi/chains";

const RESOLUTION_SOURCES = [
  {
    value: "ai_search",
    label: "AI Web Search",
    description: "Resolves via AI-powered web search — best for news & announcement questions",
  },
  {
    value: "polymarket_volume",
    label: "Polymarket Volume",
    description: "Resolves using Polymarket trading volume data",
  },
  {
    value: "polymarket_traders",
    label: "Polymarket Traders",
    description: "Resolves using Polymarket active trader counts",
  },
  {
    value: "kalshi_markets",
    label: "Kalshi Markets",
    description: "Resolves using Kalshi market data",
  },
  {
    value: "polymarket_kalshi_data",
    label: "Polymarket + Kalshi Data",
    description: "Resolves using combined data from both Polymarket and Kalshi",
  },
];

const contractAddress = CONTRACTS.baseSepolia.metaPredictionMarket;
const chainId = baseSepolia.id;

export function CreateMarketForm() {
  const { isConnected } = useAccount();
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [marketType, setMarketType] = useState<"binary" | "multi">("binary");
  const [options, setOptions] = useState(["", ""]);
  const [deadline, setDeadline] = useState("");
  const [resolutionSource, setResolutionSource] = useState("ai_search");

  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const addOption = () => {
    if (options.length < 6) setOptions([...options, ""]);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question || !deadline) return;

    const deadlineTimestamp = BigInt(
      Math.floor(new Date(deadline).getTime() / 1000)
    );

    if (marketType === "binary") {
      writeContract({
        address: contractAddress,
        abi: MARKET_ABI,
        functionName: "createBinaryMarket",
        args: [question, deadlineTimestamp, resolutionSource],
        chainId,
      });
    } else {
      const validOptions = options.filter((o) => o.trim() !== "");
      if (validOptions.length < 2) return;
      writeContract({
        address: contractAddress,
        abi: MARKET_ABI,
        functionName: "createMultiChoiceMarket",
        args: [question, validOptions, deadlineTimestamp, resolutionSource],
        chainId,
      });
    }
  };

  if (isSuccess) {
    return (
      <div className="glass rounded-xl p-8 text-center space-y-4">
        <div className="text-4xl">&#x2705;</div>
        <h3 className="text-xl font-bold">Market Created!</h3>
        <p className="text-muted text-sm">
          Your market has been successfully created on-chain.
        </p>
        <button
          onClick={() => router.push("/markets")}
          className="px-6 py-2 rounded-lg bg-accent hover:bg-accent-dim text-white font-medium transition-colors"
        >
          View Markets
        </button>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <p className="text-muted">Connect your wallet to create a market</p>
      </div>
    );
  }

  // Minimum deadline: 1 hour from now
  const minDeadline = new Date(Date.now() + 3600000)
    .toISOString()
    .slice(0, 16);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Question */}
      <div>
        <label className="block text-sm font-medium text-muted mb-2">
          Question
        </label>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Will Polymarket launch their own token before 2027?"
          required
          className="w-full bg-card border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 placeholder-muted/50"
        />
      </div>

      {/* Market Type */}
      <div>
        <label className="block text-sm font-medium text-muted mb-2">
          Market Type
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMarketType("binary")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all ${
              marketType === "binary"
                ? "border-accent bg-accent/10 text-accent"
                : "border-border bg-card text-muted hover:border-border-glow"
            }`}
          >
            Binary (Yes / No)
          </button>
          <button
            type="button"
            onClick={() => setMarketType("multi")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all ${
              marketType === "multi"
                ? "border-accent bg-accent/10 text-accent"
                : "border-border bg-card text-muted hover:border-border-glow"
            }`}
          >
            Multi-choice
          </button>
        </div>
      </div>

      {/* Multi-choice Options */}
      {marketType === "multi" && (
        <div>
          <label className="block text-sm font-medium text-muted mb-2">
            Options
          </label>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => {
                    const next = [...options];
                    next[i] = e.target.value;
                    setOptions(next);
                  }}
                  placeholder={`Option ${i + 1}`}
                  className="flex-1 bg-card border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 placeholder-muted/50"
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(i)}
                    className="px-3 py-2.5 rounded-lg border border-border text-muted hover:text-red hover:border-red/30 transition-colors"
                  >
                    &#x2715;
                  </button>
                )}
              </div>
            ))}
          </div>
          {options.length < 6 && (
            <button
              type="button"
              onClick={addOption}
              className="mt-2 text-sm text-accent hover:text-accent-dim transition-colors"
            >
              + Add Option
            </button>
          )}
        </div>
      )}

      {/* Deadline */}
      <div>
        <label className="block text-sm font-medium text-muted mb-2">
          Deadline
        </label>
        <input
          type="datetime-local"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          min={minDeadline}
          required
          className="w-full bg-card border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 [color-scheme:dark]"
        />
      </div>

      {/* Resolution Source */}
      <div>
        <label className="block text-sm font-medium text-muted mb-2">
          Resolution Source
        </label>
        <div className="space-y-2">
          {RESOLUTION_SOURCES.map((src) => (
            <button
              key={src.value}
              type="button"
              onClick={() => setResolutionSource(src.value)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                resolutionSource === src.value
                  ? "border-accent bg-accent/10"
                  : "border-border bg-card hover:border-border-glow"
              }`}
            >
              <p
                className={`text-sm font-medium ${resolutionSource === src.value ? "text-accent" : "text-foreground"}`}
              >
                {src.label}
              </p>
              <p className="text-xs text-muted mt-0.5">{src.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="glass rounded-xl p-4">
        <p className="text-xs text-muted uppercase tracking-wider mb-2">
          Preview
        </p>
        <p className="font-semibold text-sm mb-2">
          {question || "Your question will appear here..."}
        </p>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2 py-0.5 rounded bg-cyan/10 text-cyan border border-cyan/20">
            {marketType === "binary" ? "Binary" : "Multi-choice"}
          </span>
          <span className="px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/20 font-mono">
            {RESOLUTION_SOURCES.find((s) => s.value === resolutionSource)
              ?.label ?? resolutionSource}
          </span>
          {deadline && (
            <span className="text-muted">
              Ends: {new Date(deadline).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending || isConfirming || !question || !deadline}
        className="w-full py-3.5 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-accent hover:bg-accent-dim text-white glow-accent"
      >
        {isPending
          ? "Confirm in Wallet..."
          : isConfirming
            ? "Creating Market..."
            : "Create Market"}
      </button>

      {error && (
        <p className="text-xs text-red text-center">
          {error.message?.slice(0, 120)}
        </p>
      )}
    </form>
  );
}
