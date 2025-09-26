"use client";

import { useEffect, useState } from "react";
import { useReadContracts, useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId } from "wagmi";
import { ERC20_TEST, EERC_CONTRACT } from "../lib/contracts";
import { sepolia } from "wagmi/chains";
import { formatEther, parseUnits } from "viem";

export function useERC20() {
  const { address } = useAccount();
  const chainId = useChainId();
  const isOnCorrectChain = chainId === sepolia.id;
  const [timeToNextClaim, setTimeToNextClaim] = useState<number>(0);
  const [allowance, setAllowance] = useState<bigint>(0n);

  const { data: contractData, isLoading: contractsLoading, refetch: refetchContracts } = useReadContracts({
    contracts: [
      {
        address: ERC20_TEST.address,
        abi: ERC20_TEST.abi,
        functionName: "balanceOf",
        args: address ? [address] : undefined,
      },
      {
        address: ERC20_TEST.address,
        abi: ERC20_TEST.abi,
        functionName: "canClaimFromFaucet",
        args: address ? [address] : undefined,
      },
      {
        address: ERC20_TEST.address,
        abi: ERC20_TEST.abi,
        functionName: "getNextFaucetClaimTime",
        args: address ? [address] : undefined,
      },
      {
        address: ERC20_TEST.address,
        abi: ERC20_TEST.abi,
        functionName: "FAUCET_AMOUNT",
      },
      {
        address: ERC20_TEST.address,
        abi: ERC20_TEST.abi,
        functionName: "FAUCET_COOLDOWN",
      },
      {
        address: ERC20_TEST.address,
        abi: ERC20_TEST.abi,
        functionName: "decimals",
      },
      {
        address: ERC20_TEST.address,
        abi: ERC20_TEST.abi,
        functionName: "allowance",
        args: address ? [address, EERC_CONTRACT.address] : undefined,
      },
    ],
    query: { enabled: isOnCorrectChain && !!address },
  });

  const balance = contractData?.[0]?.result as bigint | undefined;
  const canClaim = contractData?.[1]?.result as boolean | undefined;
  const nextClaimTime = contractData?.[2]?.result as bigint | undefined;
  const faucetAmount = contractData?.[3]?.result as bigint | undefined;
  const faucetCooldown = contractData?.[4]?.result as bigint | undefined;
  const decimals = contractData?.[5]?.result as number | undefined;
  const allowanceData = contractData?.[6]?.result as bigint | undefined;

  const { writeContract: claimFaucet, data: claimHash, isPending: isClaimPending, error: claimError } = useWriteContract();
  const { isLoading: isClaimConfirming, isSuccess: isClaimConfirmed } = useWaitForTransactionReceipt({ hash: claimHash });

  const { writeContract: approveTokens, data: approveHash, isPending: isApprovePending, error: approveError } = useWriteContract();
  const { isLoading: isApproveConfirming, isSuccess: isApproveConfirmed } = useWaitForTransactionReceipt({ hash: approveHash });

  const handleClaimFaucet = async () => {
    if (!isOnCorrectChain) throw new Error("Please switch to Ethereum Sepolia network");
    if (!address) throw new Error("Please connect your wallet");
    await claimFaucet({ address: ERC20_TEST.address, abi: ERC20_TEST.abi, functionName: "claimFromFaucet", chainId: sepolia.id });
  };

  const handleApproveTokens = async (amount: string) => {
    if (!isOnCorrectChain) throw new Error("Please switch to Ethereum Sepolia network");
    if (!address || decimals == null) throw new Error("Please connect your wallet and wait for data to load");
    const amountInWei = parseUnits(amount, decimals);
    await approveTokens({
      address: ERC20_TEST.address,
      abi: ERC20_TEST.abi,
      functionName: "approve",
      args: [EERC_CONTRACT.address, amountInWei],
      chainId: sepolia.id,
    });
  };

  useEffect(() => {
    if (allowanceData != null) setAllowance(allowanceData);
  }, [allowanceData]);

  useEffect(() => {
    if (!nextClaimTime || canClaim) {
      setTimeToNextClaim(0);
      return;
    }
    const update = () => {
      const now = Math.floor(Date.now() / 1000);
      setTimeToNextClaim(Math.max(0, Number(nextClaimTime) - now));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [nextClaimTime, canClaim]);

  useEffect(() => {
    if (isClaimConfirmed || isApproveConfirmed) {
      setTimeout(() => refetchContracts(), 2000);
    }
  }, [isClaimConfirmed, isApproveConfirmed, refetchContracts]);

  const checkAllowanceSufficient = (depositAmount: string) => {
    if (!depositAmount || decimals == null || parseFloat(depositAmount) <= 0) return false;
    try {
      const need = parseUnits(depositAmount, decimals);
      return allowance >= need;
    } catch {
      return false;
    }
  };

  return {
    contractAddress: ERC20_TEST.address,
    isOnCorrectChain,
    balance: balance ? formatEther(balance) : "0",
    balanceLoading: contractsLoading,
    canClaim,
    faucetAmount: faucetAmount ? formatEther(faucetAmount) : "0",
    faucetCooldown,
    timeToNextClaim,
    handleClaimFaucet,
    isClaiming: isClaimPending || isClaimConfirming,
    claimError,
    isClaimConfirmed,
    claimHash,
    handleApproveTokens,
    isApproving: isApprovePending || isApproveConfirming,
    approveError,
    isApproveConfirmed,
    approveHash,
    allowance: allowance ? formatEther(allowance) : "0",
    allowanceRaw: allowance,
    decimals,
    checkAllowanceSufficient,
  };
}