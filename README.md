# SureCart AI

*A conversational checkout agent over an agent-readable catalog, built for Razorpay AI Buildathon 2026 — Track 01: AI Growth & Agentic Commerce.*

> **Official Product Name:** **SureCart AI** (formerly referenced during initial inception under the placeholder working title *GatedCart*).

This README is the entry point. For deeper detail, see:
- `PRD.md` — formal product requirements and functional specifications
- `Architecture.md` — system design, data flow, and tech stack
- `Rule.md` — single unified rulebook: permanent governance rules & agent guardrail constitution (R1–R21)
- `design.md` — UI/UX design specification
- `memory.md` — living project state, architecture truth, and decisions
- `issues.md` — persistent issue and blocker tracking
- `Instructions.md` — operational runbook and persistent verification checklists

---

## 1. The problem, in one paragraph

AI agents are starting to shop on behalf of humans — and separately, humans are starting to shop *through* chat instead of a traditional cart-and-checkout flow. Both trends need the same thing from a merchant: a catalog an agent can actually read and reason over, and a checkout path where every money-moving decision is explainable, capped, and confirmed — not an LLM improvising with a "buy" button. NPCI's UAP and the emerging agent-commerce protocols (ACP, AP2, x402) are making this the live problem of the year in Indian fintech, and Razorpay's in-app pilots already exist. SureCart AI is a working, minimal answer to that problem.

## 2. What SureCart AI actually is

A small merchant catalog exposed in a structured, agent-readable schema, sitting behind a conversational agent that can search it, propose a purchase, and execute a real (test-mode) Razorpay payment — but never without showing its reasoning and getting explicit confirmation first. Every decision the agent makes is written to a visible, timestamped audit trail. When a payment fails, the agent explains what happened in plain language instead of crashing or retrying blindly.

In one sentence: **a checkout agent that cannot spend money without explaining itself, staying under a hard cap, and getting a yes.**

## 3. Core features

| Feature | What it does |
|---|---|
| Agent-readable catalog | 5–15 SKUs in a structured schema (name, price, stock, category, policy notes) an LLM tool can query directly — not scraped from rendered HTML |
| Conversational checkout | Chat interface where a buyer (human or another agent) describes what they want in natural language |
| Tool-calling agent | The LLM only acts through defined tools — `search_catalog`, `get_product`, `create_order`, `get_order_status` — never from memory |
| Confirmation gate | Every payment action requires an explicit, distinct confirmation step showing item, price, and reasoning before it executes |
| Hard spend caps | A per-order ceiling and a per-session ceiling enforced in code, not in the prompt — cannot be talked around |
| Audit trail | Every decision (tool call, reasoning, confirmation, result) logged with a timestamp, visible in the UI, not just in server logs |
| Graceful failure handling | A deliberately simulated declined payment is caught, explained in plain language, and offered a real next step |
| Razorpay test-mode integration | Orders API used end-to-end: create → checkout → capture, entirely in test mode, no real money |

## 4. Skillset this project uses

- **LLM tool-calling / function-calling design** — defining a small, tightly-scoped tool surface and forcing the model to ground every claim in a tool result
- **Guardrail / policy engineering** — enforcing hard limits in application code rather than trusting a system prompt to hold under pressure
- **Payment API integration** — Razorpay Orders/Payments APIs in test mode, webhook signature verification, idempotency handling
- **Full-stack web development** — a chat UI, a confirmation flow, and an audit trail view, backed by a small API layer and a database
- **Basic trust/fintech UX design** — making a money-moving confirmation impossible to misread (see `design.md`)
- **Failure-mode thinking** — deliberately engineering and documenting one thing that breaks, and how the system recovers

## 5. How it works (high level)

