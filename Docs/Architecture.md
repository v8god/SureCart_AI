# Architecture.md — SureCart AI

## 1. System overview

SureCart AI is a single deployable web app: a chat-based frontend, a small API layer, a tool-calling LLM agent, a local database holding the catalog/orders/audit log, and a server-side integration with Razorpay's test-mode Orders API. There is no separate microservice split — for a solo ~9-day build, one app with clean internal boundaries is faster to build, debug, and explain than a distributed system, and the panel is evaluating design judgment, not infrastructure scale.

## 2. High-level diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          Browser (Client)                        │
│   Chat UI  |  Confirmation Card  |  Audit Trail Panel            │
└───────────────────────────┬───────────────────────────────────────┘
                             │ HTTPS (same-origin API routes)
┌───────────────────────────▼───────────────────────────────────────┐
│                          Application Server                       │
│                                                                     │
│   ┌───────────────┐   ┌────────────────────┐   ┌────────────────┐ │
│   │  Chat / Agent │──▶│   Guardrail /      │──▶│  Razorpay       │ │
│   │  Orchestrator │   │   Policy Layer     │   │  Integration    │ │
│   │ (LLM + tools) │◀──│ (caps, gating,     │◀──│  (Orders API,   │ │
│   └───────┬───────┘   │  idempotency)      │   │   test mode)    │ │
│           │           └─────────┬──────────┘   └────────┬────────┘ │
│           │                     │                        │          │
│           ▼                     ▼                        ▼          │
│   ┌───────────────┐   ┌────────────────────┐   ┌────────────────┐  │
│   │ Catalog Store │   │   Audit Log Store  │   │  Orders Store  │  │
│   └───────────────┘   └────────────────────┘   └────────────────┘  │
│                                                                     │
│                         (single SQLite database)                   │
└─────────────────────────────────────────────────────────────────────┘
                             │
                             ▼
                    Razorpay Test-Mode API
```

## 3. Components

**Frontend (chat + confirmation + audit trail)**
React + TypeScript. Three visible surfaces: the chat thread, a confirmation card that blocks further action until answered, and an audit trail panel that streams the same events the backend is logging. No business logic lives here — the frontend renders state, it never decides whether an order is allowed.

**Chat / Agent Orchestrator**
Receives the buyer's message, calls the LLM with the current conversation and the fixed tool set (`search_catalog`, `get_product`, `create_order`, `get_order_status`), and executes whichever tool the model calls. The orchestrator — not the model — is responsible for actually invoking the tool implementation and returning the real result to the model on the next turn. The model never has direct access to the database or the Razorpay API; it only ever sees tool results.

**Guardrail / Policy Layer**
Sits between the orchestrator and both the order-creation logic and the audit log. Every proposed `create_order` call passes through this layer before it's allowed to reach the Razorpay integration:
1. Check proposed amount against the per-order hard cap → reject outright if over.
2. Check running session total against the per-session cap → reject outright if it would exceed it.
3. Check that a matching, explicit confirmation event exists for this exact proposed order → reject if missing.
4. Check idempotency key hasn't been used before → reject if it's a duplicate.
5. Only if all four pass: write a "proceeding" audit entry, then call the Razorpay integration.

This layer is the actual enforcement point for "bounded and gated" — see `Docs/Rule.md` for the exact rules it implements.

**Catalog Store**
A table of products (id, name, price, currency, stock, category, policy notes). Read by `search_catalog`/`get_product` tool calls. Static/seeded for the demo — not connected to a real inventory system.

**Razorpay Integration**
Thin wrapper around Razorpay's test-mode Orders/Payments APIs: create order, simulate/capture payment, fetch status. All calls happen server-side with the test-mode secret key; the frontend never talks to Razorpay directly.

**Audit Log Store**
Append-only table: timestamp, actor (agent/buyer/system), action type, human-readable reasoning, structured payload, result. Every guardrail decision and every tool call writes here — successes, refusals, and failures alike.

**Orders Store**
Local record of orders created, mirroring what Razorpay has (order id, amount, status, linked audit entries), so the app doesn't need to re-query Razorpay to render order history.

## 4. Data flow — happy path

1. Buyer sends a chat message.
2. Orchestrator sends conversation + tool definitions to the LLM.
3. LLM calls `search_catalog` → orchestrator queries Catalog Store → result returned to LLM → **audit log: "agent searched catalog for X"**.
4. LLM proposes a purchase with stated reasoning, rendered to the buyer as a confirmation card (not yet a tool call).
5. Buyer explicitly confirms (distinct UI action) → **audit log: "buyer confirmed order for ₹Y"**.
6. Orchestrator calls `create_order` tool → Guardrail Layer runs its 4 checks → all pass → **audit log: "guardrail approved, proceeding"**.
7. Razorpay Integration creates the order and captures the (test-mode) payment → **audit log: "order created, payment captured"**.
8. Orders Store updated, success state rendered to buyer.

## 5. Data flow — deliberate failure path

1–6. Same as above, up through guardrail approval.
7. Razorpay Integration attempts capture using a test scenario that simulates a decline → **audit log: "payment declined, reason: <code>"**.
8. Orchestrator surfaces a plain-language explanation to the buyer via the LLM (grounded in the actual decline reason, not invented) plus one concrete next step (retry with a different method, or cancel).
9. No automatic retry — the next action requires a new explicit buyer decision, which itself goes back through the guardrail layer as a fresh confirmation.

## 6. Data models

**Catalog item**
```
id, name, price, currency, stock, category, policy_notes
```

**Order**
```
id, catalog_item_id, amount, currency, razorpay_order_id,
status (pending | captured | declined | failed),
idempotency_key, session_id, created_at
```

**Audit log entry**
```
id, timestamp, session_id, actor (agent | buyer | system),
action_type (search | propose | confirm_request | confirm_result |
             guardrail_check | order_created | order_result | refusal),
