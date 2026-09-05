# SureCart AI — Persistent Project Memory

*This document serves as the permanent memory and source of architectural truth for SureCart AI. It tracks the evolution, decisions, current state, known limitations, and future roadmap.*

---

## 1. Project Overview

### What is SureCart AI?
**SureCart AI** is a conversational checkout agent operating over an agent-readable product catalog, built for the **Razorpay AI Buildathon 2026 (Track 01: AI Growth & Agentic Commerce)**.

### Purpose & Problem Statement
Merchants today are built solely for traditional click-through storefronts. Two market shifts are occurring simultaneously:
1. **Human shoppers** increasingly prefer natural conversational buying rather than multi-step cart funnels.
2. **AI shopping agents** are beginning to shop on behalf of humans and require structured, machine-parseable catalogs and bounded tool APIs.

The central challenge in agentic commerce is safety: **ensuring an LLM's judgment is never the only thing standing between a conversation and a real payment.** 

SureCart AI solves this by introducing a strict **Guardrail / Policy Layer**:
* The agent can search and propose.
* The buyer explicitly authorizes.
* The system enforces hard spend caps, idempotency, and auditability in server code before any money moves.

---

## 2. Current Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                         Browser (Client)                               │
│   Chat UI  |  Confirmation Card  |  Audit Trail Panel / Mobile Drawer  │
└───────────────────────────┬────────────────────────────────────────────┘
                             │ HTTPS (same-origin API routes)
┌───────────────────────────▼────────────────────────────────────────────┐
│                         Next.js App Server                             │
│                                                                        │
│   ┌────────────────┐   ┌─────────────────────┐   ┌───────────────────┐ │
│   │ Agent          │──▶│ Guardrail / Policy  │──▶│ Razorpay          │ │
│   │ Orchestrator   │   │ Enforcement Layer   │   │ Integration       │ │
│   │ (LLM + Tools)  │◀──│ (Caps, Gating,      │◀──│ (Orders API,      │ │
│   │                │   │  Idempotency)       │   │  test mode)       │ │
│   └────────┬───────┘   └──────────┬──────────┘   └─────────┬─────────┘ │
│            │                      │                        │           │
│            ▼                      ▼                        ▼           │
│   ┌────────────────┐   ┌─────────────────────┐   ┌───────────────────┐ │
│   │ Catalog Store  │   │   Audit Log Store   │   │   Orders Store    │ │
│   └────────────────┘   └─────────────────────┘   └───────────────────┘ │
│                                                                        │
│                        (SQLite Database)                               │
└────────────────────────────────────────────────────────────────────────┘
                             │
                             ▼
                  Razorpay Test-Mode API
