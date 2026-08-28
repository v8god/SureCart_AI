import {
  getOrderByCustomerKey,
  getSessionTotalSpent,
  getConfirmationToken,
  insertAuditLog,
} from "@/lib/db";
import { GuardrailEvaluation, GuardrailCheckDetail, CatalogItem } from "@/types";

export const DEFAULT_PER_ORDER_CAP = Number(process.env.NEXT_PUBLIC_PER_ORDER_CAP) || 5000;
export const DEFAULT_PER_SESSION_CAP = Number(process.env.NEXT_PUBLIC_PER_SESSION_CAP) || 10000;

/**
 * Pre-evaluates an order proposal against spend caps BEFORE presenting confirmation to buyer.
 * As mandated by Rule R2 & R3: Refusal happens at proposal stage, not after buyer confirmation.
 */
export function evaluateProposalCaps(
  sessionId: string,
  amount: number,
  item: CatalogItem
): { allowed: boolean; refusalReason?: string; checkDetails: GuardrailCheckDetail[] } {
  const currentSpent = getSessionTotalSpent(sessionId);
  const checks: GuardrailCheckDetail[] = [];

  // Check 1: Per-order cap
  const perOrderPassed = amount <= DEFAULT_PER_ORDER_CAP;
  checks.push({
    name: "Per-Order Cap",
    passed: perOrderPassed,
    limit: DEFAULT_PER_ORDER_CAP,
    current_value: amount,
    message: perOrderPassed
      ? `Amount ₹${amount.toLocaleString("en-IN")} is within per-order limit (₹${DEFAULT_PER_ORDER_CAP.toLocaleString("en-IN")})`
      : `Proposed amount ₹${amount.toLocaleString("en-IN")} exceeds per-order limit of ₹${DEFAULT_PER_ORDER_CAP.toLocaleString("en-IN")}`,
  });

  if (!perOrderPassed) {
    // Record refusal in audit log
    insertAuditLog({
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      session_id: sessionId,
      actor: "system",
      action_type: "refusal",
      reasoning: `Order proposal refused: ₹${amount.toLocaleString("en-IN")} exceeds per-order limit of ₹${DEFAULT_PER_ORDER_CAP.toLocaleString("en-IN")}`,
      payload: {
        item_id: item.id,
        item_name: item.name,
        amount,
        limit: DEFAULT_PER_ORDER_CAP,
        violation: "per_order_cap_exceeded",
      },
      result: "refused",
    });

    return {
      allowed: false,
      refusalReason: `I cannot proceed with this purchase because ₹${amount.toLocaleString("en-IN")} exceeds the per-order spending limit of ₹${DEFAULT_PER_ORDER_CAP.toLocaleString("en-IN")}. No payment was attempted.`,
      checkDetails: checks,
    };
  }

  // Check 2: Running session total cap
  const projectedSessionTotal = currentSpent + amount;
  const sessionPassed = projectedSessionTotal <= DEFAULT_PER_SESSION_CAP;
  checks.push({
    name: "Session Cumulative Cap",
    passed: sessionPassed,
    limit: DEFAULT_PER_SESSION_CAP,
    current_value: projectedSessionTotal,
    message: sessionPassed
      ? `Projected session spend ₹${projectedSessionTotal.toLocaleString("en-IN")} is within session limit (₹${DEFAULT_PER_SESSION_CAP.toLocaleString("en-IN")})`
      : `Adding ₹${amount.toLocaleString("en-IN")} would bring session spend to ₹${projectedSessionTotal.toLocaleString("en-IN")}, exceeding session cap of ₹${DEFAULT_PER_SESSION_CAP.toLocaleString("en-IN")}`,
  });

  if (!sessionPassed) {
    insertAuditLog({
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      session_id: sessionId,
      actor: "system",
      action_type: "refusal",
      reasoning: `Order proposal refused: Adding ₹${amount.toLocaleString("en-IN")} exceeds session limit of ₹${DEFAULT_PER_SESSION_CAP.toLocaleString("en-IN")} (Current spent: ₹${currentSpent.toLocaleString("en-IN")})`,
      payload: {
        item_id: item.id,
        item_name: item.name,
        amount,
        current_session_spent: currentSpent,
        projected_session_spent: projectedSessionTotal,
        session_limit: DEFAULT_PER_SESSION_CAP,
        violation: "session_cap_exceeded",
      },
      result: "refused",
    });

    return {
      allowed: false,
      refusalReason: `I cannot proceed with this purchase. Adding ₹${amount.toLocaleString("en-IN")} to your current session total (₹${currentSpent.toLocaleString("en-IN")}) would exceed the maximum session limit of ₹${DEFAULT_PER_SESSION_CAP.toLocaleString("en-IN")}. No payment was attempted.`,
      checkDetails: checks,
    };
  }

  return {
    allowed: true,
    checkDetails: checks,
  };
}

/**
 * Server-side full guardrail evaluation before creating an order.
 * Enforces:
 * 1. Per-order hard cap
 * 2. Session cumulative hard cap
 * 3. Valid, unspent explicit confirmation token match
 * 4. Unique idempotency key (rejects duplicates full stop)
 */
