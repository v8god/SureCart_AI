# SureCart AI — UI/UX Design Specification

## 1. Design Intent

SureCart AI is a conversational checkout system where an AI agent can help a buyer find a product and prepare an order, but cannot move money without being bounded by policy and explicitly confirmed by the buyer.

The interface should make this distinction immediately understandable:

> **The agent can recommend and prepare. The buyer authorizes. The system enforces.**

The UI should therefore prioritize:

* Trust
* Clarity
* Explainability
* Explicit consent
* Visible system state
* Minimal cognitive load
* Strong separation between conversation and money-moving actions
* A readable audit history
* Graceful handling of failure

The interface should feel like a real, thoughtfully designed fintech/product application rather than an "AI demo."

Do not use a generic AI-dashboard aesthetic.

Avoid:

* Excessive gradients
* Neon/glowing effects
* Glassmorphism everywhere
* Floating decorative blobs
* Excessive rounded cards
* Emoji-based UI
* AI robot imagery
* Unnecessary animated effects
* Decorative statistics that do not represent real system state
* Fake activity or fabricated metrics
* Excessive use of icons when text communicates the meaning better

The visual language should be restrained, modern, functional, and human.

---

# 2. Primary Product Surface

The application is primarily a **conversational checkout workspace**.

On desktop, the main screen consists of three visual areas:

1. **Application header**
2. **Conversation / checkout area**
3. **Agent Activity / Audit Trail panel**

The conversation is the primary workspace.

The audit trail is a persistent secondary surface because explainability and auditability are core product requirements, not optional developer information.

The confirmation card is part of the conversation but becomes a visually distinct blocking interaction whenever an order requires authorization.

---

# 3. Desktop Layout

Use a responsive two-column application layout.

```text
┌──────────────────────────────────────────────────────────────────────┐
│ SureCart AI                                      Test Mode    Session  │
├───────────────────────────────────────┬──────────────────────────────┤
│                                       │                              │
│             CONVERSATION              │      AGENT ACTIVITY          │
│                                       │                              │
│  Agent message                        │  Session activity             │
│  Buyer message                        │                              │
│  Tool activity                        │  ✓ Catalog searched          │
│  Product information                  │  ✓ Product verified           │
│                                       │  → Purchase proposed          │
│  ┌───────────────────────────────┐    │  ✓ Buyer confirmed            │
│  │ Purchase confirmation         │    │  → Guardrail check             │
│  │                               │    │  ✓ Order created                │
│  │ Item                           │    │                              │
│  │ ₹ amount                       │    │                              │
│  │ Why this purchase              │    │                              │
│  │                               │    │                              │
│  │ Cancel          Confirm order │    │                              │
│  └───────────────────────────────┘    │                              │
│                                       │                              │
│                                       │                              │
│  ─────────────────────────────────    │                              │
│  Message the shopping agent...   Send │                              │
└───────────────────────────────────────┴──────────────────────────────┘
```

The exact implementation may use CSS grid or flexbox, but the visual hierarchy should remain equivalent.

### Desktop proportions

* Conversation: approximately 65–70% of available width
* Audit panel: approximately 30–35%
* Header: full width
* Conversation content should have a comfortable maximum reading width
* Audit panel should remain independently scrollable
* The message composer remains visually attached to the bottom of the conversation area

Do not make the audit panel so wide that it competes with the conversation.

---

# 4. Application Header

The header should be compact and functional.

Suggested structure:

```text
SureCart AI                                      TEST MODE
Conversational checkout                        Session active
```

The header should communicate that this is a payment-enabled environment while making it unmistakable that the buildathon implementation uses Razorpay test mode.

The test-mode indicator should be visually noticeable but not alarming.

Do not use a large hero banner.

Do not use marketing copy above the application.

The application should feel like the user has already entered the product.

---

# 5. Visual Identity

## Overall aesthetic

Use a restrained fintech/product aesthetic.

The interface should feel:

* Precise
* Calm
* Professional
* Technical without being intimidating
* Modern without looking futuristic
* Trustworthy
* Designed around information rather than decoration

The design should resemble a carefully built financial/product workflow rather than a chatbot template.

## Typography

The application enforces a dual-typeface typographic system:
- **Display Font**: `Plus Jakarta Sans` (`--font-display`), loaded from Google Fonts. Used for application headings, transaction amounts, and section titles to establish premium product framing.
- **Body Font**: `Inter` (`--font-sans`), loaded from Google Fonts. Used for conversational text, details checklist, input composer, and body metadata.
- **Monospace Font**: System monospaced stack (`--font-mono`). Used for order IDs, token hash strings, and timeline execution log timestamps.

