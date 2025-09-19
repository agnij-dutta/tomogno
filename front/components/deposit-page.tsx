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
import { useNativeAVAX } from "@/hooks/use-native-avax"
import { useEncryptedBalance } from "@/hooks/use-encrypted-balance"
import { useReadContract, useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useRegistrationStatus } from '@/hooks/use-registration-status'
import { useRegistration } from '@/hooks/use-registration'
import { REGISTRAR_CONTRACT, EERC_CONTRACT, ERC20_TEST } from '@/lib/contracts'
import { avalancheFuji } from 'wagmi/chains'
import { processPoseidonEncryption } from '@/lib/poseidon/poseidon'
import { parseUnits, formatUnits } from 'viem'

type PublicToken = {
  symbol: string
  name: string
  priceUsd: number
  balance: number
}

const FIXED_DENOMS = [1, 5, 10] // AVAX amounts for testnet

export default function DepositPage() {
  const router = useRouter()

  // UI State
  const [amount, setAmount] = useState<string>("")
  const [denom, setDenom] = useState<number | "">("")
  const [successOpen, setSuccessOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => setMounted(true), [])
  const { address } = useAccount()
  const {
    balance: publicBalance,
    balanceRaw,
    isLoading: balanceLoading,
    error: balanceError,
    symbol,
    decimals,
  } = useNativeAVAX()

  const { 
    decryptedBalance,
    isLoading: isLoadingEncryptedBalance,
    error: encryptedBalanceError
  } = useEncryptedBalance()

  // Check if user is registered
  const { 
    isRegistered, 
    isLoading: isCheckingRegistration,
    isOnCorrectChain: isRegistrationOnCorrectChain,
    refetch: refetchRegistrationStatus
  } = useRegistrationStatus(address)

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
    chainId: avalancheFuji.id,
    query: { 
      enabled: isRegistered && isRegistrationOnCorrectChain && !!address 
    }
  })

  const { writeContract: depositTokens, data: depositHash, isPending: isDepositPending } = useWriteContract()
  const { isLoading: isDepositConfirming, isSuccess: isDepositConfirmed } = useWaitForTransactionReceipt({ hash: depositHash })

  async function onConfirmDeposit() {
    // Check if user is registered first
    if (!isRegistered) {
      console.error('❌ User not registered. Please register first.')
      return
    }
    
    if (!userPublicKey || (userPublicKey as any[]).length !== 2) {
      console.error('❌ User public key not available for deposit')
      return
    }
    
    const pub = [BigInt((userPublicKey as any[])[0].toString()), BigInt((userPublicKey as any[])[1].toString())]
    
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
    
    // For native AVAX, we need to send the value directly
    await depositTokens({
      address: EERC_CONTRACT.address,
      abi: EERC_CONTRACT.abi,
      functionName: 'deposit',
      args: [amountWei, "0x0000000000000000000000000000000000000000", amountPCT], // Zero address for native token
      chainId: avalancheFuji.id,
      value: amountWei, // Send native AVAX
    })
  }

  // Create dynamic token from native AVAX balance
  const selectedToken: PublicToken = useMemo(() => ({
    symbol: symbol || "AVAX",
    name: "Avalanche", 
    priceUsd: 25, // Approximate AVAX price
    balance: parseFloat(publicBalance || "0")
  }), [publicBalance, symbol])

  // Derived values (UI only)
  const numericAmount = useMemo(() => Number.parseFloat(amount.replace(/,/g, "")) || 0, [amount])
  const amountUsd = useMemo(() => numericAmount * selectedToken.priceUsd, [numericAmount, selectedToken])
  const insufficient = numericAmount > selectedToken.balance
  const canConfirm = numericAmount > 0 && !insufficient && !balanceLoading && isRegistered

  function setPct(p: number) {
    const next = Math.max(0, Math.min(selectedToken.balance, +(selectedToken.balance * p).toFixed(6)))
    setAmount(next.toString())
  }

  function setMax() {
    setAmount(String(selectedToken.balance))
  }


  useEffect(() => {
    if (isDepositConfirmed) {
      setSuccessOpen(true)
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
                    Convert your AVAX into private eAVAX tokens.
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
                      Your AVAX is locked in the ShieldedVault, and you receive private eAVAX equivalents that only
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

                    <div className="mt-4 grid sm:grid-cols-[1fr_auto] gap-4 items-stretch">
                      {/* Token display (fixed to USDC) */}
                      <div className="w-full text-left backdrop-blur-xl border border-white/15 rounded-2xl px-5 py-4 flex items-center justify-between shadow-[inset_0_-1px_0_rgba(255,255,255,0.06)]"
                        style={{ background: "transparent" }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-7 h-7 bg-[#e6ff55] rounded-full flex items-center justify-center">
                            <span className="text-black text-sm font-bold">{selectedToken.symbol[0]}</span>
                          </div>
                          <div>
                            <div className="text-white text-lg font-semibold">{selectedToken.symbol}</div>
                            <div className="text-white text-xs">{selectedToken.name}</div>
                          </div>
                        </div>
                        <div className="text-white text-xs">Fixed</div>
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
                      Step 1: Send AVAX • Step 2: Lock in ShieldedVault • Step 3: Mint eAVAX note
                    </div>
                  </section>

                  {/* CTA */}
                  <section
                    className="rounded-2xl backdrop-blur-xl border border-white/15 p-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_10px_28px_rgba(0,0,0,0.45)]"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                  >
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
                  <div className="text-xs text-white">Live data</div>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-sm py-2">
                    <div className="text-white">Public AVAX</div>
                    <div className="text-white font-mono">{selectedToken.balance.toLocaleString()} AVAX</div>
                  </div>
                  <div className="flex items-center justify-between text-sm py-2">
                    <div className="text-white">Private eAVAX</div>
                    <div className="text-white font-mono">
                      {isLoadingEncryptedBalance ? "Loading..." : `${decryptedBalance || "0"} eAVAX`}
                    </div>
                  </div>
                </div>
                <div className="mt-3 p-3 rounded-lg bg-white/10 border border-white/15 text-xs text-white flex items-center gap-2">
                  <Wallet className="w-3.5 h-3.5" /> Real-time balance from contracts.
                </div>
              </section>
            </div>
          </div>
        </div>

      </div>
    </TooltipProvider>
  )
}
