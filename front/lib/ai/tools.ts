import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { parseUnits, formatUnits } from "viem";

// Types for tool responses
export type ToolResponse = {
  success: boolean;
  message: string;
  data?: any;
  intent?: string;
  params?: any;
};

// Helper to create consistent tool responses
const createResponse = (success: boolean, message: string, data?: any, intent?: string, params?: any): string => {
  if (intent && params) {
    // Return intent format for execution
    return JSON.stringify({ intent, params, success, message, data });
  }
  // Return regular response format
  return JSON.stringify({ success, message, data });
};

// ========================================
// DASHBOARD TOOLS
// ========================================

export const getDashboardData = new DynamicStructuredTool({
  name: "get_dashboard_data",
  description: "Get user's dashboard overview including encrypted balances, compliance status, and portfolio summary",
  schema: z.any(),
  func: async (input: any) => {
    const showBalances = typeof input?.showBalances === "boolean" ? input.showBalances : true;
    return createResponse(true, "Dashboard data retrieved", undefined, "show_dashboard", { showBalances });
  },
});

export const getEncryptedBalance = new DynamicStructuredTool({
  name: "get_encrypted_balance",
  description: "Retrieve and decrypt user's encrypted token balances from the shielded vault",
  schema: z.any(),
  func: async (input: any) => {
    const token = typeof input?.token === "string" ? input.token : undefined;
    return createResponse(true, "Encrypted balance retrieved", undefined, "decrypt_balance", { token });
  },
});

export const checkComplianceStatus = new DynamicStructuredTool({
  name: "check_compliance_status",
  description: "Check user's compliance status and zk-attestation readiness for large transactions",
  schema: z.any(),
  func: async (_input: any) => {
    return createResponse(true, "Compliance status checked", undefined, "check_compliance", {});
  },
});

// ========================================
// DEPOSIT TOOLS
// ========================================

export const checkRegistrationStatus = new DynamicStructuredTool({
  name: "check_registration_status",
  description: "Check if user is registered in the system and can make deposits",
  schema: z.any(),
  func: async (_input: any) => {
    return createResponse(true, "Registration status checked", undefined, "check_registration", {});
  },
});

export const registerUser = new DynamicStructuredTool({
  name: "register_user",
  description: "Register user in the system to enable deposits and other operations",
  schema: z.any(),
  func: async (input: any) => {
    let generateProof = true;
    if (typeof input?.generateProof === "boolean") generateProof = input.generateProof;
    if (typeof input?.generateProof === "string") generateProof = input.generateProof.toLowerCase() === "true";
    return createResponse(true, "User registration initiated", undefined, "register_user", { generateProof });
  },
});

export const depositTokens = new DynamicStructuredTool({
  name: "deposit_tokens",
  description: "Deposit tokens into the shielded vault with Poseidon encryption",
  schema: z.any().describe("Parameters for depositing tokens - accepts flexible input"),
  func: async (input: any) => {
    console.log("🔧 deposit_tokens called with input:", input);
    
    // Handle both object and direct parameters
    const params = typeof input === 'object' && input !== null ? input : {};
    const { token, amount, decimals = 18, denomination = 0 } = params;
    
    // Extract amount from various possible formats
    let amountStr = '';
    if (amount !== undefined) {
      amountStr = typeof amount === 'number' ? amount.toString() : String(amount);
    } else if (params.value) {
      amountStr = typeof params.value === 'number' ? params.value.toString() : String(params.value);
    } else if (typeof input === 'string') {
      // If input is just a string, try to extract amount
      const match = input.match(/(\d+\.?\d*)/);
      if (match) amountStr = match[1];
    }
    
    if (!amountStr) {
      return createResponse(false, "Missing required parameter: amount");
    }
    
    // Default to native ETH if no token specified
    const tokenAddress = token || "0x0000000000000000000000000000000000000000";
    
    console.log("🔧 deposit_tokens processed:", { tokenAddress, amountStr, decimals, denomination });
    
    return createResponse(true, `Deposit of ${amountStr} ${tokenAddress === "0x0000000000000000000000000000000000000000" ? "ETH" : "tokens"} initiated`, undefined, "deposit", { token: tokenAddress, amount: amountStr, decimals, denomination });
  },
});