Prioritize:
* Strong readability & comfortable line heights (`leading-relaxed`)
* Precise numerical values using tabular numbers class (`font-numeric`)
* Contrast weights (e.g. `font-semibold` or `font-extrabold`) for financial totals

### Recommended Hierarchy
- Application name: 14px / `font-semibold` / display tracking-tight
- Section title: 12px uppercase / `font-bold` / font-mono tracking-wider
- Message bubble text: 14px / `leading-relaxed` / sans-serif regular
- Currency amount: 16px to 20px / `font-bold` or `font-extrabold` / font-numeric
- Audit Timeline Log: 11px font-mono / muted gray
- Accordion JSON Details: 10px font-mono / line-height relaxed

Currency amounts should be especially easy to scan. The amount should never be buried inside a paragraph.

---

# 6. Color System & Design Tokens

The color system communicates transaction states and policy checks rather than decorative noise. It utilizes a deep charcoal background base with unified indigo primary accents and muted semantic alerts:

### Main Colors
- **Application Background**: `#07090e` (deep slate-charcoal)
- **Panel/Surface Background**: `#0d111c`
- **Header/Footer Highlight**: `#121829`
- **Muted Borders**: Thin transparent white lines (`rgba(255, 255, 255, 0.06)`)
- **Primary Accent**: `#6366f1` (Indigo/violet, hover state: `#4f46e5`, shadow focus: `rgba(99, 102, 241, 0.2)`)
- **Muted Gray Text**: `#94a3b8`

### State & Semantics
- **Success (Captured)**: Text: `#10b981` (emerald), background panel overlay: `rgba(16, 185, 129, 0.08)`, border accent: `rgba(16, 185, 129, 0.2)`. Used for captured orders and approved checks.
- **Warning (Attention)**: Text: `#f59e0b` (amber), background panel overlay: `rgba(245, 158, 11, 0.08)`, border accent: `rgba(245, 158, 11, 0.1)`. Used for decline simulations and pending checks.
- **Error (Refused/Declined)**: Text: `#f43f5e` (crimson), background panel overlay: `rgba(244, 63, 94, 0.08)`, border accent: `rgba(244, 63, 94, 0.2)`. Used for cap refusals and bank payment failures.

### Spacing & Layout Grid
- Strict 4px base grid system (4px, 8px, 12px, 16px, 20px, 24px, 32px, 48px).
- Border-radius tokens: `rounded-xl` (12px) for cards, `rounded-lg` (8px) for input/button, `rounded-md` (6px) for checkboxes and filters.

---

# 6.1 Interactive States

All interactive controls implement specific feedback transitions:
- **Primary Button (`Confirm Order`)**: Instantly transitions to disabled state (`opacity-50`, cursor-not-allowed) upon clicking, with a rotating spinner and text `Confirming Order...` to prevent double-clicks.
- **Suggested Chips**: Hover transitions to darker shades with clean text colors, and focus outline resets to custom indigo shadows (`focus-ring`).
- **Checkboxes & Toggles**: Custom styled with indigo active colors.

---

# 7. Conversation Interface

The conversation is the primary user experience.

The buyer should be able to describe what they want naturally.

Example:

```text
I want a pair of blue wireless earbuds.
```

The agent then uses the catalog tools rather than relying on memory.

The interface should make tool-backed information understandable without exposing unnecessary implementation details.

---

# 8. Message Types

The conversation should visually distinguish at least these message types:

### Buyer message

A simple conversational message aligned toward the buyer side.

Example:

```text
I want a pair of blue wireless earbuds.
```

Do not make buyer messages look like system logs.

---

### Agent message

A conversational response from the shopping agent.

Example:

```text
I found a matching product in the catalog.
```

The agent's responses should remain concise.

Do not make every response look like a technical report.

---

### Tool activity

When the agent queries the catalog or checks an order, show a compact activity indicator.

Example:

```text
Searching catalog...
```

Then resolve it into a readable result:

```text
Catalog searched
Product information verified
```

The interface should communicate that the agent obtained information from the catalog rather than simply "thinking."

Avoid exposing raw JSON, internal prompts, stack traces, or implementation details in the primary conversation.

---

# 9. Product Information

When the agent finds a relevant product, present the information clearly.

Example structure:

```text
Wireless Earbuds

₹2,499
In stock
Category: Audio

[Product details]
```

Only display product information backed by the catalog/tool result.

The UI must not fabricate:

