import {
  bytesToHex,
  consensusIdenticalAggregation,
  encodeCallMsg,
  EVMClient,
  getNetwork,
  handler,
  hexToBase64,
  HTTPClient,
  type HTTPSendRequester,
  ok,
  Runner,
  type Runtime,
  type EVMLog,
  TxStatus,
} from "@chainlink/cre-sdk";
import {
  decodeFunctionResult,
  encodeAbiParameters,
  encodeFunctionData,
  keccak256,
  parseAbi,
  parseAbiParameters,
  toHex,
  zeroAddress,
} from "viem";

// ── Config ──────────────────────────────────────────────────────────────────

type Config = {
  evms: Array<{
    marketAddress: string;
    chainSelectorName: string;
    gasLimit: string;
  }>;
};

// ── Contract ABIs ───────────────────────────────────────────────────────────

const MARKET_ABI = parseAbi([
  "function markets(uint256) view returns (string, uint8, uint256, string, uint8, uint8, uint256, address)",
  "function getMarketOptions(uint256) view returns (string[])",
]);

const SETTLEMENT_REQUESTED_SIG = "SettlementRequested(uint256)";

// ── Resolution Source Routing ────────────────────────────────────────────────

const POLYMARKET_SOURCES = [
  "polymarket_volume",
  "polymarket_traders",
  "polymarket_kalshi_data",
  "polymarket_markets",
  "all",
];
const KALSHI_SOURCES = [
  "kalshi_markets",
  "kalshi_volume",
  "polymarket_kalshi_data",
  "kalshi_traders",
  "all",
];

// ── Settlement Logic (runs on each DON node) ────────────────────────────────

