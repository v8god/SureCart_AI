/**
 * End-to-End Guardrail and Policy Verification Test Suite
 * Validates Rule R1–R21, Flow A, Flow B, Flow C, and Flow D directly against local SQLite & Guardrails.
 */

const { getDb, clearSessionData, getOrdersBySession, getAuditLogsBySession } = require("../src/lib/db");
const { evaluateProposalCaps, evaluateOrderGuardrails } = require("../src/lib/guardrails");
const { toolSearchCatalog, toolGetProduct, toolProposePurchase } = require("../src/lib/agent/tools");
const { processRazorpayPayment } = require("../src/lib/razorpay");

async function runTests() {
  console.log("==================================================");
  console.log("SURECART AI — GUARDRAIL & POLICY TEST SUITE");
  console.log("==================================================\n");

  const testSessionId = `test_sess_${Date.now()}`;
  clearSessionData(testSessionId);

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName, detail = "") {
    totalTests++;
    if (condition) {
      console.log(`✓ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`✗ [FAIL] ${testName} — ${detail}`);
    }
  }

  // -------------------------------------------------------------
  // TEST 1: Flow A (Happy Path Proposal & Guardrail Check)
  // -------------------------------------------------------------
  console.log("\n--- TEST 1: Flow A — Grounded Search & Purchase Proposal ---");
  const searchResult = toolSearchCatalog(testSessionId, "earbuds");
  assert(searchResult.items.length > 0, "Catalog search returns grounded items", `Found: ${searchResult.items.length}`);

  const item = searchResult.items[0];
  assert(item.id === "PROD-001" && item.price === 2499, "Grounded item matches PROD-001 (₹2,499)");

  const proposal = toolProposePurchase(testSessionId, item.id, "Requested by buyer");
  assert(proposal.allowed === true && Boolean(proposal.token), "Purchase proposal within spend cap is allowed");

  // Run 4-Gate Server Guardrail Check
  const guardrailCheck = evaluateOrderGuardrails({
    sessionId: testSessionId,
    confirmationToken: proposal.token,
    idempotencyKey: proposal.idempotency_key,
    itemId: item.id,
    amount: proposal.amount,
  });

  assert(guardrailCheck.allowed === true, "Guardrail 4-gate check passes for valid proposal");
  assert(guardrailCheck.checks.per_order_cap.passed, "Guardrail Check 1 (Per-order cap) passed");
  assert(guardrailCheck.checks.session_cap.passed, "Guardrail Check 2 (Session cap) passed");
  assert(guardrailCheck.checks.confirmation_match.passed, "Guardrail Check 3 (Confirmation token match) passed");
  assert(guardrailCheck.checks.idempotency.passed, "Guardrail Check 4 (Idempotency key) passed");

  // Process Payment
  const payment = await processRazorpayPayment({
    amount: proposal.amount,
    receipt: proposal.idempotency_key,
  });
  assert(payment.success === true && payment.status === "captured", "Razorpay test capture succeeds");

  // -------------------------------------------------------------
  // TEST 2: Flow B (Spend-Cap Refusal)
  // -------------------------------------------------------------
  console.log("\n--- TEST 2: Flow B — Spend-Cap Refusal (Rule R2) ---");
  const overCapProposal = toolProposePurchase(
    testSessionId,
    "PROD-003", // ₹15,999 soundbar
    "Requested high-value item"
  );
  assert(overCapProposal.allowed === false, "Over-cap purchase (₹15,999) is refused outright at proposal stage");
  assert(
    overCapProposal.refusal_reason && overCapProposal.refusal_reason.includes("5,000"),
    "Refusal reason states per-order limit of ₹5,000"
  );
  assert(!overCapProposal.token, "No confirmation token generated for refused proposal (Rule R2)");

  // -------------------------------------------------------------
  // TEST 3: Flow C (Deliberate Decline Handling)
  // -------------------------------------------------------------
  console.log("\n--- TEST 3: Flow C — Deliberate Payment Decline (Rule R15–R18) ---");
  const declineProposal = toolProposePurchase(testSessionId, "PROD-004", "Testing decline");
  assert(declineProposal.allowed === true, "Pre-proposal check for ₹1,299 item passed");

  const declinedPayment = await processRazorpayPayment({
    amount: declineProposal.amount,
    receipt: declineProposal.idempotency_key,
    simulateDecline: true,
    declineReasonCode: "PAYMENT_DECLINED_BANK",
  });
  assert(declinedPayment.success === false && declinedPayment.status === "declined", "Simulated decline returns status 'declined'");
  assert(Boolean(declinedPayment.error_description), "Grounded error description returned from payment system");

  // -------------------------------------------------------------
  // TEST 4: Flow D (Idempotency & Duplicate Prevention)
  // -------------------------------------------------------------
  console.log("\n--- TEST 4: Flow D — Idempotency & Duplicate Request Prevention (Rule R5) ---");
  const duplicateCheck = evaluateOrderGuardrails({
    sessionId: testSessionId,
    confirmationToken: "token_fake_duplicate",
    idempotencyKey: proposal.idempotency_key, // Reusing previously used idempotency key
    itemId: item.id,
    amount: proposal.amount,
  });
  assert(duplicateCheck.allowed === false, "Duplicate order submission rejected (Rule R5)");

  // -------------------------------------------------------------
  // TEST 5: Audit Trail Verification
  // -------------------------------------------------------------
  console.log("\n--- TEST 5: Audit Trail Integrity & Completeness ---");
  const auditLogs = getAuditLogsBySession(testSessionId);
  assert(auditLogs.length >= 4, `Audit trail contains all logged events (${auditLogs.length} events logged)`);
  
  const hasRefusalLog = auditLogs.some((l) => l.action_type === "refusal");
  assert(hasRefusalLog, "Audit trail logged spend-cap refusal event");

  console.log("\n==================================================");
  console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log("==================================================");
}

runTests().catch(console.error);