* Price
* Stock
* Availability
* Product attributes

The PRD explicitly requires current tool results to be the source of truth for these values.

If product images are not available from the structured catalog, do not invent a large image area simply for visual appeal.

The buildathon MVP explicitly allows a hand-typed structured catalog without real catalog images.

---

# 10. Purchase Proposal

Before an order can be created, the agent must present a specific purchase proposal.

This should be visually distinct from ordinary chat messages.

The proposal should communicate:

```text
Purchase proposal

Item
Wireless Earbuds

Total
₹2,499

Why this purchase
This matches the product you requested and is
available within the current purchase limits.

[Cancel]                 [Confirm order]
```

The exact reasoning must come from the agent's actual proposal.

Do not create fake explanations or generic filler.

The confirmation proposal must contain, at minimum:

* Exact item(s)
* Exact total
* Currency
* One-line reason for the recommendation

This directly follows the confirmation rules.

---

# 11. Confirmation Card

The confirmation card is the most important interaction in the UI.

It should be impossible to mistake it for an ordinary chat message.

It should appear as a clearly bounded section within the conversation.

Example:

```text
┌──────────────────────────────────────────┐
│ REVIEW ORDER                             │
│                                          │
│ Wireless Earbuds                         │
│ ₹2,499                                   │
│                                          │
│ Why                                      │
│ Matches the product you requested.       │
│                                          │
│ This action will create the order.       │
│                                          │
│ Cancel              Confirm order        │
└──────────────────────────────────────────┘
```

The confirmation action must be a distinct UI action.

Do not automatically interpret:

* "yes"
* "sure"
* "sounds good"
* "go ahead"
* Previous statements of intent

as confirmation unless the implementation explicitly treats an unambiguous typed confirmation to the currently rendered proposal as valid.

The core rule is that confirmation must correspond to the exact proposal shown.

If the buyer changes:

* Product
* Quantity
* Amount
* Any other order detail

the existing confirmation becomes invalid and a new confirmation proposal must be displayed.

This follows R8–R10.

---

# 12. Confirmation Interaction States

The confirmation card should have clear states.

## Pending

```text
Review order

₹2,499

[Cancel]    [Confirm order]
```

The rest of the payment flow must remain blocked.

---

## Confirming

After the user presses the confirmation button:

```text
Confirming order...
```

Disable the button to prevent repeated submission.

Do not visually imply that payment succeeded yet.

---

## Success

After the actual order/payment response confirms success:

```text
Order confirmed

Your order was created successfully.

Order status
Captured

₹2,499
```

The success state must be based on the actual order/payment result.

---

## Declined

For the deliberate failure path:

```text
Payment wasn't completed

The payment was declined by the payment system.

No automatic retry was made.

You can try again with a different supported payment
method or cancel the order.

[Try again]    [Cancel]
```

The actual failure explanation must be grounded in the payment system's returned reason.

Do not display a generic error if the backend provides a meaningful reason.

The failure must also appear in the audit trail.

These requirements follow R15–R18.

---

# 13. Spend-Cap Refusal

A hard cap violation should not reach the confirmation stage.

This is an important distinction.

If an order exceeds the permitted amount, the interface should explain the refusal directly.

Example:

```text
I can't proceed with that order.

The proposed amount exceeds the current per-order
spending limit, so the order cannot be created.

No payment was attempted.
```

Do not show:

```text
Confirm order
```

after a hard-cap violation.

The PRD specifies that an over-cap proposal is refused before confirmation is offered.

For a session-level cap violation, use the same principle:

```text
I can't proceed with this order.

Adding this purchase would exceed the remaining
spending limit for this session.

No payment was attempted.
```

Do not expose internal implementation terminology such as database queries or policy-layer stack traces.

---

# 14. Audit Trail / Agent Activity Panel

The audit trail is a first-class part of the product.

It should not look like a developer console.

It should communicate:

> What happened, why it happened, and what the result was.

The architecture specifies an append-only audit log containing timestamp, actor, action type, reasoning, payload, and result, with the UI showing the information in plain language.

## Desktop appearance

Place the audit panel on the right side.

Header:

```text
Agent Activity
Session history
```

Then show a chronological list.

Example:

```text
10:42:03

Catalog searched
Agent
Searched for wireless earbuds

10:42:04

Product verified
Agent
Checked current price and stock

10:42:07

Purchase proposed
Agent
Proposed the matching product

10:42:12

Order confirmed
Buyer
Confirmed ₹2,499

10:42:12

Guardrail approved
System
All purchase checks passed

10:42:14

Payment captured
System
Order created successfully
```

