# PRD.md — SureCart AI

**Track:** Razorpay AI Buildathon 2026 — Track 01: AI Growth & Agentic Commerce
*(full track comparison and reasoning behind picking this track: see `razorpay-buildathon-track-plan.md` from the earlier planning pass)*

---

## 1. Problem statement

Merchants today are built for two kinds of buyers: humans clicking through a rendered storefront, and nothing else. Two things are changing that at once — humans increasingly want to buy through conversation instead of a cart flow, and AI agents are starting to shop *for* humans and need a catalog and checkout path they can actually parse and act on. Neither is served by a traditional UI-only storefront. The open problem isn't "can an LLM place an order" — it can, trivially, and that's exactly the danger. The open problem is doing it **without ever letting the LLM's judgment be the only thing standing between a conversation and a real payment.**

## 2. Goals

**For the buildathon submission:**
- A working, demoable, test-mode checkout agent that satisfies the track's explicit bar: every money action explainable, bounded, and gated, with a visible audit trail and one failure handled gracefully.
- A codebase and repo clean enough to defend line-by-line in a panel interview.
- A 5-minute pitch video that shows the guardrails actually holding, not just the happy path.

**For the product, beyond the submission:**
- Give any merchant an agent-readable catalog and a safe checkout surface with minimal integration work.
- Be a credible early answer to agent-to-agent commerce (NPCI UAP / ACP / AP2 / x402) without waiting for those protocols to fully standardize.

## 3. Non-goals (explicitly out of scope)

- Upsell/cross-sell logic, campaign orchestration — other example directions under the same track, not this MVP.
- Live/production payments — test mode only for the buildathon.
- Real catalog ingestion pipelines, multi-merchant support, or a merchant admin dashboard.
- Native implementation of any specific agent-commerce protocol (ACP/AP2/x402) — the architecture should not preclude it later, but building to a specific protocol spec is not in scope now.
- Voice interfaces, mobile-native apps.

## 4. Target users / personas

| Persona | Who they are | What they need from SureCart AI |
|---|---|---|
| Human buyer (chat mode) | A shopper who'd rather describe what they want than click through a catalog | A natural, fast way to buy, with clear confirmation before anything is charged |
| AI-agent buyer | A third-party assistant shopping on behalf of a human | A catalog it can parse without guesswork, and tool calls with predictable, bounded behavior |
| Merchant | Runs the store this sits in front of | Confidence that no payment happens without an explainable, capped, confirmed reason — and a record to point to if a transaction is ever disputed |
| Buildathon panel (evaluator) | Reviewing the repo, video, and architecture | A clear problem statement, a working end-to-end loop, and evidence the builder can explain and defend every design decision |

## 5. User stories

- As a human buyer, I want to describe what I want in plain language and see exactly what I'm about to pay before I pay it, so I never get charged for something I didn't explicitly agree to.
- As an AI-agent buyer, I want a catalog with a stable, structured schema and a small set of well-defined tools, so I don't have to infer product data from rendered HTML or guess at what actions are safe to take.
- As a merchant, I want every payment action gated behind an explicit confirmation and a hard cap I control, so an LLM's mistake or a manipulated conversation can never move more money than I've allowed.
- As a merchant, I want a readable log of *why* each order happened, not just that it happened, so I can answer a dispute or a chargeback without re-deriving the reasoning from scratch.
- As a buyer, I want to be told clearly and immediately if a payment fails, with something concrete I can do next, instead of silence, a crash, or an endless retry.

## 6. Functional requirements

**Catalog**
- FR-1: Catalog is stored in a structured schema (id, name, price, currency, stock, category, short policy notes) queryable by a tool call.
- FR-2: Catalog data returned to the agent must come from a live query at time of use — never cached into the model's context as ground truth for more than one turn.

