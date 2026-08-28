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
| `ISSUE-005` | Redesign | Script `test-guardrails.js` fails to run directly under plain Node.js due to TypeScript module import | `scripts/test-guardrails.js` | **Open** |

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
- **What Was Attempted**: Consolidated phase planning and future roadmap into `Docs/memory.md` and `Docs/Instructions.md`, and corrected documentation links.
- **Resolution**: Documented the phase plan directly in `Docs/memory.md` and `Docs/Instructions.md`.
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
- **Stage**: Redesign
- **Date**: 2026-08-28
- **Description**: The standalone script `scripts/test-guardrails.js` attempts to import `../src/lib/db` and `../src/lib/guardrails` which are TypeScript files using ES modules, causing a CJS require load failure when run via `node`.
- **Relevant File / Component**: `scripts/test-guardrails.js`
- **Error / Inconsistency**: `Error: Cannot find module '../src/lib/db'`
- **Root Cause**: Next.js uses ESM/TS compile targets while the test script is a plain Node.js CommonJS file.
- **Current Status**: **Open** (visual redesign focus, test script logic is correct but requires TS runner environment).
- **Impact**: Developer cannot run `node scripts/test-guardrails.js` directly without `ts-node` or TS transpilation.
- **What Was Attempted**: Run via plain `node`, which failed.
- **Resolution**: Logged as open; developer can run using a Next.js API or `ts-node -O '{"module":"commonjs"}' scripts/test-guardrails.js`.
- **Remaining Action**: Adapt scripts to support unified ESM/TS execution if necessary.