const buildSettlementRequest =
  (
    question: string,
    options: readonly string[],
    resolutionSource: string,
    apiKey: string,
    needsPolymarketData: boolean,
    needsKalshiData: boolean,
    isAiSearchOnly: boolean,
  ) =>
  (sendRequester: HTTPSendRequester, _config: Config): number => {
    let polyEventsData = "No Polymarket data fetched for this market type.";
    let polyMarketsData = "";
    let kalshiMarketsData = "No Kalshi data fetched for this market type.";
    let kalshiTradesData = "";

    if (needsPolymarketData) {
      // Fetch Polymarket events (top 20 by volume)
      try {
        const resp = sendRequester
          .sendRequest({
            url: "https://gamma-api.polymarket.com/events?active=true&closed=false&limit=20&order=volume&ascending=false",
            method: "GET" as const,
            cacheSettings: { store: true, maxAge: "60s" },
          })
          .result();
        if (ok(resp)) {
          polyEventsData = new TextDecoder().decode(resp.body);
        }
      } catch {
        polyEventsData = "Polymarket events API unavailable";
      }

      // Fetch Polymarket markets (top 30 by volume)
      try {
        const resp = sendRequester
          .sendRequest({
            url: "https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=30&order=volumeNum&ascending=false",
            method: "GET" as const,
            cacheSettings: { store: true, maxAge: "60s" },
          })
          .result();
        if (ok(resp)) {
          polyMarketsData = new TextDecoder().decode(resp.body);
        }
      } catch {
        polyMarketsData = "Polymarket markets API unavailable";
      }
    }

    if (needsKalshiData) {
      // Fetch Kalshi markets (top 50 open)
      try {
        const resp = sendRequester
          .sendRequest({
            url: "https://api.elections.kalshi.com/trade-api/v2/markets?status=open&limit=50",
            method: "GET" as const,
            cacheSettings: { store: true, maxAge: "60s" },
          })
          .result();
        if (ok(resp)) {
          kalshiMarketsData = new TextDecoder().decode(resp.body);
        }
      } catch {
        kalshiMarketsData = "Kalshi markets API unavailable";
      }

      // Fetch Kalshi recent trades
      try {
        const resp = sendRequester
          .sendRequest({
            url: "https://api.elections.kalshi.com/trade-api/v2/trades?limit=30",
            method: "GET" as const,
            cacheSettings: { store: true, maxAge: "60s" },
          })
          .result();
        if (ok(resp)) {
          kalshiTradesData = new TextDecoder().decode(resp.body);
        }
      } catch {
        kalshiTradesData = "Kalshi trades API unavailable";
      }
    }

    // Build prompt based on resolution type
    const optionsList = options.map((o, i) => `${i} = ${o}`).join(", ");
    let aiPrompt: string;
    let messages: Array<{ role: string; content: string }>;

    if (isAiSearchOnly) {
      aiPrompt = `You are a prediction market settlement oracle. You must determine the outcome for the following market by searching the web for the latest news and announcements.

Market Question: ${question}
Market Options: ${optionsList}

IMPORTANT: This question is about the prediction market industry (tokens, airdrops, launches, partnerships, etc.). Search the web for:
- Official announcements from the platforms mentioned
- Recent news articles about the topic
- Twitter/X posts from official accounts
- Blog posts or press releases

Based on your web search findings, determine the most likely outcome.
Respond with ONLY a JSON object: {"outcome": <0-based index>, "confidence": <0-100>, "reasoning": "<brief>"}
${optionsList}

If there is no clear evidence yet (e.g., no announcement has been made), choose the option that represents "No" or the status quo.`;

      messages = [
        {
          role: "system",
          content:
            "You are a prediction market settlement oracle. Search the web thoroughly before answering. Use the most recent and reliable sources available.",
        },
        { role: "user", content: aiPrompt },
      ];
    } else {
      aiPrompt = `You are a prediction market settlement oracle. Determine the outcome for the following market.

Market Question: ${question}
Market Options: ${optionsList}
Resolution Source: ${resolutionSource}

=== POLYMARKET DATA (Top Events by Volume) ===
${polyEventsData.slice(0, 3000)}

=== POLYMARKET DATA (Top Markets by Volume) ===
${polyMarketsData.slice(0, 3000)}

=== KALSHI DATA (Open Markets) ===
${kalshiMarketsData.slice(0, 3000)}

=== KALSHI DATA (Recent Trades) ===
${kalshiTradesData.slice(0, 3000)}

Based on ALL the data above, determine the outcome.
Respond with ONLY a JSON object: {"outcome": <0-based index>, "confidence": <0-100>, "reasoning": "<brief>"}
${optionsList}`;

      messages = [{ role: "user", content: aiPrompt }];
    }

    // Call OpenRouter AI
    const requestBody = JSON.stringify({
      model: "google/gemini-2.0-flash-001",
      messages,
      temperature: 0,
      max_tokens: 256,
    });

    const body = Buffer.from(
      new TextEncoder().encode(requestBody),
    ).toString("base64");

    const aiResp = sendRequester
      .sendRequest({
        url: "https://openrouter.ai/api/v1/chat/completions",
        method: "POST" as const,
        body,
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + apiKey,
        },
        cacheSettings: { store: true, maxAge: "60s" },
      })
      .result();

    const respBody = new TextDecoder().decode(aiResp.body);

    if (!ok(aiResp)) {
      throw new Error(
        `OpenRouter API error: ${aiResp.statusCode} - ${respBody}`,
      );
    }

    const responseJson = JSON.parse(respBody);
    const text = responseJson?.choices?.[0]?.message?.content;
    if (!text) throw new Error("Malformed OpenRouter response");

    // Parse outcome
    const match = text.match(/\{[\s\S]*?"outcome"[\s\S]*?\}/);
    if (!match) throw new Error(`Cannot parse AI response: ${text}`);

    const parsed = JSON.parse(match[0]) as { outcome: number };
    if (parsed.outcome < 0 || parsed.outcome >= options.length) {
      throw new Error(
        `Invalid outcome ${parsed.outcome} for ${options.length} options`,
      );
    }

    return parsed.outcome;
  };

// ── Log Trigger Callback ────────────────────────────────────────────────────

