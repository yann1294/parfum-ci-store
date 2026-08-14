# Parfum CI Store — MVP developer handoff and roadmap

Status: living developer handoff  
Snapshot date: 2026-08-15  
Application directory: `parfum-ci-store/` inside the Git repository  
Deployment observed: `https://parfum-ci-store.vercel.app`

## 1. Why this document exists

This is the durable re-entry point for the project. It explains what the MVP is, why its important design decisions were made, how the main workflows work, which phases are actually implemented, which external deployment steps remain conditional, and what can reasonably come next.

Use it when returning after a long pause or beginning a new assisted development session. It is intentionally different from:

- `README.md`, which is the application setup and command reference;
- `docs/product-requirements.md`, which records product scope;
- `docs/architecture.md`, which describes technical boundaries;
- phase verification documents, which preserve evidence from a particular implementation moment;
- deployment runbooks, which describe external operational steps.

This document connects those sources into one narrative. When it conflicts with executable code or an applied database migration, inspect the implementation and migration before deciding. Do not silently rewrite history to make a document look current.

## 2. Executive summary

Parfum CI Store is a French-first, mobile-oriented perfume storefront and operations back office for Côte d’Ivoire. It serves customers who may not want an account or automated card payment and a small staff who need to manage a real catalogue, physical inventory, manual Mobile Money verification, delivery, support messages and notifications without redeploying the application.

The central architectural idea is that the browser carries **intent**, while the server and PostgreSQL establish **authority**:

- the cart stores requested variants and quantities, not trusted prices or stock;
- checkout submits customer and fulfilment intent, not authoritative totals;
- PostgreSQL locks inventory, recalculates prices and delivery, creates the order and reserves stock atomically;
- order transitions convert or release reservations exactly once;
- payment changes append immutable economic events;
- notifications are durable outbox records sent after business commits;
- public settings are safe projections, not direct reads of the private settings row;
- staff UI permissions are backed by server authorization, RLS, grants and controlled RPCs.

The functional MVP through Phase 16 is implemented. Phase 17 added CI/deployment safety and the project is now reachable on Vercel Hobby using the existing Supabase Free project. That deployment is useful for verification, but it is not yet the durable commercial target described by the project policy. Phase 18 was analyzed and documented; no production bulk importer or automated real-catalogue replacement was implemented.

## 3. State snapshot

### Repository

- Git repository root: one directory above the Next.js application.
- Application root: `parfum-ci-store/`.
- Runtime contract: Node `22.14.0` for local/CI and Node `22.x` on Vercel.
- Package manager: pnpm `10.15.0`.
- Framework snapshot: Next.js `16.2.10`, React `19.2.4`.
- Database history: 21 forward migrations through `20260814160000_phase16_security_hardening.sql`.
- Generated Supabase types live at `src/types/database.types.ts` and must not be edited manually.

At the time of this snapshot, the top-level GitHub README was on `develop`. Always run `git status`, inspect the current branch, and compare local/remote history before resuming; do not assume this branch statement remains current.

### Infrastructure

```text
Browser
  → Vercel deployment
      → existing Supabase Free project
          - Auth
          - PostgreSQL
          - Storage
          - RLS
      → Resend when a verified sender is configured
```

- Deployed URL: `https://parfum-ci-store.vercel.app`.
- Vercel plan: Hobby.
- Supabase plan: Free.
- Supabase project: existing stateful project; it is not disposable.
- Product images: public `product-images` bucket, 5 MiB, JPEG/PNG/WebP.
- Health endpoint: `GET`/`HEAD /api/health`, liveness only.
- Production database-mutating E2E: hard-denied in code.

### Last observed external gaps

These are observations, not permanent truths. Recheck them before work:

- the first deployed metadata check still emitted `http://localhost:3000` as canonical because `NEXT_PUBLIC_SITE_URL` had been copied from local configuration;
- Supabase Auth Site URL and exact application callback needed to be aligned to the deployed URL;
- `noreply@parfum-ci-store.vercel.app` is not a viable Resend production sender because the Vercel-owned domain cannot be DNS-verified by this project;
- a custom owned domain and verified Resend sending domain were not yet available;
- the Node warning was caused by Vercel Project Settings selecting 24.x while `package.json` intentionally selects Node 22; align the Vercel setting to 22.x rather than upgrading casually;
- automated notification scheduling was not configured; the current processor route is authenticated POST while Vercel Cron invokes GET;
- commercial use on Vercel Hobby remains outside the deployment policy established in Phase 17.

### Data state inherited from Phase 17 review

The last sanitized audit found substantial development/fixture history in the linked project, including catalogue, orders, notifications, messages and staff candidates. Those counts are recorded in `docs/phase-17-deployment-verification.md`. They identify review candidates only; they are not authorization to delete records.

Preserve immutable order, payment, inventory, notification-attempt and audit history. Prefer disabling staff, archiving products, cancelling eligible orders through the state machine and making compensating inventory movements over direct deletion or ledger rewriting.

