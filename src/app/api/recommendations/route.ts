import { NextRequest, NextResponse } from "next/server";
import { getPersonalizedRecommendations } from "@/lib/commerce/analytics";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId") || "default_user";
    const limit = parseInt(searchParams.get("limit") || "4", 10);

    const recommendations = getPersonalizedRecommendations(sessionId, limit);

    return NextResponse.json({
      success: true,
      recommendations,
    });
  } catch (err: unknown) {
    console.error("Recommendations API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch recommendations" },
      { status: 500 }
    );
  }
}
