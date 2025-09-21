'use client'

import { useReadContract, useChainId } from 'wagmi'
import { REGISTRAR_CONTRACT } from '../lib/contracts'
import { sepolia } from 'wagmi/chains'

export function useRegistrationStatus(userAddress?: `0x${string}`) {
  const chainId = useChainId()
  const { data: isRegistered, isError, isLoading, error, refetch } = useReadContract({
    address: REGISTRAR_CONTRACT.address,
    abi: REGISTRAR_CONTRACT.abi,
    functionName: 'isUserRegistered',
    args: userAddress ? [userAddress] : undefined,
    chainId: sepolia.id,
    query: { enabled: !!userAddress },
  })

  return {
    isRegistered: isRegistered as boolean | undefined,
    isLoading,
    isError,
    error,
    refetch,
    currentChain: chainId,
    contractChain: sepolia.id,
    isOnCorrectChain: chainId === sepolia.id,
  }
}