## 4. Status vocabulary

Use these labels consistently:

- **Implemented**: code/schema exists in the repository.
- **Locally verified**: relevant automated or manual checks passed in a non-production environment.
- **Externally verified**: the deployed provider/domain/inbox/database behavior was actually exercised.
- **Closed for MVP**: the owner accepted the phase scope. This does not retroactively turn older `NOT VERIFIED` evidence into `PASS`.
- **Deferred**: deliberately outside the current MVP.
- **Blocked**: a required dependency or launch condition is absent.

Phase verification files are historical evidence. Some were written before later browser checks and therefore retain `NOT VERIFIED` rows even though the owner subsequently closed the phase. Do not erase those records; append new dated evidence when re-verifying.

## 5. Phase-by-phase history

| Phase | Outcome                                                                 | Why it exists                                                                                                               | Current state                                                                         |
| ----- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 1     | Next.js/TypeScript application foundation                               | Establish the permanent App Router, pnpm, Tailwind and component direction                                                  | Implemented                                                                           |
| 2     | Supabase SSR integration and base schema                                | Make PostgreSQL/Auth/Storage the authoritative backend and keep browser/server clients separate                             | Implemented                                                                           |
| 3     | Staff authentication, roles and responsive admin shell                  | Give staff a protected operational surface; synchronize Auth identities to inactive-by-default profiles                     | Implemented                                                                           |
| 4     | Secure catalogue and Storage domain                                     | Establish brands, categories, products, variants, image validation, public views, activation invariants and cost protection | Implemented                                                                           |
| 5     | Admin catalogue workflows                                               | Let OWNER/ADMIN operate catalogue and images without code changes; scale lists and editors                                  | Implemented                                                                           |
| 6     | Public storefront                                                       | Expose only publishable catalogue data with discovery, product detail, SEO and WhatsApp enquiry                             | Implemented                                                                           |
| 6.5   | Managed content and inventory initialization correction                 | Separate editorial content from code and distinguish zero stock from never-configured inventory                             | Implemented                                                                           |
| 7     | Reliable guest cart                                                     | Persist customer intent locally and reconcile it with server truth before order-sensitive actions                           | Implemented                                                                           |
| 8     | Atomic guest-order transaction                                          | Prevent client price trust, overselling and partial orders; reserve stock transactionally and idempotently                  | Implemented and database-tested                                                       |
| 9     | Checkout, confirmation, tracking, payment settings and WhatsApp intents | Complete the customer journey while keeping WhatsApp intent distinct from a formal order                                    | Implemented; later browser approval reported by owner                                 |
| 10    | Transactional inventory administration                                  | Replace direct stock editing with auditable movements and invariant-preserving row locks                                    | Implemented and database-tested                                                       |
| 11    | Order/payment lifecycle                                                 | Provide controlled fulfilment, reservation release/SOLD conversion, immutable histories and manual verification             | Implemented and concurrency-tested                                                    |
| 12    | Notification outbox and center                                          | Decouple email reliability from business transactions and support retries/claims/attempt evidence                           | Implemented; external inbox delivery remains environment-dependent                    |
| 13    | Customer messages                                                       | Make website/social support auditable with assignment, status history and private notes                                     | Implemented                                                                           |
| 14    | Central settings and delivery economics                                 | Eliminate hard-coded business configuration and make delivery fees authoritative and historically stable                    | Implemented; migrations applied; browser approval later reported by owner             |
| 15    | Role-aware operational dashboard                                        | Give staff a bounded overview without creating a parallel analytics system or leaking financials                            | Implemented; owner closed after local checks                                          |
| 16    | Security/accessibility/performance hardening                            | Audit launch-critical boundaries and run broad regression without adding product features                                   | Implemented; owner declared phase closed                                              |
| 17    | CI/deployment safety and free-tier planning                             | Make the stateful backend non-disposable, guard E2E, add health/CI and document upgrade/backup operations                   | Repository implementation complete; external commercial readiness remains conditional |
| 18    | Real catalogue onboarding and launch acceptance                         | Originally combined import tooling and launch verification; split into gated optional importer and acceptance plan          | Analysis/docs only; importer and live onboarding not implemented                      |

## 6. Product intent and initial feature vision

The initial MVP was designed around a small perfume retailer rather than a generic marketplace. The intended customer experience was:

1. discover perfumes by brand/category/search;
2. choose a concrete variant such as size and concentration;
3. keep a guest cart without account friction;
4. order through a formal website checkout or contact through WhatsApp;
5. use familiar manual Mobile Money or cash-based methods;
6. receive status communication;
7. track the order using information the customer already has.

The intended staff experience was:

1. manage the catalogue and publication state;
2. manage physical stock without overwriting history;
3. process orders through an explicit lifecycle;
4. verify manual payments separately from fulfilment;
5. handle customer messages and notification failures;
6. update business settings without a redeploy;
7. see the most useful daily operational metrics.

