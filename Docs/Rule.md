# Rule.md — SureCart AI Governance Rules & Guardrail Constitution

This document is the **single unified rulebook** for **SureCart AI**. It integrates both the **Permanent Development & Governance Rules** (for contributors and AI agents building the system) and the **Agent Guardrail Constitution** (the hard behavioral and financial guardrails enforced in application code).

Every contributor and AI agent working on this codebase must adhere strictly to all rules in this document.

---

# PART 1: PERMANENT DEVELOPMENT & GOVERNANCE RULES

## 1. No Agent Mode for Verification

The AI must **not use agent mode or autonomous external verification/browsing actions to check whether something works** when the verification requires the user to perform the check manually.

If something needs to be checked by the user:
1. Tell the user exactly what needs to be checked.
2. Tell the user exactly how to check it.
3. Tell the user what result is expected.
4. Wait for the user's result.

The AI must never claim or assume that a check succeeded unless the user has explicitly verified and reported the result.

---

## 2. If Verification is Reported Incorrectly

If the user reports that a check was performed, but the check was done incorrectly or was insufficient:
1. Clearly identify what was checked.
2. Explain why that check was insufficient or incorrect.
3. Detail the exact steps that should have been checked instead.
4. State the expected result clearly.
5. Specify what information or output is needed from the user afterward.
6. Never silently assume that verification succeeded or fabricate test results.

---

## 3. Strict Verification Philosophy

Always separate and maintain clear distinctions between the following three states:

* **Implemented**: The code and configuration exist in the repository.
* **Verified**: The behavior has actually been tested against real or simulated inputs and the verified outcome is documented.
* **Expected**: The behavior is intended by design/implementation, but has not yet been verified.

*Never represent "expected" as "verified." Never represent "implemented" as "working" without appropriate verification.*

---

## 4. Absolute Prohibition on Assumptions (Anti-Hallucination)

**DO NOT HALLUCINATE OR INVENT.**

Do not invent:
* Features, products, pages, components, buttons, or UI elements.
* APIs, endpoints, database schemas, or authentication mechanisms.
* Backend or frontend behaviors, design requirements, or business logic.
* Third-party services, credentials, API keys, or environment variables.
* User roles, permissions, data models, workflows, or product capabilities.

If something is not explicitly present in the provided project documentation, design specifications, or source code, treat it strictly as **unknown**. Document unknowns and open questions in `Docs/memory.md` and `Docs/issues.md` rather than making silent assumptions.

---

## 5. Source-of-Truth Hierarchy

When information conflicts, resolve using the following priority order:
1. Explicit current project requirements / instructions from the user.
2. Authoritative design documentation (`Docs/design.md`).
3. Implemented source code and verified behavior.
4. Project configuration and directory structure.
5. Supporting project documentation (`Docs/PRD.md`, `Docs/Architecture.md`, `Docs/memory.md`).
6. Assets and supporting material.
7. Agent's own technical judgment.

*Judgment must never override an explicit requirement.* Any discovered conflict must be documented in `Docs/issues.md`.

---

## 6. Preservation of Project History

Never silently:
* Delete or overwrite previous development checklists in `Docs/Instructions.md`.
* Delete resolved issues or blockers in `Docs/issues.md`.
* Delete architectural decisions or change records in `Docs/memory.md`.
* Remove documented limitations or rewrite history to make the project look cleaner.
* Pretend an unresolved issue was resolved.

Maintain an immutable trail of progress, decisions, and resolutions.

---

## 7. Continuous Documentation Maintenance

Before and after every major implementation step:
1. Review changes against design specifications (`Docs/design.md`) and functional requirements (`Docs/PRD.md`).
2. Log newly encountered issues or inconsistencies in `Docs/issues.md`.
3. Update project state, decisions, and open questions in `Docs/memory.md`.
4. Update operational steps, expected behaviors, and checklists in `Docs/Instructions.md`.

---

# PART 2: AGENT GUARDRAIL CONSTITUTION

*Everything in this section is enforced in application code in the server-side Guardrail/Policy Layer described in `Docs/Architecture.md` — never left solely to the system prompt or client-side JavaScript. A prompt can be bypassed by adversarial phrasing; code that validates database state before allowing an API call cannot.*

---

## 8. Money-Action Rules

