'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAccount, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSignMessage } from 'wagmi';
import { EERC_CONTRACT, REGISTRAR_CONTRACT } from '../lib/contracts';
import { sepolia } from 'wagmi/chains';
import { formatEther, parseEther } from 'viem';
import { i0 } from '../lib/crypto-utils';
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

export function useWithdraw() {
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
  const [userBalance, setUserBalance] = useState<bigint>(0n);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Read user's encrypted balance
  const { data: encryptedBalanceData, refetch: refetchBalance } = useReadContract({
    address: EERC_CONTRACT.address,
    abi: EERC_CONTRACT.abi,
    functionName: 'getBalanceFromTokenAddress',
    args: address ? [address, "0x0000000000000000000000000000000000000000"] : undefined,
    chainId: sepolia.id,
    query: { enabled: !!address && isOnCorrectChain }
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

  // Decrypt user balance when encrypted balance data changes
  useEffect(() => {
    if (encryptedBalanceData && address && userPublicKey) {
      const decryptBalance = async () => {
        try {
          setIsLoadingBalance(true);
          const message = `Decrypt balance for ${address}`;
          const signature = await signMessageAsync({ message });
          const privateKey = i0(signature);
          
          const balance = await getDecryptedBalance(
            privateKey, 
            [], 
            [], 
            encryptedBalanceData as any
          );
          
          setUserBalance(balance);
        } catch (err) {
          console.error('Error decrypting balance:', err);
          setUserBalance(0n);
        } finally {
          setIsLoadingBalance(false);
        }
      };

      decryptBalance();
    }
  }, [encryptedBalanceData, address, userPublicKey, signMessageAsync]);

  // Generate withdraw proof
  const generateWithdrawProof = useCallback(async (params: WithdrawParams) => {
    if (!address || !userPublicKey || !auditorPublicKey) {
      throw new Error('Missing required data for proof generation');
    }

    setIsGeneratingProof(true);
    setProofError(null);
    setGeneratedProof(null);

    try {
      const message = `Generate withdraw proof for ${address}`;
      const signature = await signMessageAsync({ message });
      const privateKey = i0(signature);

      // Get current balance for proof generation
      const currentBalance = await getDecryptedBalance(
        privateKey,
        [],
        [],
        encryptedBalanceData as any
      );

      if (currentBalance < params.amount) {
        throw new Error('Insufficient balance for withdrawal');
      }

      // Prepare circuit inputs
      const inputs = {
        ValueToWithdraw: params.amount.toString(),
        SenderPrivateKey: privateKey.toString(),
        SenderPublicKey: [userPublicKey[0].toString(), userPublicKey[1].toString()],
        SenderBalance: currentBalance.toString(),
        SenderBalanceC1: [
          (encryptedBalanceData as any)?.eGCT?.c1?.x?.toString() || "0",
          (encryptedBalanceData as any)?.eGCT?.c1?.y?.toString() || "0"
        ],
        SenderBalanceC2: [
          (encryptedBalanceData as any)?.eGCT?.c2?.x?.toString() || "0",
          (encryptedBalanceData as any)?.eGCT?.c2?.y?.toString() || "0"
        ],
        AuditorPublicKey: [auditorPublicKey.x.toString(), auditorPublicKey.y.toString()],
        RecipientAddress: BigInt(params.recipient).toString(),
      };

      console.log('🔐 Generating withdraw proof with inputs:', inputs);

      // Generate proof using snarkjs
      const wasmPath = '/circuits/WithdrawCircuit.wasm';
      const zkeyPath = '/circuits/WithdrawCircuit.groth16.zkey';

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
  const executeWithdraw = useCallback(async (params: WithdrawParams, proof?: WithdrawProof) => {
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
      const newBalance = userBalance - params.amount;
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
  }, [address, isOnCorrectChain, userBalance, writeContract]);

  // Combined withdraw function
  const withdraw = useCallback(async (params: WithdrawParams) => {
    try {
      // Generate proof if not already generated
      let proof = generatedProof;
      if (!proof) {
        proof = await generateWithdrawProof(params);
      }

      // Execute withdraw
      await executeWithdraw(params, proof);

      // Clear generated proof after successful execution
      setGeneratedProof(null);

    } catch (error) {
      console.error('Withdraw failed:', error);
      throw error;
    }
  }, [generatedProof, generateWithdrawProof, executeWithdraw]);

  // Format balance for display
  const formattedBalance = useMemo(() => {
    if (isLoadingBalance) return 'Loading...';
    return `${formatEther(userBalance)} eETH`;
  }, [userBalance, isLoadingBalance]);

  return {
    // State
    userBalance,
    formattedBalance,
    isLoadingBalance,
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
    canWithdraw: userBalance > 0n,
    isReady: !!address && isOnCorrectChain && !!userPublicKey && !!auditorPublicKey,
  };
}
