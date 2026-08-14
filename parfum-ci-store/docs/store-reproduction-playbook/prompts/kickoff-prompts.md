# Kickoff Prompts

Replace every `<placeholder>` before use. Keep discovery and implementation as separate turns. Do not ask an assistant to “make it generic” without an approved store brief.

## Prompt 1 — Universal fit and gap analysis

Use this first for every derivative. It authorizes inspection and reporting only.

```text
We are creating a new, separate store project from the Parfum CI Store MVP baseline.

Source baseline:
- repository snapshot: commit 13d0c60;
- architecture: Next.js App Router, TypeScript, Supabase, Resend, Vitest, Playwright and Vercel;
- the new store must use a separate repository, Supabase project, deployment, Auth users, Storage, email sender, secrets and backups;
- no Parfum CI production data, credentials, catalogue assets or legal identity may be copied.

New business:
- store model: <model>;
- operating country/market: <market>;
- currency and timezone: <currency/timezone>;
- product and variant model: <summary>;
- payment methods: <methods>;
- delivery/pickup model: <model>;
- staff roles: <roles>;
- intended launch scope: <scope>.

Read before reporting:
- AGENTS.md;
- README.md;
- docs/mvp-developer-handoff-and-roadmap.md;
- docs/product-requirements.md;
- docs/architecture.md;
- docs/database-schema.md;
- docs/business-rules.md;
- docs/security.md;
- docs/testing.md;
- docs/deployment.md;
- docs/legal-and-licensing.md;
- docs/store-reproduction-playbook/reproduction-blueprint.md;
- the completed store adaptation brief.

Inspect the actual schema, migrations, generated types, product/variant DTOs, public filters, cart reconciliation, order transaction, item snapshots, inventory ledger, payment lifecycle, delivery quote, notifications, settings, dashboard and tests.

Before editing, return:
1. whether the new business is a HIGH, MEDIUM or LOW fit for this foundation;
2. reusable invariants that must be preserved;
3. perfume-specific fields and copy that must change;
4. schema, transaction, snapshot, projection and UI gaps;
5. regulatory or operational capabilities that are absent;
6. infrastructure-isolation proof required before any mutation;
7. a phased implementation plan with the smallest safe first phase;
8. migrations likely required, without editing applied migrations;
9. regression tests required for price, stock, orders, roles and privacy;
10. explicit exclusions and stop conditions.

Use only PASS, FAIL and NOT VERIFIED for evidence. Do not implement yet. Do not create infrastructure, migrations, credentials or business data. Await approval after the report.
```

## Prompt 2 — Project isolation implementation

Run this in the **new derivative repository**, never in Parfum CI.

```text
Implement only the project-isolation phase approved in the prior report.

Requirements:
- verify this is the new derivative repository and stop if its Git remote is the Parfum CI repository;
- remove no Parfum CI history or file unless its replacement is explicit and reviewed;
- replace package/project/store fallback identity;
- create placeholder-only environment documentation;
- require a new Supabase project reference and hard-deny it from destructive E2E once designated production;
- ensure no environment value points to the Parfum CI Supabase, Vercel, Resend, Auth or Storage resources;
- preserve server-only secret boundaries;
- document local, staging, preview and production environments;
- do not apply migrations or deploy automatically;
- do not invent credentials, owner identity, catalogue data or legal text.

Add tests for the E2E target guard and environment diagnostics. Update the derivative handoff with the new branch, repository, infrastructure status and NOT VERIFIED external actions.

Run typecheck, lint, unit tests, build, diff check and status. Return exact results and a safe commit message.
```

## Prompt 3 — Domain adaptation implementation

Use after the fit report and infrastructure isolation pass.

```text
Implement the approved catalogue-domain adaptation for <store name>.

Approved field mapping:
<paste the completed current-to-new mapping table>

Preserve:
- authoritative server prices and whole-unit stock;
- transactional idempotent order creation;
- reservation/release/sold ledger rules;
- immutable order-item snapshots;
- RLS, grants, staff authorization and audit;
- explicit public/admin DTOs;
- forward-only migration policy.

Requirements:
1. inspect every use of fragrance_family, target_audience, size_ml and concentration before editing;
2. add new structured fields and constraints through a forward-only migration;
3. update public and admin projections without select("*");
4. update catalogue forms, filters, product detail, cart labels, checkout, confirmation, tracking, notifications, messages and dashboard snapshot labels;
5. preserve old snapshot readability if any derivative test data already exists;
6. regenerate Supabase types only after migration review/application; never hand-edit them;
7. add unit and SQL tests for constraints, public visibility, authorization and historical snapshots;
8. rerun final-unit concurrency, cancellation release and delivered/SOLD regressions;
9. do not change payment/delivery/business settings outside this phase;
10. do not load real catalogue data.

Before editing, confirm the exact affected files and migration plan. After implementation, report any compatibility field retained and why.
```

## Prompt 4 — Beauty and skincare derivative

```text
Analyze a beauty and skincare derivative of the Parfum CI foundation.

The proposed MVP sells <product types> in Côte d’Ivoire using whole-unit stock, guest checkout, <payments>, <delivery>, and the existing staff roles.

Candidate catalogue attributes:
- product type: <values>;
- concern/benefit taxonomy: <values>;
- variant dimensions: <volume, weight, shade, pack count>;
- ingredient/usage/warning content: owner-supplied only;
- no therapeutic or medical claims;
- fixed bundles only.

Determine:
1. whether volume can safely replace size_ml or whether a new measurement model is required;
2. which attributes require structured columns versus bounded editorial content;
3. how shades/weights/volumes are snapshotted and displayed historically;
4. filter and search changes;
5. hygiene-sensitive return-policy decisions;
6. image/alt-text and variant-image needs;
7. affected SQL functions, DTOs, templates, dashboard labels and tests.

Preserve the commerce, stock, security and test-isolation invariants in the reproduction blueprint. Report only; await approval.
```

