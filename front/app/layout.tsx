import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import dynamic from "next/dynamic"
// import LiquidEther from "../components/liquid-ether"
import Providers from "./providers"
import { ToastContainer } from "../components/simple-toast"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata: Metadata = {
  title: "tZunami - Private. Compliant. DeFi-native.",
  description: "Your tokens, your privacy. Built on Uniswap v4 + zkSNARKs.",
  generator: 'v0.app'
}

const Navbar = dynamic(() => import("../components/navbar"), {
  ssr: false,
  loading: () => (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto">
        <div
          className="backdrop-blur-3xl backdrop-saturate-200 border border-white/10 rounded-2xl px-6 py-6"
          style={{ background: "rgba(255,255,255,0.04)" }}
        >
          <div className="h-6 w-48 bg-white/10 rounded animate-pulse" />
        </div>
      </div>
    </nav>
  ),
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans bg-black text-white tz-metal min-h-screen overflow-x-hidden`}>
        <Providers>
        {/* Global metallic gradient defs for strokes and text backgrounds */}
        <svg aria-hidden="true" width="0" height="0" className="absolute">
          <defs>
            <linearGradient id="metallic-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="45%" stopColor="#d4d4d4" />
              <stop offset="100%" stopColor="#737373" />
            </linearGradient>
          </defs>
        </svg>
        {/* <div className="fixed inset-0 z-0">
          <LiquidEther
            colors={["#ffffff", "#d4d4d4", "#737373"]}
            mouseForce={20}
            cursorSize={100}
            isViscous={false}
            viscous={30}
            iterationsViscous={32}
            iterationsPoisson={32}
            resolution={0.5}
            isBounce={false}
            autoDemo={true}
            autoSpeed={0.5}
            autoIntensity={2.2}
            takeoverDuration={0.25}
            autoResumeDelay={3000}
            autoRampDuration={0.6}
          />
        </div> */}

        <Navbar />

        {/* Page content */}
        <div className="relative z-10">{children}</div>
        
        {/* Global Toast Container */}
        <ToastContainer />
        </Providers>
      </body>
    </html>
  )
}
