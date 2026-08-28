# Instructions.md — SureCart AI Operational Manual & Runbook

This document is the complete operational guide for **SureCart AI**. It details environment setup, configuration requirements, execution commands, expected product behaviors across all user flows, and persistent verification checklists.

---

## 1. Prerequisites & Environment Setup

### Required System Software
* **Node.js**: v18.18.0 or later (LTS recommended, tested on v22)
* **npm** (or `npm.cmd` on Windows)

### Environment Configuration (`.env`)
Create a `.env` file in the project root based on `.env.example`:

```env
# Razorpay Test Mode Credentials (Obtain from Razorpay Dashboard -> Settings -> API Keys)
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret_key

# LLM Provider API Key (Google Gemini / OpenAI / Anthropic)
# Gemini API Key (Recommended):
GEMINI_API_KEY=
# Or OpenAI:
OPENAI_API_KEY=
# Or Anthropic:
ANTHROPIC_API_KEY=

# Guardrail Limits (Configurable defaults in INR)
NEXT_PUBLIC_PER_ORDER_CAP=5000
NEXT_PUBLIC_PER_SESSION_CAP=10000

# Server / Port Configuration
PORT=3000
```

> [!NOTE]
> **Sandbox Capability**: The application includes a deterministic grounding engine and simulated test gateway out of the box, allowing you to immediately run and test all four product flows (Flow A, B, C, D) locally even before entering live Razorpay test keys or external LLM API keys.

---

## 2. Installation & Run Commands

```bash
# 1. Install dependencies (Already performed during production stage)
npm install

# 2. Seed the SQLite database with demo catalog items
npm run db:seed

# 3. Start local development server
npm run dev

# 4. Open the application in your browser
http://localhost:3000
```

---

## 3. Detailed Expected Product Behaviors & User Flows

### Flow A: Happy Path (Grounded Search → Purchase Proposal → Explicit Confirmation → Guardrail Check → Razorpay Test Capture → Success)
1. **Trigger**: Buyer types a product query into the chat composer (e.g., *"I want a pair of wireless earbuds"* or clicks the `🎧 Buy Earbuds (₹2,499)` chip).
2. **Responsible Component**: `Agent Orchestrator` invokes `search_catalog` and `propose_purchase` on the SQLite catalog store.
3. **What the User Sees**:
   - Tool activity indicator: `Tool: search_catalog ✓` → `Tool: propose_purchase ✓`.
   - Conversational response with grounded product information (Aura Wireless Noise-Cancelling Earbuds, ₹2,499, Audio category, stock status).
   - Distinct **Purchase Proposal**: Stating item, exact total in ₹, and stated reason (*"Matches your request and verified within purchase limits"*).
   - Distinct, blocking **Confirmation Card** with two actions: `[Cancel]` and `[Confirm order]`.
4. **Buyer Action**: Buyer clicks `[Confirm order]`.
5. **Guardrail Check**:
   - `Policy Layer` validates all 4 server-side checks:
     1. Amount <= ₹5,000 (Per-order cap).
     2. Session total + Amount <= ₹10,000 (Session cap).
     3. Confirmation token is valid and unspent.
     4. Idempotency key is unique.
6. **Payment & Audit**:
   - `Razorpay Integration` creates order and executes test capture.
   - Confirmation card transitions to `Order Confirmed` with Order ID and status `Captured`.
   - Right-hand **Agent Activity & Audit Trail Panel** shows timestamped entries for Search, Verification, Proposal, Buyer Confirmation, Guardrail Approval, and Payment Capture.

---

### Flow B: Spend-Cap Refusal (Over-Cap Order Attempt — Rule R2)
1. **Trigger**: Buyer requests an order that exceeds the per-order limit (e.g., *"Order the SonicStudio Reference Studio Soundbar for ₹15,999"* or clicks the `🚫 Soundbar (₹15,999 — Over Cap)` chip).
2. **Responsible Component**: `Policy Layer` / `Agent Orchestrator`.
3. **What the User Sees**:
   - The agent responds with a plain-language explanation: *"I cannot proceed with this purchase because ₹15,999 exceeds the per-order spending limit of ₹5,000. No payment was attempted."*
   - **No confirmation card is rendered** (preventing misleading authorization prompts).
   - Audit trail records a `Refusal` event with the reason and violation details.

---

### Flow C: Deliberate Decline / Failure Handling Path (Rule R15–R18)
1. **Trigger**: Buyer prepares an order (e.g., Fast Charger ₹2,899) and checks the `Test Flow C: Simulate Bank Decline Scenario` checkbox before clicking `[Confirm order]`.
2. **Responsible Component**: `Razorpay Integration` + `Policy Layer`.
3. **What the User Sees**:
   - Confirmation card updates to: `Payment Wasn't Completed`.
   - Plain-language failure explanation grounded in the gateway decline code (*"Payment declined: Issuing bank rejected the transaction due to a simulated test rule."*).
   - Clear reassurance: *"Policy Notice: No automatic retry was made."*
   - Concrete next steps offered: `[Try Again with Standard Method]` or `[Cancel Order]`.
   - Audit trail logs `Payment declined` with timestamp and failure code.

---

### Flow D: Idempotency & Duplicate Prevention (Rule R5)
1. **Trigger**: User double-clicks `[Confirm order]` or retransmits a duplicate request.
2. **Responsible Component**: `Policy Layer` idempotency validator.
3. **What the User Sees**:
   - Button immediately disables upon the first click (`Confirming Order...`).
   - Server validates the idempotency key; any second submission is rejected with no duplicate charge.
   - Only exactly one order is created.

