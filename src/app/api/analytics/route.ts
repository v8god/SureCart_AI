import { NextRequest, NextResponse } from "next/server";
import { getAggregateAnalytics } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    // Admin aggregate analytics with zero personally identifiable customer data (Zero PII)
    const analytics = getAggregateAnalytics();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      privacy_compliance: "Zero PII - Aggregated and Anonymized",
      analytics,
    });
  } catch (err: unknown) {
    console.error("Analytics API error:", err);
    return NextResponse.json(
      { error: "Failed to generate analytics summary" },
      { status: 500 }
    );
  }
}
