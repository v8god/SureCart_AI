# Issues & Technical Blocker Log — SureCart AI

This document is the persistent central log for problems, errors, blockers, inconsistencies, uncertainties, and technical decisions encountered during the development of **SureCart AI**. 

*Do not delete resolved issues. Preserve historical records.*

---

## Issue Index

| Issue ID | Stage | Description | Component | Status |
|---|---|---|---|---|
| `ISSUE-001` | Inception / Baseline | Historical product name transition from "GatedCart" to "SureCart AI" across documentation | `Docs/*` | **Resolved** |
| `ISSUE-002` | Inception / Baseline | Missing `phases.md` file referenced in `PRD.md` and `README.md` | `Docs/` | **Resolved** |
| `ISSUE-003` | Inception / Baseline | Initial project workspace contains only documentation, requiring new Next.js application scaffolding | Full Project | **Resolved** |
| `ISSUE-004` | Baseline | Redundant `Rules.md` and `Rule.md` files causing potential confusion | `Docs/Rule.md`, `Docs/Rules.md` | **Resolved** |
| `ISSUE-005` | Redesign | Script `test-guardrails.js` fails to run directly under plain Node.js due to TypeScript module import | `scripts/test-guardrails.js` | **Resolved** |
| `ISSUE-006` | Commerce Expansion | SQLite `orders` table CHECK constraint failure on `cod_confirmed` & extended order lifecycle statuses | `src/lib/db.ts`, `scripts/migrate-orders-status.js` | **Resolved** |
| `ISSUE-007` | Address Resolution | Natural language address tags (`home`, `work`, `college`) lacked persistent session storage | `src/lib/db.ts`, `src/lib/agent/tools.ts` | **Resolved** |
| `ISSUE-008` | Agent Grounding | Grounding query engine failed on multi-attribute filters (budget limit, color, verified sellers) | `src/lib/agent/tools.ts`, `src/lib/agent/orchestrator.ts` | **Resolved** |
| `ISSUE-009` | Marketplace Discovery | Inability to dynamically filter or override cross-site marketplace sellers without database schema | `data/surecart.db`, `scripts/seed.js` | **Resolved** |
| `ISSUE-010` | Payment Security | Need for zero-card-storage verification and cryptographic Razorpay HMAC-SHA256 test harness | `src/lib/razorpay.ts`, `scripts/test-commerce-suite.js` | **Resolved** |
| `ISSUE-011` | Dev Environment | Port 3000 collision (`EADDRINUSE`) during rapid server rebuilds and background tasks | `scripts/check-port.js`, `scripts/kill-port.js`, `scripts/free-port.js` | **Resolved** |

---

## Detailed Issue Records

### `ISSUE-001` — Product Name Transition from GatedCart to SureCart AI
- **Stage**: Inception / Baseline
- **Date**: 2026-08-27
- **Description**: The project documentation originally used the placeholder working title "GatedCart". The official product name was designated as **SureCart AI**.
- **Relevant File / Component**: `Docs/PRD.md`, `Docs/Architecture.md`, `Docs/README.md`, `Docs/design.md`, `Docs/Rule.md`
- **Error / Inconsistency**: Inconsistent product naming across documentation.
- **Root Cause**: Initial documentation draft used the placeholder name.
- **Current Status**: **Resolved**
- **Impact**: Potential confusion in branding and documentation references.
- **What Was Attempted**: Updated active product titles, headers, and UI references to "SureCart AI" while noting historical context in `Docs/memory.md`.
- **Resolution**: All core documentation files updated with the official product name "SureCart AI".
- **Remaining Action**: None.

---

### `ISSUE-002` — Missing `phases.md` Reference
- **Stage**: Inception / Baseline
- **Date**: 2026-08-27
- **Description**: `PRD.md` and `README.md` contained references to a `phases.md` file that was not present in the workspace.
- **Relevant File / Component**: `Docs/README.md`, `Docs/PRD.md`
- **Error / Inconsistency**: Broken cross-document link/reference.
- **Root Cause**: `phases.md` was part of an earlier external planning pass not committed to the repository root.
- **Current Status**: **Resolved**
- **Impact**: Broken reference in documentation.
- **What Was Attempted**: Consolidated phase planning and future roadmap into `Docs/memory.md` and `Docs/Instructions.md`, and created `phases.md` and `Docs/phases.md`.
- **Resolution**: Created `phases.md` and `Docs/phases.md` defining all 6 project development phases and verification checklists.
- **Remaining Action**: None.

---