Each event should be compact.

---

# 15. Audit Entry Structure

Every visible audit event should contain:

1. Timestamp
2. Human-readable action
3. Actor
4. Reasoning/result where relevant

Example:

```text
10:42:12
Buyer confirmed order
Buyer
Confirmed ₹2,499
```

The UI does not need to display the entire structured payload by default.

If a details interaction is implemented, it should reveal structured information without replacing the simple human-readable event.

Do not turn the audit trail into a JSON viewer.

The PRD specifically requires one readable line per event rather than unreadable logging noise.

---

# 16. Audit Event Categories

The UI should support the event types defined by the system:

* Catalog search
* Product retrieval/verification
* Purchase proposal
* Confirmation request
* Confirmation result
* Guardrail check
* Order creation
* Order result
* Refusal
* Payment failure

Use subtle visual markers to distinguish them.

Do not create additional fake event categories merely for visual completeness.

---

# 17. Audit Timeline

The audit trail should be chronological.

Newest events may appear at the bottom if the panel behaves like a live activity stream, or newest at the top if the design is optimized for scanning.

Whichever direction is chosen, maintain a clear and consistent chronological relationship.

When a new event is added:

* Keep the transition subtle
* Do not use dramatic animations
* Do not flash the entire panel
* Do not make the page jump unexpectedly

The audit trail should feel like a reliable record, not a notification feed.

---

# 18. Guardrail Visualization

Guardrails are a major differentiator of SureCart AI and should be visible without turning the UI into a security dashboard.

When an order is proposed, the UI may show a compact policy summary:

```text
Purchase checks

Per-order limit       Passed
Session limit         Passed
Confirmation          Pending
```

After confirmation:

```text
Purchase checks

Per-order limit       Passed
Session limit         Passed
Confirmation          Verified
Duplicate check       Passed
```

Only show checks that correspond to actual backend state.

Do not show "Passed" before the relevant check has actually happened.

The architecture defines four checks before `create_order` can proceed:

1. Per-order cap
2. Session cap
3. Matching explicit confirmation
4. Idempotency check

Only after all four pass does the payment integration execute.

---

# 19. Order Status

When an order exists, its status should be represented clearly.

Supported order states defined by the architecture are:

* Pending
* Captured
* Declined
* Failed

Do not invent additional business states.

Example:

```text
Order
GC-XXXX

Status
Captured

Amount
₹2,499
```

The displayed status must be backed by the order state returned by the application.

The agent must not claim an order succeeded, failed, or is pending without a current tool/result backing it.

---

# 20. Message Composer

The composer should be simple.

Example:

```text
┌──────────────────────────────────────────────┐
│ Describe what you're looking for...       ↑ │
└──────────────────────────────────────────────┘
```

The buyer should be able to naturally type requests.

Avoid adding unnecessary controls such as:

* Voice input
* File upload
* Image upload
* Multiple AI modes
* Model selection
* Prompt controls
* Agent personality selectors

These are not part of the MVP.

The PRD explicitly excludes voice interfaces and mobile-native apps.

---

# 21. Loading States

Loading states should be understated.

Use text or small indicators such as:

```text
Searching catalog...
```

```text
Checking product details...
```

```text
Preparing order...
```

```text
Checking payment status...
```

Avoid large animated loaders.

Do not use "AI is thinking..." as the primary system state when the application is actually performing a specific tool operation.

The UI should communicate what is happening rather than anthropomorphizing the model.

---

# 22. Error States

Errors should be written for the buyer, not the developer.

Never show:

```text
Error: TypeError...
```

or a stack trace in the product UI.

Instead:

```text
Something went wrong while checking the order.

No additional payment attempt was made.

Please try again.
```

If the backend has a meaningful payment failure reason, surface that reason in plain language.

All failures should remain visible in the audit trail.

---

# 23. Mobile Layout

The application must work well on phone screens even though the PRD excludes a separate native mobile app.

On mobile, do not attempt to squeeze the desktop two-column layout into the screen.

Use a single primary conversation view.

```text
┌──────────────────────────────┐
│ SureCart AI            TEST    │
├──────────────────────────────┤
│                              │
│ Agent message                │
│                              │
│ Buyer message                │
│                              │
│ Agent activity               │
│                              │
│ Product proposal             │
│                              │
│ ┌──────────────────────────┐ │
│ │ REVIEW ORDER             │ │
│ │                          │ │
│ │ Wireless Earbuds         │ │
│ │ ₹2,499                   │ │
│ │                          │ │
│ │ Why                      │ │
│ │ Matches your request.    │ │
│ │                          │ │
│ │ Cancel                   │ │
│ │ Confirm order            │ │
│ └──────────────────────────┘ │
│                              │
├──────────────────────────────┤
│ Message...                 ↑ │
└──────────────────────────────┘
```