export const getPublicBalance = new DynamicStructuredTool({
  name: "get_public_balance",
  description: "Get user's public wallet balance for a specific token or native currency",
  schema: z.any(),
  func: async (input: any) => {
    const token = typeof input?.token === "string" ? input.token : undefined;
    return createResponse(true, "Public balance retrieved", undefined, "get_public_balance", { token });
  },
});

// ========================================
// SWAP TOOLS
// ========================================

export const getSwapQuote = new DynamicStructuredTool({
  name: "get_swap_quote",
  description: "Get a quote for swapping between two tokens with current pricing",
  schema: z.any(),
  func: async (input: any) => {
    const fromToken = typeof input?.fromToken === "string" ? input.fromToken : undefined;
    const toToken = typeof input?.toToken === "string" ? input.toToken : undefined;
    const slippage = input?.slippage != null ? Number(input.slippage) : 0.5;
    const amountStr = input?.amount != null ? String(input.amount) : "";
    return createResponse(true, `Quote generated for ${amountStr} ${fromToken} to ${toToken}`, undefined, "get_swap_quote", { fromToken, toToken, amount: amountStr, slippage });
  },
});

export const executeSwap = new DynamicStructuredTool({
  name: "execute_swap",
  description: "Execute a private token swap with zk-proof generation",
  schema: z.any(),
  func: async (input: any) => {
    const fromToken = typeof input?.fromToken === "string" ? input.fromToken : undefined;
    const toToken = typeof input?.toToken === "string" ? input.toToken : undefined;
    const amountStr = input?.amount != null ? String(input.amount) : "";
    const minOutStr = input?.minAmountOut != null ? String(input.minAmountOut) : undefined;
    const slippage = input?.slippage != null ? Number(input.slippage) : 0.5;
    const generateProof = input?.generateProof != null ? (String(input.generateProof).toLowerCase() === "true" ? true : Boolean(input.generateProof)) : true;
    return createResponse(true, `Private swap initiated: ${amountStr} ${fromToken} → ${toToken}`, undefined, "execute_swap", { fromToken, toToken, amount: amountStr, minAmountOut: minOutStr, slippage, generateProof });
  },
});

export const getSupportedTokens = new DynamicStructuredTool({
  name: "get_supported_tokens",
  description: "Get list of tokens supported for swapping and their current balances",
  schema: z.object({}),
  func: async () => {
    return createResponse(true, "Supported tokens retrieved", undefined, "get_supported_tokens", {});
  },
});

// ========================================
// WITHDRAW TOOLS
// ========================================

export const checkWithdrawCompliance = new DynamicStructuredTool({
  name: "check_withdraw_compliance",
  description: "Check if a withdrawal amount requires compliance verification (>$5000 threshold)",
  schema: z.any(),
  func: async (input: any) => {
    const token = typeof input?.token === "string" ? input.token : undefined;
    const amountStr = input?.amount != null ? String(input.amount) : "";
    return createResponse(true, `Compliance check completed for ${amountStr} ${token}`, undefined, "check_withdraw_compliance", { token, amount: amountStr });
  },
});

export const generateWithdrawProof = new DynamicStructuredTool({
  name: "generate_withdraw_proof",
  description: "Generate zk-proof for withdrawal transaction",
  schema: z.any(),
  func: async (input: any) => {
    const token = typeof input?.token === "string" ? input.token : undefined;
    const amountStr = input?.amount != null ? String(input.amount) : "";
    const recipient = typeof input?.recipient === "string" ? input.recipient : undefined;
    if (recipient && !recipient.startsWith("0x")) {
      return createResponse(false, "Invalid recipient address format");
    }
    return createResponse(true, `Withdrawal proof generation started for ${amountStr} ${token}`, undefined, "generate_withdraw_proof", { token, amount: amountStr, recipient });
  },
});

export const executeWithdraw = new DynamicStructuredTool({
  name: "execute_withdraw",
  description: "Execute withdrawal from shielded vault to specified recipient",
  schema: z.any(),
  func: async (input: any) => {
    const token = typeof input?.token === "string" ? input.token : undefined;
    const amountStr = input?.amount != null ? String(input.amount) : "";
    const recipient = typeof input?.recipient === "string" ? input.recipient : undefined;
    const proof = typeof input?.proof === "string" ? input.proof : undefined;
    const bypassCompliance = input?.bypassCompliance != null ? (String(input.bypassCompliance).toLowerCase() === "true" ? true : Boolean(input.bypassCompliance)) : false;
    if (recipient && !recipient.startsWith("0x")) {
      return createResponse(false, "Invalid recipient address format");
    }
    return createResponse(true, `Withdrawal initiated: ${amountStr} ${token} to ${recipient}`, undefined, "execute_withdraw", { token, amount: amountStr, recipient, proof, bypassCompliance });
  },
});

