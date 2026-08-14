# Reproduction Blueprint

## 1. Reuse by boundary, not by appearance

A derivative should not begin by changing colors and nouns. First separate the current application into three classes.

### Preserve until proven otherwise

These boundaries carry most of the MVP's correctness and should normally remain structurally intact:

- browser/server separation and explicit runtime validation;
- Supabase SSR authentication and profile-based staff authorization;
- public-safe, role-aware and server-only projections;
- idempotent transactional order creation;
- authoritative price, fee and availability calculation;
- reservation, release and sold inventory effects;
- immutable order/payment/inventory/status histories;
- payment-versus-fulfilment separation;
- notification outbox and retry/claim safety;
- audit logging and bounded audit payloads;
- settings optimistic concurrency;
- production/destructive-test isolation;
- safe error mapping and PII logging rules.

### Adapt deliberately

Most physical-goods derivatives will change:

- store identity, language tone and visual tokens;
- product taxonomy and domain attributes;
- variant dimensions and labels;
- product detail and filters;
- delivery methods, zones and estimates;
- payment methods and instructions;
- order/customer messaging templates;
- legal notices, privacy, returns and tax wording;
- dashboard labels and selected operational metrics;
- role names only if the permission model genuinely differs.

### Redesign when the business requires it

Do not force the existing model to cover:

- multi-merchant settlement or commissions;
- lot, batch, expiry or serial-number traceability;
- weighted/fractional quantities;
- appointments, time slots or resource capacity;
- recurring billing or subscription state;
- product customization that changes price or production work;
- quotes, purchase orders or B2B credit terms;
- multi-warehouse allocation;
- multi-currency accounting or tax calculation;
- automated refunds without an authoritative refunded-amount ledger.

These are new domain capabilities and need their own schema, services, permissions, transactions and tests.

## 2. Current perfume-specific coupling

The foundation is reusable, but these concepts are embedded in schema, projections, UI and historical snapshots:

- `products.fragrance_family`;
- public target values oriented around Homme/Femme/Unisexe/Enfant;
- `product_variants.size_ml` as a required positive integer;
- `product_variants.concentration`;
- order-item snapshots and display labels based on millilitres/concentration;
- fragrance-family filters and storefront copy;
- perfume-specific default content, SEO and notification wording;
- product-image and catalogue test fixtures.

Renaming a label in React does not remove these couplings. A proper derivative inventory must search migrations, SQL functions, generated types, services, tests, content and messages for each concept.

## 3. Store adaptation brief

Complete [templates/store-adaptation-brief.md](templates/store-adaptation-brief.md) before implementation. The brief must define at least:

| Decision               | Example                                        |
| ---------------------- | ---------------------------------------------- |
| Operating market       | Côte d’Ivoire, French-first                    |
| Currency arithmetic    | Integer XOF                                    |
| Product unit           | One physical SKU per size/color combination    |
| Variant dimensions     | Size + color                                   |
| Stock semantics        | Whole units, no lots/expiry                    |
| Order channel          | Website checkout; WhatsApp remains intent only |
| Payment                | COD + manually verified Wave                   |
| Fulfilment             | Abidjan zones + pickup                         |
| Returns                | Owner-approved rules for unused products       |
| Staff roles            | Owner, admin, orders, inventory, support       |
| Analytics              | Gross paid revenue + operational counts        |
| Regulatory constraints | Business-specific review                       |

If an answer changes an authoritative invariant, stop and design that change before editing.

## 4. Recommended adaptation phases

### Phase R0 — Evidence and fit assessment

Objective: determine whether the business fits the foundation.

Deliverables:

- completed adaptation brief;
- fit rating and blocking mismatches;
- inventory of perfume-specific coupling;
- exact infrastructure isolation plan;
- data and asset ownership checklist;
- smallest sequence of implementation phases.

No code or migration changes.

### Phase R1 — Project and infrastructure isolation

Objective: make the derivative incapable of mutating Parfum CI.

Deliverables:

- new private repository;
- new package/project identity;
- new Supabase project reference;
- new E2E production hard deny;
- separate Vercel/Resend/Auth/Storage configuration;
- placeholder-only `.env.example`;
- sanitized history/asset review.

Do not begin domain changes while any environment still points to Parfum CI.

### Phase R2 — Domain vocabulary and catalogue contract

Objective: replace perfume-specific product/variant concepts with the approved store model.

