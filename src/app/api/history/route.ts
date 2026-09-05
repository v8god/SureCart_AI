import { NextRequest, NextResponse } from "next/server";
import { getSearchHistory, getOrdersBySession } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const type = searchParams.get("type") || "orders"; // "orders" | "searches" | "export"
    const format = searchParams.get("format") || "json"; // "json" | "csv"

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    if (type === "searches") {
      const searches = getSearchHistory(sessionId);
      return NextResponse.json({ searches });
    }

    if (type === "orders") {
      const orders = getOrdersBySession(sessionId);
      return NextResponse.json({ orders });
    }

    if (type === "export") {
      const orders = getOrdersBySession(sessionId);

      if (format === "csv") {
        const headers = [
          "Order ID",
          "Item Name",
          "Amount (INR)",
          "Status",
          "Payment Method",
          "Seller",
          "Website",
          "Tracking URL",
          "Delivery Date",
          "Date",
        ];

        const rows = orders.map((o) => [
          o.id,
          `"${(o.item_name || "").replace(/"/g, '""')}"`,
          o.amount,
          o.status,
          `"${(o.payment_method || "UPI").replace(/"/g, '""')}"`,
          `"${(o.seller || "Verified Retailer").replace(/"/g, '""')}"`,
          `"${(o.website || "Store").replace(/"/g, '""')}"`,
          `"${o.tracking_url || ""}"`,
          `"${o.delivery_date || ""}"`,
          `"${o.created_at}"`,
        ]);

        const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

        return new NextResponse(csvContent, {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="surecart-orders-${sessionId.substring(0, 8)}.csv"`,
          },
        });
      }

      // Default export as JSON
      return NextResponse.json({
        sessionId,
        export_date: new Date().toISOString(),
        total_orders: orders.length,
        orders,
      });
    }

    return NextResponse.json({ error: `Unsupported history type: ${type}` }, { status: 400 });
  } catch (err: unknown) {
    console.error("History API error:", err);
    return NextResponse.json({ error: "Failed to retrieve history" }, { status: 500 });
  }
}