The audit trail should become an accessible secondary surface.

Possible interaction:

```text
Agent Activity  →
```

opens a full-height or full-screen activity drawer.

The audit panel should not permanently consume half the phone screen.

---

# 24. Mobile Audit Trail

On mobile, the audit trail should open as a dedicated sheet/page.

Example:

```text
Agent Activity                         Close

10:42:03
Catalog searched
Agent
Searched for wireless earbuds

10:42:04
Product verified
Agent
Checked current price and stock

10:42:12
Order confirmed
Buyer
Confirmed ₹2,499

10:42:12
Guardrail approved
System
All purchase checks passed
```

The buyer should be able to return to the conversation without losing their place.

---

# 25. Responsive Behavior

At large widths:

* Two-column layout
* Persistent audit panel
* Conversation centered within its column

At medium widths:

* Reduce audit-panel width
* Reduce unnecessary spacing
* Preserve the two-surface model where practical

At small widths:

* Conversation becomes the primary full-width surface
* Audit trail becomes a drawer/sheet
* Confirmation card remains fully visible
* Action buttons should be comfortably tappable
* Avoid horizontal scrolling

The confirmation action should never become visually hidden because of responsive layout.

---

# 26. Accessibility

The interface should be usable without relying only on color.

Important states should be communicated through:

* Text
* Labels
* Icons where useful
* Position
* Typography

Examples:

Instead of only showing a green dot:

```text
Payment captured
```

Instead of only showing red:

```text
Payment declined
```

Buttons must have clear labels.

Avoid ambiguous actions such as:

```text
Continue
```

for the final payment authorization.

Prefer:

```text
Confirm order
```

The buyer must understand what action they are authorizing.

---

# 27. Interaction Rules

The UI must reflect backend authority.

The frontend does not decide whether an order is permitted.

It only displays application state returned by the server.

This follows the architecture requirement that the frontend renders state but does not decide whether an order is allowed.

Therefore:

* Do not implement client-only spend-cap enforcement
* Do not assume confirmation means payment succeeded
* Do not assume an order was created because a button was clicked
* Do not display success until the server confirms success
* Do not allow UI manipulation to bypass guardrails
* Do not expose payment/API secrets
* Do not allow the frontend to directly call Razorpay

---

# 28. Explicit Confirmation Interaction

The confirmation button should initiate exactly one confirmation event.

After clicking:

```text
Confirm order
```

the button should immediately become unavailable while the request is processed.

Example:

```text
Confirming...
```

This prevents accidental double submission at the UI level.

However, UI disabling is only a usability safeguard.

Actual duplicate prevention must remain server-side through the idempotency mechanism.

The rules explicitly require a unique idempotency key for every proposed order and rejection of reused keys.

---

# 29. Failed Payment Interaction

The failure path should be intentionally designed, not treated as a generic error.

Expected sequence:

```text
Purchase proposal
        ↓
Buyer confirms
        ↓
Guardrails pass
        ↓
Payment attempted
        ↓
Payment declined
        ↓
Failure logged
        ↓
Buyer receives explanation
        ↓
Buyer chooses next action
```

The interface must not automatically loop:

```text
Retrying...
Retrying...
Retrying...
```

A decline hands control back to the buyer.

The next attempt, if any, requires a new explicit decision and must pass through the guardrails again.

---

# 30. Empty State

When the application first opens, the conversation should not look empty or broken.

Use a restrained introduction:

```text
What are you looking for?

Describe a product or purchase in your own words.
I'll check the catalog and show you exactly what
would be purchased before anything is charged.
```

Optionally show one or two simple example prompts derived from the actual demo catalog.

Do not fabricate product examples if the actual seeded catalog is not known.

Avoid a large marketing hero section.

---

# 31. Initial Product Experience

The first screen should communicate the product's unique value quickly.

The buyer should understand:

1. They can ask for something naturally.
2. The agent checks the catalog.
3. The agent will show the proposed purchase.
4. The buyer must explicitly approve it.
5. The system records what happened.

A concise introduction is preferable to several paragraphs of explanation.

---

# 32. Trust Indicators

Trust should be represented through product behavior and information architecture rather than decorative badges.

Useful persistent information:

```text
TEST MODE
```