The original non-goals remain valuable constraints:

- no Stripe requirement for MVP;
- no customer accounts;
- no automated Mobile Money gateway;
- no loyalty program;
- no multi-country tax/shipping engine;
- no marketplace/seller model;
- no profit/COGS/forecasting/warehouse analytics.

These exclusions kept the first version aligned with manual business operations and reduced payment, privacy and accounting risk.

## 7. Architectural reasoning

### 7.1 Why Next.js App Router and Server Components

Public catalogue and metadata benefit from server rendering, while admin and checkout still need focused client interactivity. Server Components minimize browser data exposure and keep data access close to authorization. Client Components are limited to stateful interactions such as cart state, controlled forms, dialogs, filters and theme controls.

Before changing framework behavior, read the matching versioned guide under `node_modules/next/dist/docs/`; this project uses a Next.js version with conventions that may differ from older examples.

### 7.2 Why Supabase PostgreSQL is the source of truth

The most dangerous operations—stock reservation, order creation, fulfilment conversion, payment history, settings concurrency and notification claiming—need row locks, constraints and one commit boundary. PostgreSQL functions provide stronger guarantees than coordinating several browser or server API calls.

Supabase also provides Auth, RLS, Storage and typed PostgREST integration without requiring a second backend platform for the MVP.

### 7.3 Why the cart is not an order

The cart is versioned browser intent. Prices, availability and product publication can change after an item is added. `/api/cart/reconcile` reloads authoritative safe catalogue data before display-sensitive ordering actions.

Cart activity never reserves stock. Only the Phase 8 order transaction creates reservations. This prevents abandoned carts from blocking physical inventory.

### 7.4 Why order creation lives in a transaction

The client supplies product/variant IDs and quantities, never trusted price or delivery fee. The transaction:

1. validates a bounded strict request;
2. normalizes Côte d’Ivoire phone numbers;
3. locks variants in deterministic order;
4. verifies product/variant publication and initialized availability;
5. loads enabled payment and delivery configuration;
6. recalculates zone/default/pickup delivery fees;
7. snapshots product, price and delivery facts;
8. inserts customer, order, items and histories;
9. increments reserved stock and writes `RESERVED` ledger entries;
10. inserts audit and notification intents;
11. commits once.

Idempotency keys return the original result for the same fingerprint and reject conflicting payload reuse. This is why checkout can safely retry after uncertain network responses.

### 7.5 Why inventory is a ledger

Physical stock and reservations represent different facts:

```text
available = stock_on_hand - reserved_quantity
```

- order creation increases `reserved_quantity` only;
- cancellation decreases the reservation and writes `RELEASED`;
- delivery decreases physical and reserved stock and writes `SOLD`;
- receiving, damage, adjustment and return are explicit staff operations;
- corrections are new movements, never edits to old ledger rows.

`inventory_initialized_at` distinguishes a genuine zero-stock item from a variant whose inventory has never been configured.

### 7.6 Why payment and fulfilment are separate

A manual payment may be pending while an order is confirmed, or COD may remain unpaid until delivery. `payment_status` and `order_status` therefore evolve independently under explicit allowed transitions.

Payment verification appends a `payment_transactions` event with actor/reference/note evidence. It never trusts a browser redirect and never stores Mobile Money PINs, OTPs, CVVs or card credentials.

Dashboard revenue is gross paid XOF derived from the first authoritative `PAID` event per order at its verification time, not from current order state. Refunds are not subtracted because there is no authoritative refunded-amount field yet.

### 7.7 Why historical snapshots matter

Products can be renamed, prices can change and delivery zones can be edited. Existing orders must not change economically or descriptively afterward. Order items snapshot product/brand/variant/price data, while Phase 14 snapshots the fee, method, matched zone and estimate.

Current catalogue IDs may support navigation, but reports should prefer historical snapshots for labels.

### 7.8 Why notifications use an outbox

Order/payment/inventory success must not depend on Resend availability. Business transactions insert pending notification intents. A later processor claims rows with `FOR UPDATE SKIP LOCKED`, sends through a provider interface, records immutable attempts and applies bounded retries.

This provides concurrency safety, observability and recovery. Provider acceptance is still different from recipient inbox delivery.

### 7.9 Why content and settings are separate

`/admin/contenu` owns editorial page copy. `/admin/parametres` owns structured operational configuration such as identity, contact, payment, delivery, global SEO, notification recipient and availability.

This avoids both hard-coded business values and an unrestricted JSON settings dump. Public callers receive a typed safe projection; admin updates are section-specific, revision-checked and audited.

### 7.10 Why analytics remains operational

The dashboard uses existing economic and lifecycle records rather than a new event pipeline. One role-authorized aggregate RPC returns a bounded DTO. This avoids loading thousands of rows into the browser and avoids premature Redis, warehouse or materialized-view infrastructure.

