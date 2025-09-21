import { ChatPromptTemplate } from "@langchain/core/prompts";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { ChatGroq } from "@langchain/groq";
import { Client, PrivateKey } from "@hashgraph/sdk";
import { HederaLangchainToolkit, coreQueriesPlugin } from "hedera-agent-kit";
import { allTools } from "@/lib/ai/tools";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function createLLM() {
  // Prefer explicit key if provided; ChatGroq will also read GROQ_API_KEY from env
  const apiKey = process.env.GROQ_API_KEY;
  return new ChatGroq({
    model: "llama-3.1-8b-instant", // Fast and supports tool calling
    temperature: 0.1, // Lower temperature for more consistent tool calling
    ...(apiKey ? { apiKey } : {}),
  });
}

function createHederaClient() {
  const accountId = process.env.HEDERA_ACCOUNT_ID;
  const privateKey = process.env.HEDERA_PRIVATE_KEY;
  const network = (process.env.HEDERA_NETWORK || "testnet").toLowerCase();

  if (!accountId || !privateKey) {
    throw new Error(
      "Missing HEDERA_ACCOUNT_ID or HEDERA_PRIVATE_KEY in environment variables."
    );
  }

  let client: Client;
  if (network === "mainnet") client = Client.forMainnet();
  else if (network === "previewnet") client = Client.forPreviewnet();
  else client = Client.forTestnet();

  client.setOperator(accountId, PrivateKey.fromStringECDSA(privateKey));
  return client;
}

// App tools are now imported from the comprehensive tools module

