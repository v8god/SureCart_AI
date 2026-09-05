import { NextRequest, NextResponse } from "next/server";
import { getSessionCaps, updateSessionCaps } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId") || "default_user";
    const caps = getSessionCaps(sessionId);
    return NextResponse.json(caps);
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: "Failed to fetch session caps", details: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, per_order_cap, per_session_cap } = body;

    if (!sessionId || typeof per_order_cap !== "number" || typeof per_session_cap !== "number") {
      return NextResponse.json({ error: "sessionId, per_order_cap, and per_session_cap are required" }, { status: 400 });
    }

    if (per_order_cap < 500 || per_session_cap < 500) {
      return NextResponse.json({ error: "Caps must be at least ₹500" }, { status: 400 });
    }

    const updated = updateSessionCaps(sessionId, per_order_cap, per_session_cap);
    return NextResponse.json({ success: true, ...updated });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: "Failed to update session caps", details: err.message }, { status: 500 });
  }
}
