"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useAccount, useChainId, usePublicClient, useSwitchChain, useWriteContract } from "wagmi";
import { sepolia } from "wagmi/chains";
import { IntentExecutor, type ExecutorHooks } from "@/lib/ai/executors";
import { useRouter } from "next/navigation";
import { SelfQRCode } from "@/components/self-qr-code";

// Message type aligned with our API contract
type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export default function AIPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your AI assistant. I can help you with:\n\n" +
        "🏦 **Dashboard**: Check balances, compliance status\n" +
        "💰 **Deposits**: Register and deposit tokens into shielded vault\n" +
        "🔄 **Swaps**: Get quotes and execute private token swaps\n" +
        "💸 **Withdrawals**: Check compliance and withdraw tokens\n" +
        "🛡️ **Compliance**: KYC verification and zk-attestations\n" +
        "⚡ **Hedera**: Network operations and token management\n\n" +
        "Try: 'deposit 1 ETH', 'swap 100 eUSDC to eDAI', 'check my registration status', or 'what's my balance?'",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  // Inline KYC state
  const [kycOpen, setKycOpen] = useState(false);
  const [kycSession, setKycSession] = useState<any | null>(null);
  const [kycSessionData, setKycSessionData] = useState<any | null>(null);

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  // Wallet & chain
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  // Intent executor
  const executorHooks: ExecutorHooks = {
    address,
    isConnected,
    chainId,
    switchChain: async (params) => switchChain(params),
    publicClient,
    writeContractAsync,
  };

  const executor = new IntentExecutor(executorHooks);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text) return;

    const newMessages = [...messages, { role: "user", content: text } as ChatMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || `Request failed with status ${res.status}`);
      }
      const output = String(data.output ?? "");
      console.log("Raw AI response:", output);
      
      // Try to parse for intents and execute client-side wallet actions
      let hasExecutableIntent = false;
      try {
        const parsed = JSON.parse(output);
        console.log("Parsed agent output:", parsed);
        
        if (parsed && parsed.intent && parsed.params) {
          hasExecutableIntent = true;
          console.log("Executing intent:", parsed.intent, "with params:", parsed.params);
          
          // Show thinking message
          setMessages(prev => [...prev, { 
            role: "assistant", 
            content: `🤔 I'll help you with that ${parsed.intent}. Let me process this...` 
          }]);
          
          const result = await executor.executeIntent(parsed.intent, parsed.params);
          console.log("Intent execution result:", result);
          
          // Remove the thinking message and add the final result
          setMessages(prev => {
            const newMessages = prev.slice(0, -1); // Remove thinking message
            if (result.success) {
              // If a redirect is suggested (e.g., KYC), persist context and navigate
              if (result?.data?.kycInline) {
                try {
                  if (result.data.session || result.data.sessionData) {
                    setKycSession(result.data.session);
                    setKycSessionData(result.data.sessionData);
                    setKycOpen(true);
                    localStorage.setItem("kycSession", JSON.stringify({
                      session: result.data.session,
                      sessionData: result.data.sessionData,
                      backendUrl: result.data.backendUrl,
                    }));
                  }
                } catch {}
                return [...newMessages, { 
                  role: "assistant", 
                  content: `🔐 Starting KYC verification inline. Please scan the QR below to continue.` 
                }];
              }
              if (result.txHash) {
                return [...newMessages, { 
                  role: "assistant", 
                  content: `✅ ${result.message}\n\n🔗 Transaction Hash: ${result.txHash}` 
                }];
              } else {
                return [...newMessages, { 
                  role: "assistant", 
                  content: `✅ ${result.message}` 
                }];
              }
            } else {
              return [...newMessages, { 
                role: "assistant", 
                content: `❌ ${result.message}` 
              }];
            }
          });
        } else {
          console.log("No intent found in parsed output");
        }
      } catch (e) {
        console.log("Failed to parse agent output as JSON:", e);
        // Not JSON or no intent; treat as regular text response
      }
      
      // If no executable intent was found, show the AI response as a regular message
      if (!hasExecutableIntent) {
        // Clean up the output - remove any JSON formatting if it's not parseable
        let cleanOutput = output;
        try {
          const parsed = JSON.parse(output);
          // If it parses but has no intent, it might be a regular response
          if (typeof parsed === 'object' && parsed.message) {
            cleanOutput = parsed.message;
          } else if (typeof parsed === 'string') {
            cleanOutput = parsed;
          }
        } catch {
          // Keep original output if not JSON
        }
        
        setMessages((prev) => [...prev, { role: "assistant", content: cleanOutput }]);
      }
    } catch (err: any) {
      console.error("Error processing AI request:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `I apologize, but I encountered an error while processing your request. Please try again.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // Intent execution is now handled by the IntentExecutor class

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col">
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

      {/* Main Content */}
      <div className="w-full max-w-4xl mx-auto px-4 py-8 relative z-10 flex-1 flex flex-col">
        {/* Inline KYC Modal */}
        {kycOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={() => setKycOpen(false)} />
            <div className="relative w-full max-w-lg mx-auto backdrop-blur-3xl border border-white/15 rounded-2xl p-6 shadow-[0_12px_48px_rgba(0,0,0,0.6)] bg-black/60 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="text-lg font-semibold">Complete KYC Verification</div>
                <button className="px-3 py-1.5 rounded-md bg-white/10 border border-white/15 hover:bg-white/15" onClick={() => setKycOpen(false)}>Close</button>
              </div>
              <SelfQRCode
                sessionData={kycSessionData || undefined}
                userId={address}
                onSuccess={() => {
                  setKycOpen(false);
                  setMessages(prev => [...prev, { role: "assistant", content: "✅ KYC verification successful. You can proceed now." }]);
                }}
                onError={(err) => {
                  console.error("KYC error:", err);
                  setMessages(prev => [...prev, { role: "assistant", content: "❌ KYC verification failed. Please try again." }]);
                }}
                className="mx-auto"
              />
            </div>
          </div>
        )}
        {/* Header */}
        <div className="mb-6">
          <div className="backdrop-blur-3xl backdrop-saturate-200 border border-white/15 rounded-2xl px-6 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_56px_rgba(0,0,0,0.35)]" style={{ background: "rgba(255,255,255,0.015)" }}>
            <h1 className="text-2xl font-light tracking-tight bg-gradient-to-b from-white via-zinc-300 to-zinc-500 bg-clip-text text-transparent mb-2">
              AI Assistant
            </h1>
            <p className="text-white/80 text-sm font-medium">
              Natural language interface for deposits, swaps, withdrawals, compliance, and Hedera operations.
              {isConnected ? (
                <span className="ml-2 text-emerald-300">Connected: {address?.slice(0, 6)}...{address?.slice(-4)}</span>
              ) : (
                <span className="ml-2 text-yellow-300">Connect wallet to perform transactions</span>
              )}
            </p>
          </div>
        </div>

        {/* Chat Container */}
        <div className="flex-1 flex flex-col">
          <div className="relative rounded-[24px] overflow-hidden shadow-[0_24px_70px_rgba(0,0,0,0.55)] flex-1 flex flex-col">
            <div className="absolute inset-0 opacity-45 pointer-events-none bg-[radial-gradient(120%_120%_at_50%_0%,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.08)_40%,rgba(255,255,255,0.03)_100%)]" />
            
            <div
              className="relative backdrop-blur-3xl backdrop-saturate-200 border border-white/15 rounded-[24px] shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_56px_rgba(0,0,0,0.55)] flex-1 flex flex-col"
              style={{ background: "rgba(255,255,255,0.015)" }}
            >
              {/* Messages Area */}
              <div className="flex-1 p-6">
                <ScrollArea className="h-[60vh]">
                  <div className="space-y-4 pr-4">
                    {messages.map((m, i) => (
                      <MessageBubble key={i} role={m.role} content={m.content} />
                    ))}
                    <div ref={endRef} />
                  </div>
                </ScrollArea>
              </div>

              {/* Input Area */}
              <div className="border-t border-white/10 p-6">
                <form onSubmit={sendMessage} className="space-y-4">
                  <div className="relative">
                    <Textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Type your message... (Shift+Enter for newline)"
                      className="min-h-[100px] bg-white/5 backdrop-blur-md border border-white/15 rounded-xl px-4 py-3 text-white placeholder:text-white/60 outline-none resize-none focus:border-white/25 transition-colors"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (canSend) void sendMessage();
                        }
                      }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 text-xs text-white/60 font-medium">
                      Examples: deposit 1 ETH | swap 100 eUSDC to eDAI | check registration | withdraw 0.5 eETH | what's my balance?
                    </div>
                    <button
                      type="submit"
                      disabled={!canSend}
                      className="px-6 py-3 bg-[#e6ff55] text-[#0a0b0e] font-bold text-sm rounded-full hover:brightness-110 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {loading ? "Thinking..." : "Send"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ role, content }: { role: ChatMessage["role"]; content: string }) {
  const isUser = role === "user";
  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}> 
      <div
        className={cn(
          "max-w-[85%] whitespace-pre-wrap rounded-xl px-4 py-3 text-sm backdrop-blur-xl border shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_8px_24px_rgba(0,0,0,0.35)]",
          isUser 
            ? "bg-[#e6ff55]/10 border-[#e6ff55]/30 text-white" 
            : "bg-white/8 border-white/15 text-white"
        )}
      >
        <div className={cn(
          "mb-2 text-[10px] uppercase font-medium tracking-wider",
          isUser ? "text-[#e6ff55]/80" : "text-white/60"
        )}>
          {isUser ? "You" : "Assistant"}
        </div>
        <div className="leading-relaxed">{content}</div>
      </div>
    </div>
  );
}