export async function runHederaAgent(messages: ChatMessage[]) {
  const llm = createLLM();
  const client = createHederaClient();

  const hederaAgentToolkit = new HederaLangchainToolkit({
    client,
    configuration: {
      plugins: [coreQueriesPlugin],
    },
  });

  const tools = [
    ...hederaAgentToolkit.getTools(),
    ...allTools,
  ];
  
  console.log(`🔧 Agent initialized with ${tools.length} tools:`, tools.map(t => t.name));

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      "You are a helpful AI assistant for a privacy-focused DeFi application. You MUST use the available tools to perform actions - never give generic advice when a tool can do the actual work.\n\n" +
      "For deposits: Use deposit_tokens tool\n" +
      "For swaps: Use get_swap_quote or execute_swap tools\n" +
      "For withdrawals: Use check_withdraw_compliance, generate_withdraw_proof, or execute_withdraw tools\n" +
      "For balances: Use get_encrypted_balance or get_public_balance tools\n" +
      "For registration: Use check_registration_status or register_user tools\n" +
      "For Hedera operations: Use the Hedera tools\n\n" +
      "ALWAYS call the appropriate tool instead of just describing what you would do. The user expects real actions, not explanations.",
    ],
    ["placeholder", "{chat_history}"],
    ["human", "{input}"],
    ["placeholder", "{agent_scratchpad}"],
  ]);

  const agent = createToolCallingAgent({ llm, tools, prompt });
  const agentExecutor = new AgentExecutor({ agent, tools, maxIterations: 5, returnIntermediateSteps: false });

  // Prepare chat history string for context (excluding the latest user message)
  const last = messages[messages.length - 1];
  const history = messages.slice(0, -1)
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");

  const input = last?.content ?? "Hello";

  console.log(`🤖 Agent processing input: "${input}"`);

  // Fast intent router for common actions to avoid tool-selection stalls
  const fastIntent = (() => {
    const lower = input.toLowerCase();
    // Check registration
    if (
      lower.includes("check registration") ||
      lower.includes("registration status") ||
      lower.includes("check my registration") ||
      /\b(am i|am i'm)?\s*registered\b/.test(lower) ||
      /\b(check|see|view)\s+(if\s+)?(i'm|i am|my)\s+registered\b/.test(lower)
    ) {
      return { intent: "check_registration", params: {} };
    }
    // Balances
    if (/encrypted\s+balance/.test(lower)) {
      return { intent: "decrypt_balance", params: {} };
    }
    if (
      /\b(balance|what'?s my balance|whats my balance|my balance)\b/.test(lower) ||
      /\b(avax|eth|usdc|dai)\s+balance\b/.test(lower)
    ) {
      // Try to extract token symbol if provided
      const tokenMatch = lower.match(/\b(avax|eth|usdc|dai|eusdc|edai|eeth)\b/);
      const token = tokenMatch ? tokenMatch[1] : undefined;
      return { intent: "get_public_balance", params: { token } };
    }
    // Swap e.g., "swap 100 eUSDC to eDAI"
    const swapMatch = lower.match(/swap\s+(\d+\.?\d*)\s+([a-z0-9]+)\s+(?:to|->)\s+([a-z0-9]+)/i);
    if (swapMatch) {
      return {
        intent: "get_swap_quote",
        params: { amount: swapMatch[1], fromToken: swapMatch[2], toToken: swapMatch[3], slippage: 0.5 },
      };
    }
    // Withdraw e.g., "withdraw 0.5 eETH"
    const wdMatch = lower.match(/withdraw\s+(\d+\.?\d*)\s+([a-z0-9]+)/i);
    if (wdMatch) {
      return { intent: "check_withdraw_compliance", params: { amount: wdMatch[1], token: wdMatch[2] } };
    }
    // Dashboard
    if (/\b(show|open)?\s*dashboard\b/.test(lower)) {
      return { intent: "show_dashboard", params: { showBalances: true } };
    }
    // Compliance status
    if (/\b(compliance status|am i compliant|check compliance)\b/.test(lower)) {
      return { intent: "check_compliance", params: {} };
    }
    // KYC status
    if (/\b(kyc status|am i verified|check kyc)\b/.test(lower)) {
      return { intent: "check_kyc_status", params: {} };
    }
    // Supported tokens
    if (/\b(supported tokens|list tokens|what can i trade)\b/.test(lower)) {
      return { intent: "get_supported_tokens", params: {} };
    }
    // Transaction history
    if (/\b(history|transactions|recent activity)\b/.test(lower)) {
      return { intent: "get_transaction_history", params: { type: "all", limit: 10 } };
    }
    // KYC initiation phrases
    if (
      lower.includes("register kyc") ||
      lower.includes("start kyc") ||
      lower.includes("kyc") ||
      lower.includes("verify identity")
    ) {
      return { intent: "initiate_kyc", params: {} };
    }
    // Register user (avoid matching 'registration status'); prefer KYC first
    if ((lower.includes("register user") || lower.includes("register me") || /^register\b/.test(lower)) &&
        !lower.includes("status")) {
      return { intent: "initiate_kyc", params: {} };
    }
    // Deposit patterns e.g., "deposit 0.1 avax"
    const depMatch = lower.match(/deposit\s+(\d+\.?\d*)\s*(avax)?/);
    if (depMatch) {
      return { intent: "deposit", params: { token: "0x0000000000000000000000000000000000000000", amount: depMatch[1], decimals: 18, denomination: 0 } };
    }
    return null;
  })();

  if (fastIntent) {
    const output = JSON.stringify({ intent: fastIntent.intent, params: fastIntent.params, success: true, message: "Routed by fast intent" });
    console.log("⚡ Fast-intent routed output:", output);
    return { output, raw: { output } } as any;
  }

  // Run the agent with a timeout to prevent hanging
  const timeoutMs = 30000;
  const agentPromise = agentExecutor.invoke({ input, chat_history: history });
  const timer = new Promise((_, reject) => setTimeout(() => reject(new Error("Agent timed out")), timeoutMs));

  try {
    const result = await Promise.race([agentPromise, timer]) as any;
    console.log(`🤖 Agent result:`, result);
    const output = result?.output ?? JSON.stringify(result);
    console.log(`🤖 Agent output: "${output}"`);
    return { output, raw: result };
  } catch (err: any) {
    console.error("⚠️ Agent error or timeout:", err?.message || err);
    const fallback = {
      success: false,
      message: `Agent failed: ${err?.message || err}. Please try a more direct instruction like 'deposit 0.1 AVAX' or 'check registration'.`,
    };
    return { output: JSON.stringify(fallback), raw: fallback } as any;
  }
}
