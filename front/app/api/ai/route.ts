import { NextRequest, NextResponse } from "next/server";
import { runHederaAgent } from "@/lib/ai/agent";

export const runtime = "nodejs"; // ensure Node runtime

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Invalid payload: 'messages' must be a non-empty array" },
        { status: 400 }
      );
    }

    const result = await runHederaAgent(messages);

    return NextResponse.json({
      ok: true,
      output: result.output,
      raw: result.raw,
    });
  } catch (err: any) {
    console.error("/api/ai error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