and, where useful:

```text
Agent Activity
```

The confirmation card itself is the strongest trust indicator because it demonstrates that payment cannot silently happen.

The audit trail is the second strongest trust indicator because it shows what happened and why.

Do not create fake claims such as:

```text
100% Secure
Bank-grade AI
Military-grade security
Trusted by thousands
```

unless such claims are actually supported by the product.

---

# 33. Demo-Oriented Interaction Flow

The interface should support the complete buildathon demonstration cleanly.

## Flow A — Successful purchase

```text
1. Buyer asks for a product
        ↓
2. Agent searches catalog
        ↓
3. Product information appears
        ↓
4. Agent proposes purchase
        ↓
5. Confirmation card blocks payment
        ↓
6. Buyer explicitly confirms
        ↓
7. Guardrails are checked
        ↓
8. Razorpay test-mode order/payment executes
        ↓
9. Success appears
        ↓
10. Audit trail shows the complete sequence
```

This is the primary happy path defined in the architecture.

---

# 34. Demo Flow — Cap Violation

```text
Buyer asks for an order above the allowed limit
        ↓
Agent proposes/identifies that it cannot proceed
        ↓
System rejects it before confirmation
        ↓
Buyer sees a plain-language explanation
        ↓
Audit trail records the refusal
```

The important visual point is that there should be **no misleading confirmation button** after the hard cap has already been violated.

---

# 35. Demo Flow — Declined Payment

```text
Buyer asks for product
        ↓
Catalog checked
        ↓
Purchase proposed
        ↓
Buyer confirms
        ↓
Guardrails pass
        ↓
Test payment deliberately declines
        ↓
Failure appears in audit trail
        ↓
Buyer receives plain-language explanation
        ↓
Concrete next step is offered
```

This should look like a deliberate product state rather than a broken application.

---

# 36. Demo Flow — Duplicate Confirmation

If the buyer presses confirmation twice or the request is duplicated:

```text
First confirmation
        ↓
Order created

Second submission
        ↓
Rejected as duplicate
        ↓
No second order
```

The UI should not display two successful orders.

The audit trail may show the duplicate attempt/refusal if that event is surfaced by the backend.

The underlying protection is the server-side idempotency key, not the button state alone.

---

# 37. Demo Flow — Changed Order

If the buyer changes the product or order details after seeing the confirmation card:

```text
Existing proposal
        ↓
Buyer changes request
        ↓
Existing proposal becomes invalid
        ↓
New proposal generated
        ↓
New confirmation required
```

Never allow an old confirmation to authorize a different order.

---

# 38. Agent Reasoning Presentation

The project requires the agent to state what it is about to buy, for how much, and why.

This should be presented as concise human-readable reasoning.

Example:

```text
I recommend the Wireless Earbuds because they match
the product you requested and are currently available.

Total: ₹2,499
```

Do not expose hidden chain-of-thought.

The UI should display the concise, user-facing reason associated with the proposal and the audit event.

The purpose is explainability of the decision, not disclosure of private model reasoning.

---

# 39. Catalog Interaction

The catalog itself is primarily an agent-readable backend resource.

The UI should not turn SureCart AI into a conventional storefront.

A small optional catalog-browse surface can exist if useful, but it should remain secondary to conversational checkout.

Do not build:

* Large product grids
* Shopping categories navigation
* Full ecommerce homepage
* Cart drawer
* Wishlist
* Product reviews
* Recommendation carousels
* Campaign banners

These would move the interface toward a traditional storefront and away from the core MVP.

The project explicitly scopes the MVP around a small structured catalog and conversational checkout.

---

# 40. Do Not Add AI-Themed Decoration

The project is about AI-agent commerce, but the UI does not need to visually scream "AI."

Avoid:

* Robot icons
* Neural-network backgrounds
* Glowing particles
* "AI magic" animations
* Chatbot avatars unless genuinely useful
* Sparkle icons
* Futuristic HUD interfaces
* Excessive gradients
* "Powered by AI" banners

The intelligence should be visible through the interaction itself.

A buyer asking:

```text
Find me something suitable for...
```

and receiving a grounded catalog result is enough.

The strongest visual proof of the technology is the combination of:

```text
Conversation
        +
Confirmation
        +
Guardrails
        +
Audit Trail
```

---

# 41. Motion Design

Use motion sparingly.

Appropriate:

* Subtle appearance of a new message
* Small loading transition
* Confirmation card appearing
* Audit event entering the timeline
* Drawer opening on mobile

Avoid:

