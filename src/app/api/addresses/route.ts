import { NextRequest, NextResponse } from "next/server";
import { getAddresses, saveAddress } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId") || "default_user";
    const addresses = getAddresses(sessionId);
    return NextResponse.json({ addresses });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: "Failed to fetch addresses", details: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, tag, recipient_name, address_line1, city, postal_code, is_default } = body;

    if (!sessionId || !tag || !recipient_name || !address_line1 || !city || !postal_code) {
      return NextResponse.json({ error: "Missing required address fields" }, { status: 400 });
    }

    const saved = saveAddress({
      session_id: sessionId,
      tag,
      recipient_name,
      address_line1,
      city,
      postal_code,
      is_default: Boolean(is_default),
    });
    return NextResponse.json({ success: true, address: saved });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: "Failed to save address", details: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const sessionId = searchParams.get("sessionId");

    if (!id || !sessionId) {
      return NextResponse.json({ error: "id and sessionId are required" }, { status: 400 });
    }

    const { deleteAddress } = await import("@/lib/db");
    const success = deleteAddress(id, sessionId);
    return NextResponse.json({ success });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: "Failed to delete address", details: err.message }, { status: 500 });
  }
}