Business boundaries use `Africa/Abidjan` local midnight converted once to UTC. OWNER/ADMIN and ORDER_MANAGER can receive approved financial metrics; support and inventory roles never receive financial fields merely hidden with CSS.

## 8. Core domain behavior

### Catalogue publication

A public product must be `ACTIVE` and retain:

- a meaningful name and description;
- at least one active positive-price variant;
- at least one active, approved, validated image.

Database triggers prevent changes that would make an active product invalid. Draft and archived products remain unavailable through public catalogue views.

### Product images

Image paths are server-generated under `products/<product-id>/<random-id>.<ext>`. Upload uses a signed Storage flow, followed by server-side magic-byte/MIME/size validation and database finalization. The bucket is public-read because storefront images are public assets; do not store confidential images there.

### Delivery fees

The deterministic precedence is:

1. configured pickup fee for pickup;
2. exact normalized active zone match for home delivery;
3. configured default delivery fee;
4. unavailable when no rule applies.

Free delivery is applied server-side when enabled and the authoritative subtotal reaches the integer XOF threshold. Checkout preview and stored order calculation share the database logic; browser-submitted fees are ignored.

### Order lifecycle

Main states:

```text
PENDING_CONFIRMATION
  → CONFIRMED
  → PREPARING
  → READY_FOR_PICKUP or OUT_FOR_DELIVERY
  → DELIVERED
```

Cancellation/return rules are constrained by the Phase 11 state machine. Cancellation before sale releases inventory once. Delivery converts the reservation to SOLD once. A returned order does not automatically decide whether stock is resellable; an authorized `RETURNED` inventory movement records that separate physical decision.

### Messages

Website contact submission requires bounded content, consent and at least one contact method. Honeypot, rate limiting and idempotency reduce abuse/duplicates. Manual Instagram, WhatsApp, phone or email enquiries are staff-created records, not external platform synchronization.

Status, assignment and internal-note history is append-only. Customer-facing pages never expose internal notes.

### Store availability

- `accepting_orders=false`: catalogue/cart remain available, website checkout is blocked both in UI and server order transaction; WhatsApp contact follows the documented independent policy.
- `maintenance_mode=true`: public storefront renders maintenance state, while admin, Auth and operational API routes remain reachable.

Maintenance is implemented in the storefront layout rather than broad middleware interception to avoid breaking internal operations.

## 9. Roles and permissions

| Capability                     | OWNER | ADMIN | ORDER_MANAGER | INVENTORY_MANAGER | CUSTOMER_SUPPORT |
| ------------------------------ | ----: | ----: | ------------: | ----------------: | ---------------: |
| Manage products/images         |   Yes |   Yes |            No |                No |               No |
| Read staff catalogue           |   Yes |   Yes |            No |               Yes |               No |
| Manage inventory               |   Yes |   Yes |            No |               Yes |               No |
| Manage order/payment lifecycle |   Yes |   Yes |           Yes |                No |               No |
| Read support-relevant orders   |   Yes |   Yes |           Yes |                No |              Yes |
| Manage messages                |   Yes |   Yes |            No |                No |              Yes |
| Manage settings                |   Yes |   Yes |            No |                No |               No |
| Dashboard financial aggregates |   Yes |   Yes |           Yes |                No |               No |

All permissions require an active profile. New Supabase Auth users synchronize to inactive profiles and receive no role from email/domain metadata. UI visibility is convenience only; server services, controlled functions, grants and RLS enforce the boundary.

## 10. Public and private data boundaries

### Public-safe data

- published catalogue projection;
- approved image URLs;
- configured public contact/social values;
- enabled payment labels and safe instructions;
- enabled delivery methods/estimates and safe zone quote output;
- global SEO defaults;
- order-acceptance/maintenance state;
- limited tracking result after order number plus normalized phone match.

### Never public

- Supabase secret/service key;
- Resend/SMTP/cron credentials;
- cost prices;
- physical/reserved stock internals;
- notification routing/provider payloads;
- audit metadata;
- internal notes;
- customer address or full order data outside authorized views;
- payment-provider secrets or customer payment credentials;
- settings revision/internal notification routing;
- raw Supabase/PostgreSQL errors.

There are three Supabase clients:

- browser client: public URL and publishable key only;
- SSR server client: cookie-based current user access;
- admin client: server-only secret key for controlled privileged workflows.

## 11. Route map

### Public

- `/` — home
- `/catalogue` — catalogue/search/filter
- `/parfums/[slug]` — product detail
- `/panier` — cart
- `/commande` — checkout
- `/commande/succes/[orderNumber]` — session-scoped confirmation
- `/suivi-commande` — order number + phone tracking
- `/contact` — public contact message
- `/livraison` — delivery/payment editorial page
- `/a-propos` — about page

### Authentication