// ========================================
// KYC & COMPLIANCE TOOLS
// ========================================

export const initiateKYC = new DynamicStructuredTool({
  name: "initiate_kyc",
  description: "Start KYC verification process for compliance requirements",
  schema: z.any(),
  func: async (input: any) => {
    const userId = typeof input?.userId === "string" ? input.userId : undefined;
    const stealthAddress = typeof input?.stealthAddress === "string" ? input.stealthAddress : undefined;
    return createResponse(true, "KYC verification process initiated", undefined, "initiate_kyc", { userId, stealthAddress });
  },
});

export const checkKYCStatus = new DynamicStructuredTool({
  name: "check_kyc_status",
  description: "Check current KYC verification status and compliance level",
  schema: z.any(),
  func: async (input: any) => {
    const userId = typeof input?.userId === "string" ? input.userId : undefined;
    return createResponse(true, "KYC status retrieved", undefined, "check_kyc_status", { userId });
  },
});

export const generateZkAttestation = new DynamicStructuredTool({
  name: "generate_zk_attestation",
  description: "Generate zero-knowledge attestation for large transaction compliance",
  schema: z.any(),
  func: async (input: any) => {
    const amountStr = input?.amount != null ? String(input.amount) : "";
    const transactionType = typeof input?.transactionType === "string" ? input.transactionType : undefined;
    return createResponse(true, `ZK attestation generation started for ${transactionType} of ${amountStr}`, undefined, "generate_zk_attestation", { amount: amountStr, transactionType });
  },
});

// ========================================
// UTILITY TOOLS
// ========================================

export const convertUnits = new DynamicStructuredTool({
  name: "convert_units",
  description: "Convert between human-readable amounts and wei units for blockchain transactions",
  schema: z.any(),
  func: async (input: any) => {
    try {
      const amountStr = input?.amount != null ? String(input.amount) : "";
      const decimals = input?.decimals != null ? Number(input.decimals) : 18;
      const direction = typeof input?.direction === "string" ? input.direction : "to_wei";
      if (direction === "to_wei") {
        const wei = parseUnits(amountStr, decimals);
        return createResponse(true, `Converted ${amountStr} to ${wei.toString()} wei`, {
          data: { original: amountStr, converted: wei.toString(), decimals }
        });
      } else {
        const formatted = formatUnits(BigInt(amountStr), decimals);
        return createResponse(true, `Converted ${amountStr} wei to ${formatted}`, {
          data: { original: amountStr, converted: formatted, decimals }
        });
      }
    } catch (error: any) {
      return createResponse(false, `Conversion failed: ${error.message}`);
    }
  },
});

export const getTransactionHistory = new DynamicStructuredTool({
  name: "get_transaction_history",
  description: "Get user's transaction history for deposits, withdrawals, and swaps",
  schema: z.any(),
  func: async (input: any) => {
    const type = typeof input?.type === "string" ? input.type : "all";
    const limit = input?.limit != null ? Number(input.limit) : 10;
    const offset = input?.offset != null ? Number(input.offset) : 0;
    return createResponse(true, "Transaction history retrieved", undefined, "get_transaction_history", { type, limit, offset });
  },
});

// Export all tools as an array for easy consumption
export const allTools = [
  // Dashboard
  getDashboardData,
  getEncryptedBalance,
  checkComplianceStatus,
  
  // Deposit
  checkRegistrationStatus,
  registerUser,
  depositTokens,
  getPublicBalance,
  
  // Swap
  getSwapQuote,
  executeSwap,
  getSupportedTokens,
  
  // Withdraw
  checkWithdrawCompliance,
  generateWithdrawProof,
  executeWithdraw,
  
  // KYC & Compliance
  initiateKYC,
  checkKYCStatus,
  generateZkAttestation,
  
  // Utilities
  convertUnits,
  getTransactionHistory,
];