1. Buyer sends a message describing what they want.
2. Agent calls `search_catalog` / `get_product` — never guesses at price or stock.
3. Agent proposes a specific purchase and states its reasoning ("here's what I'm about to buy, for how much, and why").
4. The system checks the proposed amount against the hard caps. If it's over the absolute cap, the agent refuses outright and explains the limit.
5. If within caps, the buyer must explicitly confirm — a distinct action, not inferred from conversational tone.
6. On confirmation, the agent calls `create_order` against Razorpay test mode, and the payment is simulated (success or, in the deliberate failure case, decline).
7. Every step from (2) through (6) is written to the audit trail before or as it happens, not reconstructed afterward.
8. On success: order confirmation shown. On decline: plain-language explanation plus a concrete next step (retry with a different method, or cancel) — never a silent retry loop.

Full data flow and component breakdown: see `Architecture.md`.

## 6. Getting started (planned setup)

> These are the steps once the build begins — see `phases.md` Phase 1 for when each of these actually gets done.

1. Create a Razorpay account and generate **test-mode** API keys (Dashboard → Test Mode → API Keys). Test mode uses a dummy balance; no real money moves.
2. Clone the repo, copy `.env.example` to `.env`, fill in `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and your LLM provider key.
3. Install dependencies and run the local database migration (creates the catalog, orders, and audit-log tables).
4. Seed the catalog with the demo product list.
5. Start the dev server and open the chat UI.
6. Use Razorpay's documented test payment methods to walk through both a successful purchase and the deliberate decline scenario.

## 7. What to expect when you run the demo

- A chat window on the left, an **Agent Activity / Audit Trail** panel on the right (see `design.md`).
- Ask for something in the catalog ("I want a pair of the blue wireless earbuds") — you'll see a tool-call indicator, then a product result.
- Ask to buy it — you'll see the agent state the price and reasoning, then a **blocking confirmation card**, never a payment fired silently.
- Confirm — a real (test-mode) order gets created, and you'll see it land in the audit trail with a timestamp.
- Try to ask for something absurdly expensive, or many of the same item — you should hit the hard cap and get a plain refusal, not a workaround.
- Trigger the deliberate decline scenario — you should see a plain-language failure explanation and a next step, not a crash or an infinite retry.

## 8. Problems you're likely to run into, and what to do

| Problem | What's actually happening | What to do |
|---|---|---|
| Agent states a price that's wrong or outdated | It answered from its own memory instead of a fresh tool call | Check the tool-calling code path — the agent should be structurally unable to state a price without a `search_catalog`/`get_product` result in that turn (see `Docs/Rule.md`) |
| Agent tries to skip confirmation on a "just buy it" style message | Prompt is being interpreted as implicit consent | Confirmation must be a distinct UI action (button/explicit reply), never inferred from tone — this is enforced in code, not the prompt |
| Spend cap gets bypassed by rephrasing ("split into two orders of half the price") | Cap is only checked per-order, not per-session | Enforce both a per-order cap and a running per-session cap server-side |
| Payment gets created twice on a flaky connection / user double-clicking confirm | No idempotency key on order creation | Attach an idempotency/receipt key tied to the specific confirmation event, reject duplicate submissions |
| Webhook (if used) fires but the app doesn't trust it | Signature not verified, or verified against the wrong secret | Always verify Razorpay's webhook signature server-side before acting on a webhook payload |
| Declined payment causes a silent infinite retry | No stopping rule on failure | One retry attempt maximum, then hand control back to the user with an explanation — never auto-retry silently |
| Audit trail becomes unreadable clutter during the demo | Logging every internal step instead of every decision | Log one line per *decision* (tool call, reasoning, confirmation, result) — not every internal function call |
| LLM API key or Razorpay secret ends up visible in the browser | Secret used client-side instead of server-side | All provider/API secrets live only in server-side code / environment variables, never shipped to the frontend |
| Demo looks fine until you ask something slightly off-script and the agent breaks | Tool surface or prompt too narrow for real conversation | Keep the catalog and tool set small but test with a handful of deliberately odd phrasings before recording the pitch video |

## 9. What to look out for (things that fail silently, not loudly)

- **A confirmation that "feels" like a confirmation but isn't a distinct action** — the most common way "gated" quietly breaks.
- **A cap that's enforced in the system prompt instead of in code** — models can be talked out of prompt-only rules; code-level enforcement can't be.
- **An audit trail that's written *after* the action instead of alongside it** — if the app crashes mid-action, you want to know that from the log, not have to guess.
- **A catalog that looks agent-readable but isn't actually machine-parseable** — test by having the agent query it exactly the way it will in production, not by eyeballing the JSON.
- **Forgetting to actually test the failure path before recording the video** — "one failure handled gracefully" is graded, and it's the easiest thing to leave untested under time pressure.

## 10. Benefit to the merchant

- **Recovers sales that die from checkout friction.** Conversational checkout removes the multi-page cart-to-payment funnel for both human buyers who prefer chat and AI agents that can't navigate a rendered UI at all.
- **Makes the merchant "AI-buyer ready"** for the coming wave of agent-to-agent commerce (NPCI UAP, ACP, AP2, x402) without redesigning their storefront.
- **Every transaction is defensible after the fact.** The audit trail is a ready-made explanation for disputes, chargebacks, or "why did this order happen" questions — not just a payment log, but a reasoning log.
- **Nothing happens the merchant didn't explicitly bound.** Hard caps and mandatory confirmation mean the merchant isn't trusting an LLM's judgment with unlimited authority over their payment gateway.

## 11. What the buyer (human or agent) experiences

- Describes what they want in plain language instead of navigating a catalog UI.
- Sees exactly what the agent is about to do and why, before any money moves.
- Has to explicitly say yes — no dark patterns, no inferred consent.
- Gets a clear, human-readable explanation if anything goes wrong, with an actual next step.
- Can review, at any point, a plain-language history of everything the agent has done in the session.

## 12. Future of this product (beyond the buildathon submission)

- Real catalog ingestion from an actual merchant's product feed, not a hand-typed demo list.
- Multi-merchant support — one agent, many agent-readable catalogs.
- The other Track 1 example directions layered on top of the same guardrail core: upsell/cross-sell suggestions, a campaign orchestrator.
- Native support for emerging agent-commerce protocols (ACP, AP2, x402) so SureCart AI is directly callable by third-party shopping agents, not just a chat UI a human types into.
- Configurable caps and confirmation policy per merchant, instead of one hard-coded set of numbers.
- Production-grade payment capture with proper KYC/compliance flows, replacing the test-mode-only MVP.
- Richer audit/compliance tooling: exportable audit reports, anomaly flags on the agent's own decision history.

## 13. What we're taking shortcuts on for the buildathon, vs. the eventual plan

| Area | Buildathon shortcut | Designated full plan |
|---|---|---|
| Catalog | 5–15 hand-typed SKUs in a JSON file | Real-time ingestion from a merchant's actual product feed |
| Buyer | A human types in the chat UI, playing the role of "the buyer" (human or agent) | Direct callability by third-party AI shopping agents over a standard protocol (ACP/AP2/x402) |
| Payment | Razorpay test mode only, one simulated success + one simulated decline | Live payment capture with full KYC/compliance and broader failure-mode coverage |
| Caps & policy | One hard-coded per-order and per-session cap | Per-merchant configurable policy engine |
| Catalog scope | Single merchant, single category | Multi-merchant, multi-category |
| Upsell / cross-sell / campaigns | Not built — explicitly out of scope for the MVP | Layered on top of the same guardrail core as a second track direction |
| Audit trail | In-app log, viewable in the UI | Exportable compliance reports, anomaly detection on the agent's own decisions |
| Notifications | None — everything happens synchronously in the chat | Email/SMS confirmation, async order status updates |

---

*See `PRD.md` for the formal requirements this shortcut table is scoped against, and `phases.md` for when each piece of the MVP actually gets built.*