const onSettlementRequested = (
  runtime: Runtime<Config>,
  log: EVMLog,
): string => {
  const evmConfig = runtime.config.evms[0];

  // 1. Parse marketId from indexed event parameter
  const marketId = BigInt(bytesToHex(log.topics[1]));
  runtime.log(`Settlement requested for market ${marketId}`);

  // 2. Resolve network and create EVM client
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: evmConfig.chainSelectorName,
    isTestnet: true,
  });
  if (!network)
    throw new Error(`Network not found: ${evmConfig.chainSelectorName}`);
  const evmClient = new EVMClient(network.chainSelector.selector);

  // 3. Read market data from contract
  const marketResult = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({
        from: zeroAddress,
        to: evmConfig.marketAddress as `0x${string}`,
        data: encodeFunctionData({
          abi: MARKET_ABI,
          functionName: "markets",
          args: [marketId],
        }),
      }),
    })
    .result();

  const marketData = decodeFunctionResult({
    abi: MARKET_ABI,
    functionName: "markets",
    data: bytesToHex(marketResult.data),
  });
  const question = (marketData as any)[0] as string;
  const resolutionSource = (marketData as any)[3] as string;

  // 4. Read market options
  const optionsResult = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({
        from: zeroAddress,
        to: evmConfig.marketAddress as `0x${string}`,
        data: encodeFunctionData({
          abi: MARKET_ABI,
          functionName: "getMarketOptions",
          args: [marketId],
        }),
      }),
    })
    .result();

  const options = decodeFunctionResult({
    abi: MARKET_ABI,
    functionName: "getMarketOptions",
    data: bytesToHex(optionsResult.data),
  }) as readonly string[];

  runtime.log(`Market: "${question}" | Options: [${options.join(", ")}]`);

  // 5. Route based on resolution source
  const needsPolymarketData = POLYMARKET_SOURCES.includes(resolutionSource);
  const needsKalshiData = KALSHI_SOURCES.includes(resolutionSource);
  const isAiSearchOnly = resolutionSource === "ai_search";

  runtime.log(
    `Resolution source: ${resolutionSource} | Route: ${isAiSearchOnly ? "AI_SEARCH" : `API_DATA (poly=${needsPolymarketData}, kalshi=${needsKalshiData})`}`,
  );

  // 6. Fetch data + call AI for settlement
  const apiKey = runtime.getSecret({ id: "OPENROUTER_API_KEY" }).result();
  const httpClient = new HTTPClient();

  const outcome = httpClient
    .sendRequest(
      runtime,
      buildSettlementRequest(
        question,
        options,
        resolutionSource,
        apiKey.value,
        needsPolymarketData,
        needsKalshiData,
        isAiSearchOnly,
      ),
      consensusIdenticalAggregation<number>(),
    )(runtime.config)
    .result();

  runtime.log(`Settlement outcome: ${outcome} (${options[outcome]})`);

  // 7. Encode report: (marketId, outcome)
  const reportData = encodeAbiParameters(
    parseAbiParameters("uint256, uint8"),
    [marketId, outcome],
  );

  // 8. Generate DON-signed report
  const report = runtime
    .report({
      encodedPayload: hexToBase64(reportData),
      encoderName: "evm",
      signingAlgo: "ecdsa",
      hashingAlgo: "keccak256",
    })
    .result();

  // 9. Write report to MetaPredictionMarket contract
  const writeResult = evmClient
    .writeReport(runtime, {
      receiver: evmConfig.marketAddress,
      report,
      gasConfig: { gasLimit: evmConfig.gasLimit },
    })
    .result();

  if (writeResult.txStatus !== TxStatus.SUCCESS) {
    throw new Error(
      `Write failed: ${writeResult.errorMessage || writeResult.txStatus}`,
    );
  }

  const txHash = bytesToHex(writeResult.txHash || new Uint8Array(32));
  runtime.log(
    `Market ${marketId} settled → outcome ${outcome}. Tx: ${txHash}`,
  );

  return `settled:${marketId}:${outcome}`;
};

// ── Workflow Init ───────────────────────────────────────────────────────────

const initWorkflow = (config: Config) => {
  const evmConfig = config.evms[0];

  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: evmConfig.chainSelectorName,
    isTestnet: true,
  });
  if (!network)
    throw new Error(`Network not found: ${evmConfig.chainSelectorName}`);

  const evmClient = new EVMClient(network.chainSelector.selector);
  const eventHash = keccak256(toHex(SETTLEMENT_REQUESTED_SIG));

  const logTrigger = evmClient.logTrigger({
    addresses: [evmConfig.marketAddress],
    topics: [{ values: [eventHash] }],
    confidence: "CONFIDENCE_LEVEL_FINALIZED",
  });

  return [handler(logTrigger, onSettlementRequested)];
};

// ── Entry Point ─────────────────────────────────────────────────────────────

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}
main();
