"use client"
import { Shield, ArrowUpRight, DollarSign, Coins, CheckCircle2, AlertTriangle, Wallet, ArrowLeftRight } from "lucide-react"
import { useMemo, useState, useEffect } from "react"
import { useEncryptedBalance } from "@/hooks/use-encrypted-balance"
import { useAccount } from 'wagmi'
import { useRouter } from "next/navigation"

type TokenRow = {
  symbol: string
  balance: number
  usd: number
  icon?: React.ComponentType<{ className?: string }>
}

export default function TsunamiDashboard() {
  const router = useRouter()
  const [showBalances, setShowBalances] = useState(true)
  const { address } = useAccount()
  const { decryptedBalance, isLoading: isLoadingBalance, error: balanceError } = useEncryptedBalance()
  const [hasZkAttestation, setHasZkAttestation] = useState<boolean>(true)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const decryptedNum = useMemo(() => {
    const n = Number(decryptedBalance || 0)
    return Number.isFinite(n) ? n : 0
  }, [decryptedBalance])
  const tokens: TokenRow[] = useMemo(() => [
    { symbol: "eETH", balance: decryptedNum, usd: decryptedNum * 2000, icon: DollarSign }, // ETH price ~$2000
  ], [decryptedNum])

  const totalUsd = useMemo(() => tokens.reduce((sum, t) => sum + t.usd, 0), [tokens])

  const obfuscate = (addr?: string) => (addr && addr.startsWith("0x") && addr.length > 6 ? `${addr.slice(0,6)}…${addr.slice(-4)}` : "0x…")

  const goDeposit = () => router.push("/deposit")
  const goSwap = (prefill?: { from?: string; to?: string }) => {
    const params = new URLSearchParams()
    if (prefill?.from) params.set("from", prefill.from)
    if (prefill?.to) params.set("to", prefill.to)
    router.push(`/swap${params.toString() ? `?${params.toString()}` : ""}`)
  }
  const goWithdraw = () => router.push("/withdraw")

  // No analytics segment in minimal build

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col font-sans">
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
          backgroundImage: "url('/back.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      {/* Dark overlay for better readability */}
      <div className="pointer-events-none absolute inset-0 bg-black/10" />

      {/* Header / Identity */}
      <header className="sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="backdrop-blur-3xl backdrop-saturate-200 border border-white/15 rounded-2xl px-4 py-3 flex items-center justify-between shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_56px_rgba(0,0,0,0.35)]" style={{ background: "transparent" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shadow-sm">
                <Shield className="w-5 h-5 text-black" />
              </div>
              <div className="flex items-center gap-2 text-white/90 text-sm">
                <span className="hidden xs:inline">Wallet:</span>
                <span className="font-mono text-white">{mounted ? obfuscate(address) : "0x…"}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasZkAttestation ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-300 text-xs px-2.5 py-1.5 rounded-md bg-emerald-500/15 border border-emerald-500/40">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Compliant
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-yellow-200 text-xs px-2.5 py-1.5 rounded-md bg-yellow-500/15 border border-yellow-500/40">
                  <AlertTriangle className="w-3.5 h-3.5" /> Unverified
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 relative z-10">
        {/* Quick Actions (Always Visible) */}
        <div className="sticky top-[72px] z-20">
          <div className="grid grid-cols-3 gap-3">
            <button onClick={goDeposit} className="flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-[#e6ff55] text-[#0a0b0e] font-bold hover:brightness-110 transition-all">
              <Wallet className="w-4 h-4" /> Deposit
            </button>
            <button onClick={() => goSwap()} className="flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white/90 font-semibold hover:bg-white/15 transition-colors">
              <ArrowLeftRight className="w-4 h-4" /> Private Swap
            </button>
            <button onClick={goWithdraw} className="flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white/90 font-semibold hover:bg-white/15 transition-colors">
              <ArrowUpRight className="w-4 h-4" /> Withdraw
            </button>
          </div>
        </div>

        {/* Balances Section */}
        <section className="backdrop-blur-xl border border-white/15 rounded-2xl p-6 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_16px_56px_rgba(0,0,0,0.45)]" style={{ background: "transparent" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold bg-gradient-to-b from-white via-zinc-300 to-zinc-500 bg-clip-text text-transparent tracking-tight">Private Balances</h2>
            <button
              onClick={() => setShowBalances((s) => !s)}
              className="text-xs px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/15 text-white/90 border border-white/15"
            >
              {showBalances ? "Hide" : "Show"}
            </button>
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-b from-white via-zinc-300 to-zinc-500 bg-clip-text text-transparent tracking-tight">
            {showBalances ? `$${totalUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "••••"}
          </div>
          <div className="mt-2 text-sm text-white/80">
            {address ? (
              isLoadingBalance ? 'Decrypting encrypted balance…' : balanceError ? (
                'Error'
            ) : (
              `Encrypted total: ${decryptedBalance ?? 0} eETH`
            )
            ) : (
              'Connect wallet to view encrypted balance'
            )}
          </div>
          <div className="mt-4 divide-y divide-white/10">
            {tokens.map((t) => (
              <div key={t.symbol} className="py-4 flex items-center gap-3 justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center">
                    {t.icon ? <t.icon className="w-4 h-4 text-white" /> : <Coins className="w-4 h-4 text-white" />}
                  </div>
                  <div>
                    <div className="text-white font-medium">{t.symbol}</div>
                    <div className="text-xs text-white/70">
                      {showBalances ? `${t.balance} ${t.symbol}` : "••••"}
                    </div>
                  </div>
                </div>
                <div className="hidden sm:block text-white/85 text-sm min-w-[96px] text-right">
                  {showBalances ? `$${t.usd.toLocaleString()}` : "••••"}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={goDeposit} className="px-3 py-1.5 text-xs rounded-md bg-white/10 backdrop-blur-md border border-white/15 text-white/90 hover:bg-white/15">
                    Deposit
                  </button>
                  <button onClick={() => goSwap({ from: t.symbol })} className="px-3 py-1.5 text-xs rounded-md bg-white/10 backdrop-blur-md border border-white/15 text-white/90 hover:bg-white/15">
                    Swap
                  </button>
                  <button onClick={goWithdraw} className="px-3 py-1.5 text-xs rounded-md bg-[#e6ff55] text-[#0a0b0e] font-semibold hover:brightness-110 transition">
                    Withdraw
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Compliance */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            {/* Compliance & Limits */}
            <section className="backdrop-blur-xl border border-white/15 rounded-2xl p-6 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_16px_56px_rgba(0,0,0,0.45)]" style={{ background: "transparent" }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold bg-gradient-to-b from-white via-zinc-300 to-zinc-500 bg-clip-text text-transparent tracking-tight">Compliance & Limits</h3>
                {hasZkAttestation ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-300 text-xs px-2.5 py-1.5 rounded-md bg-emerald-500/15 border border-emerald-500/40">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-yellow-200 text-xs px-2.5 py-1.5 rounded-md bg-yellow-500/15 border border-yellow-500/40">
                    <AlertTriangle className="w-3.5 h-3.5" /> Action needed
                  </span>
                )}
              </div>
              <ul className="space-y-2 text-sm text-white/85">
                <li>Withdrawals below $5,000 auto-approved.</li>
                <li>Above $5,000 → zk-attestation required.</li>
              </ul>
              <div className="mt-3 text-sm">
                {hasZkAttestation ? (
                  <span className="text-emerald-300">Ready for large withdrawals.</span>
                ) : (
                  <span className="text-yellow-200">Link zk-attestation to enable large withdrawals.</span>
                )}
              </div>
              {!hasZkAttestation && (
                <div className="mt-4">
                  <button
                    onClick={() => setHasZkAttestation(true)}
                    className="px-4 py-2 rounded-full bg-[#e6ff55] text-[#0a0b0e] text-sm font-bold hover:brightness-110 transition"
                  >
                    Provide zk-Attestation
                  </button>
                </div>
              )}
            </section>

            {/* No analytics/activity in minimal build */}
          </div>
        </div>
      </main>
    </div>
  )
}
