import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { getOrderById, updateOrderStatus, insertAuditLog } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing x-razorpay-signature header" }, { status: 400 });
    }

    const isValid = verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event;
    const payload = event.payload;

    if (eventType === "payment.captured" || eventType === "order.paid") {
      const paymentEntity = payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;

      insertAuditLog({
        id: `audit_wh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        session_id: "webhook_system",
        actor: "system",
        action_type: "webhook_received",
        reasoning: `Razorpay webhook verified: event=${eventType}, payment_id=${paymentId}, order_id=${razorpayOrderId}`,
        payload: { event: eventType, payment_id: paymentId, order_id: razorpayOrderId },
        result: "success",
      });
    }

    return NextResponse.json({ status: "ok", received: true });
  } catch (err: unknown) {
    console.error("Webhook processing error:", err);
    return NextResponse.json({ error: "Webhook processing error" }, { status: 500 });
  }
}