- `/connexion` — password and Google staff login
- `/auth/callback` — safe canonical OAuth code exchange
- `/acces-refuse` — inactive/missing-profile denial

### Admin

- `/admin` — role-aware dashboard
- `/admin/produits`, `/admin/produits/[id]`, `/admin/produits/nouveau`
- `/admin/marques`, `/admin/categories`
- `/admin/inventaire`, `/admin/inventaire/[variantId]`, `/admin/inventaire/stock-faible`
- `/admin/commandes`, `/admin/commandes/[id]`
- `/admin/messages`, `/admin/messages/[id]`
- `/admin/notifications`, `/admin/notifications/[id]`
- `/admin/contenu` — editorial content
- `/admin/parametres` — operational settings

### APIs

- `POST /api/cart/reconcile`
- `POST /api/orders`
- `POST /api/orders/track`
- `POST /api/storefront/delivery-quote`
- `POST /api/storefront/order-intents/whatsapp`
- `POST /api/contact/messages`
- `POST /api/cron/notifications`
- `GET`/`HEAD /api/health`

## 12. Database evolution

Never modify an applied migration. Add a new timestamped forward-only migration, review it, apply manually, regenerate types and run relevant SQL regressions.

Migration groups:

1. `20260713000100` — initial business schema, enums, constraints, RLS and grants.
2. `20260713000200` — Auth/profile synchronization.
3. `20260714000100` — catalogue Storage, public projections and activation invariants.
4. `20260716000200` — structured storefront content.
5. `20260718141514` and `20260720093000` — inventory initialization and public projection grant repair.
6. `20260723080100` — atomic guest order creation/reservation.
7. `20260727090100` plus three 2026-08-03 repairs — payment settings, WhatsApp intents and transaction conflict fixes.
8. `20260803143000` — transactional inventory adjustments.
9. `20260803153000` and `20260804103000` — order/payment management and optimistic expected-status repair.
10. `20260804120000` and `20260804124500` — notification processing and ambiguity repair.
11. `20260804133000` — customer messages.
12. `20260813090000` — centralized settings, zones and authoritative delivery snapshots.
13. `20260814090000` — dashboard timezone and aggregate RPC.
14. `20260814160000` — final grants/security hardening.

The exact filenames are in `supabase/migrations/`; their SQL is authoritative.

## 13. Testing and verification philosophy

### Layers

- Vitest: parsing, permissions, projections, rendering boundaries and business helpers.
- SQL integration: real RLS, grants, functions, rollback, idempotency and concurrency.
- Playwright safe mode: public, responsive, accessibility and liveness checks.
- Playwright destructive mode: real order/inventory/payment/message/settings lifecycle against local or explicitly allowlisted staging only.
- Manual deployed acceptance: provider, domain, Auth, email inbox, production settings and controlled operational flows.

### Production test isolation

`scripts/e2e-safety.ts` hard-codes the current live Supabase project reference as forbidden. Destructive mode additionally requires explicit permission and a local or exact staging target. Do not weaken this guard to make a test pass.

If production moves to another Supabase project, update:

1. `CURRENT_PRODUCTION_SUPABASE_PROJECT_REF`;
2. its unit test;
3. deployment/testing docs;
4. staging allowlist configuration.

Neither the old nor new live project should ever become an E2E fixture target.

### Honest evidence

Use only `PASS`, `FAIL` and `NOT VERIFIED`. A successful admin save does not prove checkout integration; a preview quote does not prove the stored order fee; a hidden card does not prove financial authorization; a provider ID does not prove inbox delivery.

### Standard commands

```bash
pnpm install --frozen-lockfile
pnpm format:check
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
git diff --check
git status --short
```

The repository historically had broad Prettier debt. Phase 17 CI left formatting visible but temporarily non-blocking. Recheck the current count before assuming it remains 124 files; do not reformat unrelated files as part of a feature change.

## 14. Deployment and operations

### Environment boundary