reasoning (plain language), payload (structured), result
```

## 7. Tech stack

| Layer | Technology | Why |
|---|---|---|
| Frontend + backend framework | Next.js (App Router), TypeScript | One deployable app, no separate frontend/backend servers or CORS to manage — fastest path for a solo ~9-day build |
| Database | SQLite (via Prisma or better-sqlite3) | Zero setup, file-based, plenty for a demo's data volume, trivial to seed and reset |
| LLM | Claude or GPT via tool-calling / function-calling API | Native structured tool-use support; either works — pick whichever key you already have |
| Payments | Razorpay Node SDK, test mode | Matches the track's required API surface directly |
| Styling | Tailwind CSS | Fast to build a clean, trustworthy-looking interface without hand-rolling a design system |
| Hosting (for the demo video) | Vercel (or local dev is enough) | Optional — pairs naturally with Next.js if a live deployed link is wanted |

## 8. Internal API surface

- `POST /api/chat` — send a buyer message, returns the agent's response (and any pending confirmation)
- `POST /api/confirm` — buyer's explicit confirmation/cancellation of a pending proposed order
- `GET /api/catalog` — list catalog items (used by the tool implementation, also by an optional catalog-browse view)
- `GET /api/orders/:id` — fetch order status
- `GET /api/audit` — stream/list audit log entries for the current session, used by the audit trail panel

## 9. Razorpay integration details

- Test-mode key ID/secret generated from the Razorpay dashboard, stored only in server-side environment variables.
- Order creation via the Orders API (amount, currency, receipt = idempotency key).
- Payment capture simulated using Razorpay's documented test-mode payment methods, including at least one method/scenario that produces a decline, to drive the deliberate failure path.
- If webhooks are used to confirm final payment status: verify the signature against the webhook secret before trusting the payload, and treat an unverified webhook as untrusted input, not as ground truth.

## 10. Security considerations

- Razorpay secret key and LLM API key exist only in server-side code/environment variables — never in frontend bundles, never passed into the LLM's context.
- All guardrail checks (caps, confirmation match, idempotency) are enforced server-side, so no client-side tampering can skip them.
- Input from the buyer is treated as untrusted text passed to the LLM, not as executable instructions to the guardrail layer — the guardrail layer only trusts its own database state and the explicit confirmation event, never the LLM's summary of what the buyer said.

## 11. Idempotency and concurrency

- Every proposed order gets a unique idempotency key at the moment it's presented for confirmation.
- The guardrail layer rejects any `create_order` call reusing a key that's already resulted in an order — covers double-clicks, retried requests, and flaky connections.
- Session-level spend total is computed from the Orders Store at check time, not cached, to avoid race conditions from near-simultaneous requests.

## 12. Local development

1. `git clone` the repo, `npm install`.
2. Copy `.env.example` → `.env`, fill in Razorpay test keys and LLM API key.
3. Run the database migration/seed script (creates tables, seeds the demo catalog).
4. `npm run dev`, open the chat UI locally.
5. Run through the happy path and the deliberate failure path before recording anything.
