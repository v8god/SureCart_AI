import { NextResponse } from "next/server";
import { getAllCatalogItems } from "@/lib/db";

export async function GET() {
  try {
    const items = getAllCatalogItems();
    return NextResponse.json({ items });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: "Failed to fetch catalog", details: err.message },
      { status: 500 }
    );
  }
}