---

## 4. Persistent Stage-by-Stage Verification Checklists

*Rule: Never delete completed checklists. Append new development stages and preserve historical records.*

### Stage 1: Documentation Baseline & Project Inception (Completed: 2026-08-27)
- [x] Master development prompt analyzed and all instructions internalized.
- [x] `Docs/PRD.md`, `Docs/Architecture.md`, `Docs/README.md`, `Docs/design.md`, and `Docs/Rule.md` thoroughly reviewed.
- [x] Official product name established as **SureCart AI**.
- [x] `Docs/Rule.md` created as single unified rulebook (governance + code guardrails R1–R21).
- [x] `Docs/issues.md` created and initialized with initial issue log.
- [x] `Docs/memory.md` created with persistent project memory and architectural truth.
- [x] `Docs/Instructions.md` created with operational runbook and expected behavior flows.
- [x] Historical naming references updated across documentation.

### Stage 2: Codebase Scaffolding & Database Layer (Completed: 2026-08-27)
- [x] Initialized Next.js 15 project with TypeScript, App Router, and Tailwind CSS.
- [x] Configured SQLite database schema (`catalog`, `orders`, `audit_log`, `confirmation_tokens`) with WAL mode in `src/lib/db.ts`.
- [x] Created database seed script `scripts/seed.js` with 9 realistic demo catalog items matching `Docs/design.md`.
- [x] Seeded SQLite database at `data/surecart.db`.
- [x] Provided `.env.example` with documented environment variables.

### Stage 3: Guardrail Engine & Tool Orchestrator (Completed: 2026-08-27)
- [x] Implemented server-side Policy Layer (`src/lib/guardrails.ts`) enforcing per-order cap (₹5,000), session cap (₹10,000), confirmation token verification, and idempotency key uniqueness.
- [x] Implemented LLM tool-calling orchestrator (`src/lib/agent/orchestrator.ts`, `tools.ts`) with scoped tools (`search_catalog`, `get_product`, `propose_purchase`, `get_order_status`).
- [x] Implemented Razorpay Node SDK test-mode integration (`src/lib/razorpay.ts`) with test capture and deliberate simulated decline testing.
- [x] Implemented append-only audit logging pipeline in `src/lib/db.ts`.
- [x] Implemented API routes (`/api/chat`, `/api/confirm`, `/api/audit`, `/api/catalog`, `/api/orders/[id]`, `/api/session/reset`).

### Stage 4: User Interface Implementation (Completed: 2026-08-27)
- [x] Built `AppHeader.tsx` with brand header, test-mode badge, live session spend indicator, and session reset.
- [x] Built `ChatPanel.tsx` and `ChatMessageItem.tsx` with tool activity indicators, grounded product displays (`ProductCard.tsx`), and testing chips.
- [x] Built `ConfirmationCard.tsx` with pending review, confirming, success (captured), and declined states.
- [x] Built `AuditPanel.tsx` (desktop 2-column layout) and mobile drawer with real-time event streaming and payload inspector.
- [x] Ensured full compliance with typography, spacing, and styling rules in `Docs/design.md`.

### Stage 5: Manual User Verification (Current Active Stage)
- [ ] Manual Check 1: Verify Flow A (Happy path purchase and audit log stream).
- [ ] Manual Check 2: Verify Flow B (Spend-cap refusal before confirmation).
- [ ] Manual Check 3: Verify Flow C (Deliberate payment decline and recovery options).
- [ ] Manual Check 4: Verify Flow D (Idempotency and duplicate prevention).
- [ ] Manual Check 5: Verify Session reset and spend cumulative limit tracking.

### Stage 6: Design Development & Redesign Checklist (Completed: 2026-08-28)
- [x] Existing UI audited for "AI slop" patterns
- [x] Existing design requirements reviewed and mapped to codebase
- [x] Current frontend component implementation understood
- [x] Reviewed design references (Taste Skill, Vercel Guidelines, Image-to-Code Skill, Awesome Design, Playwright CLI)
- [x] `design.md` updated with HSL tokens, font pairings, references, and future guidelines
- [x] Design system established/refined and integrated into client styles
- [x] Typography refined with display and body font variable mappings
- [x] Color system refined with muted slate HSL backgrounds and indigo highlights
- [x] Spacing system refined with strict 4px base scale and proportional paddings
- [x] Component consistency reviewed (inputs, cards, titles, headers, and logs)
- [x] Navigation reviewed (AppHeader session indicator and resets)
- [x] Forms reviewed (composers, submit buttons, setting checkboxes)
- [x] Buttons reviewed with transition scaling and disabling states
- [x] Loading states reviewed (quiet pulse indicators instead of sparkles)
- [x] Empty states reviewed (brand greeting and suggesion cards layout)
- [x] Error states reviewed (decline receipt layouts and cap refusal panels)
- [x] Responsive behavior reviewed (desktop 2-column, mobile drawers, full confirmation card)
- [x] Accessibility reviewed (contrast ratio checks, custom focus rings, labels)
- [x] Existing functionality and guardrail logic preserved
- [x] Actual UI implementation updated across all component files
- [x] Documentation synchronized with current codebase structures
- [x] Automated/project verification performed where appropriate
- [ ] Manual verification requirements documented for user checkoff (Flow A, B, C, D)
