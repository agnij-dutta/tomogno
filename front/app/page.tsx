"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import dynamic from "next/dynamic"
import {
  Shield,
  Zap,
  Droplets,
  Smartphone,
  FileText,
  Lock,
  Globe,
  Cpu,
  TrendingUp,
  Users,
  Award,
  Rocket,
  ArrowLeftRight,
} from "lucide-react"

interface LandingProps {
  onNavigate: (page: string) => void
}

// Lazy-load heavy above-the-fold hero to speed up initial paint
const InfiniteHero = dynamic(() => import("@/components/ui/infinite-hero"), {
  ssr: false,
  loading: () => (
    <section className="relative h-screen flex items-center justify-center">
      <div className="flex items-center gap-3 text-white/60">
        <div className="h-3 w-3 rounded-full bg-white/30 animate-pulse" />
        <div className="h-3 w-3 rounded-full bg-white/30 animate-pulse [animation-delay:150ms]" />
        <div className="h-3 w-3 rounded-full bg-white/30 animate-pulse [animation-delay:300ms]" />
      </div>
    </section>
  ),
})

export default function TZunamiApp() {
  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden" style={{ scrollBehavior: "smooth" }}>
      {/* Metallic gradient defs (reusable across icons) */}
      <svg aria-hidden="true" width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="metallic-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="45%" stopColor="#d4d4d4" />
            <stop offset="100%" stopColor="#737373" />
          </linearGradient>
        </defs>
      </svg>
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center">
        <InfiniteHero />
      </section>

      {/* Features Section */}
      <section className="relative min-h-screen py-20 px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-purple-950/20 to-black" />

        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-6xl md:text-7xl font-extralight mb-8 tracking-tight bg-gradient-to-b from-white via-zinc-300 to-zinc-500 bg-clip-text text-transparent">
              Features
            </h2>
            <p className="text-xl max-w-3xl mx-auto leading-relaxed font-light tracking-tight bg-gradient-to-b from-white via-zinc-300/80 to-zinc-500/60 bg-clip-text text-transparent">
              Revolutionary DeFi infrastructure built for privacy, compliance, and seamless user experience
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
            {[
              {
                icon: Shield,
                title: "Privacy-first Trading",
                description: "Shielded balances + stealth addresses for complete transaction privacy",
                color: "purple",
              },
              {
                icon: FileText,
                title: "Compliance-friendly",
                description: "zk-attestations and AML/KYC integration for regulatory compliance",
                color: "pink",
              },
              {
                icon: Droplets,
                title: "Liquidity-rich",
                description: "Direct integration with Uniswap v4 liquidity pools",
                color: "purple",
              },
              {
                icon: Smartphone,
                title: "User-friendly UX",
                description: "Mobile-first design that hides complexity behind intuitive interfaces",
                color: "pink",
              },
              {
                icon: Globe,
                title: "Cross-chain Ready",
                description: "Multi-chain support for seamless asset movement",
                color: "purple",
              },
              {
                icon: Cpu,
                title: "Advanced zk-Proofs",
                description: "Cutting-edge zero-knowledge technology for maximum privacy",
                color: "pink",
              },
              {
                icon: TrendingUp,
                title: "Real-time Analytics",
                description: "Comprehensive trading insights and portfolio tracking",
                color: "purple",
              },
              {
                icon: Award,
                title: "Institutional Grade",
                description: "Enterprise-level security and compliance standards",
                color: "pink",
              },
            ].map((feature, index) => (
              <Card
                key={index}
                className="backdrop-blur-xl bg-white/5 border-white/15 p-8 hover:bg-white/10 transition-all duration-500 hover:scale-105 hover:rotate-1 group shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_56px_rgba(0,0,0,0.35)]"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  animationDelay: `${index * 0.1}s`,
                }}
              >
                <div className="relative">
                  <feature.icon
                    className={`w-12 h-12 mb-6 transition-all duration-300 group-hover:scale-110 [stroke:url(#metallic-gradient)]`}
                  />
                  <h3 className="text-xl font-light tracking-tight mb-4 bg-gradient-to-b from-white via-zinc-300 to-zinc-500 bg-clip-text text-transparent">
                    {feature.title}
                  </h3>
                  <p className="leading-relaxed font-light tracking-tight bg-gradient-to-b from-white via-zinc-300/80 to-zinc-500/60 bg-clip-text text-transparent">
                    {feature.description}
                  </p>
                </div>
              </Card>
            ))}
          </div>

          {/* User Flow Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Deposit Flow",
                description: "Seamlessly deposit assets with automatic privacy shielding and instant confirmation",
                step: "01",
                icon: Droplets,
              },
              {
                title: "Private Swap Flow",
                description: "Execute trades with complete anonymity, compliance verification, and optimal routing",
                step: "02",
                icon: ArrowLeftRight,
              },
              {
                title: "Withdraw Flow",
                description: "Withdraw to any address with optional compliance verification and instant settlement",
                step: "03",
                icon: Rocket,
              },
            ].map((flow, index) => (
              <Card
                key={index}
                className="backdrop-blur-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20 p-10 hover:from-purple-500/20 hover:to-pink-500/20 transition-all duration-500 hover:scale-105 hover:-rotate-1 group shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_56px_rgba(0,0,0,0.35)]"
                style={{ background: "rgba(139,92,246,0.05)" }}
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="text-5xl font-extralight tracking-tight bg-gradient-to-b from-white via-zinc-300 to-zinc-500 bg-clip-text text-transparent">
                    {flow.step}
                  </div>
                  <flow.icon className="w-8 h-8 transition-all duration-300 group-hover:scale-110 [stroke:url(#metallic-gradient)]" />
                </div>
                <h3 className="text-2xl font-light tracking-tight mb-4 bg-gradient-to-b from-white via-zinc-300 to-zinc-500 bg-clip-text text-transparent">
                  {flow.title}
                </h3>
                <p className="leading-relaxed font-light tracking-tight bg-gradient-to-b from-white via-zinc-300/80 to-zinc-500/60 bg-clip-text text-transparent">
                  {flow.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative py-20 px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-pink-950/20 to-black" />

        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-extralight mb-6 tracking-tight bg-gradient-to-b from-white via-zinc-300 to-zinc-500 bg-clip-text text-transparent">
              Trusted by Thousands
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { number: "$2.5B+", label: "Total Volume Traded", icon: TrendingUp },
              { number: "50K+", label: "Active Users", icon: Users },
              { number: "99.9%", label: "Uptime", icon: Shield },
              { number: "24/7", label: "Support", icon: Globe },
            ].map((stat, index) => (
              <Card
                key={index}
                className="backdrop-blur-xl bg-white/5 border-white/15 p-8 text-center hover:bg-white/10 transition-all duration-500 hover:scale-105 group shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_56px_rgba(0,0,0,0.35)]"
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                <stat.icon className="w-10 h-10 mb-4 mx-auto group-hover:scale-110 transition-transform [stroke:url(#metallic-gradient)]" />
                <div className="text-4xl font-extralight tracking-tight mb-2 bg-gradient-to-b from-white via-zinc-300 to-zinc-500 bg-clip-text text-transparent">
                  {stat.number}
                </div>
                <div className="font-light tracking-tight bg-gradient-to-b from-white via-zinc-300/80 to-zinc-500/60 bg-clip-text text-transparent">{stat.label}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
