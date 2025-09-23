"use client"

import React from 'react'
import { useAccount, useReadContract } from 'wagmi'
import { createPublicClient, http } from 'viem'
import { sepolia } from 'wagmi/chains'
import { EERC_CONTRACT } from '../lib/contracts'

export type DiscoveredToken = {
  address: `0x${string}`
  symbol: string
  decimals: number
  isNative: boolean
}

const NATIVE_ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const

export function useTokens() {
  const { address: user } = useAccount()

  const { data: tokenAddresses, isLoading, error } = useReadContract({
    address: EERC_CONTRACT.address,
    abi: EERC_CONTRACT.abi,
    functionName: 'getTokens',
    chainId: sepolia.id,
    query: { enabled: true },
  })

  const [tokens, setTokens] = React.useState<DiscoveredToken[]>([])
  const [metaLoading, setMetaLoading] = React.useState(false)
  const [metaError, setMetaError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const load = async () => {
      try {
        setMetaLoading(true)
        setMetaError(null)
        const list = (tokenAddresses as `0x${string}`[] | undefined) ?? []
        const client = createPublicClient({ chain: sepolia, transport: http() })

        const discovered: DiscoveredToken[] = []

        // prepend native
        discovered.push({ address: NATIVE_ZERO_ADDRESS, symbol: 'ETH', decimals: 18, isNative: true })

        for (const addr of list) {
          try {
            const [symbol, decimals] = await Promise.all([
              client.readContract({
                address: addr,
                abi: [
                  { inputs: [], name: 'symbol', outputs: [{ name: '', type: 'string' }], stateMutability: 'view', type: 'function' },
                ] as const,
                functionName: 'symbol',
              }) as Promise<string>,
              client.readContract({
                address: addr,
                abi: [
                  { inputs: [], name: 'decimals', outputs: [{ name: '', type: 'uint8' }], stateMutability: 'view', type: 'function' },
                ] as const,
                functionName: 'decimals',
              }) as Promise<number>,
            ])
            discovered.push({ address: addr, symbol, decimals, isNative: false })
          } catch (e) {
            // fallback if metadata fails
            discovered.push({ address: addr, symbol: 'TOKEN', decimals: 18, isNative: false })
          }
        }

        setTokens(discovered)
      } catch (e: any) {
        setMetaError(e?.message ?? 'Failed to load token metadata')
      } finally {
        setMetaLoading(false)
      }
    }

    load()
  }, [tokenAddresses])

  return {
    tokens,
    isLoading: isLoading || metaLoading,
    error: (error as any)?.message || metaError,
  }
}


