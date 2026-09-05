# SureCart AI — Development Phases & Verification Plan

This document is the authoritative development and verification progression roadmap for **SureCart AI**. It defines the phase structure, functional requirements, code-enforced guardrails, and verification criteria.

---

## Phase Overview

| Phase | Title | Scope | Status |
|---|---|---|---|
| **Phase 1** | **Foundation & Architecture Baseline** | Scaffolding, SQLite catalog store, WAL mode, seed data, unified rulebook (`Docs/Rule.md`), design system specification (`Docs/design.md`). | **Complete & Verified** |
| **Phase 2** | **Guardrail / Policy Engine** | Server-side 4-gate verification (per-order cap ₹5,000, session cap ₹10,000, unspent confirmation token, unique idempotency key) in `src/lib/guardrails.ts`. | **Complete & Verified** |
| **Phase 3** | **Agent Orchestrator & Tool Surface** | Scoped tools (`search_catalog`, `get_product`, `propose_purchase`, `get_order_status`), deterministic grounding engine, proposal generator. | **Complete & Verified** |
| **Phase 4** | **Payment Gateway Integration** | Razorpay test-mode integration (`src/lib/razorpay.ts`), simulated capture, deliberate decline testing (Flow C), zero automatic retry. | **Complete & Verified** |
| **Phase 5** | **UI/UX & Design System Alignment** | Two-column responsive layout, light/dark mode semantic tokens, zero emojis, honest loading states, accessible confirmation card, and real-time audit panel. | **Complete & Verified** |
| **Phase 6** | **End-to-End Flow Verification** | Automated & manual verification of Flow A (Happy path), Flow B (Cap refusal), Flow C (Decline handling), Flow D (Idempotency), and session management. | **Active & Ready** |

---

## Detailed Phase Requirements & Verification Checklists

### Phase 1: Foundation & Architecture Baseline
- [x] Next.js App Router project initialized with TypeScript and Tailwind CSS.
- [x] SQLite database schema defined for `catalog`, `orders`, `audit_log`, and `confirmation_tokens`.
- [x] Database seed script `scripts/seed.js` configured with 9 realistic demo catalog SKUs.
- [x] Authoritative design specification established in `Docs/design.md`.
- [x] Unified rulebook established in `Docs/Rule.md` (Rules R1–R21).

### Phase 2: Guardrail / Policy Engine
- [x] Per-order hard spend cap (₹5,000) enforced server-side; orders exceeding cap refused at proposal stage before confirmation is created (**Rule R2**).
- [x] Per-session cumulative spend cap (₹10,000) enforced server-side against database order history (**Rule R3**).
- [x] Time-bounded (10-minute) explicit confirmation tokens generated at proposal time and checked for exact item, amount, and session match (**Rule R8, R9, R10**).
- [x] Unique idempotency keys required for every payment action; duplicates rejected with no duplicate charge (**Rule R5**).

### Phase 3: Agent Orchestrator & Tool Surface
- [x] Agent actions restricted strictly to tool set (`search_catalog`, `get_product`, `propose_purchase`, `get_order_status`) (**Rule R14**).
- [x] Prices, stock levels, and product names come strictly from tool results, never LLM memory (**Rule R1, R6**).
- [x] Grounded product search supports categories, text queries, and budget filtering.
- [x] Stated reasoning recorded for every proposed purchase (**Rule R4, R9**).

### Phase 4: Payment Gateway Integration
- [x] Razorpay Orders API test-mode integration implemented in `src/lib/razorpay.ts`.
- [x] Test-mode order capture simulated end-to-end (Flow A).
- [x] Deliberate bank decline scenario implemented with realistic gateway decline code and plain-language explanation (Flow C) (**Rule R15**).
- [x] Zero automatic retry on decline; control returned to the buyer with actionable next steps (**Rule R17, R18**).
- [x] Secrets isolated to server-side environment variables; never exposed to browser or LLM context (**Rule R19**).

### Phase 5: UI/UX & Design System Alignment (`Docs/design.md`)
- [x] Warm neutral foundation (`#F7F7F4`) with evergreen accent (`#176B5B`) for Light Mode.
- [x] Charcoal surfaces (`#171916`) with evergreen accent (`#55A996`) for Dark Mode.
- [x] User-switchable Light / Dark mode with persistent theme preference.
- [x] **Zero emojis** anywhere in the UI (buttons, headings, chips, messages, cards, audit trail).
- [x] No AI slop: no purple/indigo SaaS gradients, no glassmorphism, no sparkles, no floating blobs, no fake badges.
- [x] Distinct, blocking confirmation card with explicit action: `Confirm order` and `Cancel`.
- [x] Receipt formatting for captured orders; clear failure presentation for declined orders.
- [x] Real-time audit trail panel with expandable payload inspector and actor filters.
- [x] Responsive layout: two-column on desktop (68% / 32%), mobile drawer on `< 640px`.
- [x] Keyboard accessibility, visible focus rings (`:focus-visible`), and semantic HTML.

### Phase 6: End-to-End Flow Verification

#### Verification Matrix

| Flow | Scenario | Trigger | Expected Outcome | Status |
|---|---|---|---|---|
| **Flow A** | Happy Path Purchase | Search "earbuds" → Click "Confirm order" | 4-gate check passes → Order captured → Status: `captured` → Receipt rendered → Audit trail logged | **Verified** |
| **Flow B** | Spend-Cap Refusal | Request Soundbar (₹15,999) | Refused at proposal stage → No confirmation button shown → Audit trail records `refusal` | **Verified** |
| **Flow C** | Deliberate Decline | Toggle "Simulate Decline" → Click "Confirm order" | Gateway declines → Status: `declined` → Zero auto-retry notice → Retry/Cancel options shown | **Verified** |
| **Flow D** | Idempotency Protection | Double-click confirm / Replay token | First request succeeds → Subsequent request rejected as duplicate → No extra charge | **Verified** |
| **Session Reset** | Reset Spend & Audit | Click "Reset Session" in header | Session spend resets to ₹0 → Audit log cleared for session → Ready for fresh demo | **Verified** |
