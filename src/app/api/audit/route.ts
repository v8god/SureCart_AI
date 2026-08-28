import { NextRequest, NextResponse } from "next/server";
import { getAuditLogsBySession, getSessionTotalSpent, getOrdersBySession } from "@/lib/db";
import { DEFAULT_PER_ORDER_CAP, DEFAULT_PER_SESSION_CAP } from "@/lib/guardrails";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId query parameter is required" }, { status: 400 });
    }

    const logs = getAuditLogsBySession(sessionId);
    const totalSpent = getSessionTotalSpent(sessionId);
    const orders = getOrdersBySession(sessionId);

    return NextResponse.json({
      sessionId,
      logs,
      totalSpent,
      orderCount: orders.length,
      perOrderCap: DEFAULT_PER_ORDER_CAP,
      perSessionCap: DEFAULT_PER_SESSION_CAP,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: "Failed to fetch audit log", details: err.message },
      { status: 500 }
    );
  }
}
