import { NextRequest, NextResponse } from "next/server";
import { runAgentOrchestrator } from "@/lib/agent/orchestrator";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, sessionId, history = [], referencedContext } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const currentSessionId = sessionId || `sess_${Date.now()}`;
    const result = await runAgentOrchestrator(currentSessionId, message.trim(), history, referencedContext);

    return NextResponse.json({
      sessionId: currentSessionId,
      ...result,
    });
  } catch (error: unknown) {
    console.error("Chat API error:", error);
    const err = error as Error;
    return NextResponse.json(
      { error: "Failed to process chat message", details: err.message },
      { status: 500 }
    );
  }
}
