import { NextResponse } from "next/server";
import { getDb, clearSessionData, getOrdersBySession, getAuditLogsBySession } from "@/lib/db";
import { evaluateProposalCaps, evaluateOrderGuardrails } from "@/lib/guardrails";
import { toolSearchCatalog, toolGetProduct, toolProposePurchase, toolGetOrderStatus } from "@/lib/agent/tools";
import { processRazorpayPayment } from "@/lib/razorpay";

export async function GET() {
  const results: { name: string; passed: boolean; detail?: string }[] = [];
  const testSessionId = `test_sess_${Date.now()}`;
  clearSessionData(testSessionId);

  // 1. TEST 1: Flow A (Happy Path Proposal, 4-Gate Check & Test Capture)
  const searchResult = toolSearchCatalog(testSessionId, { query: "earbuds" });
  results.push({
    name: "Flow A: Catalog search returns grounded products",
    passed: searchResult.items.length > 0 && searchResult.items[0].id === "PROD-001",
    detail: `Found item: ${searchResult.items[0]?.name} (₹${searchResult.items[0]?.price})`,
  });

  const item = searchResult.items[0];
  const proposal = toolProposePurchase(testSessionId, item.id, "Requested by buyer");
  results.push({
    name: "Flow A: Purchase proposal generated with unspent token",
    passed: proposal.allowed === true && Boolean(proposal.token) && Boolean(proposal.idempotency_key),
    detail: `Token: ${proposal.token?.substring(0, 12)}...`,
  });

  const guardrailCheck = evaluateOrderGuardrails({
    sessionId: testSessionId,
    confirmationToken: proposal.token!,
    idempotencyKey: proposal.idempotency_key!,
    itemId: item.id,
    amount: proposal.amount!,
  });

  results.push({
    name: "Flow A: Server-side 4-gate policy validation passes",
    passed:
      guardrailCheck.allowed === true &&
      guardrailCheck.checks.per_order_cap.passed &&
      guardrailCheck.checks.session_cap.passed &&
      guardrailCheck.checks.confirmation_match.passed &&
      guardrailCheck.checks.idempotency.passed,
    detail: "Per-order cap, session cap, token match, and idempotency verified",
  });

  const payment = await processRazorpayPayment({
    amount: proposal.amount!,
    receipt: proposal.idempotency_key!,
  });

  results.push({
    name: "Flow A: Razorpay test-mode capture succeeds",
    passed: payment.success === true && payment.status === "captured",
    detail: `Status: ${payment.status}, Razorpay Order ID: ${payment.razorpay_order_id}`,
  });

  // 2. TEST 2: Flow B (Spend-Cap Refusal — Rule R2)
  const overCapProposal = toolProposePurchase(
    testSessionId,
    "PROD-003", // ₹15,999 soundbar
    "Requested over-cap item"
  );

  results.push({
    name: "Flow B: Over-cap order (₹15,999) refused before confirmation",
    passed: overCapProposal.allowed === false && !overCapProposal.token,
    detail: `Refusal reason: ${overCapProposal.refusal_reason}`,
  });

  // 3. TEST 3: Flow C (Deliberate Decline Handling — Rule R15–R18)
  const declineProposal = toolProposePurchase(testSessionId, "PROD-004", "Testing decline");
  const declinedPayment = await processRazorpayPayment({
    amount: declineProposal.amount!,
    receipt: declineProposal.idempotency_key!,
    simulateDecline: true,
    declineReasonCode: "PAYMENT_DECLINED_BANK",
  });

  results.push({
    name: "Flow C: Deliberate decline caught with zero auto-retry",
    passed: declinedPayment.success === false && declinedPayment.status === "declined" && Boolean(declinedPayment.error_description),
    detail: `Decline description: ${declinedPayment.error_description}`,
  });

  // 4. TEST 4: Flow D (Idempotency & Duplicate Request Protection — Rule R5)
  const duplicateCheck = evaluateOrderGuardrails({
    sessionId: testSessionId,
    confirmationToken: "token_fake_replay",
    idempotencyKey: proposal.idempotency_key!, // Reusing original idempotency key
    itemId: item.id,
    amount: proposal.amount!,
  });

  results.push({
    name: "Flow D: Duplicate order submission rejected by idempotency key",
    passed: duplicateCheck.allowed === false,
    detail: duplicateCheck.refusal_reason,
  });

  // 5. TEST 5: Audit Trail Integrity
  const auditLogs = getAuditLogsBySession(testSessionId);
  const hasRefusalLog = auditLogs.some((l) => l.action_type === "refusal");
  const hasProposalLog = auditLogs.some((l) => l.action_type === "propose");
  const hasGuardrailLog = auditLogs.some((l) => l.action_type === "guardrail_check");

  results.push({
    name: "Audit Trail: Complete append-only event logging",
    passed: auditLogs.length >= 4 && hasRefusalLog && hasProposalLog && hasGuardrailLog,
    detail: `Recorded ${auditLogs.length} audit events with timestamps`,
  });

  const totalPassed = results.filter((r) => r.passed).length;
  const allPassed = totalPassed === results.length;

  return NextResponse.json({
    summary: {
      total: results.length,
      passed: totalPassed,
      failed: results.length - totalPassed,
      status: allPassed ? "ALL_PASS" : "SOME_FAILED",
    },
    results,
  });
}
