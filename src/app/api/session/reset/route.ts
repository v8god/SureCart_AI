import { NextRequest, NextResponse } from "next/server";
import { clearSessionData, insertAuditLog } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    clearSessionData(sessionId);

    // Write fresh session start audit log
    insertAuditLog({
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      session_id: sessionId,
      actor: "system",
      action_type: "guardrail_check",
      reasoning: "Session reset to initial clean state. Spend counter reset to ₹0.",
      payload: { sessionId, reset: true },
      result: "info",
    });

    return NextResponse.json({ success: true, message: "Session data reset successfully." });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: "Failed to reset session", details: err.message },
      { status: 500 }
    );
  }
}