- **R1.** The agent may never call `create_order` without a fresh `search_catalog` / `get_product` result from the current turn backing the item and price. No exceptions for "obviously" repeat purchases.
- **R2.** Every proposed order has a hard per-order cap. Any amount above it is refused outright, before confirmation is even offered — refusal happens at the proposal stage, not after the buyer says yes.
- **R3.** Every session has a hard running-total cap, checked against the Orders Store at the time of each new proposal, independent of how spend is split across multiple smaller orders.
- **R4.** Exactly one order may be created per confirmation event. A single "yes" can never authorize more than the specific order it was shown against.
- **R5.** Every `create_order` call must carry a unique idempotency key generated at proposal time. A reused key is rejected, full stop — this covers double-clicks, retries, and duplicate requests.

---

## 9. Grounding Rules

- **R6.** The agent must never state a price, stock level, or order status that isn't backed by a tool-call result from the current turn. If it doesn't know, it calls the tool — it doesn't estimate, remember, or assume.
- **R7.** The agent must never claim an order succeeded, failed, or is pending without a `get_order_status` (or the immediate `create_order` response) confirming it.

---

## 10. Confirmation Rules

- **R8.** Confirmation must be a distinct, explicit action (a button press or an unambiguous typed "yes" to a specific rendered proposal) — never inferred from general enthusiasm, prior statements of intent, or conversational tone.
- **R9.** The confirmation prompt shown to the buyer must include, at minimum: the exact item(s), the exact total amount and currency, and a one-line statement of why the agent is proposing this specific purchase.
- **R10.** A confirmation is valid only for the exact proposal it was shown against. If the buyer changes the order in any way after seeing a confirmation card, a new confirmation proposal must be issued.

---

## 11. Scope Rules

- **R11.** The agent cannot modify the catalog (price, stock, availability) under any circumstance — it is read-only with respect to catalog data.
- **R12.** The agent cannot process a payment method that isn't explicitly supported and listed — no "trying" an unsupported method to see if it works.
- **R13.** The agent cannot silently retry a failed payment. Any retry requires a new, explicit confirmation from the buyer, run back through every rule in this document as if it were a new order.
- **R14.** The agent cannot take any action outside its fixed tool set (`search_catalog`, `get_product`, `create_order`, `get_order_status`). There is no general-purpose code execution or unscoped API access available to it.

---

## 12. Failure-Handling Rules

- **R15.** On a declined or failed payment, the agent must explain the failure in plain language grounded in the actual reason returned by the payment system — never a generic or invented explanation.
- **R16.** The failure and its reason must be written to the audit log before or as the explanation is shown to the buyer — never after, and never omitted.
- **R17.** The agent must offer at least one concrete next step on failure (retry with a different method, or cancel) — a dead end is not an acceptable failure response.
- **R18.** Maximum one automatic retry attempt by the system itself (e.g., for a transient network error, not a decline) before handing control back to the buyer. A hard decline never triggers an automatic retry.

---

## 13. Security Rules

- **R19.** Razorpay and LLM provider secrets exist only in server-side environment variables. They are never sent to the browser, never included in a prompt or tool-call payload, and never logged in plaintext in the audit trail.
- **R20.** Any webhook payload from Razorpay is untrusted until its signature is verified server-side against the webhook secret. An unverified webhook must not update order status.
- **R21.** Buyer input is treated as untrusted conversational text passed to the LLM — it is never treated as a direct instruction to the Guardrail Layer. The guardrail layer only trusts its own database state and the explicit confirmation event.

---

## 14. Override Policy

**There is no override.** For this MVP, none of the rules in this document can be bypassed by anything said in the conversation — not by the buyer, not by the agent's own "reasoning," and not by a merchant-side setting exposed through chat. If a future version needs configurable caps per merchant, that configuration lives in a separate, non-conversational admin surface — it is explicitly never something the chat agent can change about itself mid-conversation.

---

# PART 3: PRE-DEMO TESTING CHECKLIST

Run all of these verification tests before recording the pitch video or final submission:

- [ ] Ask the agent to buy something at a price above the per-order cap → confirm it refuses before any confirmation card appears (**R2**).
- [ ] Try to split a large purchase into several smaller orders in one session to exceed the session cap → confirm the system-level cap still catches it (**R3**).
- [ ] Say "yes just buy it" without ever seeing a specific confirmation card → confirm nothing gets ordered (**R8**).
- [ ] Double-submit a confirmation (double-click or duplicate request) → confirm only one order is created (**R5**).
- [ ] Ask the agent for the price of something without it having just queried the catalog → confirm it queries again rather than answering from memory (**R6**).
- [ ] Trigger the deliberate decline scenario → confirm a plain-language explanation, a logged failure, and an offered next step, with no silent retry (**R15–R18**).
- [ ] Check browser network tab and client bundle for any leaked API key or secret (**R19**).
- [ ] Confirm a session's total spend, computed independently from the Orders Store, matches what the audit trail claims — no drift between "what happened" and "what was logged."