**Conversational agent**
- FR-3: Agent only takes action through a fixed, small tool set: `search_catalog`, `get_product`, `create_order`, `get_order_status`.
- FR-4: Agent must state its reasoning (what it's about to buy, for how much, why) before any `create_order` call.
- FR-5: Agent must never state a price, stock level, or order status without a tool-call result from the current turn backing it.

**Guardrails**
- FR-6: A per-order hard spend cap is enforced server-side; any proposed order above it is refused outright, with a plain-language explanation, regardless of confirmation.
- FR-7: A per-session running cap is enforced server-side, independent of how the spend is split across multiple orders.
- FR-8: Every `create_order` call requires an explicit, distinct confirmation action from the buyer — never inferred from conversational tone or a prior general statement of intent.

**Payments**
- FR-9: Orders are created and captured against Razorpay's test-mode Orders API.
- FR-10: Order creation is idempotent — a retried or duplicated confirmation event must not create a duplicate order.
- FR-11: If a webhook is used to confirm payment status, its signature must be verified server-side before the result is trusted.

**Audit trail**
- FR-12: Every agent decision (tool call, stated reasoning, confirmation request, confirmation result, order outcome) is written to an audit log with a timestamp, at or before the time the action happens.
- FR-13: The audit trail is visible in the UI in plain language, not only as raw server logs.

**Failure handling**
- FR-14: At least one payment failure mode (simulated decline) is deliberately triggerable and handled: explained in plain language, logged, with a concrete next step offered — no silent retry loop.

## 7. Non-functional requirements

- **Explainability:** any action taken by the agent must have a human-readable reason attached in the audit trail, not just a status code.
- **Boundedness:** hard limits (caps, tool surface, one order per confirmation) must be enforced in application code, not solely in the LLM's system prompt.
- **Auditability:** the audit trail must be reconstructable into a plain narrative of "what happened and why" for any given session, without engineering knowledge.
- **Latency:** a catalog query or order action should resolve within a few seconds — this is a chat demo, not a batch job.
- **Security:** all provider and payment API secrets are server-side only; no secret is ever sent to the browser or included in LLM context.
- **Reliability for the demo:** the happy path and the one deliberate failure path must both work reliably enough to run live in a 5-minute video without luck.

## 8. Success metrics

**Bar set by the track itself:**
- Every money action explainable, bounded, and gated — demonstrated live, not just asserted.
- A visible audit trail.
- One failure handled gracefully.

**Additional metrics worth holding ourselves to:**
- 100% of `create_order` calls preceded by an explicit confirmation event in the audit trail (zero exceptions, checked by test).
- 0 successful orders above the hard cap in adversarial testing (deliberately try to talk the agent past the cap).
- 0 duplicate orders created under a deliberately repeated/duplicated confirmation click.
- The one deliberate failure path succeeds on demand, every time, for the video recording.

## 9. Constraints and assumptions

- ~9–10 days total from track selection to submission (Aug 27 → Sep 5, 2026), most of it solo.
- Razorpay test mode only — no real transactions, dummy balance.
- Catalog, buyer, and "AI-agent buyer" role are all simulated/synthetic for the demo; there is no real merchant integration.
- One builder, one machine — architecture should stay simple enough to build, debug, and explain solo under time pressure.

## 10. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| LLM tool-calling behaves unpredictably under adversarial phrasing | Cap or confirmation gate gets bypassed | Enforce every hard rule in code, treat the prompt as a UX layer, not a security layer (see `Docs/Rule.md`) |
| Running out of time before the failure-handling path is built and tested | Can't demonstrate the explicitly graded "one failure handled gracefully" requirement | Build and test the failure path early, not last — scheduled explicitly in `phases.md` |
| Demo breaks live during video recording | Weak submission regardless of how good the code is | Rehearse the exact demo script multiple times before final recording; keep the script narrow |
| Scope creep toward upsell/campaign features | Nothing finishes cleanly | Non-goals section above is final for this submission — anything not in Functional Requirements does not get built |
