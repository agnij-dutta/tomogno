'use client'

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { EERC_CONTRACT } from '../lib/contracts'
import { sepolia } from 'wagmi/chains'

type HexAddress = `0x${string}`

export function useEercWrites() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash })

  async function deposit(params: { amount: bigint; tokenAddress: HexAddress; amountPCT: readonly [bigint, bigint, bigint, bigint, bigint, bigint, bigint] }) {
    await writeContract({
      address: EERC_CONTRACT.address,
      abi: EERC_CONTRACT.abi,
      functionName: 'deposit',
      args: [params.amount, params.tokenAddress, params.amountPCT],
      chainId: sepolia.id,
    })
  }

  async function withdraw(params: { tokenId: bigint; proof: any; balancePCT: readonly [bigint, bigint, bigint, bigint, bigint, bigint, bigint] }) {
    await writeContract({
      address: EERC_CONTRACT.address,
      abi: EERC_CONTRACT.abi,
      functionName: 'withdraw',
      args: [params.tokenId, params.proof, params.balancePCT],
      chainId: sepolia.id,
    })
  }

  async function transfer(params: { to: HexAddress; tokenId: bigint; proof: any; balancePCT: readonly [bigint, bigint, bigint, bigint, bigint, bigint, bigint] }) {
    await writeContract({
      address: EERC_CONTRACT.address,
      abi: EERC_CONTRACT.abi,
      functionName: 'transfer',
      args: [params.to, params.tokenId, params.proof, params.balancePCT],
      chainId: sepolia.id,
    })
  }

  return {
    deposit,
    withdraw,
    transfer,
    txHash: hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  }
}