Browser-safe:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SITE_NAME`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Server-only:

- `SUPABASE_SECRET_KEY`
- `RESEND_API_KEY`
- `EMAIL_FROM`/`RESEND_FROM_EMAIL`
- `CRON_SECRET`
- provider/scheduler configuration

Database-managed business configuration:

- identity/contact/social data;
- payment labels, merchant display values and instructions;
- delivery methods, zones, fees, thresholds and estimates;
- SEO defaults;
- notification recipient;
- maintenance and order acceptance.

Do not duplicate Phase 14 values into environment variables. Several legacy variables remain in `.env.example` for historical compatibility but are not consumed by current code; inspect actual `process.env` usage before copying any environment file wholesale.

### Current free-tier posture

Vercel Hobby and Supabase Free helped minimize initial cost, but create explicit limitations:

- Hobby is not the project’s approved commercial hosting plan;
- Free Supabase has weaker backup/recovery and capacity guarantees than the desired production target;
- no staging project exists by default;
- preview environments must not receive unrestricted live mutation credentials;
- reliable sub-daily notification scheduling still needs an appropriate scheduler/adapter;
- Supabase leaked-password protection is unavailable on Free;
- the application rate limiter is process-local, not distributed across serverless instances.

### Backup

Before launch or high-risk changes:

1. create an encrypted PostgreSQL logical backup outside Git;
2. record timestamp, source, checksum, tool version, custodian and recovery location;
3. export `product-images` separately;
4. test restoration into an isolated target periodically.

A catalogue CSV export is not a database backup. Managed PostgreSQL backups also do not contain Storage objects.

### Rollback

- application: redeploy/rollback a known Vercel deployment;
- database: prefer a reviewed forward-fix migration;
- severe destructive incident: stop writes and restore the recorded backup into an approved recovery target;
- never delete applied migrations or casually restore only some transactional tables.

## 15. Known limitations and debt

### Launch-affecting

- commercial-compatible hosting still needs confirmation/upgrade;
- canonical URL, Auth URLs and production environment scopes must be re-verified after every domain change;
- Resend needs a domain owned by the business; a `vercel.app` sender cannot be DNS-verified by this project;
- Auth custom SMTP and application Resend notifications are separate configurations;
- production staff/test-data classification and actual catalogue readiness require manual confirmation;
- backup creation and restoration evidence remain operational, not code-only tasks;
- delivery/payment/settings must be checked with real business values before accepting orders;
- final deployed cancellation, SOLD, tracking-privacy, contact and inbox smoke checks need recorded evidence.

### Functional/legal

- there are no dedicated privacy-policy, terms or legal-notice routes yet;
- checkout requires terms acceptance in UI but does not snapshot a policy version/timestamp;
- refunds have lifecycle statuses but no authoritative refunded-amount model, so dashboard revenue is gross paid revenue;
- no automated payment gateway or webhook reconciliation exists;
- no customer accounts or self-service order history;
- no dedicated branding Storage bucket; logo policy currently uses a bounded HTTPS URL;
- WhatsApp integration records click intent, not message delivery or an order;
- manual social messages are staff records, not Instagram/WhatsApp API synchronization.

### Operational/technical

- notification cron needs a secure GET adapter for Vercel Cron or a compatible POST scheduler;
- process-local rate limiting is not sufficient for strong multi-instance enforcement;
- public product images can be fetched when their public object URL is known, even for draft-related objects;
- dashboard query performance has not been proven at large production volume;
- legacy environment-variable examples should eventually be pruned after a compatibility review;
- Phase 18 bulk catalogue import/export was designed but not implemented.

## 16. Phase 17 continuation paths

### Path A — Keep Supabase Free temporarily

1. move Vercel to a commercial-compatible plan before real sales;
2. correct `NEXT_PUBLIC_SITE_URL`, root SEO canonical and Supabase Auth URL configuration;
3. obtain an owned domain and verify a Resend sender/subdomain;
4. configure Auth custom SMTP separately;
5. create database and Storage backups;
6. review staff, fixture catalogue, inventory reservations and production settings;
7. implement/configure a compatible notification scheduler;
8. run controlled deployed acceptance.

Accept the Free project’s capacity, pause and recovery risks explicitly and monitor usage.

### Path B — Upgrade the existing Supabase project to Pro

This is the simplest database continuity path because project URL/reference and data remain in place:

1. back up database and Storage;
2. record migration state and project reference;
3. upgrade in place;
4. configure managed backup/retention and leaked-password protection where available;
5. verify Auth, RLS, grants, Storage and advisors;
6. leave Vercel keys unchanged unless rotating them intentionally;
7. rerun deployed acceptance.

An account-plan change is not evidence that application behavior passed.

### Path C — Move production to a new Supabase project

Use this for strong production/staging separation or a clean long-term boundary:

1. create the destination in the intended region/plan;
2. freeze schema changes and checkpoint the source;
3. apply committed migrations in order;
4. migrate PostgreSQL data through an approved logical process;
5. migrate Storage objects separately and verify them;
6. migrate/recreate Auth users through supported Supabase mechanisms—never copy password hashes ad hoc;
7. verify RLS, grants, functions, settings and staff profiles;
8. update Vercel variables under maintenance;
9. update canonical/Auth/provider URLs;
10. update the destructive-E2E production hard deny;
11. smoke test, switch traffic and retain a rollback window.

### Path D — Add staging

A separate staging Supabase project is the most valuable development-infrastructure improvement after launch. It allows SQL/concurrency/lifecycle E2E without risking customer data. Use synthetic `example.test` identities, development notification delivery and explicit reset/seed permissions.

## 17. Phase 18 continuation paths

### Manual catalogue onboarding

Recommended when the real launch catalogue is small:

1. create brands/categories/products/variants in existing admin;
2. keep products in `DRAFT`;
3. upload owned/licensed images through the existing image manager;
4. initialize stock through Phase 10 operations;
5. review publication readiness;
6. activate intended products individually;
7. verify storefront/cart/checkout.

This adds no new mutation surface and is the safest route.

### Bulk catalogue onboarding

Only implement when volume justifies it. Follow `docs/phase-18-proposed-prompt.md`:

- four strict CSV contracts with slug references;
- create-only conflicts—no silent upsert;
- complete dry run before writes;
- one all-or-nothing transaction;
- import identifier/fingerprint for retries;
- imported products always `DRAFT`;
- no image URLs or stock fields;
- authorized, formula-safe catalogue export;
- isolated local/staging integration tests only.

Live import, fixture cleanup and acceptance are three separate approvals.

## 18. Prioritized future roadmap

### Priority 0 — Make the deployed MVP safe for commercial operation

- commercial-compatible hosting;
- owned canonical domain and HTTPS;
- correct Vercel/Supabase/Google OAuth URLs;
- verified Resend domain plus Supabase Auth SMTP;
- tested notification scheduling;
- production staff and settings review;
- real catalogue/inventory onboarding;
- database and Storage backups with restore evidence;
- controlled production cancellation/SOLD/tracking/contact/email acceptance;
- privacy, terms and legal content supplied by an appropriate reviewer.

### Priority 1 — Improve operational reliability

- separate staging Supabase project;
- distributed rate limiter/WAF for login, order, tracking, contact and WhatsApp intent;
- secure Vercel Cron GET adapter or approved external scheduler;
- structured error monitoring with PII scrubbing;
- backup automation and restore drills;
- notification bounce/complaint observability;
- database capacity/query-plan monitoring;
- remove obsolete environment variables and resolve formatting debt in a dedicated change.

### Priority 2 — Improve catalogue operations

- optional Phase 18 create-only CSV importer/exporter;
- dedicated branding asset upload workflow;
- safe bulk activation/archive workflow with readiness report;
- improved image variants/resizing strategy;
- richer catalogue facets only when real inventory demands them;
- controlled explicit test-data marker for future analytics exclusion, without rewriting history.

### Priority 3 — Add an online payment gateway

Follow `docs/post-mvp-payment-gateway-roadmap.md`. Choose a provider based on current Côte d’Ivoire merchant eligibility, XOF support, methods, fees, settlement, refunds and webhook quality—not name recognition alone.

Keep manual Mobile Money and COD fallbacks. Use hosted checkout, cryptographically verified idempotent webhooks, authoritative amount/currency/reference checks, immutable events and admin reconciliation. Never mark paid from a browser success redirect.

### Priority 4 — Customer convenience

- optional customer accounts linked carefully to existing guest customers/orders;
- secure customer order history and saved contact/delivery details;
- self-service notification preferences;
- invoice/receipt generation;
- exchanges/returns workflow with explicit inventory disposition;
- better delivery status/customer timeline;
- multilingual support if business demand exists.

Customer accounts require an identity-linking and privacy design; do not retrofit them by exposing existing guest-order rows broadly.

### Priority 5 — Growth and business intelligence

- authoritative refunded amounts and gross/net revenue split;
- payment settlement reconciliation;
- cost/COGS and margin only after cost data governance is approved;
- launch-date/test-data-aware analytics;
- campaign attribution separated from order channel;
- export/reporting for accounting;
- low-stock reorder suggestions;
- customer segmentation/loyalty only with consent and privacy review.

Avoid forecasting, lifetime value, cohort and warehouse infrastructure until transaction volume and a concrete decision justify them.

### Priority 6 — Platform expansion

- additional countries/currencies/tax rules;
- multiple stores/warehouses;
- marketplace sellers;
- native/mobile client;
- external social-channel synchronization.

These are not incremental toggles. Each would change core tenancy, inventory, accounting, authorization and data models and should be treated as a new product phase.

## 19. How to resume work after months

### Step 1 — Establish facts

```bash
cd parfum-ci-store
git status --short
git branch --show-current
git log -5 --oneline
node --version
pnpm --version
pnpm db:migrations
pnpm db:push:dry
```

Do not run `supabase db reset`, seed scripts, cleanup scripts or destructive E2E until the target URL/project reference is explicitly proven local/staging.

### Step 2 — Read in this order

1. this document;
2. `AGENTS.md`;
3. `README.md`;
4. `docs/product-requirements.md`;
5. `docs/architecture.md`;
6. `docs/business-rules.md`;
7. `docs/security.md`;
8. `docs/testing.md`;
9. `docs/deployment.md`;
10. the verification document for the domain being changed;
11. Phase 17/18 and roadmap documents when touching infrastructure/catalogue launch.

### Step 3 — Recheck external state

- Vercel plan, Node setting, deployment branch and environment scopes;
- live canonical metadata and health;
- Supabase plan, migration history, Auth URLs/providers/rate limits/SMTP;
- Resend verified domains, sender and provider events;
- database/Storage backup timestamps;
- store settings, order acceptance and maintenance state;
- staff/test accounts and catalogue/inventory readiness;
- latest CI result.

External state changes independently of Git. Never infer it from documentation alone.

### Step 4 — Choose one bounded objective

Examples:

- “Upgrade current Vercel project to Pro and re-run deployment acceptance.”
- “Upgrade the existing Supabase project to Pro in place; no project migration.”
- “Create isolated staging and enable destructive lifecycle E2E there.”
- “Implement Phase 18A create-only catalogue import, without running it live.”
- “Add privacy/legal routes using owner-supplied reviewed content.”
- “Evaluate one hosted payment provider; planning only.”

Avoid combining infrastructure migration, catalogue cleanup and a new payment gateway in one change.

### Step 5 — Preserve the project rules

- inspect existing patterns before editing;
- read current Next.js docs from installed `node_modules` before framework changes;
- validate every external boundary with Zod;
- keep privileged modules server-only;
- do not trust browser price/fee/stock/status values;
- use a new forward migration for database changes;
- do not push migrations automatically;
- regenerate, never hand-edit, Supabase types;
- add risk-bearing tests;
- update docs and verification evidence;
- report failed and unverified checks honestly.

## 20. Suggested context for a future assistant

Paste or adapt this at the beginning of a future session:

```text
We are continuing Parfum CI Store. Read AGENTS.md and
docs/mvp-developer-handoff-and-roadmap.md first, then the domain docs it links.