### `ISSUE-003` — Initial Application Scaffolding Required
- **Stage**: Inception / Baseline
- **Date**: 2026-08-27
- **Description**: The workspace originally contained only the `Docs/` directory. Next.js App Router, TypeScript, SQLite database layer, Tailwind styling, Razorpay integration, tool-calling orchestrator, and conversational UI needed to be scaffolded and implemented.
- **Relevant File / Component**: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `src/*`, `scripts/seed.js`, `data/surecart.db`
- **Error / Inconsistency**: Fresh project initialization.
- **Root Cause**: Project transition from documentation to production.
- **Current Status**: **Resolved**
- **Impact**: Scaffolding and core production modules successfully implemented.
- **What Was Attempted**: Installed Next.js, React 19, Tailwind CSS, TypeScript, better-sqlite3, and Razorpay SDK; configured SQLite database schema, seeded realistic demo catalog items, built server-side Guardrail / Policy Layer (with 4-gate verification), implemented Razorpay test-mode integration, built agent orchestrator with scoped tools, and implemented the full conversational checkout workspace and persistent audit trail according to `Docs/design.md`.
- **Resolution**: Complete production codebase created, compiled, and database seeded.
- **Remaining Action**: Run user verification of the four primary user flows (Flow A, Flow B, Flow C, Flow D).

---

### `ISSUE-004` — Unification of `Rules.md` and `Rule.md`
- **Stage**: Baseline
- **Date**: 2026-08-27
- **Description**: The repository contained both `Docs/Rules.md` (guardrail constitution) and `Docs/Rule.md` (governance rules), creating potential ambiguity.
- **Relevant File / Component**: `Docs/Rule.md`, `Docs/Rules.md`
- **Error / Inconsistency**: Coexistence of singular and plural rule documents.
- **Root Cause**: The prompt mandated `Docs/Rule.md` while the existing repository contained `Docs/Rules.md`.
- **Current Status**: **Resolved**
- **Impact**: Potential confusion regarding the authoritative source of truth for rules.
- **What Was Attempted**: Merged all development governance rules and code-enforced guardrails (R1–R21) into a single master document `Docs/Rule.md`.
- **Resolution**: Created unified `Docs/Rule.md` and redirected `Docs/Rules.md` to point directly to `Docs/Rule.md`, updating all documentation links.
- **Remaining Action**: None.

---

### `ISSUE-005` — Test Guardrails Script TypeScript Resolution Failure
- **Stage**: Redesign / Verification
- **Date**: 2026-08-28
- **Description**: The standalone script `scripts/test-guardrails.js` attempted to import TypeScript files using ES modules, causing a CJS require load failure when run via `node`.
- **Relevant File / Component**: `scripts/test-guardrails.js`, `src/app/api/test-suite/route.ts`
- **Error / Inconsistency**: `Error: Cannot find module '../src/lib/db'`
- **Root Cause**: Next.js uses ESM/TS compile targets while the test script was a plain Node.js CommonJS file.
- **Current Status**: **Resolved**
- **Impact**: Developer can run tests via `npm test` or `GET /api/test-suite`.
- **What Was Attempted**: Replaced CJS module import with direct SQLite test harness and added `/api/test-suite` endpoint.
- **Resolution**: Updated `scripts/test-guardrails.js` to run directly with `better-sqlite3` and added `"test": "node scripts/test-guardrails.js"` to `package.json`. 8/8 tests pass (100%).
- **Remaining Action**: None.

---

### `ISSUE-006` — SQLite `orders` Table CHECK Constraint Failure on `cod_confirmed`
- **Stage**: Commerce Expansion
- **Date**: 2026-08-30
- **Description**: When adding Cash on Delivery (COD) payment flow, inserting orders with `status = 'cod_confirmed'` threw `SqliteError: CHECK constraint failed: orders`.
- **Relevant File / Component**: `data/surecart.db`, `scripts/migrate-orders-status.js`, `src/lib/db.ts`
- **Error / Inconsistency**: SQLite table created with `CHECK(status IN ('pending', 'captured', 'declined', 'failed'))`.
- **Root Cause**: The original schema only anticipated synchronous online card/UPI capture states, rejecting asynchronous COD lifecycle statuses.
- **Current Status**: **Resolved**
- **Impact**: Blocked COD order placements during test execution.
- **What Was Attempted**: Developed and executed `scripts/migrate-orders-status.js` to create `orders_new` with expanded status enum (`'pending', 'captured', 'declined', 'failed', 'cod_confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'`), migrate existing records, swap tables, and update schema definitions.
- **Resolution**: Migration completed cleanly without data loss; full order lifecycle and COD states now supported.
- **Remaining Action**: None.

---

### `ISSUE-007` — Natural Language Address Presets Lacked Database Persistence
- **Stage**: Address Resolution
- **Date**: 2026-08-31
- **Description**: When buyers requested deliveries to "Home", "Work", or "College", the orchestrator had hardcoded fallback objects in memory. Custom or modified addresses were lost across sessions or server restarts.
- **Relevant File / Component**: `src/lib/db.ts`, `src/lib/agent/tools.ts`, `data/surecart.db`
- **Error / Inconsistency**: Address tags not resolving to user's saved location profile.
- **Root Cause**: No dedicated relational table existed for user-tagged delivery addresses.
- **Current Status**: **Resolved**
- **Impact**: Inconsistent shipping address assignment in order confirmation tokens.
- **What Was Attempted**: Introduced `addresses` table in SQLite schema (`id`, `session_id`, `tag`, `recipient_name`, `address_line1`, `city`, `postal_code`, `is_default`), seeded default addresses for demo sessions, and connected `tools.ts` to query database-backed address profiles dynamically.
- **Resolution**: Verified natural language address resolution with 100% database persistence in `test-commerce-suite.js`.
- **Remaining Action**: None.