## Prompt 5 — Fashion and accessories derivative

```text
Analyze a fashion and accessories derivative of the Parfum CI foundation.

The MVP sells <clothing/shoes/bags/accessories>. Every purchasable option must resolve to one whole-unit SKU. Proposed variant dimensions are <size> and <color>; <material/style> is product-level unless justified otherwise.

Report:
1. replacement of required size_ml/concentration fields;
2. normalized size values and deterministic display order;
3. color and variant-image architecture;
4. size/color order-item snapshots;
5. availability/filter changes;
6. exchange versus return/cancellation workflow gaps;
7. final-unit concurrency for each size/color SKU;
8. admin form, notification, tracking and dashboard changes;
9. legal sizing/returns content required;
10. why made-to-measure, preorder and drop-shipping remain excluded.

Do not implement until the owner approves the attribute values, exchange policy and field mapping. Preserve all authoritative transaction and permission boundaries.
```

## Prompt 6 — Home fragrance and artisan gifts derivative

```text
Analyze a home fragrance and artisan gift derivative of the Parfum CI foundation.

Products include <candles/diffusers/room sprays/soaps/fixed gift boxes>. The MVP supports only whole-unit stocked SKUs and fixed bundles.

Inspect whether fragrance_family, size_ml and concentration can be generalized without misleading semantics. Design product format, scent family, size/weight, material, burn-time/care and safety content using structured fields only where filtering/validation/snapshots require them.

Explicitly reject component-level or build-your-own bundle stock unless a bill-of-materials and atomic component reservation transaction is separately approved.

Return the complete coupling inventory, migration plan, snapshot changes, filter/UI changes, safety/legal inputs and regression suite. Await approval before editing.
```

## Prompt 7 — Electronics accessories derivative

```text
Analyze a non-serialized phone/electronics accessories derivative of the Parfum CI foundation.

Products are limited to <cases/chargers/cables/power banks/earbuds/screen protectors>. Phones, computers, repair jobs, IMEI/serial tracking and manufacturer-claim automation are excluded.

Design:
- device compatibility taxonomy;
- connector, color, power/capacity and model attributes;
- distinction between product brand and compatible-device brand;
- SKU and historical snapshot labels;
- search/filter behavior;
- electrical/safety copy boundaries;
- defective-item and warranty support workflow.

Report every schema, SQL, DTO, admin/public UI, notification, dashboard, legal and test impact. Identify the exact point at which serial tracking would require a new inventory model. Preserve existing order and inventory transaction invariants. Await approval.
```

## Prompt 8 — Shelf-stable gourmet derivative

```text
Analyze a shelf-stable, prepacked gourmet and gift derivative of the Parfum CI foundation.

Products are limited to <coffee/tea/confectionery/spices/fixed hampers>. No cold chain, variable weight, component-built hampers, lot selection, expiry allocation or recall workflow is allowed in the first MVP.

Determine:
- weight/pack/format variant fields;
- ingredient, allergen, storage and label content boundaries;
- whether the proposed catalogue can legally and operationally omit batch/expiry tracking;
- fixed-hamper SKU behavior;
- order-item snapshots and customer communications;
- food-specific return/damage/legal decisions;
- exact stop condition if batch, expiry or weighted inventory becomes required.

Return a fit decision, gap report and phased plan only. Do not implement until the owner supplies verified label data and legal guidance.
```

## Prompt 9 — Review an implementation proposal

```text
Review the proposed derivative implementation against the completed adaptation brief and reproduction blueprint.

For every proposed change classify:
- KEEP: preserves a proven reusable boundary;
- ADAPT: changes domain vocabulary/fields without changing the invariant;
- REDESIGN: changes the economic, inventory, identity or authorization model;
- REJECT: out of approved MVP scope or unsafe.

Specifically check:
- no Parfum CI infrastructure/data/asset reuse;
- no edited applied migration;
- no browser-authoritative money/stock/status;
- no direct stock update;
- no weakened RLS/grants or hidden-only permissions;
- no loss of historical snapshots;
- no duplicated payment/delivery/settings systems;
- no copied legal identity or unapproved claims;
- complete tests for idempotency and real concurrency.

Return defects by BLOCKER, HIGH, MEDIUM, LOW and INFORMATIONAL. Propose the smallest correction. Do not edit until approved.
```

## Prompt 10 — Resume after months

```text
We are resuming <new store project> after a pause.

Read AGENTS.md, README.md, the derivative developer handoff, architecture, schema, business rules, security, testing, deployment, legal handoff, store adaptation brief and the latest verification record.

Before editing:
1. report branch, HEAD and worktree state;
2. report local versus remote migration alignment;
3. verify current Vercel/Supabase/Resend/domain/backup state rather than trusting old docs;
4. identify the current production Supabase hard deny and staging target;
5. summarize the product/variant contract and authoritative transaction boundaries;
6. list open launch blockers and accepted exclusions;
7. compare the requested task to the approved adaptation brief;
8. propose one bounded next objective.

Do not push migrations, deploy, seed, clean live data or run destructive E2E. Use PASS, FAIL and NOT VERIFIED. Await approval if the task expands the domain or infrastructure authority.

Current objective: <one bounded objective>
```
