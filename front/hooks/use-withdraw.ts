'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAccount, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSignMessage } from 'wagmi';
import { EERC_CONTRACT, REGISTRAR_CONTRACT } from '../lib/contracts';
import { sepolia } from 'wagmi/chains';
import { formatEther, parseEther } from 'viem';
import { i0 } from '../lib/crypto-utils';
import { formatPrivKeyForBabyJub } from 'maci-crypto';
import { subOrder } from '@zk-kit/baby-jubjub';
import { processPoseidonEncryption } from '../lib/poseidon/poseidon';
import { getDecryptedBalance } from '../lib/balances/balances';
import * as snarkjs from 'snarkjs';

export interface WithdrawParams {
  tokenId: bigint;
  amount: bigint;
  recipient: string;
}

export interface WithdrawProof {
  proofPoints: {
    a: readonly [bigint, bigint];
    b: readonly [readonly [bigint, bigint], readonly [bigint, bigint]];
    c: readonly [bigint, bigint];
  };
  publicSignals: readonly bigint[];
}

export function useWithdraw(tokenAddress?: `0x${string}`, tokenDecimals: number = 18) {
  const { address } = useAccount();
  const chainId = useChainId();
  const { signMessageAsync } = useSignMessage();
  const isOnCorrectChain = chainId === sepolia.id;

  // Contract write operations
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  // State management
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);
  const [proofError, setProofError] = useState<string | null>(null);
  const [generatedProof, setGeneratedProof] = useState<WithdrawProof | null>(null);

  // Read user's encrypted balance
  const { data: encryptedBalanceData, refetch: refetchBalance } = useReadContract({
    address: EERC_CONTRACT.address,
    abi: EERC_CONTRACT.abi,
    functionName: 'getBalanceFromTokenAddress',
    args: address && tokenAddress ? [address, tokenAddress] : undefined,
    chainId: sepolia.id,
    query: { enabled: !!address && !!tokenAddress && isOnCorrectChain, scopeKey: tokenAddress }
  });

  // Read auditor public key
  const { data: auditorPublicKey } = useReadContract({
    address: EERC_CONTRACT.address,
    abi: EERC_CONTRACT.abi,
    functionName: 'auditorPublicKey',
    query: { enabled: isOnCorrectChain }
  });

  // Read user's public key
  const { data: userPublicKey } = useReadContract({
    address: REGISTRAR_CONTRACT.address,
    abi: REGISTRAR_CONTRACT.abi,
    functionName: 'getUserPublicKey',
    args: address ? [address] : undefined,
    query: { enabled: !!address && isOnCorrectChain }
  });

  // Note: Balance decryption is now handled by useEncryptedBalance hook

  // Generate withdraw proof
  const generateWithdrawProof = useCallback(async (params: WithdrawParams, currentBalance: bigint) => {
    if (!address || !userPublicKey || !auditorPublicKey) {
      throw new Error('Missing required data for proof generation');
    }

    setIsGeneratingProof(true);
    setProofError(null);
    setGeneratedProof(null);

    try {
      // Derive the SAME private key used during registration
      const message = `eERC\nRegistering user with\n Address:${address.toLowerCase()}`;
      const signature = await signMessageAsync({ message });
      const privateKey = i0(signature);

      if (currentBalance < params.amount) {
        throw new Error('Insufficient balance for withdrawal');
      }

      // Normalize auditor key (supports {x,y} or [x,y])
      const auditorKeyAny: any = auditorPublicKey as any;
      const auditorX = (auditorKeyAny?.x ?? auditorKeyAny?.[0])?.toString?.() || auditorKeyAny?.[0]?.toString?.() || undefined;
      const auditorY = (auditorKeyAny?.y ?? auditorKeyAny?.[1])?.toString?.() || auditorKeyAny?.[1]?.toString?.() || undefined;
      if (!auditorX || !auditorY) {
        throw new Error('Auditor public key not available');
      }

      // Prepare circuit inputs
      // Withdraw/Transfer circuits expect ValueToWithdraw as a single field (internal 2 decimals).
      // Convert wei amount (tokenDecimals) down to 2-decimal protocol units
      const INTERNAL_DECIMALS = 2n;
      const desiredDecimals = INTERNAL_DECIMALS;
      const tokenDecimalsBig = BigInt(tokenDecimals);
      const diff = tokenDecimalsBig - desiredDecimals;
      const valueToWithdrawInternal = diff >= 0n
        ? (params.amount / (10n ** diff))
        : (params.amount * (10n ** (-diff)));

      // Scale currentBalance (assumed 18 decimals) down to internal 2 decimals
      const senderBalanceInternal = diff >= 0n
        ? (currentBalance / (10n ** diff))
        : (currentBalance * (10n ** (-diff)));

      // Normalize encrypted balance EGCT c1/c2 from possible tuple/object shapes
      const ebAny: any = encryptedBalanceData as any;
      let c1x = "0", c1y = "0", c2x = "0", c2y = "0";
      try {
        const eGCT = ebAny?.eGCT ?? ebAny?.[0];
        const c1Any = eGCT?.c1 ?? eGCT?.[0];
        const c2Any = eGCT?.c2 ?? eGCT?.[1];
        c1x = (c1Any?.x ?? c1Any?.[0])?.toString?.() || "0";
        c1y = (c1Any?.y ?? c1Any?.[1])?.toString?.() || "0";
        c2x = (c2Any?.x ?? c2Any?.[0])?.toString?.() || "0";
        c2y = (c2Any?.y ?? c2Any?.[1])?.toString?.() || "0";
      } catch (_) {
        // fall back to zeros if shape mismatches
      }

      // Guard: require non-zero EGCT for selected token
      if (c1x === "0" || c1y === "0" || c2x === "0" || c2y === "0") {
        throw new Error('Encrypted balance not found for selected token');
      }

      // Generate Auditor PCT payload for the withdrawal amount
      // This produces ciphertext[4], nonce, encRandom, authKey[2]
      const auditorEnc = processPoseidonEncryption(
        [valueToWithdrawInternal],
        [BigInt(auditorX), BigInt(auditorY)]
      );

      const formattedPrivateKey = (formatPrivKeyForBabyJub(privateKey) % subOrder);

      const inputs = {
        ValueToWithdraw: valueToWithdrawInternal.toString(),
        SenderPrivateKey: formattedPrivateKey.toString(),
        SenderPublicKey: [userPublicKey[0].toString(), userPublicKey[1].toString()],
        SenderBalance: senderBalanceInternal.toString(),
        SenderBalanceC1: [c1x, c1y],
        SenderBalanceC2: [c2x, c2y],
        AuditorPublicKey: [auditorX, auditorY],
        AuditorPCT: auditorEnc.ciphertext.map((v: bigint) => v.toString()),
        AuditorPCTAuthKey: auditorEnc.authKey.map((v: bigint) => v.toString()),
        AuditorPCTNonce: auditorEnc.nonce.toString(),
        AuditorPCTRandom: auditorEnc.encRandom.toString(),
      };

      console.log('🔐 Generating withdraw proof with inputs:', inputs);

      // Generate proof using snarkjs
      // Files must be present in public/circuits
      const wasmPath = '/circuits/WithdrawCircuit.wasm';
      const zkeyPath = '/circuits/WithdrawCircuit.groth16.zkey';

      // Verify assets exist to avoid confusing wasm errors
      try {
        const [wRes, zRes] = await Promise.all([
          fetch(wasmPath, { method: 'HEAD' }),
          fetch(zkeyPath, { method: 'HEAD' })
        ]);
        if (!wRes.ok || !zRes.ok) {
          throw new Error('Withdraw circuit assets missing. Place WithdrawCircuit.wasm and WithdrawCircuit.groth16.zkey under /public/circuits');
        }
      } catch (e) {
        throw e;
      }

      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        inputs,
        wasmPath,
        zkeyPath
      );

      console.log('✅ Withdraw proof generated successfully!');

      // Format proof for contract
      const formattedProof: WithdrawProof = {
        proofPoints: {
          a: [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])] as readonly [bigint, bigint],
          b: [
            [BigInt(proof.pi_b[0][1]), BigInt(proof.pi_b[0][0])],
            [BigInt(proof.pi_b[1][1]), BigInt(proof.pi_b[1][0])]
          ] as readonly [readonly [bigint, bigint], readonly [bigint, bigint]],
          c: [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])] as readonly [bigint, bigint]
        },
        publicSignals: publicSignals.map((signal: string) => BigInt(signal)) as readonly bigint[]
      };

      setGeneratedProof(formattedProof);
      return formattedProof;

    } catch (error) {
      console.error('Error generating withdraw proof:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate proof';
      setProofError(errorMessage);
      throw error;
    } finally {
      setIsGeneratingProof(false);
    }
  }, [address, userPublicKey, auditorPublicKey, encryptedBalanceData, signMessageAsync]);

  // Execute withdraw transaction
  const executeWithdraw = useCallback(async (params: WithdrawParams, currentBalance: bigint, proof?: WithdrawProof) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    if (!isOnCorrectChain) {
      throw new Error('Please switch to Sepolia network');
    }

    if (!proof) {
      throw new Error('Withdraw proof required');
    }

    try {
      // Generate balance PCT for the new balance after withdrawal
      const newBalance = currentBalance - params.amount;
      const balancePCT = new Array(7).fill(0n).map((_, i) => 
        i === 0 ? newBalance : 0n
      ) as readonly [bigint, bigint, bigint, bigint, bigint, bigint, bigint];

      await writeContract({
        address: EERC_CONTRACT.address,
        abi: EERC_CONTRACT.abi,
        functionName: 'withdraw',
        args: [params.tokenId, proof, balancePCT],
        chainId: sepolia.id,
      });

    } catch (error) {
      console.error('Error executing withdraw:', error);
      throw error;
    }
  }, [address, isOnCorrectChain, writeContract]);

  // Combined withdraw function
  const withdraw = useCallback(async (params: WithdrawParams, currentBalance: bigint) => {
    try {
      // Generate proof if not already generated
      let proof = generatedProof;
      if (!proof) {
        proof = await generateWithdrawProof(params, currentBalance);
      }

      // Execute withdraw
      await executeWithdraw(params, currentBalance, proof);

      // Clear generated proof after successful execution
      setGeneratedProof(null);

    } catch (error) {
      console.error('Withdraw failed:', error);
      throw error;
    }
  }, [generatedProof, generateWithdrawProof, executeWithdraw]);

  return {
    // State
    isGeneratingProof,
    proofError,
    generatedProof,
    
    // Contract state
    isPending,
    isConfirming,
    isConfirmed,
    error: writeError,
    txHash: hash,
    
    // Actions
    generateWithdrawProof,
    executeWithdraw,
    withdraw,
    refetchBalance,
    
    // Computed
    isReady: !!address && isOnCorrectChain && !!userPublicKey && !!auditorPublicKey,
  };
}