export function evaluateOrderGuardrails(params: {
  sessionId: string;
  confirmationToken: string;
  idempotencyKey: string;
  itemId: string;
  amount: number;
}): GuardrailEvaluation {
  const { sessionId, confirmationToken, idempotencyKey, itemId, amount } = params;
  const currentSpent = getSessionTotalSpent(sessionId);

  // Check 1: Per-order cap
  const perOrderPassed = amount <= DEFAULT_PER_ORDER_CAP;
  const perOrderCheck: GuardrailCheckDetail = {
    name: "Per-Order Cap",
    passed: perOrderPassed,
    limit: DEFAULT_PER_ORDER_CAP,
    current_value: amount,
    message: perOrderPassed
      ? `Passed (₹${amount.toLocaleString("en-IN")} <= ₹${DEFAULT_PER_ORDER_CAP.toLocaleString("en-IN")})`
      : `Failed: ₹${amount.toLocaleString("en-IN")} exceeds ₹${DEFAULT_PER_ORDER_CAP.toLocaleString("en-IN")}`,
  };

  // Check 2: Session cumulative cap
  const projectedSessionTotal = currentSpent + amount;
  const sessionPassed = projectedSessionTotal <= DEFAULT_PER_SESSION_CAP;
  const sessionCheck: GuardrailCheckDetail = {
    name: "Session Cumulative Cap",
    passed: sessionPassed,
    limit: DEFAULT_PER_SESSION_CAP,
    current_value: projectedSessionTotal,
    message: sessionPassed
      ? `Passed (₹${projectedSessionTotal.toLocaleString("en-IN")} <= ₹${DEFAULT_PER_SESSION_CAP.toLocaleString("en-IN")})`
      : `Failed: Session total ₹${projectedSessionTotal.toLocaleString("en-IN")} exceeds ₹${DEFAULT_PER_SESSION_CAP.toLocaleString("en-IN")}`,
  };

  // Check 3: Explicit confirmation token validation
  const tokenRecord = getConfirmationToken(confirmationToken);
  const tokenValid =
    tokenRecord !== null &&
    tokenRecord.session_id === sessionId &&
    tokenRecord.catalog_item_id === itemId &&
    tokenRecord.amount === amount &&
    tokenRecord.idempotency_key === idempotencyKey &&
    tokenRecord.status === "pending" &&
    new Date(tokenRecord.expires_at).getTime() > Date.now();

  const confirmationCheck: GuardrailCheckDetail = {
    name: "Explicit Confirmation Match",
    passed: tokenValid,
    message: tokenValid
      ? "Passed (Matching unspent confirmation token verified)"
      : tokenRecord
      ? `Failed: Token status '${tokenRecord?.status}' or parameter mismatch`
      : "Failed: No matching confirmation token found",
  };

  // Check 4: Idempotency key uniqueness
  const existingOrder = getOrderByCustomerKey(idempotencyKey);
  const idempotencyPassed = existingOrder === null;
  const idempotencyCheck: GuardrailCheckDetail = {
    name: "Idempotency & Duplicate Check",
    passed: idempotencyPassed,
    message: idempotencyPassed
      ? "Passed (Unique idempotency key verified)"
      : `Failed: Duplicate request. Order ${existingOrder?.id} already exists for this key`,
  };

  const allPassed = perOrderPassed && sessionPassed && tokenValid && idempotencyPassed;

  let refusalReason: string | undefined;
  if (!perOrderPassed) {
    refusalReason = `Per-order cap violation: ₹${amount.toLocaleString("en-IN")} exceeds limit of ₹${DEFAULT_PER_ORDER_CAP.toLocaleString("en-IN")}`;
  } else if (!sessionPassed) {
    refusalReason = `Session cap violation: Total ₹${projectedSessionTotal.toLocaleString("en-IN")} exceeds limit of ₹${DEFAULT_PER_SESSION_CAP.toLocaleString("en-IN")}`;
  } else if (!tokenValid) {
    refusalReason = `Explicit confirmation required: Token is invalid, expired, or does not match proposed item and amount.`;
  } else if (!idempotencyPassed) {
    refusalReason = `Duplicate submission rejected: An order with this idempotency key was already created.`;
  }

  // Record audit log for guardrail check
  insertAuditLog({
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    session_id: sessionId,
    actor: "system",
    action_type: "guardrail_check",
    reasoning: allPassed
      ? "All 4 guardrail checks passed (Per-order cap, Session cap, Confirmation match, Idempotency key uniqueness)"
      : `Guardrail check failed: ${refusalReason}`,
    payload: {
      amount,
      itemId,
      idempotencyKey,
      allPassed,
      checks: {
        perOrder: perOrderPassed,
        session: sessionPassed,
        confirmationToken: tokenValid,
        idempotency: idempotencyPassed,
      },
    },
    result: allPassed ? "success" : "refused",
  });

  return {
    allowed: allPassed,
    refusal_reason: refusalReason,
    checks: {
      per_order_cap: perOrderCheck,
      session_cap: sessionCheck,
      confirmation_match: confirmationCheck,
      idempotency: idempotencyCheck,
    },
  };
}
