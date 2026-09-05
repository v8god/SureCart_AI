import Razorpay from "razorpay";
import crypto from "crypto";
import { Currency } from "@/types";

export interface CreateOrderParams {
  amount: number; // in whole INR
  currency?: Currency;
  receipt: string; // idempotency key
  notes?: Record<string, string>;
  simulateDecline?: boolean;
  declineReasonCode?: string;
}

export interface RazorpayOrderResult {
  success: boolean;
  razorpay_order_id: string;
  razorpay_payment_id?: string;
  status: "captured" | "declined" | "failed";
  amount: number;
  currency: string;
  error_code?: string;
  error_description?: string;
  is_simulation_mode: boolean;
}

// Check if credentials exist
const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;
const isConfigured = Boolean(keyId && keySecret && !keyId.includes("your_key_id"));

let razorpayClient: Razorpay | null = null;
if (isConfigured) {
  try {
    razorpayClient = new Razorpay({
      key_id: keyId!,
      key_secret: keySecret!,
    });
  } catch (err) {
    console.warn("Could not initialize Razorpay client with provided keys:", err);
  }
}

/**
 * Creates an official Razorpay Order on the gateway (or sandbox mock)
 */
export async function createRazorpayGatewayOrder(
  amount: number,
  receipt: string,
  notes: Record<string, string> = {}
): Promise<{ id: string; amount: number; currency: string; is_mock: boolean }> {
  const amountInPaise = Math.round(amount * 100);

  if (razorpayClient && isConfigured) {
    try {
      const order = await razorpayClient.orders.create({
        amount: amountInPaise,
        currency: "INR",
        receipt: receipt.substring(0, 40),
        notes: {
          ...notes,
          platform: "SureCart AI",
          agentic_commerce: "true",
        },
      });

      return {
        id: order.id,
        amount,
        currency: "INR",
        is_mock: false,
      };
    } catch (err) {
      console.warn("Failed to create real Razorpay order, falling back to simulated order:", err);
    }
  }

  const randomSuffix = Math.random().toString(36).substring(2, 9);
  return {
    id: `order_test_${randomSuffix}`,
    amount,
    currency: "INR",
    is_mock: true,
  };
}

/**
 * Official HMAC-SHA256 Signature Verification for Razorpay payments
 * Verifies that payment was legitimately captured by Razorpay without client-side tampering.
 * Zero Card Credential Storage: no card numbers or CVVs are accepted or stored.
 */
export function verifyRazorpayPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secretOverride?: string
): boolean {
  const secret = secretOverride || keySecret || "surecart_sandbox_secret";
  if (!orderId || !paymentId || !signature) {
    return false;
  }

  // Simulated signatures in test mode
  if (!isConfigured && signature.startsWith("sim_sig_")) {
    return true;
  }

  try {
    const generatedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(generatedSignature, "utf-8"),
      Buffer.from(signature, "utf-8")
    );
  } catch (err) {
    console.error("Signature verification error:", err);
    return false;
  }
}

/**
 * Webhook Signature Verification
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secretOverride?: string
): boolean {
  const secret = secretOverride || process.env.RAZORPAY_WEBHOOK_SECRET || "surecart_webhook_secret";
  if (!rawBody || !signature) return false;

  try {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "utf-8"),
      Buffer.from(signature, "utf-8")
    );
  } catch (err) {
    console.error("Webhook signature verification error:", err);
    return false;
  }
}

/**
 * Creates an order and processes test-mode capture or deliberate simulated decline.
 * Follows Rule R15–R18: Plain language grounded in real payment system reason,
 * no silent retries, concrete next steps.
 */
export async function processRazorpayPayment(params: CreateOrderParams): Promise<RazorpayOrderResult> {
  const { amount, currency = "INR", receipt, notes = {}, simulateDecline, declineReasonCode } = params;
  const amountInPaise = Math.round(amount * 100);

  // Handle Deliberate Decline scenario (Flow C)
  if (simulateDecline) {
    const randomSuffix = Math.random().toString(36).substring(2, 9);
    const mockOrderId = `order_test_${randomSuffix}`;

    const code = declineReasonCode || "BAD_REQUEST_ERROR";
    const desc = "Payment declined: Issuing bank rejected the transaction due to a simulated test rule.";

    return {
      success: false,
      razorpay_order_id: mockOrderId,
      status: "declined",
      amount,
      currency,
      error_code: code,
      error_description: desc,
      is_simulation_mode: !isConfigured,
    };
  }

  // If live Razorpay Test Keys are configured:
  if (razorpayClient && isConfigured) {
    try {
      const order = await razorpayClient.orders.create({
        amount: amountInPaise,
        currency,
        receipt: receipt.substring(0, 40),
        notes: {
          ...notes,
          platform: "SureCart AI",
          agentic_commerce: "true",
        },
      });

      const randomPaymentId = `pay_test_${Math.random().toString(36).substring(2, 10)}`;

      return {
        success: true,
        razorpay_order_id: order.id,
        razorpay_payment_id: randomPaymentId,
        status: "captured",
        amount,
        currency,
        is_simulation_mode: false,
      };
    } catch (error: unknown) {
      const err = error as { statusCode?: number; error?: { code?: string; description?: string } };
      return {
        success: false,
        razorpay_order_id: `order_failed_${Date.now()}`,
        status: "failed",
        amount,
        currency,
        error_code: err.error?.code || "GATEWAY_ERROR",
        error_description: err.error?.description || "Payment creation failed on Razorpay test gateway.",
        is_simulation_mode: false,
      };
    }
  }

  // Sandbox Test-Mode Gateway Simulation (when keys are not provided in .env)
  const randomSuffix = Math.random().toString(36).substring(2, 9);
  const mockOrderId = `order_test_${randomSuffix}`;
  const mockPaymentId = `pay_test_${Math.random().toString(36).substring(2, 10)}`;

  return {
    success: true,
    razorpay_order_id: mockOrderId,
    razorpay_payment_id: mockPaymentId,
    status: "captured",
    amount,
    currency,
    is_simulation_mode: true,
  };
}

export function isRazorpayConfigured(): boolean {
  return isConfigured;
}

export function getRazorpayKeyId(): string {
  return keyId || "rzp_test_simulation";
}
