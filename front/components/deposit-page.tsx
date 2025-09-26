"use client"

import { useMemo, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Shield,
  Info,
  Loader2,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import { useNativeETH } from "@/hooks/use-native-eth"
import { useERC20 } from "@/hooks/use-erc20"
import { useEncryptedBalance } from "@/hooks/use-encrypted-balance"
import { useTokens } from "@/hooks/use-tokens"
import { useReadContract, useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId, useSwitchChain } from 'wagmi'
import { useRegistrationStatus } from '@/hooks/use-registration-status'
import { useRegistration } from '@/hooks/use-registration'
import { REGISTRAR_CONTRACT, EERC_CONTRACT, ERC20_TEST } from '@/lib/contracts'
import { sepolia } from 'wagmi/chains'
import { processPoseidonEncryption } from '@/lib/poseidon/poseidon'
import { parseUnits, formatUnits } from 'viem'

type TokenType = 'ETH' | 'ERC20'

type PublicToken = {
  symbol: string
  name: string
  priceUsd: number
  balance: number
  type: TokenType
  address?: string
}

const FIXED_DENOMS = [0.1, 0.5, 1.0] // ETH amounts for testnet

export default function DepositPage() {
  const router = useRouter()

  // UI State
  const [amount, setAmount] = useState<string>("")
  const [denom, setDenom] = useState<number | "">("")
  const [successOpen, setSuccessOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [depositError, setDepositError] = useState<string | null>(null)
  const [selectedTokenType, setSelectedTokenType] = useState<TokenType>('ETH')
  
  useEffect(() => {
    setMounted(true)
  }, [])
  const { address, isConnected, connector } = useAccount()
  const chainId = useChainId()
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain()
  // ETH balance hook
  const {
    balance: ethBalance,
    balanceRaw: ethBalanceRaw,
    isLoading: ethBalanceLoading,
    error: ethBalanceError,
    symbol: ethSymbol,
    decimals: ethDecimals,
  } = useNativeETH()

  // ERC20 balance hook
  const {
    balance: erc20Balance,
    balanceLoading: erc20BalanceLoading,
    claimError: erc20BalanceError,
    decimals: erc20Decimals,
    allowance,
    checkAllowanceSufficient,
    handleApproveTokens
  } = useERC20()
  
  const erc20BalanceRaw = BigInt(0) // Placeholder since not available
  
  const erc20Symbol = 'TEST'

  // Current token data based on selection
  const currentToken = useMemo(() => {
    if (selectedTokenType === 'ETH') {
      return {
        balance: ethBalance,
        balanceRaw: ethBalanceRaw,
        isLoading: ethBalanceLoading,
        error: ethBalanceError,
        symbol: ethSymbol,
        decimals: ethDecimals,
        type: 'ETH' as TokenType,
        name: 'Ethereum',
        priceUsd: 2000, // Approximate ETH price
        address: undefined
      }
    } else {
      return {
        balance: erc20Balance,
        balanceRaw: erc20BalanceRaw,
        isLoading: erc20BalanceLoading,
        error: erc20BalanceError,
        symbol: erc20Symbol,
        decimals: erc20Decimals,
        type: 'ERC20' as TokenType,
        name: 'Test Token',
        priceUsd: 1, // Test token price
        address: ERC20_TEST.address
      }
    }
  }, [selectedTokenType, ethBalance, ethBalanceRaw, ethBalanceLoading, ethBalanceError, ethSymbol, ethDecimals, erc20Balance, erc20BalanceRaw, erc20BalanceLoading, erc20BalanceError, erc20Symbol, erc20Decimals])

  // Alias for easier use
  const publicBalance = currentToken.balance
  const balanceRaw = currentToken.balanceRaw
  const balanceLoading = currentToken.isLoading
  const balanceError = currentToken.error
  const symbol = currentToken.symbol
  const decimals = currentToken.decimals

  const { tokens } = useTokens()
  const [selectedTokenAddress, setSelectedTokenAddress] = useState<`0x${string}` | null>(null)
  const firstErc20 = useMemo(() => (tokens || []).find(t => !t.isNative), [tokens])
  const selectedAddress = useMemo<`0x${string}` | undefined>(() => {
    return selectedTokenType === 'ETH'
      ? '0x0000000000000000000000000000000000000000'
      : (selectedTokenAddress || firstErc20?.address)
  }, [selectedTokenType, selectedTokenAddress, firstErc20])
  const selectedMeta = useMemo(() => (tokens || []).find(t => t.address === (selectedAddress as any)), [tokens, selectedAddress])
  const isNativeSelected = selectedTokenType === 'ETH'
  // keep selectedTokenAddress in sync with the UI token type
  useEffect(() => {
    if (!tokens || tokens.length === 0) return
    if (selectedTokenType === 'ETH') {
      setSelectedTokenAddress('0x0000000000000000000000000000000000000000')
    } else if (firstErc20) {
      setSelectedTokenAddress(firstErc20.address)
    }
  }, [selectedTokenType, tokens, firstErc20])
  const tokenDecimals = useMemo(() => selectedMeta?.decimals ?? (isNativeSelected ? 18 : 18), [selectedMeta, isNativeSelected])
  const { 
    decryptedBalance,
    isLoading: isLoadingEncryptedBalance,
    error: encryptedBalanceError
  } = useEncryptedBalance(selectedAddress as any, tokenDecimals)

  // Check if user is registered
  const { 
    isRegistered, 
    isLoading: isCheckingRegistration,
    isOnCorrectChain: isRegistrationOnCorrectChain,
    refetch: refetchRegistrationStatus
  } = useRegistrationStatus(address)

  // Check auditor status
  const { 
    data: isAuditorSet,
    isLoading: isCheckingAuditor,
    error: auditorError
  } = useReadContract({
    address: EERC_CONTRACT.address,
    abi: EERC_CONTRACT.abi,
    functionName: 'isAuditorKeySet',
    query: {
      enabled: !!address && isConnected
    }
  })

  // Registration functionality
  const { 
    register, 
    isPending: isRegistering, 
    isPreparingProof: isPreparingRegistration,
    isConfirming: isRegistrationConfirming, 
    isConfirmed: isRegistrationConfirmed, 
    error: registrationError,
    hash: registrationHash,
    hasProofReady,
    signature
  } = useRegistration(refetchRegistrationStatus)

  // Get user's public key from registrar contract
  const { 
    data: userPublicKey,
    isLoading: isLoadingPublicKey,
    error: publicKeyError
  } = useReadContract({
    address: REGISTRAR_CONTRACT.address,
    abi: REGISTRAR_CONTRACT.abi,
    functionName: 'getUserPublicKey',
    args: address ? [address] : undefined,
    chainId: sepolia.id,
    query: { 
      enabled: isRegistered && isRegistrationOnCorrectChain && !!address 
    }
  })

  const { writeContract: depositTokens, data: depositHash, isPending: isDepositPending, error: writeError } = useWriteContract()
  const { isLoading: isDepositConfirming, isSuccess: isDepositConfirmed } = useWaitForTransactionReceipt({ hash: depositHash })

  // Debug wagmi states
  useEffect(() => {
    console.log('🔍 Wagmi states:', {
      depositHash,
      isDepositPending,
      writeError: writeError?.message,
      isDepositConfirming,
      isDepositConfirmed
    })
  }, [depositHash, isDepositPending, writeError, isDepositConfirming, isDepositConfirmed])

  // Debug chain status
  useEffect(() => {
    console.log('🔗 Chain status:', {
      currentChainId: chainId,
      targetChainId: sepolia.id,
      isCorrectChain: chainId === sepolia.id,
      shouldShowSwitchButton: chainId !== sepolia.id,
      sepoliaId: sepolia.id,
      chainIdType: typeof chainId
    })
  }, [chainId])

  // Force show switch button if there's a write error about chain mismatch
  const hasChainMismatchError = writeError?.message?.includes('chain') || writeError?.message?.includes('Chain ID')
  const shouldShowSwitchButton = chainId !== sepolia.id || hasChainMismatchError

  // Add a manual refresh function
  const refreshChainStatus = () => {
    console.log('🔄 Manually refreshing chain status...')
    window.location.reload()
  }

  async function onConfirmDeposit() {
    try {
      setDepositError(null) // Clear any previous errors
      
      console.log('🔍 Pre-deposit checks:', {
        isRegistered,
        hasUserPublicKey: !!userPublicKey,
        userPublicKeyLength: userPublicKey ? (userPublicKey as readonly [bigint, bigint]).length : 0,
        address,
        isConnected,
        connector: connector?.name,
        currentChainId: chainId,
        targetChainId: sepolia.id,
        isCorrectChain: chainId === sepolia.id,
        amount: numericAmount,
        balance: publicBalance
      })
      
      // Check if user is registered first
      if (!isRegistered) {
        const errorMsg = 'User not registered. Please register first.'
        console.error('❌', errorMsg)
        setDepositError(errorMsg)
        return
      }

      // Check if auditor is set
      if (isAuditorSet === false) {
        const errorMsg = 'Auditor not set. Please set auditor first using the "Set Auditor" button.'
        console.error('❌', errorMsg)
        setDepositError(errorMsg)
        return
      }
      
      if (!userPublicKey || (userPublicKey as readonly [bigint, bigint]).length !== 2) {
        const errorMsg = 'User public key not available for deposit'
        console.error('❌', errorMsg)
        setDepositError(errorMsg)
        return
      }
      
      if (!address || !isConnected) {
        const errorMsg = 'Wallet not connected'
        console.error('❌', errorMsg)
        setDepositError(errorMsg)
        return
      }
      
      if (chainId !== sepolia.id) {
        console.log('🔄 Wrong network detected, switching to Ethereum Sepolia...')
        try {
          await switchChain({ chainId: sepolia.id })
          console.log('✅ Switched to Ethereum Sepolia, please retry deposit')
          setDepositError('Network switched. Please click "Confirm Deposit" again to complete the transaction.')
          return
        } catch (error) {
          const errorMsg = `Failed to switch to Ethereum Sepolia. Please switch manually to Chain ID: ${sepolia.id}`
          console.error('❌', errorMsg)
          setDepositError(errorMsg)
          return
        }
      }
      
      const pub = [BigInt((userPublicKey as readonly [bigint, bigint])[0].toString()), BigInt((userPublicKey as readonly [bigint, bigint])[1].toString())]
      
      // Convert amount to wei first, then to BigInt for encryption
      const amountWei = parseUnits(String(numericAmount), decimals || 18)
      const depAmt = amountWei // Use the wei amount directly
      
      const { ciphertext, nonce, authKey } = processPoseidonEncryption([depAmt], pub)
      const amountPCT: [bigint, bigint, bigint, bigint, bigint, bigint, bigint] = [
        ...ciphertext,
        ...authKey,
        nonce,
      ] as [bigint, bigint, bigint, bigint, bigint, bigint, bigint]
      
      console.log('🔐 Ready to deposit with public key:', {
        amount: numericAmount,
        amountWei: amountWei.toString(),
        balance: publicBalance,
        userPublicKey: pub.map(k => k.toString()),
        amountPCT: amountPCT.map(x => x.toString()),
        timestamp: new Date().toISOString()
      })
      
      // For native ETH, we need to send the value directly
      console.log('🚀 Submitting deposit transaction...')
      console.log('📋 Transaction details:', {
        contractAddress: EERC_CONTRACT.address,
        functionName: 'deposit',
        args: [amountWei.toString(), "0x0000000000000000000000000000000000000000", amountPCT.map(x => x.toString())],
        chainId: sepolia.id,
        value: amountWei.toString(),
        userAddress: address
      })
      
      // Validate the deposit parameters
      console.log('🔍 Validating deposit parameters:', {
        amountWei: amountWei.toString(),
        tokenAddress: "0x0000000000000000000000000000000000000000",
        amountPCTLength: amountPCT.length,
        amountPCTValues: amountPCT.map(x => x.toString()),
        userPublicKey: pub.map(k => k.toString()),
        isRegistered,
        hasUserPublicKey: !!userPublicKey
      })
      
      console.log('🔄 Calling depositTokens function...')
      
      // Prepare deposit arguments based on token type
      let depositArgs: [bigint, `0x${string}`, readonly [bigint, bigint, bigint, bigint, bigint, bigint, bigint]]
      let depositValue: bigint | undefined
      
      if (selectedTokenType === 'ETH') {
        // Native ETH deposit
        depositArgs = [amountWei, "0x0000000000000000000000000000000000000000", amountPCT]
        depositValue = amountWei
      } else {
        // ERC20 token deposit: approve then deposit in one click
        depositArgs = [amountWei, currentToken.address!, amountPCT]
        depositValue = undefined

        if (!checkAllowanceSufficient(amount)) {
          console.log('🔄 Insufficient allowance, approving tokens...')
          await handleApproveTokens(amount)
          console.log('✅ Tokens approved, proceeding to deposit...')
        }
      }
      
      const result = await depositTokens({
        address: EERC_CONTRACT.address,
        abi: EERC_CONTRACT.abi,
        functionName: 'deposit',
        args: depositArgs,
        chainId: sepolia.id,
        value: depositValue as any,
      })
      
      console.log('✅ Deposit transaction submitted successfully!', result)
      console.log('📊 Transaction hash:', result)
      console.log('⏳ Waiting for transaction confirmation...')
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('❌ Deposit failed:', error)
      setDepositError(errorMsg)
    }
  }

  // Create dynamic token from native ETH balance
  const selectedToken: PublicToken = useMemo(() => ({
    symbol: symbol || "ETH",
    name: currentToken.name,
    priceUsd: currentToken.priceUsd,
    balance: parseFloat(publicBalance || "0"),
    type: currentToken.type,
    address: currentToken.address
  }), [publicBalance, symbol, currentToken])

  // Derived values (UI only)
  const numericAmount = useMemo(() => Number.parseFloat(amount.replace(/,/g, "")) || 0, [amount])
  const amountUsd = useMemo(() => numericAmount * selectedToken.priceUsd, [numericAmount, selectedToken])
  const insufficient = numericAmount > selectedToken.balance
  const canConfirm = numericAmount > 0 && !insufficient && !balanceLoading && isRegistered && chainId === sepolia.id && !isSwitchingChain && isAuditorSet === true

  // All useEffect hooks must be before any early returns
  useEffect(() => {
    if (isDepositConfirmed) {
      setSuccessOpen(true)
      // Refresh encrypted balance after successful deposit
      console.log('🔄 Refreshing encrypted balance after deposit...')
      setTimeout(() => {
        window.location.reload() // Force refresh to get updated balance
      }, 3000) // Wait 3 seconds for blockchain to update
    }
  }, [isDepositConfirmed, numericAmount, selectedToken.symbol])

  // Refetch registration status when registration is confirmed
  useEffect(() => {
    if (isRegistrationConfirmed) {
      console.log('✅ Registration confirmed, refetching status...')
      // Wait a bit for the transaction to be mined, then refetch
      setTimeout(() => {
        console.log('🔄 Refetching registration status...')
        refetchRegistrationStatus()
      }, 2000)
    }
  }, [isRegistrationConfirmed, refetchRegistrationStatus])

  // Also refetch when the page loads to ensure we have the latest status
  useEffect(() => {
    if (address && !isCheckingRegistration) {
      console.log('🔄 Initial registration status check...')
      refetchRegistrationStatus()
    }
  }, [address, refetchRegistrationStatus, isCheckingRegistration])

  // Monitor write errors
  useEffect(() => {
    if (writeError) {
      console.error('❌ Write contract error:', writeError)
      setDepositError(writeError.message || 'Transaction failed')
    }
  }, [writeError])

  // Clear errors when chain switches correctly
  useEffect(() => {
    if (chainId === sepolia.id && !hasChainMismatchError) {
      console.log('✅ Chain is correct, clearing errors...')
      setDepositError(null)
    }
  }, [chainId, hasChainMismatchError])

  // Prevent hydration issues
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  function setPct(p: number) {
    const next = Math.max(0, Math.min(selectedToken.balance, +(selectedToken.balance * p).toFixed(6)))
    setAmount(next.toString())
  }

  function setMax() {
    setAmount(String(selectedToken.balance))
  }

  // Function to switch to Ethereum Sepolia for deposits
  const switchToAvalancheFuji = async () => {
    try {
      console.log('🔄 Switching to Ethereum Sepolia for deposits...')
      console.log('📍 Current chain before switch:', chainId)
      
      await switchChain({ chainId: sepolia.id })
      
      console.log('✅ Switch request sent, waiting for confirmation...')
      
      // Wait for the chain switch to complete
      let attempts = 0
      const maxAttempts = 10
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second
        
        console.log(`🔄 Checking chain switch... attempt ${attempts + 1}/${maxAttempts}`)
        console.log('📍 Current chain after switch:', chainId)
        
        if (chainId === sepolia.id) {
          console.log('✅ Chain switch confirmed!')
          setDepositError(null) // Clear any previous errors
          return
        }
        
        attempts++
      }
      
      console.log('⚠️ Chain switch may not have completed, but continuing...')
      
    } catch (error) {
      console.error('❌ Failed to switch chain:', error)
      setDepositError('Failed to switch to Ethereum Sepolia network. Please switch manually in your wallet.')
    }
  }

  // Test function to debug writeContract
  const testWriteContract = async () => {
    try {
      console.log('🧪 Testing writeContract with simple transaction...')
      console.log('📋 Test transaction details:', {
        address: EERC_CONTRACT.address,
        abi: EERC_CONTRACT.abi,
        functionName: 'name', // Read function
        chainId: sepolia.id
      })
      
        // Try a simple read first to test connection
        const result = await depositTokens({
          address: EERC_CONTRACT.address,
          abi: EERC_CONTRACT.abi,
          functionName: 'deposit',
          args: [BigInt(0), "0x0000000000000000000000000000000000000000", [BigInt(0), BigInt(0), BigInt(0), BigInt(0), BigInt(0), BigInt(0), BigInt(0)]],
          chainId: sepolia.id,
        })
      
      console.log('✅ Test transaction result:', result)
    } catch (error) {
      console.error('❌ Test transaction failed:', error)
    }
  }

  const obfuscate = (addr?: string) => (addr && addr.startsWith("0x") && addr.length > 6 ? `${addr.slice(0,6)}…${addr.slice(-4)}` : "0x…")
  const stealthAddress = mounted ? obfuscate(address) : "0x…"
  const receiveLabel = denom
    ? `Deposit ${denom} ${selectedToken.symbol} → Receive ${denom} e${selectedToken.symbol}`
    : `Deposit ${selectedToken.symbol} → Receive e${selectedToken.symbol}`

  return (
    <TooltipProvider>
      <div className="relative min-h-screen w-full overflow-hidden flex flex-col items-center">
        {/* Local metallic gradient defs */}
        <svg aria-hidden="true" width="0" height="0" className="absolute">
          <defs>
            <linearGradient id="metallic-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="45%" stopColor="#d4d4d4" />
              <stop offset="100%" stopColor="#737373" />
            </linearGradient>
          </defs>
        </svg>
        {/* Background image */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
        {/* Dark overlay */}
        <div className="pointer-events-none absolute inset-0 bg-black/10" />

        {/* Page container */}
        <div className="w-full max-w-6xl mx-auto px-4 pb-10 relative z-10 pt-8">
          {/* Glass wrapper */}
          <div className="relative rounded-[32px] overflow-hidden shadow-[0_24px_70px_rgba(0,0,0,0.55)]">
            <div className="absolute inset-0 opacity-45 pointer-events-none" style={{ background: "transparent" }} />
            <div
              className="absolute -inset-1 rounded-[36px] pointer-events-none"
              style={{
                background: "radial-gradient(80% 50% at 10% 0%, rgba(255,255,255,0.12), rgba(255,255,255,0) 60%)",
              }}
            />
            <div
              className="relative backdrop-blur-3xl backdrop-saturate-200 border border-white/15 rounded-[32px] p-5 sm:p-6 lg:p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_56px_rgba(0,0,0,0.55)]"
              style={{ background: "transparent" }}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-xl font-light tracking-tight flex items-center gap-2">
                    <button className="text-xl font-light tracking-tight bg-gradient-to-b from-white via-zinc-300 to-zinc-500 bg-clip-text text-transparent">Deposit</button>
                    <span className="inline-flex items-center gap-1 text-white text-xs px-2.5 py-1.5 rounded-md bg-white/10 border border-white/15">
                      <Shield className="w-3.5 h-3.5 [stroke:url(#metallic-gradient)]" /> public → private
                    </span>
                  </div>
                  <div className="text-white text-base font-medium mt-2">
                    Convert your ETH into private eETH tokens.
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push("/dashboard")}
                    className="px-3 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white hover:bg-white/15 inline-flex items-center gap-2 text-sm"
                  >
                    <ArrowLeft className="w-4 h-4" /> Dashboard
                  </button>
                  {/* Tooltip */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="p-2 rounded-lg border border-white/10 bg-white/10 text-white">
                        <Info className="w-5 h-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="w-80 text-white border-white/15" side="bottom" align="end">
                      Your ETH is locked in the ShieldedVault, and you receive private eETH equivalents that only
                      you can spend.
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>


              {/* Registration Status */}
              {!isRegistered && (
                <div className="mb-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-400" />
                      <div>
                        <div className="text-yellow-200 font-medium">Registration Required</div>
                        <div className="text-yellow-300/80 text-sm">
                          {isPreparingRegistration 
                            ? "Preparing registration proof..." 
                            : isRegistering
                            ? "Signing registration transaction..."
                            : isRegistrationConfirming 
                            ? "Registration transaction is being confirmed..." 
                            : "You need to register with the EERC system before making deposits."
                          }
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => refetchRegistrationStatus()}
                        disabled={isCheckingRegistration}
                        className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/20 text-sm"
                      >
                        {isCheckingRegistration ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Refresh"
                        )}
                      </Button>
                      <Button
                        onClick={register}
                        disabled={isPreparingRegistration || isRegistering || isRegistrationConfirming}
                        className="bg-yellow-500 hover:bg-yellow-600 text-black font-medium px-4 py-2 rounded-lg"
                      >
                        {isPreparingRegistration ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Preparing...
                          </>
                        ) : isRegistering ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Signing...
                          </>
                        ) : isRegistrationConfirming ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Confirming...
                          </>
                        ) : (
                          "Register Now"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {isRegistered && (
                <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                      <div>
                        <div className="text-green-200 font-medium">Registration Complete</div>
                        <div className="text-green-300/80 text-sm">You're ready to make private deposits.</div>
                      </div>
                    </div>
                    <Button
                      onClick={() => refetchRegistrationStatus()}
                      disabled={isCheckingRegistration}
                      className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/20 text-sm"
                    >
                      {isCheckingRegistration ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Refresh"
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Chain Status */}
              {shouldShowSwitchButton && (
                <div className="mb-6 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-orange-400" />
                      <div>
                        <div className="text-orange-200 font-medium">Wrong Network</div>
                        <div className="text-orange-300/80 text-sm">
                          You're on Chain ID: {chainId}. Deposits require Ethereum Sepolia (Chain ID: {sepolia.id}).
                          {hasChainMismatchError && " Click the button below to switch networks."}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={switchToAvalancheFuji}
                        disabled={isSwitchingChain}
                        className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-4 py-2 rounded-lg"
                      >
                        {isSwitchingChain ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Switching...
                          </>
                        ) : (
                          "Switch to Ethereum Sepolia"
                        )}
                      </Button>
                      <Button
                        onClick={refreshChainStatus}
                        className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-3 py-2 rounded-lg text-sm"
                      >
                        Refresh
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Grid content */}
              <div className="grid lg:grid-cols-3 gap-6 mt-6">
                {/* Left: Token & Amount + Key Generation + Privacy Settings */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Token & Amount */}
                  <section
                    className="rounded-2xl backdrop-blur-xl border border-white/15 p-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_10px_28px_rgba(0,0,0,0.45)]"
                    style={{ background: "transparent" }}
                  >
                    <div className="flex items-center justify-between">
                      <label className="text-white text-base font-semibold">Token & Amount</label>
                      <div className="text-xs text-white">
                        1 {selectedToken.symbol} ≈ ${selectedToken.priceUsd.toLocaleString()}
                      </div>
                    </div>

                    {/* Token Switcher */}
                    <div className="mt-4 mb-4">
                      <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
                        <button
                          onClick={() => { setSelectedTokenType('ETH'); setSelectedTokenAddress('0x0000000000000000000000000000000000000000') }}
                          className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                            selectedTokenType === 'ETH'
                              ? 'bg-white/20 text-white border border-white/20'
                              : 'text-white/60 hover:text-white/80 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-5 h-5 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full"></div>
                            <span>ETH</span>
                          </div>
                          <div className="text-xs mt-1 opacity-80">
                            Balance: {ethBalanceLoading ? '...' : `${parseFloat(ethBalance || '0').toFixed(4)} ETH`}
                          </div>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTokenType('ERC20');
                            const firstErc20 = (tokens || []).find(t => !t.isNative)
                            if (firstErc20) setSelectedTokenAddress(firstErc20.address)
                          }}
                          className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                            selectedTokenType === 'ERC20'
                              ? 'bg-white/20 text-white border border-white/20'
                              : 'text-white/60 hover:text-white/80 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-5 h-5 bg-gradient-to-br from-green-400 to-blue-600 rounded-full"></div>
                            <span>TEST</span>
                          </div>
                          <div className="text-xs mt-1 opacity-80">
                            Balance: {erc20BalanceLoading ? '...' : `${parseFloat(erc20Balance || '0').toFixed(4)} TEST`}
                          </div>
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid sm:grid-cols-[1fr_auto] gap-4 items-stretch">
                      {/* Selected Token Display */}
                      <div className="w-full text-left backdrop-blur-xl border border-white/15 rounded-2xl px-5 py-4 flex items-center justify-between shadow-[inset_0_-1px_0_rgba(255,255,255,0.06)]"
                        style={{ background: "transparent" }}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                            selectedTokenType === 'ETH' 
                              ? 'bg-gradient-to-br from-blue-400 to-purple-600' 
                              : 'bg-gradient-to-br from-green-400 to-blue-600'
                          }`}>
                            <span className="text-white text-sm font-bold">{selectedToken.symbol[0]}</span>
                          </div>
                          <div>
                            <div className="text-white text-lg font-semibold">{selectedMeta?.isNative ? 'ETH' : selectedToken.symbol}</div>
                            <div className="text-white text-xs">{selectedMeta?.isNative ? 'Ethereum' : selectedToken.symbol.replace(/^e/, '')}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-white text-sm font-medium">
                            {balanceLoading ? '...' : `${parseFloat(publicBalance || '0').toFixed(4)}`}
                          </div>
                          <div className="text-white/60 text-xs">Balance</div>
                        </div>
                      </div>

                      {/* Amount input */}
                      <div
                        className="rounded-2xl backdrop-blur-xl border border-white/15 px-5 py-4 flex flex-col justify-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_10px_28px_rgba(0,0,0,0.45)]"
                        style={{ background: "transparent" }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-white text-sm font-medium">Amount</span>
                          <div className="flex items-center gap-1.5">
                            <Button
                              onClick={() => setPct(0.25)}
                              variant="outline"
                              className="h-7 px-2 text-[11px] border-white/15 bg-white/10 hover:bg-white/15 text-white"
                            >
                              25%
                            </Button>
                            <Button
                              onClick={() => setPct(0.5)}
                              variant="outline"
                              className="h-7 px-2 text-[11px] border-white/15 bg-white/10 hover:bg-white/15 text-white"
                            >
                              50%
                            </Button>
                            <Button
                              onClick={setMax}
                              variant="outline"
                              className="h-7 px-2 text-[11px] border-white/15 bg-white/10 hover:bg-white/15 text-white"
                            >
                              Max
                            </Button>
                          </div>
                        </div>
                        <Input
                          value={amount}
                          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                          placeholder="0.00"
                          className="w-full bg-transparent outline-none text-right text-[28px] leading-[1.1] font-bold text-white tracking-tight mt-1"
                          inputMode="decimal"
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-sm text-white">
                        Wallet balance: {balanceLoading ? "Loading..." : `${selectedToken.balance.toLocaleString()} ${selectedToken.symbol}`}
                      </div>
                      <div className="text-sm text-white">
                        ≈ ${amountUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </div>
                    </div>

                    {insufficient && (
                      <div className="mt-3 flex items-center gap-2 text-rose-200 bg-rose-500/15 border border-rose-500/40 px-3 py-2 rounded-lg text-sm">
                        <AlertTriangle className="w-4 h-4" /> Insufficient balance
                      </div>
                    )}

                    {depositError && (
                      <div className="mt-3 flex items-center gap-2 text-rose-200 bg-rose-500/15 border border-rose-500/40 px-3 py-2 rounded-lg text-sm">
                        <AlertTriangle className="w-4 h-4" /> {depositError}
                      </div>
                    )}
                  </section>


                  {/* Quick Amount Selection */}
                  <section
                    className="rounded-2xl backdrop-blur-xl border border-white/15 p-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_10px_28px_rgba(0,0,0,0.45)]"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                  >
                    <div className="text-white text-base font-semibold mb-2">Quick Amounts</div>
                    <div className="text-sm text-white mb-4">
                      Select a preset amount or enter custom amount above.
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {FIXED_DENOMS.map((d) => (
                        <button
                          key={d}
                          onClick={() => {
                            setDenom(d)
                            setAmount(d.toString())
                          }}
                          className={`px-4 py-3 rounded-xl border transition ${
                            denom === d
                              ? "bg-white/15 border-white/25 text-white"
                              : "bg-white/10 border-white/15 text-white hover:bg-white/15"
                          }`}
                        >
                          {d.toLocaleString()} {selectedToken.symbol}
                        </button>
                      ))}
                    </div>
                  </section>
                </div>

                {/* Right: Transaction Summary + CTA */}
                <div className="space-y-6">
                  {/* Summary */}
                  <section
                    className="rounded-2xl backdrop-blur-xl border border-white/15 p-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_10px_28px_rgba(0,0,0,0.45)]"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                  >
                    <div className="text-white text-base font-semibold mb-3">Transaction Summary</div>

                    <div className="space-y-2 text-sm text-white">
                      <div className="flex items-center justify-between">
                        <span>Action</span>
                        <span className="font-medium">{receiveLabel}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Recipient</span>
                        <span className="font-mono text-white">ShieldedVault</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Stealth address</span>
                        <span className="font-mono text-white">{stealthAddress}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Network fees</span>
                        <span className="text-white">~ $0.50</span>
                      </div>
                    </div>

                    <div className="mt-4 text-xs text-white">
                      Step 1: Send ETH • Step 2: Lock in ShieldedVault • Step 3: Mint eETH note
                    </div>
                  </section>

                  {/* CTA */}
                  <section
                    className="rounded-2xl backdrop-blur-xl border border-white/15 p-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_10px_28px_rgba(0,0,0,0.45)]"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                  >
                    {!shouldShowSwitchButton ? (
                      <Button
                        onClick={onConfirmDeposit}
                        disabled={!canConfirm || isDepositPending || isDepositConfirming}
                        className="w-full flex items-center justify-center gap-2 h-12 px-8 rounded-full bg-[#e6ff55] text-[#0a0b0e] font-bold text-sm hover:brightness-110 transition disabled:opacity-60"
                      >
                        {isDepositPending || isDepositConfirming ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {isDepositPending ? "Sending…" : "Confirming…"}
                          </>
                        ) : (
                          <>
                            <Shield className="w-4 h-4" /> Confirm Deposit
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        onClick={switchToAvalancheFuji}
                        disabled={isSwitchingChain}
                        className="w-full flex items-center justify-center gap-2 h-12 px-8 rounded-full bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 transition disabled:opacity-60"
                      >
                        {isSwitchingChain ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Switching...
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-4 h-4" /> Switch to Ethereum Sepolia
                          </>
                        )}
                      </Button>
                    )}

                    {/* Debug Test Button */}
                    <Button
                      onClick={testWriteContract}
                      className="w-full flex items-center justify-center gap-2 h-8 px-4 rounded-full bg-blue-500 text-white font-medium text-xs hover:bg-blue-600 transition mt-2"
                    >
                      🧪 Test Contract Connection
                    </Button>

                    {/* Debug Chain Button */}
                    <Button
                      onClick={() => {
                        console.log('🔍 Debug Chain Info:', {
                          chainId,
                          sepoliaId: sepolia.id,
                          isCorrectChain: chainId === sepolia.id,
                          shouldShowSwitchButton,
                          hasChainMismatchError,
                          writeError: writeError?.message
                        })
                      }}
                      className="w-full flex items-center justify-center gap-2 h-8 px-4 rounded-full bg-purple-500 text-white font-medium text-xs hover:bg-purple-600 transition mt-2"
                    >
                      🔍 Debug Chain Status
                    </Button>

                    {/* Auditor Status and Set Button */}
                    <div className="space-y-2">
                      <div className="text-xs text-white/60 text-center">
                        Auditor Status: {isCheckingAuditor ? 'Checking...' : isAuditorSet ? '✅ Set' : '❌ Not Set'}
                      </div>
                      {!isAuditorSet && (
                        <Button
                          onClick={async () => {
                            try {
                              console.log('🔐 Setting auditor public key...')
                              const txHash = await depositTokens({
                                address: EERC_CONTRACT.address,
                                abi: EERC_CONTRACT.abi,
                                functionName: 'setAuditorPublicKey',
                                args: [address!], // Use current user as auditor
                                chainId: sepolia.id,
                              })
                              console.log('✅ Auditor set transaction submitted:', txHash)
                              setDepositError('Auditor set transaction submitted. Please wait for confirmation.')
                            } catch (error: any) {
                              console.error('❌ Failed to set auditor:', error)
                              setDepositError(`Failed to set auditor: ${error.message}`)
                            }
                          }}
                          className="w-full flex items-center justify-center gap-2 h-8 px-4 rounded-full bg-orange-500 text-white font-medium text-xs hover:bg-orange-600 transition"
                        >
                          🔐 Set Auditor (Admin)
                        </Button>
                      )}
                    </div>

                  </section>

                  {/* Success state */}
                  {successOpen && (
                    <section
                      className="rounded-2xl backdrop-blur-xl border border-white/15 p-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_10px_28px_rgba(0,0,0,0.45)]"
                      style={{ background: "transparent" }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#e6ff55] text-[#0a0b0e] flex items-center justify-center">
                          <CheckCircle2 className="w-6 h-6 text-black" />
                        </div>
                        <div>
                          <div className="text-white font-semibold">
                            Deposit complete. You now have {numericAmount} e{selectedToken.symbol} in your private
                            balance.
                          </div>
                          <div className="text-white text-sm mt-1">
                            Your {selectedToken.symbol} is now shielded. Only you can prove ownership.
                          </div>
                          <div className="mt-3 flex items-center gap-2">
                            <Button
                              onClick={() => router.push("/dashboard")}
                              className="px-3 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white hover:bg-white/15 inline-flex items-center gap-2 text-sm"
                            >
                              <ArrowRight className="w-4 h-4" /> Go to Dashboard
                            </Button>
                            <Button
                              onClick={() => setSuccessOpen(false)}
                              variant="outline"
                              className="px-3 py-2 rounded-full bg-white/10 border border-white/15 text-white hover:bg-white/15 text-sm"
                            >
                              Dismiss
                            </Button>
                          </div>
                        </div>
                      </div>
                    </section>
                  )}
                </div>
              </div>

              {/* Balance Info */}
              <section
                className="mt-6 rounded-2xl backdrop-blur-xl border border-white/15 p-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_10px_28px_rgba(0,0,0,0.45)]"
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                <div className="flex items-center justify-between">
                  <div className="text-white text-base font-semibold">Current Balance</div>
                  <div className="text-xs text-white/70">Balances</div>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-sm py-2">
                    <div className="text-white">Public {selectedToken.symbol}</div>
                    <div className="text-white font-mono">{selectedToken.balance.toLocaleString()} {selectedToken.symbol}</div>
                  </div>
                  <div className="flex items-center justify-between text-sm py-2">
                    <div className="text-white">Private {isNativeSelected ? 'eETH' : `e${currentToken.symbol}`}</div>
                    <div className="text-white font-mono">
                      {isLoadingEncryptedBalance ? "Loading..." : `${decryptedBalance || "0"} ${isNativeSelected ? 'eETH' : `e${currentToken.symbol}`}`}
                    </div>
                  </div>
                </div>
                
              </section>
            </div>
          </div>
        </div>

      </div>
    </TooltipProvider>
  )
}
