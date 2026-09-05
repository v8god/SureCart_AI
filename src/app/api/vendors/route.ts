import { NextRequest, NextResponse } from "next/server";
import { getVendorOverrides, setVendorOverride, getAllOffers, getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const overrides = getVendorOverrides();
    const offers = getAllOffers();
    return NextResponse.json({
      overrides,
      total_active_offers: offers.length,
      verified_offers: offers.filter((o) => o.is_verified).length,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: "Failed to fetch vendor overrides", details: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { seller_name, site_name, status, note } = body;

    if (!seller_name || !site_name || !status) {
      return NextResponse.json({ error: "seller_name, site_name, and status are required" }, { status: 400 });
    }

    setVendorOverride(seller_name, site_name, status as "allowed" | "blocked", note);
    return NextResponse.json({ success: true, overrides: getVendorOverrides() });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: "Failed to update vendor override", details: err.message }, { status: 500 });
  }
}
