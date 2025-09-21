"use client";

import { useAccount, useBalance } from "wagmi";
import { sepolia } from "wagmi/chains";

export function useNativeETH() {
  const { address } = useAccount();
  
  const { data: balance, isLoading, error } = useBalance({
    address,
    chainId: sepolia.id,
  });

  return {
    balance: balance ? balance.formatted : "0",
    balanceRaw: balance?.value || 0n,
    isLoading,
    error,
    symbol: "ETH",
    decimals: 18,
  };
}