---

### `ISSUE-008` — Agent Query Parsing Missed Multi-Attribute Filters
- **Stage**: Agent Grounding
- **Date**: 2026-09-01
- **Description**: Natural language prompts like "earbuds under 3000 in black" yielded unfiltered or partially matched results because naive substring matching failed on combined constraints (price upper bound, color, category).
- **Relevant File / Component**: `src/lib/agent/tools.ts`, `src/lib/agent/orchestrator.ts`
- **Error / Inconsistency**: Showing ₹15,999 soundbars or white chargers when the prompt specified ₹3,000 budget and black color.
- **Root Cause**: Single text search argument passed to SQL `LIKE %query%` without structured filter extraction.
- **Current Status**: **Resolved**
- **Impact**: Potential hallucination or poor buyer experience violating Rule R1/R6.
- **What Was Attempted**: Enhanced the deterministic grounding engine with regular-expression extraction for prices (`under/below <N>`), color keywords, and category tokens, combining them into parameterized SQL queries with offer joins.
- **Resolution**: Search accurately extracts price limits and color filters, logging structured criteria into `search_history`.
- **Remaining Action**: None.

---

### `ISSUE-009` — Marketplace Cross-Site Offers Lacked Admin Allowlist Controls
- **Stage**: Marketplace Discovery
- **Date**: 2026-09-02
- **Description**: Showing multi-seller offers across Amazon, Croma, and Flipkart required a mechanism to distinguish genuine authorized distributors from unverified third-party merchants to satisfy agent safety principles.
- **Relevant File / Component**: `src/lib/db.ts`, `scripts/seed.js`, `scripts/test-guardrails.js`
- **Error / Inconsistency**: No structured verification flag or admin override system existed for sellers.
- **Root Cause**: Initial catalog schema only tracked solitary products without multi-vendor offer variants.
- **Current Status**: **Resolved**
- **Impact**: Risk of proposing products from unverified third-party sellers without explicit safety indication.
- **What Was Attempted**: Created `product_offers` and `vendor_overrides` tables. Seeded verified vendors (e.g. Tata Croma Retail, Appario Retail Pvt Ltd) and added verification badge indicators to UI and proposal cards.
- **Resolution**: All proposed purchases now display verified seller provenance and allow admin overrides.
- **Remaining Action**: None.

---

### `ISSUE-010` — Cryptographic Razorpay Signature Verification & Zero Card Storage
- **Stage**: Payment Security
- **Date**: 2026-09-03
- **Description**: Need to guarantee zero card/CVV storage (PCI-DSS compliance) while verifying Razorpay HMAC-SHA256 signatures in both live and simulated test runs without external API dependencies.
- **Relevant File / Component**: `src/lib/razorpay.ts`, `scripts/test-commerce-suite.js`
- **Error / Inconsistency**: Potential for fake or spoofed payment confirmations during automated integration tests.
- **Root Cause**: Testing relied on mocked payment status without cryptographic signature validation.
- **Current Status**: **Resolved**
- **Impact**: Unverified payment captures could compromise system financial integrity.
- **What Was Attempted**: Implemented strict timing-safe HMAC-SHA256 signature verification (`crypto.timingSafeEqual`) against `order_id|payment_id` payload and verified that tampered signatures are rejected. Enforced zero PAN/card data persistence anywhere in the SQLite schema.
- **Resolution**: Automated in `test-commerce-suite.js` with 100% pass rate.
- **Remaining Action**: None.

---

### `ISSUE-011` — Port 3000 Collision During Rapid Development Rebuilds
- **Stage**: Dev Environment
- **Date**: 2026-09-04
- **Description**: Background Next.js dev servers or zombie node instances occasionally held port 3000 on Windows (`EADDRINUSE`), causing port increments or failed HTTP probes.
- **Relevant File / Component**: `scripts/check-port.js`, `scripts/kill-port.js`, `scripts/free-port.js`, `scripts/probe-server.js`
- **Error / Inconsistency**: `Error: listen EADDRINUSE: address already in use :::3000`
- **Root Cause**: Windows process termination via PowerShell sometimes leaves detached node socket listeners.
- **Current Status**: **Resolved**
- **Impact**: Tests and local server startup could fail unpredictably.
- **What Was Attempted**: Created utility scripts using `netstat -ano` and `taskkill /PID <PID> /F` to reliably detect and release port 3000 before running tests or development servers.
- **Resolution**: Clean socket release workflows established.
- **Remaining Action**: None.