* Large page transitions
* Constant animated gradients
* Pulsing borders
* Floating elements
* Excessive hover animations
* Long delays before displaying information

Interaction should feel fast.

The PRD identifies a few-second target for catalog queries and order actions.

---

# 42. Spacing and Components

Use a consistent spacing system.

Prefer:

* Generous whitespace
* Clear section boundaries
* Thin borders
* Moderate corner radii
* Compact controls
* Strong alignment

Do not make every element a separate floating card.

Cards should be reserved for meaningful grouped information:

* Purchase proposal
* Product information where necessary
* Order result
* Failure state

The conversation itself should remain visually lightweight.

---

# 43. Component Structure

A sensible frontend component structure is:

```text
AppShell
├── Header
│   ├── Brand
│   ├── TestModeIndicator
│   └── SessionStatus
│
├── MainLayout
│   ├── ChatPanel
│   │   ├── ConversationHeader
│   │   ├── MessageList
│   │   │   ├── BuyerMessage
│   │   │   ├── AgentMessage
│   │   │   ├── ToolActivity
│   │   │   └── ProductResult
│   │   │
│   │   ├── PurchaseProposal
│   │   ├── OrderResult
│   │   └── MessageComposer
│   │
│   └── AuditPanel
│       ├── AuditHeader
│       └── AuditTimeline
│           └── AuditEntry
│
└── MobileAuditDrawer
```

The frontend should render state received from the application rather than implementing business-policy decisions itself.

---

# 44. State Model for UI

The UI should conceptually support states such as:

```text
idle
searching
product_found
proposing
awaiting_confirmation
confirming
guardrail_checking
processing_payment
success
declined
failed
refused
```

These states are UI representations of actual application events.

Do not allow the UI to transition to `success` merely because a request was submitted.

Success requires an actual successful backend/payment result.

---

# 45. Information Hierarchy

At any moment, the user should be able to answer these questions immediately:

### During browsing

```text
What product did the agent find?
What is its current price?
Is it available?
```

### During proposal

```text
What am I buying?
How much is it?
Why is the agent proposing it?
```

### During confirmation

```text
What exactly am I authorizing?
```

### During payment

```text
Is the order being processed?
```

### After payment

```text
Did it succeed?
What is the order status?
```

### During failure

```text
What happened?
Was I charged?
What can I do next?
```

### At any point

```text
What has the agent done so far?
Why did it do it?
```

The interface should be designed around answering these questions rather than around displaying every internal system detail.

---

# 46. Auditability as a Visual Principle

The audit trail should make it possible to reconstruct the session as a simple narrative:

```text
The buyer asked for X.
The agent searched the catalog.
The product was verified.
The agent proposed X for ₹Y because Z.
The buyer explicitly confirmed.
The guardrails approved the request.
The order was created.
The payment was captured.
```

For a failed flow:

```text
The buyer confirmed.
The guardrails approved.
The payment was attempted.
The payment was declined.
The failure was recorded.
The buyer was given the next step.
```

This narrative is more important than exposing technical implementation details.

The PRD defines auditability as reconstructing "what happened and why" without engineering knowledge.

---

# 47. Security Visibility

Do not expose:

* Razorpay secret keys
* LLM API keys
* Internal authentication secrets
* Raw webhook payloads containing sensitive information
* Internal server implementation details

The UI should never imply that the browser directly controls payment authorization.

Secrets remain server-side according to the architecture and security requirements.

---

# 48. What the UI Should Communicate About the Product

Without requiring the user to read documentation, the interface should naturally demonstrate the project's core proposition:

```text
Traditional checkout:

Browse → Cart → Checkout → Pay

SureCart AI:

Describe → Agent searches → Proposal → Confirm → Pay
                              ↓
                         Guardrails
                              ↓
                         Audit trail
```

The product should demonstrate that the agent is not given unrestricted authority over payment.

---

# 49. Design Priorities

When making implementation decisions, use this priority order:

### 1. Correctness

The UI must accurately represent backend state.

### 2. Confirmation clarity

The buyer must never be confused about what they are authorizing.

### 3. Auditability

Important actions must remain visible and understandable.

### 4. Failure clarity

A declined payment must feel handled rather than broken.

### 5. Responsiveness

The core experience must work on both desktop and mobile.

### 6. Visual polish

Only after the above are correct should decorative polish be added.

---

# 50. Explicitly Out of Scope for the UI

Do not build UI for functionality that is explicitly outside the MVP:

* Upsell/cross-sell
* Campaign orchestration
* Live production payments
* Multi-merchant management
* Merchant administration dashboard
* Real catalog ingestion
* Native agent-commerce protocol controls
* Voice interface
* Mobile-native application
* Advanced analytics dashboard
* Marketing homepage
* Customer loyalty features
* Reviews
* Wishlist
* General ecommerce cart features

The PRD defines these as non-goals or future functionality.

---

# 51. Final Visual Direction

The finished interface should look like a real product that could plausibly sit between a merchant and an AI shopping agent.

It should feel:

**Quiet rather than flashy.**

**Structured rather than decorative.**

**Modern rather than futuristic.**

**Trustworthy rather than promotional.**

**Interactive rather than animated.**

**Human-designed rather than AI-generated.**

The visual identity should come from excellent spacing, typography, hierarchy, interaction states, and information design.

The central visual story should always remain:

```text
                SureCart AI

        CONVERSATIONAL CHECKOUT

Buyer ────────► Agent
                  │
                  ▼
              Catalog
                  │
                  ▼
             Proposal
                  │
                  ▼
          Explicit Confirmation
                  │
                  ▼
             Guardrails
                  │
                  ▼
          Razorpay Test Mode
                  │
                  ▼
              Result

        ┌───────────────────────┐
        │     AUDIT TRAIL       │
        │ What happened + why   │
        └───────────────────────┘
```

The interface succeeds if a person watching the demo can understand the entire safety model without being told:

**The agent can search.
The agent can propose.
The agent cannot independently authorize payment.
The system enforces the limits.
The buyer explicitly confirms.
Every important decision is recorded.
If payment fails, control returns to the buyer.**

That is the UI's core job.

---

# 52. Design References & Skills

To maintain high visual quality, accessibility, and E2E behavioral robustness, the design and implementation of SureCart AI utilizes the following design-development reference standards:

1. **Taste Skill**
   - **URL**: [https://www.tasteskill.dev/](https://www.tasteskill.dev/)
   - **Purpose**: Establishes modern, polished visual standards and aesthetic quality benchmarks.
   - **Influence on SureCart AI**: Guides layout density, color harmony, and typographic breathing room to ensure the workspace feels premium and human-designed rather than AI-generated.

2. **Vercel Web Design Guidelines / Agent Skill**
   - **URL**: [https://github.com/vercel-labs/agent-skills/blob/main/skills/web-design-guidelines/SKILL.md](https://github.com/vercel-labs/agent-skills/blob/main/skills/web-design-guidelines/SKILL.md)
   - **Purpose**: A rigorous set of standards for accessibility (WCAG contrast levels, focus indicators), keyboard support, forgiving inputs, semantic HTML structures, and responsive viewport guidelines.
   - **Influence on SureCart AI**: Sets the bar for contrast ratios, custom focus borders (`focus-ring`), HTML semantic elements, and responsive single-column layouts for mobile viewports.

3. **Image-to-Code Skill**
   - **URL**: [https://github.com/Leonxlnx/taste-skill/blob/main/skills/image-to-code-skill/SKILL.md](https://github.com/Leonxlnx/taste-skill/blob/main/skills/image-to-code-skill/SKILL.md)
   - **Purpose**: Defines workflow requirements for visual translation, warning against nested card chaos, text scaling mismatches, and over-cluttered dashboard layouts.
   - **Influence on SureCart AI**: Inspired the removal of text-heavy banners in favor of visual suggetsion card grids and sleek checkout widgets.

4. **Awesome Design**
   - **URL**: [https://github.com/VoltAgent/awesome-design-md/](https://github.com/VoltAgent/awesome-design-md/)
   - **Purpose**: Collection of design frameworks, typography guides, and interaction models.
   - **Influence on SureCart AI**: Directs font hierarchy scale, numerical alignment rules, and transition timing curves.

5. **Playwright CLI**
   - **URL**: [https://github.com/microsoft/playwright-cli](https://github.com/microsoft/playwright-cli)
   - **Purpose**: Automated browser action scripting and visual regression assertion.
   - **Influence on SureCart AI**: Forms the foundation of automated E2E interface state verification during development (Flow A, B, C, D).

---

# 53. Future Design Development

All future UI/UX development, components, routing layouts, and interactions built for **SureCart AI** must consult the listed design references and preserve strict consistency with the color system, typography variables, spacing grid, and gating checklist states established in this document. 

The references listed in Section 52 are living standards. If any reference undergoes updates, developers should consult the updated specifications to refine the product while preserving SureCart AI's core security-first checkout identity. Any major architectural visual transitions must update this design specification accordingly.