The Next.js app is nested under parfum-ci-store/. Phases 1–16 are implemented
and closed for MVP. Phase 17 repository safety/CI is implemented; external
commercial deployment status must be re-verified. Phase 18 importer is not
implemented—only its readiness analysis and proposed prompt exist.

The current/previous live backend is stateful and must never be reset, seeded,
cleaned broadly or used for destructive E2E. Browser data is intent only;
PostgreSQL transactions are authoritative for prices, delivery fees, orders,
inventory and lifecycle effects. Do not modify applied migrations or generated
types manually.

Before editing, report current branch/worktree, migration alignment, relevant
implementation, external assumptions and the smallest safe plan. Use only PASS,
FAIL or NOT VERIFIED for evidence.

Current objective: <one bounded objective here>.
```

If infrastructure has changed, add the new Vercel plan/domain, Supabase project/plan (project reference is not a credential), staging target and last backup/acceptance date.

## 21. Decision record summary

These decisions should not be reversed accidentally:

- Guest checkout is intentional; customer accounts are not required for MVP.
- WhatsApp intent is analytics/contact intent, not an order.
- Manual payment is intentional and independent from fulfilment.
- PostgreSQL is authoritative for economic and inventory effects.
- Historical order economics use snapshots.
- Inventory movements are immutable and corrections are compensating entries.
- Business notifications use an outbox and do not gate transaction success.
- Editorial content and operational settings remain separate.
- Public/private/admin DTOs expose the minimum required fields.
- Role checks happen server-side and at database boundaries.
- Operational analytics reuse authoritative events; no parallel analytics stream.
- Production and destructive test targets must be isolated.
- Migrations are forward-only and manually deployed after review.
- Future payment automation must use the provider interface and verified webhooks.

## 22. Primary reference map

- Setup and commands: `README.md`
- Product scope: `docs/product-requirements.md`
- Technical boundaries: `docs/architecture.md`
- Tables/functions/invariants: `docs/database-schema.md`
- Domain decisions: `docs/business-rules.md`
- Roles/RLS/secrets/privacy: `docs/security.md`
- UI/accessibility: `docs/design-system.md`
- Test commands/evidence expectations: `docs/testing.md`
- Deployment/backup/rollback: `docs/deployment.md`
- Phase 16 hardening evidence: `docs/phase-16-hardening-verification.md`
- Phase 17 plan/evidence: `docs/phase-17-free-tier-deployment-plan.md`, `docs/phase-17-deployment-verification.md`
- Infrastructure upgrades: `docs/production-upgrade-roadmap.md`
- Phase 18 decision/prompt: `docs/phase-18-readiness-analysis.md`, `docs/phase-18-proposed-prompt.md`
- Payment gateway future: `docs/post-mvp-payment-gateway-roadmap.md`
- Manual acceptance: `docs/manual-acceptance-test.md`

## 23. Updating this handoff

After a major phase, deployment change or infrastructure migration, append a dated state update covering:

- branch/release/deployment identifier;
- Vercel plan/domain/runtime;
- Supabase project/plan/migration head;
- backup and restore-test date;
- Auth/SMTP/Resend/cron status;
- production catalogue/inventory state;
- tests and acceptance evidence;
- newly accepted risks;
- completed/deferred roadmap items;
- new non-negotiable invariants.

Do not replace old facts without noting when they changed. The purpose of this file is continuity, not a permanently optimistic status page.
