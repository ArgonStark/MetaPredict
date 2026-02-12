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
  geminiModel: string;
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

// ── Settlement Logic (runs on each DON node) ────────────────────────────────

const buildSettlementRequest =
  (
    question: string,
    options: readonly string[],
    resolutionSource: string,
    apiKey: string,
  ) =>
  (sendRequester: HTTPSendRequester, config: Config): number => {
    // 1. Fetch Polymarket data
    let polymarketData = "[]";
    try {
      const polyResp = sendRequester
        .sendRequest({
          url: "https://gamma-api.polymarket.com/markets?limit=10&active=true",
          method: "GET" as const,
          cacheSettings: { store: true, maxAge: "60s" },
        })
        .result();
      if (ok(polyResp)) {
        polymarketData = new TextDecoder().decode(polyResp.body);
      }
    } catch {
      // Polymarket unavailable — continue with empty data
    }

    // 2. Fetch Kalshi data
    let kalshiData = "[]";
    try {
      const kalshiResp = sendRequester
        .sendRequest({
          url: "https://api.elections.kalshi.com/trade-api/v2/markets?limit=10&status=open",
          method: "GET" as const,
          cacheSettings: { store: true, maxAge: "60s" },
        })
        .result();
      if (ok(kalshiResp)) {
        kalshiData = new TextDecoder().decode(kalshiResp.body);
      }
    } catch {
      // Kalshi unavailable — continue with empty data
    }

    // 3. Build prompt and call Gemini AI
    const optionsList = options.map((o, i) => `  ${i}: ${o}`).join("\n");

    const prompt = `You are a prediction market settlement oracle. Determine the outcome of this market based on available data.

Market Question: ${question}
Resolution Source: ${resolutionSource}

Options:
${optionsList}

Polymarket data (active markets):
${polymarketData.slice(0, 4000)}

Kalshi data (active markets):
${kalshiData.slice(0, 4000)}

Based on the data and your knowledge, determine which outcome is correct.
Respond with ONLY a JSON object: {"outcome": <0-based index>, "confidence": <0-100>, "reasoning": "<brief>"}
For binary markets: 0 = first option (No), 1 = second option (Yes).`;

    const geminiBody = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0, topK: 1, maxOutputTokens: 256 },
      tools: [{ googleSearch: {} }],
    });

    const body = Buffer.from(
      new TextEncoder().encode(geminiBody),
    ).toString("base64");

    const geminiResp = sendRequester
      .sendRequest({
        url: `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent`,
        method: "POST" as const,
        body,
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        cacheSettings: { store: true, maxAge: "60s" },
      })
      .result();

    if (!ok(geminiResp)) {
      throw new Error(`Gemini API error: ${geminiResp.statusCode}`);
    }

    const responseJson = JSON.parse(new TextDecoder().decode(geminiResp.body));
    const text = responseJson?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Malformed Gemini response");

    // 4. Parse outcome
    const match = text.match(/\{[\s\S]*?"outcome"[\s\S]*?\}/);
    if (!match) throw new Error(`Cannot parse Gemini response: ${text}`);

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

  // 5. Fetch prediction market data + call Gemini AI for settlement
  const apiKey = runtime.getSecret({ id: "GEMINI_API_KEY" }).result();
  const httpClient = new HTTPClient();

  const outcome = httpClient
    .sendRequest(
      runtime,
      buildSettlementRequest(
        question,
        options,
        resolutionSource,
        apiKey.value,
      ),
      consensusIdenticalAggregation<number>(),
    )(runtime.config)
    .result();

  runtime.log(`Settlement outcome: ${outcome} (${options[outcome]})`);

  // 6. Encode report: (marketId, outcome)
  const reportData = encodeAbiParameters(
    parseAbiParameters("uint256, uint8"),
    [marketId, outcome],
  );

  // 7. Generate DON-signed report
  const report = runtime
    .report({
      encodedPayload: hexToBase64(reportData),
      encoderName: "evm",
      signingAlgo: "ecdsa",
      hashingAlgo: "keccak256",
    })
    .result();

  // 8. Write report to MetaPredictionMarket contract
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
