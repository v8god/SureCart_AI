# phases.md — SureCart AI (formerly GatedCart)

Deadline: **September 5, 2026**. Today: **August 29**. Rewritten against the actual repo state described in the antigravity memory doc — this is no longer a forward-looking plan, it's a status report plus what's left.

## Where things actually stand — read this first

Per your own project memory (dated through Aug 28), the core build moved far faster than the original day-by-day estimate:

- **Renamed to SureCart AI.** This file now uses that name. `README.md`, `PRD.md`, `Architecture.md`, `Rules.md`, `design.md`, and `memory.md` in this doc set still say "GatedCart" — not yet reconciled (see Phase 0.5).
- **Built:** scaffolding, catalog + seed data (9 SKUs), the guardrail engine (4 checks — per-order cap **₹5,000**, session cap **₹10,000**, confirmation token, idempotency), the tool-calling orchestrator with grounded catalog lookups, Razorpay test-mode integration including a deliberate decline path, the full chat + confirmation + audit-trail UI, and a since-completed anti-slop visual redesign.
- **LLM:** Gemini as primary provider, with a deterministic-grounding fallback that works with no API key at all — a genuinely good addition; it means the demo doesn't depend on an LLM API call succeeding live on video.
- **Not done: verification.** Your own memory doc lists Flows A–D as *"Pending User Verification."* Built is not the same as tested — nobody has yet confirmed the caps can't be talked around, that duplicate submissions are actually rejected, or that the decline path behaves as designed under real conditions rather than the one clean path someone coded against. This is the single most important thing to do next.
- **Two loose ends, both small, both worth closing before Phase 2 or 6:**
  1. Two overlapping doc sets now exist — this set (README/PRD/Architecture/**Rules**/phases/design/memory) and antigravity's (PRD.md/Architecture.md/README.md/design.md/**Rule.md**/issues.md/memory.md/Instructions.md). A repo with two rulebooks that don't quite agree is a bad thing for a panel to open. Pick one as canonical — recommend keeping antigravity's since it already reflects what's actually running — and mark or delete the other.
  2. My `Rules.md`/`memory.md` still carry placeholder cap values (₹10,000/₹20,000) that don't match what's actually enforced in code (₹5,000/₹10,000). Cosmetic, but worth a find-and-replace so the docs describe the real system.

Net effect on the plan: everything through what was Phase 5 is done. Testing moves to the front of what's left. Auth and the dashboard — which two days ago looked like the first things to cut — are now realistically in reach, because the core finished this far ahead of schedule. The same discipline still applies: **verify before you extend.**

---

## Phase 0 — Planning ✅ done (Aug 27)

## Phase 0.5 — Documentation reconciliation (NEW) — do this first, it's an hour, not a day

1. Pick one doc set as canonical (recommend antigravity's — retrofit anything useful from mine into it, not the reverse).
2. Lock in the real values everywhere: name = SureCart AI, per-order cap = ₹5,000, per-session cap = ₹10,000, LLM = Gemini + deterministic fallback.
3. Mark or delete the superseded set so nobody edits the wrong file on day 6 at 11pm.

## Phase 1 — Skeleton ✅ done (Aug 27)

## Phase 2 — Auth: login/signup `[STRETCH]` — realistically in reach, but only after Phase 7 passes

Goal unchanged from the original plan: real buyer identity so caps and history belong to a person. What changes given the existing build:

- This is now an actual migration, not a "leave room for it" note — `orders`, `audit_log`, and `confirmation_tokens` already exist without a `user_id` column. Add it via migration; backfill existing seed/demo rows with a placeholder user so nothing breaks.
- Guardrail check should read `user.per_order_cap ?? 5000` / `user.per_session_cap ?? 10000` — the real defaults already hard-coded in `guardrails.ts`, not the ₹10,000/₹20,000 placeholders from the earlier draft of this file.
- Everything else unchanged: email + password only, no OAuth/reset/email-verification, gate chat and order routes behind a valid session.

**Exit criteria:** unchanged — sign up, log in, log out; every order and audit entry tied to the real authenticated user.

## Phase 3 — Agent + tool-calling core ✅ done (grounded catalog lookups, no memory-based pricing)

## Phase 4 — Guardrails, confirmation, payment ✅ built — covered by Phase 7 verification

## Phase 5 — Audit trail + failure handling ✅ built — **not yet verified**

The one to actually pay attention to. "Built" means the code exists and Flow C (decline) was implemented. It does not mean anyone has confirmed it behaves correctly. That confirmation is Phase 7, and it comes before Phase 2 or Phase 6, not after.

## Phase 6 — Settings + Observability Dashboard `[STRETCH]` — smaller than originally scoped, but only after Phase 7 passes

Goal unchanged: a `/settings` view with spend graphs, an editable per-order/per-session cap (can only tighten, never loosen past the platform ceiling — same principle as before), and a technical/error log.

What's already partially done, reuse rather than rebuild:

- The header's **session spend progress bar and reset button** are a primitive slice of the spend-summary requirement — extend it into the dashboard rather than building a second one.
- The audit panel's **actor filters and structured payload inspector** cover most of what the "technical/error log" needed — add a filter for system-level events (declines, retries, refusals) to the existing component instead of building a new log view.

Remaining net-new work: the two graphs (spend-over-time, orders-per-day) and the editable-cap form + `PATCH /api/preferences` endpoint.

## Phase 7 — Adversarial testing + verification `[CORE]` — **do this next, before Phase 2 or 6**

Run every item below against the actual running app — this is what "Pending User Verification" in your own memory doc is waiting on:

- [ ] Propose an order over ₹5,000 → refused before any confirmation card appears
- [ ] Split a purchase across multiple orders in one session to cross ₹10,000 total → still caught by the session cap
- [ ] Say "yes just buy it" without a rendered confirmation card ever appearing → nothing gets ordered
- [ ] Double-submit / resend a confirmation → exactly one order created, not two
- [ ] Ask for a price without a fresh catalog query preceding it → agent re-queries rather than answering from memory
- [ ] Trigger Flow C (deliberate decline) → plain-language explanation, logged in the audit trail, a concrete next step offered, no silent auto-retry
- [ ] Check the bundled frontend and network tab for a leaked Razorpay or Gemini key

Fix whatever this finds before starting Phase 2 or 6. A stretch feature sitting on top of unverified guardrails is worse for the panel to find than no stretch feature at all.

## Phase 8 — Documentation + video `[CORE]`

Once Phase 7 passes (and Phase 2/6, if attempted): finalize whichever doc set survived Phase 0.5 against what's actually running — not what was originally planned. Script and record the 5-minute video around the real Flows A–D, live.

## Phase 9 — Buffer + submit `[CORE]` — Sep 5

Given the head start, use whatever time remains after Phase 7 passes to attempt Phase 2, then Phase 6, in that order — and stop, move to Phase 8, whenever you're two days out from the deadline regardless of how far through either you got.
