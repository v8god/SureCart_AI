import { NextRequest, NextResponse } from "next/server";
import {
  getConfirmationToken,
  updateConfirmationTokenStatus,
  insertOrder,
  insertAuditLog,
} from "@/lib/db";
import { evaluateOrderGuardrails } from "@/lib/guardrails";
import { processRazorpayPayment } from "@/lib/razorpay";
import { Order } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, token, idempotencyKey, action, simulateDecline, declineReasonCode } = body;

    if (!sessionId || !token || !action) {
      return NextResponse.json(
        { error: "sessionId, token, and action ('confirm' | 'cancel') are required." },
        { status: 400 }
      );
    }

    const tokenRecord = getConfirmationToken(token);
    if (!tokenRecord) {
      return NextResponse.json(
        { error: "Confirmation token not found or invalid." },
        { status: 404 }
      );
    }

    // Handle cancellation
    if (action === "cancel") {
      updateConfirmationTokenStatus(token, "cancelled");

      insertAuditLog({
        id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        session_id: sessionId,
        actor: "buyer",
        action_type: "confirm_result",
        reasoning: `Buyer cancelled proposed order for ${tokenRecord.item_name} (₹${tokenRecord.amount.toLocaleString(
          "en-IN"
        )})`,
        payload: {
          token,
          item_id: tokenRecord.catalog_item_id,
          amount: tokenRecord.amount,
          action: "cancelled",
        },
        result: "info",
      });

      return NextResponse.json({
        success: true,
        status: "cancelled",
        message: "Order proposal was cancelled.",
      });
    }

    // Handle confirmation (Rule R4, R5, R8)
    // 1. Audit log buyer explicit confirmation
    insertAuditLog({
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      session_id: sessionId,
      actor: "buyer",
      action_type: "confirm_request",
      reasoning: `Buyer confirmed order for ${tokenRecord.item_name} — Total: ₹${tokenRecord.amount.toLocaleString(
        "en-IN"
      )}`,
      payload: {
        token,
        item_id: tokenRecord.catalog_item_id,
        item_name: tokenRecord.item_name,
        amount: tokenRecord.amount,
        idempotency_key: idempotencyKey || tokenRecord.idempotency_key,
      },
      result: "success",
    });

    // 2. Full Server-Side Guardrail Evaluation (4 Gates)
    const guardrailResult = evaluateOrderGuardrails({
      sessionId,
      confirmationToken: token,
      idempotencyKey: idempotencyKey || tokenRecord.idempotency_key,
      itemId: tokenRecord.catalog_item_id,
      amount: tokenRecord.amount,
    });

    if (!guardrailResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          refusal_reason: guardrailResult.refusal_reason,
          checks: guardrailResult.checks,
        },
        { status: 400 }
      );
    }

    // 3. Mark token as confirmed / in-flight
    updateConfirmationTokenStatus(token, "confirmed");

    // 4. Razorpay Payment Processing (Test Mode / Simulated Decline)
    const paymentResult = await processRazorpayPayment({
      amount: tokenRecord.amount,
      currency: tokenRecord.currency,
      receipt: tokenRecord.idempotency_key,
      notes: {
        item_id: tokenRecord.catalog_item_id,
        session_id: sessionId,
      },
      simulateDecline: Boolean(simulateDecline),
      declineReasonCode,
    });

    const now = new Date().toISOString();
    const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // If Payment Succeeded (Flow A - Happy Path)
    if (paymentResult.success && paymentResult.status === "captured") {
      const newOrder: Order = {
        id: orderId,
        catalog_item_id: tokenRecord.catalog_item_id,
        item_name: tokenRecord.item_name,
        amount: tokenRecord.amount,
        currency: tokenRecord.currency,
        razorpay_order_id: paymentResult.razorpay_order_id,
        razorpay_payment_id: paymentResult.razorpay_payment_id,
        status: "captured",
        idempotency_key: tokenRecord.idempotency_key,
        session_id: sessionId,
        created_at: now,
      };

      insertOrder(newOrder);
      updateConfirmationTokenStatus(token, "spent");

      // Audit Log: Order Created & Payment Captured
      insertAuditLog({
        id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: now,
        session_id: sessionId,
        actor: "system",
        action_type: "order_created",
        reasoning: `Order created successfully. Razorpay Order: ${paymentResult.razorpay_order_id}, Payment: ${paymentResult.razorpay_payment_id} (Captured ₹${tokenRecord.amount.toLocaleString(
          "en-IN"
        )})`,
        payload: {
          order_id: orderId,
          razorpay_order_id: paymentResult.razorpay_order_id,
          razorpay_payment_id: paymentResult.razorpay_payment_id,
          amount: tokenRecord.amount,
          status: "captured",
          simulation_mode: paymentResult.is_simulation_mode,
        },
        result: "success",
      });

      return NextResponse.json({
        success: true,
        status: "captured",
        order: newOrder,
        checks: guardrailResult.checks,
        is_simulation_mode: paymentResult.is_simulation_mode,
      });
    }

    // If Payment Declined / Failed (Flow C - Failure Handling Path)
    const failedOrder: Order = {
      id: orderId,
      catalog_item_id: tokenRecord.catalog_item_id,
      item_name: tokenRecord.item_name,
      amount: tokenRecord.amount,
      currency: tokenRecord.currency,
      razorpay_order_id: paymentResult.razorpay_order_id,
      status: "declined",
      idempotency_key: tokenRecord.idempotency_key,
      session_id: sessionId,
      failure_reason: paymentResult.error_description || "Payment was declined by payment system.",
      created_at: now,
    };

    insertOrder(failedOrder);
    updateConfirmationTokenStatus(token, "spent");

    // Audit Log: Payment Declined (Rule R16)
    insertAuditLog({
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: now,
      session_id: sessionId,
      actor: "system",
      action_type: "payment_declined",
      reasoning: `Payment declined for ${tokenRecord.item_name} (₹${tokenRecord.amount.toLocaleString(
        "en-IN"
      )}). Reason: ${paymentResult.error_code} - ${paymentResult.error_description}`,
      payload: {
        order_id: orderId,
        error_code: paymentResult.error_code,
        error_description: paymentResult.error_description,
        amount: tokenRecord.amount,
        retry_allowed_automatically: false,
      },
      result: "declined",
    });

    return NextResponse.json(
      {
        success: false,
        status: "declined",
        error_code: paymentResult.error_code,
        error_description: paymentResult.error_description,
        order: failedOrder,
        checks: guardrailResult.checks,
      },
      { status: 402 } // Payment Required / Declined
    );
  } catch (error: unknown) {
    console.error("Confirmation API error:", error);
    const err = error as Error;
    return NextResponse.json(
      { error: "Internal error processing confirmation", details: err.message },
      { status: 500 }
    );
  }
}
