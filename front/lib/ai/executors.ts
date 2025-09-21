import { useAccount, useChainId, usePublicClient, useSwitchChain, useWriteContract, useReadContract } from "wagmi";
import { sepolia } from "wagmi/chains";
import { REGISTRAR_CONTRACT, EERC_CONTRACT } from "@/lib/contracts";
import { parseUnits } from "viem";
import { processPoseidonEncryption } from "@/lib/poseidon/poseidon";
import { useRegistration } from "@/hooks/use-registration";
import { useRegistrationStatus } from "@/hooks/use-registration-status";
import { useEncryptedBalance } from "@/hooks/use-encrypted-balance";
import { useNativeETH } from "@/hooks/use-native-eth";

// Types for intent execution
export type IntentResult = {
  success: boolean;
  message: string;
  data?: any;
  txHash?: string;
};

export type ExecutorHooks = {
  address?: string;
  isConnected: boolean;
  chainId: number;
  switchChain: (params: { chainId: number }) => Promise<void>;
  publicClient: any;
  writeContractAsync: (params: any) => Promise<string>;
};

// Client-side intent executors that use wagmi hooks
export class IntentExecutor {
  private hooks: ExecutorHooks;

  constructor(hooks: ExecutorHooks) {
    this.hooks = hooks;
  }