```

### Core Components
1. **Frontend UI (Next.js 15 / React 19 / Tailwind CSS)**:
   - **Header (`AppHeader.tsx`)**: Brand title, Test-Mode status badge, session spend progress bar, session reset button, mobile drawer toggle.
   - **Chat Panel (`ChatPanel.tsx`, `ChatMessageItem.tsx`)**: Message stream, grounded product cards (`ProductCard.tsx`), tool activity badges, suggestion chips.
   - **Purchase Proposal & Gated Confirmation Card (`ConfirmationCard.tsx`)**: Distinct, blocking confirmation card presenting exact items, total amount (₹), currency, stated reason, and 4-gate policy status (per-order cap, session cap, confirmation token, idempotency key). States: pending, confirming, captured (success), and declined (with grounded failure reason and concrete next steps).
   - **Agent Activity & Audit Trail Panel (`AuditPanel.tsx`, `AuditItem.tsx`)**: Real-time stream of audit events (Search, Verification, Proposal, Confirmation, Guardrail approval, Order creation, Refusal, Decline) with expandable structured payload inspector and actor filters.
2. **Agent Orchestrator (`src/lib/agent/orchestrator.ts`, `tools.ts`)**:
   - Manages conversation context and executes scoped tools (`search_catalog`, `get_product`, `propose_purchase`, `get_order_status`).
   - Forces grounding: prices, stock, and status come strictly from tool results, never LLM memory.
   - Deterministic grounding engine ensuring reliable local testing with fallback support for Gemini / OpenAI / Anthropic.
3. **Guardrail / Policy Layer (`src/lib/guardrails.ts`)**:
   - **Check 1**: Proposed order amount <= Per-order hard cap (₹5,000). Rejects over-cap orders before confirmation is offered.
   - **Check 2**: Cumulative session spend + Proposed amount <= Per-session hard cap (₹10,000).
   - **Check 3**: Valid, unspent explicit confirmation token tied to the specific proposed item and amount.
   - **Check 4**: Unique idempotency key verification to reject duplicate submissions.
   - Only proceeds to Razorpay API if all 4 checks pass.
4. **Data Layer (`src/lib/db.ts`, `scripts/seed.js`)**:
   - `catalog`: Structured product catalog (id, name, price, currency, stock, category, policy_notes) seeded with 9 demo SKUs.
   - `orders`: Order history, status (`pending`, `captured`, `declined`, `failed`), idempotency keys, Razorpay order IDs.
   - `audit_log`: Append-only audit entries (timestamp, actor, action_type, reasoning, payload, result).
   - `confirmation_tokens`: Time-bounded unspent authorization tokens.
5. **Razorpay Test-Mode Integration (`src/lib/razorpay.ts`)**:
   - Server-side wrapper using Razorpay Node SDK.
   - Test-mode order creation and simulated capture.
   - Deliberate simulated decline path (Flow C) for failure testing without automatic retries.

---

## 3. Current Implementation State

| Component | Status | Details |
|---|---|---|
| Documentation Baseline | **Complete** | `PRD.md`, `Architecture.md`, `README.md`, `design.md`, `Rule.md`, `issues.md`, `memory.md`, `Instructions.md` |
| Project Scaffolding | **Complete** | Next.js 15 (App Router), TypeScript, Tailwind CSS, dependencies installed |
| Catalog Store & Seeding | **Complete** | 9 realistic SKUs in SQLite `data/surecart.db` via `scripts/seed.js` |
| Policy / Guardrail Engine | **Complete** | `src/lib/guardrails.ts` enforcing 4-gate verification & pre-proposal refusal |
| Tool-calling Orchestrator | **Complete** | Scoped tools (`search_catalog`, `get_product`, `propose_purchase`, `get_order_status`) |
| Razorpay Test Integration | **Complete** | `src/lib/razorpay.ts` supporting test capture and deliberate simulated decline |
| Conversational UI & Audit Panel | **Complete** | `AppHeader.tsx`, `ChatPanel.tsx`, `ConfirmationCard.tsx`, `AuditPanel.tsx` |
| End-to-End Verification | **Pending User Verification** | Ready for manual verification of Flow A, B, C, and D |

---

## 4. Changes Made

| Date | Stage | Change Description | Relevant Files | Purpose & Expected Effect |
|---|---|---|---|---|
| 2026-08-27 | Inception | Renamed product from "GatedCart" to "SureCart AI" | `Docs/*` | Aligns all product documentation and branding with official naming. |
| 2026-08-27 | Inception | Created `Docs/Rule.md` | `Docs/Rule.md` | Establishes non-negotiable development rules, including No Agent-Mode Verification and strict anti-hallucination. |
| 2026-08-27 | Inception | Created `Docs/issues.md` | `Docs/issues.md` | Centralizes persistent issue and blocker tracking. |
| 2026-08-27 | Inception | Created `Docs/memory.md` | `Docs/memory.md` | Maintains persistent project memory, decisions, and architecture truth. |
| 2026-08-27 | Inception | Created `Docs/Instructions.md` | `Docs/Instructions.md` | Establishes operational runbooks, environment setups, and stage checklists. |
| 2026-08-27 | Baseline | Merged `Rules.md` and `Rule.md` into unified `Docs/Rule.md` | `Docs/Rule.md`, `Docs/Rules.md` | Eliminates confusion by consolidating governance rules and agent guardrails (R1–R21) into one single source of truth. |
| 2026-08-27 | Production Stage 1 | Scaffolded Next.js App Router project and installed dependencies | `package.json`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `next.config.mjs` | Foundational full-stack web application structure. |
| 2026-08-27 | Production Stage 1 | Implemented SQLite database layer and catalog seed script | `src/lib/db.ts`, `scripts/seed.js`, `src/types/index.ts` | Local persistence for catalog, orders, audit log, and confirmation tokens. |
| 2026-08-27 | Production Stage 1 | Implemented Server-Side Guardrail & Policy Engine | `src/lib/guardrails.ts` | Enforces 4-gate verification and proposal spend-cap checks. |
| 2026-08-27 | Production Stage 1 | Implemented Razorpay Test-Mode Wrapper | `src/lib/razorpay.ts` | Handles order creation, test capture, and simulated decline testing. |
| 2026-08-27 | Production Stage 1 | Implemented Agent Tools & Orchestrator | `src/lib/agent/tools.ts`, `src/lib/agent/orchestrator.ts` | Grounded catalog queries, proposal generation, and multi-provider support. |
| 2026-08-27 | Production Stage 1 | Implemented API Routes | `src/app/api/chat/route.ts`, `src/app/api/confirm/route.ts`, `src/app/api/audit/route.ts`, `src/app/api/catalog/route.ts`, `src/app/api/orders/[id]/route.ts`, `src/app/api/session/reset/route.ts` | Backend API surface for conversational checkout and audit streaming. |
| 2026-08-27 | Production Stage 1 | Implemented Full-Fidelity Frontend UI Components | `src/components/*`, `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx` | 2-column desktop workspace, chat thread, gated confirmation card, and real-time audit panel adhering strictly to `Docs/design.md`. |
| 2026-08-28 | Redesign | Executed UI Redesign & Design System Enforcement | `src/components/*`, `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`, `tailwind.config.ts`, `Docs/design.md` | Replaced 'AI-slop' features with a premium dark theme, integrated suggestion card grid empty state, receipt formatting for transactions, timeline log structure, and clean typography layouts. |
| 2026-08-29 | Phase 5 & 6 Alignment | Full Design System Token & Verification Alignment | `phases.md`, `Docs/phases.md`, `src/app/globals.css`, `tailwind.config.ts`, `src/components/*`, `src/app/page.tsx`, `scripts/test-guardrails.js`, `src/app/api/test-suite/route.ts` | Aligned light and dark mode with exact tokens in `design.md` (warm neutral + evergreen), eliminated all emojis, created `phases.md` roadmap, added theme toggle, and resolved test suite execution with 100% pass rate. |
| 2026-08-29 | Feature Expansion & ASCII Donut | Price/Color Filters, Grounded Comparison Matrix, Saved Tagged Addresses, Custom Dynamic Spend Caps & Mathematical 3D ASCII Donut | `src/components/AsciiDonut.tsx`, `src/components/ComparisonView.tsx`, `src/components/AppHeader.tsx`, `src/components/ChatPanel.tsx`, `src/components/ConfirmationCard.tsx`, `src/components/ProductCard.tsx`, `src/lib/agent/*`, `src/lib/db.ts`, `src/lib/guardrails.ts`, `src/app/api/*`, `Docs/design.md` | Enabled natural language price range & color search, side-by-side product comparisons, saved shipping addresses (Home, Work), dynamic spend cap customization in UI, and classic mathematical 3D rotating ASCII donut (`donut.c` torus projection) in onboarding empty state. |
| 2026-08-30 | Database Migration & COD | SQLite Orders Status Expansion & Cash on Delivery (COD) Flow | `src/lib/db.ts`, `scripts/migrate-orders-status.js`, `src/components/ConfirmationCard.tsx` | Expanded order status CHECK constraint to support `cod_confirmed`, tracking URLs, itemized price breakdown, and dual payment path (Razorpay UPI/Card vs Cash on Delivery). |
| 2026-09-02 | Marketplace Discovery & Security | Cross-Site Seller Verification, Admin Overrides & HMAC-SHA256 Signatures | `src/lib/db.ts`, `scripts/seed.js`, `scripts/test-commerce-suite.js`, `src/lib/razorpay.ts` | Added multi-seller price discovery with verified seller badges, admin allowlist override table, zero-card storage guarantee, and timing-safe cryptographic signature validation. |
| 2026-09-04 | Verification Automation | Comprehensive 32-Point Commerce Verification Suite | `scripts/test-commerce-suite.js`, `scripts/test-guardrails.js` | Automated end-to-end schema checks, address resolution, search logging, COD workflows, signature tampering protection, and aggregate analytics. |

---

## 5. Architectural & Technical Decisions

### `DEC-001` — Product Name Official Designation
- **Date**: 2026-08-27
- **Decision**: Designated **SureCart AI** as the official product name.
- **Reason**: Replaced placeholder working title ("GatedCart").
- **Consequence**: All UI branding, page titles, documentation, and user-facing copy updated to SureCart AI.
- **Related Files**: `Docs/*`

### `DEC-002` — Single Monolithic Next.js Application
- **Date**: 2026-08-27
- **Decision**: Built as a single Next.js (App Router) application with collocated frontend and server API routes, rather than separate microservices.
- **Reason**: Maximizes development velocity and debugging clarity for a ~9-day buildathon delivery while eliminating CORS and distributed state complexity.
- **Consequence**: Single repository, single build, unified TypeScript types across client and server.
- **Related Files**: `Docs/Architecture.md`

### `DEC-003` — Server-Side Application Code for Guardrail Enforcement
- **Date**: 2026-08-27
- **Decision**: Guardrail caps, idempotency keys, and explicit confirmation checks are executed in backend application code, never delegated solely to the LLM system prompt or client-side JavaScript.
- **Reason**: LLM prompts can be bypassed or jailbroken through adversarial phrasing; deterministic financial safety requires hard server-side policy enforcement.
- **Consequence**: The Policy Layer acts as an unbypassable gate before the Razorpay API can be called.
- **Related Files**: `Docs/Rule.md`, `Docs/Architecture.md`, `src/lib/guardrails.ts`

### `DEC-004` — Local SQLite Database
- **Date**: 2026-08-27
- **Decision**: Use a zero-setup, local SQLite database (`data/surecart.db`) with WAL mode for the catalog, orders, tokens, and append-only audit log.
- **Reason**: Zero external database infrastructure dependencies; easily seeded, queried, and reset during local development and video demonstration.
- **Consequence**: Rapid local testing and reproducible demonstration states.
- **Related Files**: `src/lib/db.ts`, `scripts/seed.js`

### `DEC-005` — Unified Single Rulebook (`Docs/Rule.md`)
- **Date**: 2026-08-27
- **Decision**: Consolidated all development governance rules and agent guardrail constitution (R1–R21) into a single master document: `Docs/Rule.md`.
- **Reason**: Prevent fragmentation and ambiguity.
- **Consequence**: Authoritative rulebook for contributors and policy engine.
- **Related Files**: `Docs/Rule.md`, `Docs/Rules.md`

### `DEC-006` — Premium E-commerce & Checkout Visual Redesign
- **Date**: 2026-08-28
- **Decision**: Visual overhaul of all product surfaces to remove "AI slop" aesthetics (saturated navy grids, nested cards, sparkles, developer checkboxes) in favor of high-fidelity, professional product layouts.
- **Reason**: The initial UI felt generic and AI-generated. A production-ready agentic checkout surface needs to command trust, visual breathing room, clean hierarchy, and intentional semantic cues.
- **Consequence**:
  - Implemented dual-font typography (Plus Jakarta Sans display, Inter body) via Next.js Google Font integration.
  - Formulated slate HSL colors, hairline borders (`border-white/5`), and elegant shadow focus states (`focus-ring`).
  - Replaced welcome banner with a centered greeting empty state and suggested action grid.
  - Converted the gated confirmation card into a custom checklist design, transforming captured orders into a digital receipt layout.
  - Updated the audit timeline log to render as a continuous vertical timeline thread with actor tags and an integrated accordion inspector.
- **Related Files**: `src/components/*`, `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`, `tailwind.config.ts`, `Docs/design.md`

---

## 6. Open Questions

1. **LLM Provider Configuration**: The orchestrator is fully built and runs with reliable deterministic grounding and policy evaluation out of the box, and automatically connects to Gemini Generative AI when `GEMINI_API_KEY` is provided in `.env`.

---

## 7. Known Limitations (MVP Scope)

- **Test Mode Only**: Uses Razorpay test mode; no live credit card or UPI processing.
- **Single Synthetic Merchant**: Catalog contains 9 seeded demo SKUs across 4 categories.
- **Simulated Chat Buyer**: Buyer role is played via conversational chat UI.
- **Synchronous Chat**: Notifications occur within the active session.

---

## 8. Future Plans & Roadmap

- **FP-1: Multi-Merchant & Dynamic Ingestion**: Integrate live product feeds and multi-merchant inventory endpoints.
- **FP-2: Native Agent Protocol Endpoints**: Expose direct agent-to-agent protocol endpoints (NPCI UAP, ACP, AP2, x402).
- **FP-3: Merchant Policy Console**: Merchant dashboard for configuring dynamic per-category spend caps, confirmation rules, and audit exports.
- **FP-4: Production KYC & Live Gateway**: Transition from test mode to live Razorpay checkout with full compliance flows.