Deliverables:

- explicit product and variant field mapping;
- forward-only schema migration;
- public/admin DTO changes;
- filters, forms, images and snapshots updated;
- compatibility policy for legacy fields;
- generated types after migration review;
- catalogue, RLS and snapshot tests.

Do not use an unrestricted JSON blob merely to avoid designing fields that must be filtered, constrained or snapshotted.

### Phase R3 — Brand, editorial content and settings

Objective: make all customer-facing configuration belong to the new business.

Deliverables:

- new design tokens and approved assets;
- domain-neutral navigation and copy;
- structured identity/contact/social/settings values;
- approved payment and delivery configuration;
- safe metadata and canonical URL;
- no remaining Parfum CI or perfume-specific customer copy.

Never copy product images or legal identities without permission.

### Phase R4 — Commerce workflow adaptation

Objective: prove the existing cart/order/inventory/payment lifecycle still matches the new product unit.

Deliverables:

- cart reconciliation uses the new variant representation;
- order items snapshot the new attributes;
- order creation remains transactional and idempotent;
- final-unit concurrency passes;
- cancellation/release and delivery/sold effects pass;
- every enabled payment and fulfilment method passes.

If stock can be fractional, batched, serialized or made-to-order, redesign before this phase.

### Phase R5 — Communications, dashboard and roles

Objective: adapt operational surfaces without weakening permissions.

Deliverables:

- notification/message templates use new vocabulary;
- dashboard top-product labels use new snapshots;
- deep links remain correct;
- financial metrics remain absent from unauthorized DTOs;
- staff role matrix is reviewed against actual operations.

### Phase R6 — Legal, privacy and data operations

Objective: replace every Parfum CI legal assumption with owner-approved business facts.

Deliverables:

- proprietary/open/commercial license decision for the derivative;
- operator identity and publisher information;
- sales terms and returns/refund policy;
- privacy purposes, recipients, retention and rights process;
- processor/international-transfer review;
- policy version snapshot decision;
- rights to catalogue and brand assets.

Never copy the Parfum CI legal pages and merely replace the store name.

### Phase R7 — Data onboarding

Objective: load only approved, owned launch data.

Choose:

- manual admin entry for a small catalogue; or
- a separate, approved create-only importer for a large catalogue.

Initialize inventory through ledger operations. Never set stock or reservations directly. Imported products should begin as drafts until images, price, variants and stock are reviewed.

### Phase R8 — Hardening and deployment acceptance

Objective: produce evidence for the new store, not inherit old evidence.

Run:

- unit and build suite;
- SQL/RLS/grant/concurrency integration tests;
- safe browser tests;
- destructive lifecycle tests against isolated local/staging only;
- deployed public/admin/mobile/accessibility smoke;
- controlled order, cancellation and sold conversion;
- payment, contact, notification, tracking and role checks;
- backup and restoration evidence.

## 5. Domain mapping table

Create this mapping before touching code:

| Current concept       | New concept | Keep / rename / replace / remove | Schema impact | Snapshot impact | UI/filter impact | Test impact |
| --------------------- | ----------- | -------------------------------- | ------------- | --------------- | ---------------- | ----------- |
| Fragrance family      |             |                                  |               |                 |                  |             |
| Target audience       |             |                                  |               |                 |                  |             |
| Size in ml            |             |                                  |               |                 |                  |             |
| Concentration         |             |                                  |               |                 |                  |             |
| Brand                 |             |                                  |               |                 |                  |             |
| Category              |             |                                  |               |                 |                  |             |
| SKU                   |             |                                  |               |                 |                  |             |
| Integer XOF price     |             |                                  |               |                 |                  |             |
| Whole-unit stock      |             |                                  |               |                 |                  |             |
| Delivery zone         |             |                                  |               |                 |                  |             |
| Manual payment method |             |                                  |               |                 |                  |             |

## 6. Definition of “reproduced successfully”

A derivative is not ready because the home page has a new logo. It is ready only when:

- no environment or service points to Parfum CI;
- the product/variant contract matches the new merchandise;
- checkout and stored orders use the same authoritative prices and fees;
- stock concurrency and history rules still pass;
- public/private/role projections remain safe;
- new business content, settings, legal identity and assets are approved;
- production acceptance is executed on the derivative deployment;
- remaining limitations are recorded as `NOT VERIFIED` or accepted risk.