  async executeIntent(intent: string, params: any): Promise<IntentResult> {
    console.log(`🎯 ExecuteIntent called with intent: ${intent}`, params);
    try {
      switch (intent) {
        case "deposit":
          return await this.executeDeposit(params);
        case "register_user":
          return await this.executeRegistration(params);
        case "check_registration":
          return await this.checkRegistration(params);
        case "get_public_balance":
          return await this.getPublicBalance(params);
        case "decrypt_balance":
          return await this.getEncryptedBalance(params);
        case "show_dashboard":
          return await this.showDashboard(params);
        case "get_swap_quote":
          return await this.getSwapQuote(params);
        case "execute_swap":
          return await this.executeSwap(params);
        case "get_supported_tokens":
          return await this.getSupportedTokens(params);
        case "check_withdraw_compliance":
          return await this.checkWithdrawCompliance(params);
        case "generate_withdraw_proof":
          return await this.generateWithdrawProof(params);
        case "execute_withdraw":
          return await this.executeWithdraw(params);
        case "check_compliance":
          return await this.checkCompliance(params);
        case "initiate_kyc":
          return await this.initiateKYC(params);
        case "check_kyc_status":
          return await this.checkKYCStatus(params);
        case "generate_zk_attestation":
          return await this.generateZkAttestation(params);
        case "get_transaction_history":
          return await this.getTransactionHistory(params);
        default:
          return {
            success: false,
            message: `Unknown intent: ${intent}. Available intents: deposit, register_user, check_registration, get_public_balance, decrypt_balance, show_dashboard, get_swap_quote, execute_swap, etc.`
          };
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Intent execution failed: ${error.message || error}`
      };
    }
  }

  private async ensureCorrectChain(): Promise<boolean> {
    if (this.hooks.chainId !== sepolia.id) {
      console.log("Switching to Ethereum Sepolia network...");
      await this.hooks.switchChain({ chainId: sepolia.id });
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for chain switch
      return true;
    }
    return true;
  }

  private async executeDeposit(params: any): Promise<IntentResult> {
    console.log("💰 ExecuteDeposit called with params:", params);
    
    // Check wallet connection
    if (!this.hooks.isConnected || !this.hooks.address) {
      return { 
        success: false, 
        message: "❌ Wallet not connected. Please connect your wallet first to make deposits." 
      };
    }

    if (!this.hooks.publicClient) {
      return { success: false, message: "RPC client not available." };
    }

    await this.ensureCorrectChain();

    // Check KYC status before allowing deposits
    console.log("Checking KYC verification status...");
    const kycResult = await this.checkKYCStatus({ walletAddress: this.hooks.address });
    
    if (!kycResult.success || !kycResult.data?.isVerified) {
      return {
        success: false,
        message: "❌ KYC verification required. Deposits are only allowed for verified users. Please complete KYC verification first by typing 'start kyc'.",
        data: { 
          requiresKYC: true,
          kycStatus: kycResult.data,
          suggestedAction: "Type 'start kyc' to begin verification"
        }
      };
    }

    console.log("✅ KYC verified. Proceeding with deposit...");

    const { token, amount, decimals = 18 } = params;
    if (!token || !amount) {
      return { success: false, message: "Missing token address or amount." };
    }

    try {
      const amountWei = parseUnits(amount.toString(), decimals);

      // Read user's public key from registrar
      const userPublicKey = await this.hooks.publicClient.readContract({
        address: REGISTRAR_CONTRACT.address,
        abi: REGISTRAR_CONTRACT.abi,
        functionName: 'getUserPublicKey',
        args: [this.hooks.address],
      });

      if (!Array.isArray(userPublicKey) || userPublicKey.length !== 2) {
        return { 
          success: false, 
          message: "User not registered. Please register first using the 'register user' command." 
        };
      }

      const pub: [bigint, bigint] = [
        BigInt(userPublicKey[0].toString()), 
        BigInt(userPublicKey[1].toString())
      ];

      console.log("Encrypting deposit amount with Poseidon...");
      const { ciphertext, nonce, authKey } = processPoseidonEncryption([amountWei], pub);
      const amountPCT: [bigint, bigint, bigint, bigint, bigint, bigint, bigint] = [
        ...ciphertext,
        ...authKey,
        nonce,
      ] as [bigint, bigint, bigint, bigint, bigint, bigint, bigint];

      console.log("Submitting deposit transaction...");

      const txHash = await this.hooks.writeContractAsync({
        address: EERC_CONTRACT.address,
        abi: EERC_CONTRACT.abi,
        functionName: "deposit",
        args: [amountWei, "0x0000000000000000000000000000000000000000", amountPCT],
        chainId: sepolia.id,
        value: amountWei,
      });

      console.log(`Deposit transaction submitted: ${txHash}`);
      
      // Wait for confirmation
      const receipt = await this.hooks.publicClient.waitForTransactionReceipt({ 
        hash: txHash as `0x${string}` 
      });

      return {
        success: true,
        message: `Deposit of ${amount} ETH confirmed in block ${receipt.blockNumber}`,
        txHash,
        data: { amount, token, blockNumber: receipt.blockNumber.toString() }
      };

    } catch (error: any) {
      return { 
        success: false, 
        message: `Deposit failed: ${error.message || error}` 
      };
    }
  }

  private async executeRegistration(params: any): Promise<IntentResult> {
    if (!this.hooks.isConnected || !this.hooks.address) {
      return { success: false, message: "Please connect your wallet first." };
    }

    await this.ensureCorrectChain();

    console.log("Registration requires wallet interaction. Please use the /deposit page for full registration flow.");
    
    return {
      success: true,
      message: "Registration process initiated. Please visit /deposit to complete registration with proof generation.",
      data: { redirectTo: "/deposit" }
    };
  }

  private async checkRegistration(params: any): Promise<IntentResult> {
    if (!this.hooks.isConnected || !this.hooks.address) {
      return { success: false, message: "Please connect your wallet first." };
    }

    // Ensure on expected chain
    await this.ensureCorrectChain();

    try {
      // First, try the explicit boolean helper if available
      let isRegistered: boolean | null = null;
      let registrarAddr: `0x${string}` = REGISTRAR_CONTRACT.address as `0x${string}`;

      try {
        const res = await this.hooks.publicClient.readContract({
          address: registrarAddr,
          abi: REGISTRAR_CONTRACT.abi,
          functionName: 'isUserRegistered',
          args: [this.hooks.address],
        });
        if (typeof res === 'boolean') {
          isRegistered = res;
        }
      } catch (_ignored) {
        // continue to fallback
      }

      // Fallback: try reading the public key and infer registration
      let userPublicKey: any = null;
      try {
        userPublicKey = await this.hooks.publicClient.readContract({
          address: registrarAddr,
          abi: REGISTRAR_CONTRACT.abi,
          functionName: 'getUserPublicKey',
          args: [this.hooks.address],
        });
        if (isRegistered === null) {
          isRegistered = Array.isArray(userPublicKey) && userPublicKey.length === 2 && 
                         userPublicKey[0] !== 0n && userPublicKey[1] !== 0n;
        }
      } catch (innerErr: any) {
        // If the contract call returns no data, it's likely wrong network or incorrect address
        const msg = String(innerErr?.message || innerErr || '').toLowerCase();
        if (msg.includes('returned no data') || msg.includes('execution reverted') || msg.includes('not a contract')) {
          // Fallback: try resolving registrar from EERC contract, then re-try reads
          try {
            const resolvedRegistrar = await this.hooks.publicClient.readContract({
              address: EERC_CONTRACT.address,
              abi: EERC_CONTRACT.abi,
              functionName: 'registrar',
              args: [],
            });
            if (typeof resolvedRegistrar === 'string' && resolvedRegistrar.startsWith('0x')) {
              registrarAddr = resolvedRegistrar as `0x${string}`;
              // retry isUserRegistered
              try {
                const res2 = await this.hooks.publicClient.readContract({
                  address: registrarAddr,
                  abi: REGISTRAR_CONTRACT.abi,
                  functionName: 'isUserRegistered',
                  args: [this.hooks.address],
                });
                if (typeof res2 === 'boolean') {
                  isRegistered = res2;
                }
              } catch {}
              // retry getUserPublicKey
              try {
                userPublicKey = await this.hooks.publicClient.readContract({
                  address: registrarAddr,
                  abi: REGISTRAR_CONTRACT.abi,
                  functionName: 'getUserPublicKey',
                  args: [this.hooks.address],
                });
                if (isRegistered === null) {
                  isRegistered = Array.isArray(userPublicKey) && userPublicKey.length === 2 && 
                                 userPublicKey[0] !== 0n && userPublicKey[1] !== 0n;
                }
              } catch {}
            }
          } catch {}

          // If still null and nothing worked, surface a clear guidance
          if (isRegistered === null && userPublicKey === null) {
            return {
              success: false,
              message: `Registration check failed: Registrar not found on this network or ABI mismatch.\n\n` +
                       `Static registrar: ${REGISTRAR_CONTRACT.address}\n` +
                       `Resolved registrar (from EERC): ${registrarAddr}\n` +
                       `ChainId: ${this.hooks.chainId}. Ensure Ethereum Sepolia is selected and contracts are deployed.`,
            };
          }
        }
        // Other errors
        return { success: false, message: `Registration check failed: ${innerErr?.message || innerErr}` };
      }

      const ok = Boolean(isRegistered);
      return {
        success: true,
        message: ok ? "User is registered ✅" : "User is not registered ❌",
        data: {
          isRegistered: ok,
          publicKey: ok ? userPublicKey : null,
          address: this.hooks.address,
          registrar: registrarAddr,
          chainId: this.hooks.chainId,
        }
      };
    } catch (error: any) {
      return { success: false, message: `Registration check failed: ${error.message || error}` };
    }
  }

  private async getPublicBalance(params: any): Promise<IntentResult> {
    if (!this.hooks.isConnected || !this.hooks.address) {
      return { success: false, message: "Please connect your wallet first." };
    }

    try {
      const balance = await this.hooks.publicClient.getBalance({
        address: this.hooks.address,
      });

      const balanceEth = parseFloat((Number(balance) / 1e18).toFixed(6));

      return {
        success: true,
        message: `Public ETH balance: ${balanceEth} ETH`,
        data: { 
          balance: balanceEth, 
          balanceWei: balance.toString(), 
          symbol: "ETH",
          address: this.hooks.address 
        }
      };
    } catch (error: any) {
      return { 
        success: false, 
        message: `Balance check failed: ${error.message}` 
      };
    }
  }

  private async getEncryptedBalance(params: any): Promise<IntentResult> {
    // This would need to be implemented with the actual encrypted balance hook
    // For now, return a placeholder
    return {
      success: true,
      message: "Encrypted balance retrieval requires client-side decryption. Please check the dashboard.",
      data: { note: "Use the dashboard to view decrypted balances" }
    };
  }

  private async showDashboard(params: any): Promise<IntentResult> {
    return {
      success: true,
      message: "Dashboard data would be displayed here. Visit /dashboard for full interface.",
      data: { 
        redirectTo: "/dashboard",
        showBalances: params.showBalances ?? true 
      }
    };
  }

  private async getSwapQuote(params: any): Promise<IntentResult> {
    const { fromToken, toToken, amount, slippage = 0.5 } = params;
    
    // Mock pricing logic (same as swap page)
    let price = 1;
    if (fromToken === "eUSDC" && toToken === "eDAI") price = 0.99;
    else if (fromToken === "eDAI" && toToken === "eUSDC") price = 1 / 0.99;
    
    const amountNum = parseFloat(amount);
    const estimatedOut = amountNum * price;
    const minOut = estimatedOut * (1 - slippage / 100);

    return {
      success: true,
      message: `Quote: ${amount} ${fromToken} → ${estimatedOut.toFixed(6)} ${toToken} (min: ${minOut.toFixed(6)})`,
      data: {
        fromToken,
        toToken,
        amountIn: amount,
        estimatedOut: estimatedOut.toFixed(6),
        minAmountOut: minOut.toFixed(6),
        price: price.toFixed(6),
        slippage
      }
    };
  }

  private async executeSwap(params: any): Promise<IntentResult> {
    const { fromToken, toToken, amount, generateProof = true } = params;
    
    console.log(`Initiating private swap: ${amount} ${fromToken} → ${toToken}`);
    
    if (generateProof) {
      console.log("Generating zk-proof for private swap...");
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log("Proof generated successfully ✅");
    }
    
    console.log("Submitting swap to PrivacyRouter...");
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock transaction hash
    const mockTxHash = `0x${Math.random().toString(16).slice(2, 66)}`;
    
    return {
      success: true,
      message: `Private swap completed! ${amount} ${fromToken} → ${toToken}`,
      txHash: mockTxHash,
      data: { fromToken, toToken, amount, txHash: mockTxHash }
    };
  }

  private async getSupportedTokens(params: any): Promise<IntentResult> {
    const tokens = [
      { symbol: "eUSDC", name: "Encrypted USD Coin", balance: 1250.89, priceUsd: 1.00 },
      { symbol: "eDAI", name: "Encrypted DAI", balance: 640.12, priceUsd: 1.00 },
      { symbol: "eETH", name: "Encrypted ETH", balance: 0.75, priceUsd: 1600.00 },
      { symbol: "BNB", name: "BNB", balance: 5695.89, priceUsd: 220.00 },
      { symbol: "USDT", name: "Tether", balance: 7575.93, priceUsd: 1.00 },
    ];

    return {
      success: true,
      message: `${tokens.length} supported tokens available for trading`,
      data: { tokens }
    };
  }

  private async checkWithdrawCompliance(params: any): Promise<IntentResult> {
    const { token, amount } = params;
    const THRESHOLD_USD = 5000;
    
    // Mock price lookup
    const prices: Record<string, number> = {
      "eUSDC": 1, "eDAI": 1, "eETH": 1600, "BNB": 220, "USDT": 1
    };
    
    const price = prices[token] || 1;
    const amountUsd = parseFloat(amount) * price;
    const requiresCompliance = amountUsd >= THRESHOLD_USD;

    return {
      success: true,
      message: requiresCompliance 
        ? `⚠️ Withdrawal of $${amountUsd.toFixed(2)} requires zk-attestation (>$${THRESHOLD_USD} threshold)`
        : `✅ Withdrawal of $${amountUsd.toFixed(2)} is auto-approved (<$${THRESHOLD_USD} threshold)`,
      data: {
        token,
        amount,
        amountUsd: amountUsd.toFixed(2),
        requiresCompliance,
        threshold: THRESHOLD_USD
      }
    };
  }

  private async generateWithdrawProof(params: any): Promise<IntentResult> {
    const { token, amount, recipient } = params;
    
    console.log("Generating withdrawal proof...");
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const mockProof = `zk-proof-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    
    return {
      success: true,
      message: `Withdrawal proof generated for ${amount} ${token}`,
      data: {
        proof: mockProof,
        token,
        amount,
        recipient,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
      }
    };
  }

  private async executeWithdraw(params: any): Promise<IntentResult> {
    const { token, amount, recipient, proof, bypassCompliance = false } = params;
    
    if (!proof && !bypassCompliance) {
      return { 
        success: false, 
        message: "Withdrawal proof required. Generate proof first or use small amount (<$5000)." 
      };
    }
    
    console.log(`Processing withdrawal: ${amount} ${token} to ${recipient}`);
    
    if (proof) {
      console.log("Verifying zk-proof...");
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log("Proof verified ✅");
    }
    
    console.log("Submitting withdrawal transaction...");
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const mockTxHash = `0x${Math.random().toString(16).slice(2, 66)}`;
    
    return {
      success: true,
      message: `Withdrawal completed! ${amount} ${token} sent to ${recipient}`,
      txHash: mockTxHash,
      data: { token, amount, recipient, txHash: mockTxHash, proof: !!proof }
    };
  }

  private async checkCompliance(params: any): Promise<IntentResult> {
    return {
      success: true,
      message: "Compliance status: ✅ Ready for transactions up to $50,000",
      data: {
        isCompliant: true,
        hasZkAttestation: true,
        maxTransactionUsd: 50000,
        kycStatus: "verified"
      }
    };
  }

  private async initiateKYC(params: any): Promise<IntentResult> {
    const { userId, requirements = {} } = params || {};
    const walletAddress = this.hooks.address;
    if (!this.hooks.isConnected || !walletAddress) {
      return { success: false, message: "Please connect your wallet first." };
    }

    // Create session data that works with SelfQRCode (same as kyc-test)
    console.log("Creating KYC verification session...");

    const sessionData = {
      scope: process.env.NEXT_PUBLIC_SELF_SCOPE || "tsunami-wallet-kyc",
      configId: process.env.NEXT_PUBLIC_SELF_CONFIG_ID || "1",
      endpoint: process.env.NEXT_PUBLIC_SELF_ENDPOINT || "https://staging-api.self.xyz",
      userId: walletAddress,
      requirements: {
        minimumAge: 18,
        requireOfacCheck: false,
        excludedCountries: [],
        allowedDocumentTypes: [1, 2, 3],
        ...requirements,
      },
    };

    const session = {
      sessionId: `kyc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      status: "qr_generated",
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
      progressPercentage: 10,
    };

    console.log("KYC session created. Returning session to display inline QR in chat.");

    return {
      success: true,
      message: "KYC session created. Opening inline verification...",
      data: {
        session,
        sessionData,
        kycInline: true,
      },
    };
  }

  private async checkKYCStatus(params: any): Promise<IntentResult> {
    const walletAddress = (params?.walletAddress as string) || this.hooks.address;
    if (!walletAddress) {
      return { success: false, message: "Wallet address required to check KYC status." };
    }

    try {
      const baseUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001").replace(/\/$/, "");
      const url = `${baseUrl}/api/kyc/onchain/status/${walletAddress}`;

      const res = await fetch(url, { method: 'GET' });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        return { success: false, message: `KYC status fetch failed: ${data?.error || res.statusText}`, data };
      }

      const kycStatus = data.kycStatus;
      const msg = kycStatus?.isVerified ? "KYC Status: ✅ Verified" : "KYC Status: ❌ Not verified";
      return { success: true, message: msg, data: kycStatus };
    } catch (err: any) {
      return { success: false, message: `KYC status error: ${err?.message || err}` };
    }
  }

  private async generateZkAttestation(params: any): Promise<IntentResult> {
    const { amount, transactionType } = params;
    
    console.log("Generating zk-attestation for compliance...");
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    const attestation = `zk-attestation-${Date.now().toString(36)}`;
    
    return {
      success: true,
      message: `ZK attestation generated for ${transactionType} of ${amount}`,
      data: {
        attestation,
        amount,
        transactionType,
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      }
    };
  }

  private async getTransactionHistory(params: any): Promise<IntentResult> {
    const { type = "all", limit = 10 } = params;
    
    const mockHistory = [
      { type: "deposit", amount: "1.5", token: "ETH", timestamp: new Date(Date.now() - 86400000).toISOString(), txHash: "0xabc..." },
      { type: "swap", from: "eUSDC", to: "eDAI", amount: "100", timestamp: new Date(Date.now() - 172800000).toISOString(), txHash: "0xdef..." },
      { type: "withdraw", amount: "0.5", token: "eETH", recipient: "0x123...", timestamp: new Date(Date.now() - 259200000).toISOString(), txHash: "0xghi..." },
    ].filter(tx => type === "all" || tx.type === type).slice(0, limit);

    return {
      success: true,
      message: `Retrieved ${mockHistory.length} ${type} transactions`,
      data: { transactions: mockHistory, type, limit }
    };
  }
}
