# Testing

## Tooling

- TypeScript: `pnpm typecheck`
- ESLint: `pnpm lint`
- Vitest: `pnpm test`
- Playwright: `pnpm test:e2e`
- Production build: `pnpm build`

## Unit Tests

Use Vitest for business rules and pure logic:

- Zod schemas
- Price and XOF formatting
- Order totals
- Order state transitions
- Payment provider contract behavior
- Inventory ledger calculations
- Redaction helpers

Vitest is configured with jsdom. Current unit coverage includes foundational component/config tests; domain tests should be added with each business rule.

## Browser Tests

Use Playwright for critical flows:

- Storefront browse and product detail
- Cart update
- Guest checkout
- Order tracking
- Admin login
- Admin order verification

Do not add broad browser tests until the corresponding features exist.

Admin authentication setup reads credentials only from ignored environment variables:

```bash
PLAYWRIGHT_OWNER_EMAIL=owner@example.com PLAYWRIGHT_OWNER_PASSWORD='...' pnpm test:e2e
```

The setup project writes authenticated browser state to `playwright/.auth/admin.json`, which is ignored by Git. Do not commit storage state, traces, videos, screenshots, or reports that contain authenticated cookies or session data.

Use these optional role-specific variables for broader Phase 3 browser coverage:

- `PLAYWRIGHT_OWNER_EMAIL`, `PLAYWRIGHT_OWNER_PASSWORD`
- `PLAYWRIGHT_INVENTORY_MANAGER_EMAIL`, `PLAYWRIGHT_INVENTORY_MANAGER_PASSWORD`
- `PLAYWRIGHT_ORDER_MANAGER_EMAIL`, `PLAYWRIGHT_ORDER_MANAGER_PASSWORD`
- `PLAYWRIGHT_SUPPORT_EMAIL`, `PLAYWRIGHT_SUPPORT_PASSWORD`
- `PLAYWRIGHT_INACTIVE_EMAIL`, `PLAYWRIGHT_INACTIVE_PASSWORD`

`PLAYWRIGHT_ADMIN_EMAIL` and `PLAYWRIGHT_ADMIN_PASSWORD` remain a backward-compatible owner/admin fallback. If role credentials are missing, the affected authenticated tests are skipped. Unauthenticated smoke tests may still run, but skipped authenticated coverage is not verified.

Google's real consent screen is not automated in CI. Browser tests verify the Google button and safe failure paths; manual verification covers the real provider flow.

## Phase 4 Catalogue And Storage

Unit tests cover slug generation, slug collision behavior, XOF validation, image path safety, image size and magic-byte validation, activation rules, availability calculation, public DTO cost-price omission, and Phase 4 migration contents.

After applying the Phase 4 migration to a local or staging Supabase database, run:

```bash
psql "$DATABASE_URL" -f supabase/tests/phase4_catalogue_storage.sql
```

That script verifies the `product-images` bucket configuration, Storage policy shape, anonymous cost-price column protection, public view shape, and activation trigger presence.

Full Storage RLS behavior requires configured Supabase auth users and must not be marked as passed unless it actually runs against Supabase:

- anonymous upload denied;
- inactive staff upload denied;
- unauthorized role upload denied;
- authorized product manager upload allowed;
- unauthorized delete denied;
- authorized delete allowed;
- anonymous direct access cannot retrieve `cost_price_xof`.

## Phase 5 Admin Catalogue

Unit/component coverage includes:

- French XOF formatting and parsing;
- URL filter parsing and maximum page-size enforcement for brands, categories, and variants;
- server-side pagination assumptions for brand/category/variant screens;
- corrected `Public cible` terminology and `Famille olfactive` help text;
- role-aware catalogue navigation and permissions;
- read-only inventory-manager access;
- inventory stock summaries staying read-only in the catalogue module;
- variant create/edit dialogs replacing always-rendered forms for every variant;
- product-editor breadcrumb and deterministic `Retour aux produits` navigation;
- validated `/admin/produits` return-path preservation from list filters;
- unsaved-change interception before leaving the editor;
- image upload pending-state cleanup after successful finalization;
- object URL cleanup for local image previews;
- product list rendering without cost-price leakage.

Playwright should use ignored environment variables for role credentials and a non-sensitive fixture image under test fixtures. Live image integration is verified only when a real image passes through preparation, `uploadToSignedUrl`, finalization, row persistence, public retrieval, and deletion.

Image upload tests should treat temporary pending cards and persisted image cards as separate states:

- pending cards hold the selected `File`, local object URL, draft alt text, and current upload/finalization status;
- successful finalization revalidates the product editor route, calls a client refresh, removes the pending card, resets the file input, and revokes the object URL;
- upload or finalization failures leave the pending card visible with a safe retry/removal path;
- tests must not require `window.location.reload()`.

### Phase 5 E2E Seed Data

Development/test catalogue pagination and role checks can use the guarded seed scripts:

```bash
ALLOW_E2E_SEED=true pnpm seed:phase5
ALLOW_E2E_SEED=true pnpm cleanup:phase5
```

Required environment-variable names:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `ALLOW_E2E_SEED=true`

The scripts refuse to run when `NODE_ENV=production` or `VERCEL_ENV=production`, never print secret values, and operate only on records containing the exact prefix `E2E-20260716-A`.

Seeded records:

- 25 fictional brands;
- 25 fictional categories;
- one primary draft product;
- additional draft, archived, and active-intended products;
- 25 variants across `EDP`, `EDT`, and `extrait`;
- in-stock, low-stock, and out-of-stock inventory states.

Phase 4 activation rules require a validated product image for `ACTIVE` products. The seed does not insert rows into `storage.objects` and does not fabricate image records. Active-intended products are only moved to `ACTIVE` when a real finalized image already exists for that product. Real Storage image tests still run through the authenticated signed-upload UI/Playwright flow so Storage policies, upload tokens, MIME validation, finalization, public retrieval, and deletion are exercised honestly.

Cleanup deletes only prefixed products, variants, brands, categories, image upload rows, image rows, and related Storage objects belonging to prefixed products. It respects foreign-key ordering and does not target non-E2E data.

## Phase 6 Storefront

Unit coverage includes public catalogue filter parsing, bounded page sizes, WhatsApp URL encoding, first-touch attribution, and the client cart boundary.

Public product flow tests require an `ACTIVE` product with a real finalized product image and at least one active positive-price variant. The Phase 5 seed does not fabricate image records; finalize an image through the normal OWNER/ADMIN upload UI before marking live storefront product E2E as passed.

The cart is Phase 6 discovery state only. It stores variant snapshots and first-touch attribution in first-party storage, but checkout and order creation remain later operational phases and must revalidate server-side.

SEO checks should cover canonical URLs, hidden-product not-found behaviour, Product JSON-LD, sitemap, robots, and absence of staff-only fields in rendered HTML.

## Phase 6.5 Corrections

Unit and integration coverage should include:

- public catalogue default page size 8 and maximum page size 32;
- at least 100 mocked or seeded active products proving only the requested page is returned/rendered;
- filter/search/sort URL preservation and page reset when filters change;
- `Effacer les filtres` resets every catalogue filter, controlled desktop field, mobile sheet draft field, active chip, sort value, page value, and the URL to `/catalogue`;
- individual active-filter chip removal removes only that filter, preserves the others, and resets page to 1;
- invalid public URL filters are normalized with `safeParse` and must not throw Zod errors into the page;
- admin search handles names, brands, SKUs, accented text, apostrophes, `%`, comma, and no-result queries without rendering raw Supabase errors;
- admin availability labels for draft, archived, no variants, inactive variants, uninitialized inventory, initialized zero quantity, low stock, and in-stock;
- admin variant lists render a wide table with internal horizontal scroll and a narrow-container/mobile card fallback with equivalent critical values;
- publication readiness separates image, description, active-variant, and valid-price blockers; image plus inactive-only variants remains non-publishable;
- initial stock operations create inventory transactions and deny unauthorized roles;
- OWNER/ADMIN content edit permission and unauthorized-role denial;
- structured content validation limits for repeatable items;
- public Contact and Delivery pages hiding absent optional fields;
- cart `Continuer mes achats` target `/catalogue`;
- storefront header presents exactly one cart action per navigation context;
- home fragrance-family links use `fragranceFamily`, not `categorySlug`;
- catalogue cards do not render Product JSON-LD script tags; Product JSON-LD remains on active product detail pages;
- absence of public implementation-phase wording;
- WhatsApp cart message encoding and no inventory reservation/decrement.

## Phase 7 Cart Hardening

Cart tests should cover:

- persisted cart schema version `2`;
- local storage key `parfum-ci:cart`;
- intent-only persistence with product ID, variant ID, quantity, optional validated attribution, and timestamps;
- migration from legacy snapshot carts when product IDs are available;
- corrupted, unsupported, oversized, or prototype-pollution-shaped payload reset;
- duplicate variant merge and separate lines for different variants;
- authoritative reconciliation through `/api/cart/reconcile`;
- hidden-product and hidden-variant generic unavailable responses;
- stock-not-configured versus out-of-stock labels;
- integer XOF line totals and subtotal;
- WhatsApp message generation from reconciled data only;
- validation failure preserving local intent;
- drawer open validation, `/panier` validation, and `Voir le panier` navigation closing the drawer, overlay, focus trap and scroll lock without changing cart contents;
- localStorage write failure fallback;
- cross-tab update handling through storage events.

Post-Phase-7 UI regression tests also cover the admin content editor controlled-field lifecycle: initial values render from server content, edits update controlled draft state, successful saves keep the saved value visible and clear dirty state, failed saves preserve input, section switches reset intentionally, dirty forms are not overwritten by external prop refreshes, and console-error spies fail on Base UI changed-`defaultValue` FieldControl warnings.

Playwright content-management tests require staff credentials from ignored environment variables and a migrated Supabase project with `store_content` applied. If those are unavailable, mark live persistence and browser content-edit tests `NOT VERIFIED`.

## Phase 8 Guest Order Transactions

Unit tests cover the strict `/api/orders` request contract, unexpected field rejection, honeypot rejection, phone and WhatsApp normalization, email normalization, duplicate variant-line merging, quantity and line-count bounds, stable request fingerprinting, rate-limit response mapping, safe success responses, safe expected error responses, and suppression of raw database diagnostics. Phone tests must prove `+225XXXXXXXXXX`, `00225XXXXXXXXXX`, `225XXXXXXXXXX`, accepted local values, spaces, hyphens, and parentheses all converge to `+225XXXXXXXXXX`, while repeated country codes, unsupported country prefixes, letters, empty required values, and invalid lengths return `ORDER_INVALID_PHONE`.

After applying the Phase 8 migration to an isolated local or staging Supabase database, run:

```bash
psql "$DATABASE_URL" -f supabase/tests/phase8_guest_order_transaction.sql
```

That SQL test verifies successful order creation, authoritative integer totals, customer normalized-phone matching, immutable item snapshots, reservation without stock decrement, `RESERVED` inventory ledger rows, initial status history, sanitized audit records, pending notification intents, idempotent replay, conflicting idempotency payloads, insufficient-stock rollback, execute grants, and forced late rollback.

Final-unit and opposite-lock-order concurrency must be verified with two real simultaneous database sessions or an equivalent integration harness before Phase 8 can be approved. Sequential SQL tests are not sufficient to mark overselling prevention as passed.

## Phase 9 Checkout, Confirmation And Tracking

Unit/component tests cover checkout form validation, enabled delivery/payment methods, terms acceptance, fresh cart reconciliation before submit, exact Phase 8 request shape, idempotency-key stability for a checkout attempt, cart clearing only after success, confirmation storage without internal UUIDs, French status/payment labels, pending delivery-fee wording, and generic tracking responses.

Checkout success tests must verify the full post-commit lifecycle: parse the successful Phase 8 response envelope, require a non-empty `orderNumber`, store only the short-lived safe confirmation state, clear the cart after that proof is stored, and navigate with `router.replace('/commande/succes/[orderNumber]')`. The confirmation URL must never use the internal order UUID, and an empty-cart rerender after cart clearing must not interrupt confirmation navigation.

If an order was created but confirmation navigation fails, tests must assert the UI shows the inline success fallback `Votre commande a bien été enregistrée.`, displays the same order number, offers `Voir la confirmation` and `/suivi-commande`, settles the pending state, and does not resubmit the order or convert the committed order into a generic creation failure.

Phase 9 correction tests must also cover structured payment-method configuration: enabled and configured methods appear, disabled methods are hidden, unsupported values are ignored, merchant instructions come from settings, and checkout maps display labels back to the Phase 8 enum values. Payment settings mutation tests should verify OWNER/ADMIN authorization and unauthorized-role denial where server-action mocks are available.

Checkout reconciliation-loop tests must verify one validation after hydration, no repeat loop after readiness or authoritative-line updates, one new validation after a material cart intent change, one forced validation before submit, settled loading after success/failure, stale response protection, and an enabled submit button once readiness is `READY` and the form is valid.

WhatsApp intent tests must verify no intent on render, intent creation only after a customer click, authoritative prices/names from server reconciliation, duplicate-click deduplication, safe attribution storage, no Phase 8 order creation, no stock reservation/decrement, persistence-failure fallback, and encoded WhatsApp text without sensitive fields.

Phase 9 integration repair tests must verify payment settings persistence reaches the singleton `store_settings` update with only explicit payment columns, missing payment migration is surfaced as a typed safe failure, HTTP 400 from `/api/orders` does not clear cart or navigate, malformed 2xx order payloads are rejected, order errors remain visible after follow-up cart refresh, and optional WhatsApp intent endpoint failures do not block a freshly validated READY cart.

Route tests for `/api/orders/track` must verify bounded JSON, shared phone normalization, rate limiting, no-store responses, generic no-result shape for wrong phone/unknown order, and absence of customer IDs, cost prices, inventory data, audit data, notification payloads, or Supabase diagnostics.

Playwright Phase 9 tests require real ACTIVE products with initialized available inventory, applied Phase 8 migrations, and a non-production database. Do not mark successful checkout, cart clearing, duplicate submission, tracking security, wrong-phone privacy, or reservation behavior as passed without a real database-backed order.

## Phase 10 Inventory Management

Unit tests cover manual inventory request schemas, signed adjustment direction, idempotency fingerprints, URL filter normalization, French labels, CSV generation, formula-injection protection, and the Phase 10 migration contract.

After applying the Phase 10 migration to an isolated local or staging Supabase database, add real SQL/integration coverage for receive, initialize, damage, positive adjustment, negative adjustment, returned stock, reason requirement, reserved-invariant rejection, idempotent replay, conflicting idempotency payloads, ledger insertion, audit insertion, direct ledger update/delete denial, rollback, concurrent adjustments, and manual adjustment racing a Phase 8 reservation.

Sequential tests are not sufficient for Phase 10 approval. Concurrency must be verified with simultaneous database sessions or an equivalent harness proving no lost update and no final state where `reserved_quantity > stock_on_hand`.

Playwright inventory tests require role credentials and disposable inventory fixtures. Mark live operations, CSV downloads, and reservation-race scenarios `NOT VERIFIED` when those fixtures are unavailable.

## Phase 11 Order Management

Unit tests cover order URL filter normalization, French status/payment labels, transition maps, delivery-method-dependent next actions, request schemas, payment mappings, contact masking, idempotency fingerprints and the Phase 11 migration contract.

After applying the Phase 11 migration to an isolated local or staging Supabase database, run:

```bash
psql "$DATABASE_URL" -f supabase/tests/phase11_order_management.sql
```

Full Phase 11 approval requires real SQL or integration concurrency coverage for duplicate transitions, conflicting transitions, cancellation versus delivery, and delivery conversion racing a Phase 10 manual stock operation. Sequential tests are not sufficient.

Playwright Phase 11 tests require role credentials, disposable orders created through Phase 9, and initialized inventory fixtures. Mark live order transitions, payment verification, stock effects, notification intents and permission checks `NOT VERIFIED` when those fixtures are unavailable.

## Phase 12 Notifications

Unit tests cover notification provider selection, development redaction, Resend response mapping, admin filter normalization, template rendering, safe links, migration contracts, and processor claim/result calls.

## Phase 13 Messages

Run `psql "$DATABASE_URL" -f supabase/tests/phase13_messages.sql` after applying the Phase 13 migration. Unit tests cover contact-method validation, Côte d’Ivoire phone normalization, idempotency fingerprints, migration contracts, notification-template registration and XSS rendering boundaries. Playwright should cover contact-to-admin flow, manual social entry, permission denial and responsive layouts when staff credentials and fixtures exist.

Database tests for Phase 12 must use a real PostgreSQL/Supabase database for concurrent claiming, stale claim recovery, duplicate-send prevention, retry scheduling, cancellation, and low-stock crossing deduplication. Sequential mocks are not proof of concurrency safety.

Playwright Phase 12 tests should use the development provider unless a verified Resend sandbox recipient and API key are configured. Mark external Resend delivery `NOT VERIFIED` unless the provider accepts the message and inbox delivery is actually checked.

## Environment Diagnostics

Run:

```bash
pnpm env:check
```

The command reports only `SET` or `MISSING` for expected variables and never prints values.

## Required Check Before Completion

Run and report:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
```

Never report a command as passing unless it ran and exited successfully.

## Phase 14 Settings Verification

- Unit tests cover CI phone normalization, social URL safety, delivery-zone normalization/duplicates, payment configuration reuse and public projection redaction.
- `supabase/tests/phase14_settings.sql` covers service-role grants, revision conflicts, idempotent audit, exact/default/pickup/free-threshold quotes, authoritative order totals and historical snapshots. Run it only after applying the Phase 14 migration to a disposable database.
- Rerun `supabase/tests/phase8_guest_order_transaction.sql`; it explicitly configures a zero default fee so its historical subtotal assertions remain deterministic under the Phase 14 trigger.
- Browser acceptance must test two simultaneous settings sessions, stored order totals before/after a zone edit, direct order API rejection while order acceptance is off, and maintenance exemptions for admin/auth/cron/API.
- A legitimate zero delivery fee is not a pending fee after Phase 14. Assertions must inspect stored `delivery_fee_xof`, `total_xof` and `delivery_rule_snapshot`.

## Phase 15 Dashboard Verification

- Unit tests cover range validation, fixed business-local boundaries, percentage zero handling, role DTO stripping, accessible range links, chart table equivalents, deep links and restricted-role rendering.
- After applying `20260814090000_phase15_admin_dashboard.sql`, run `psql "$DATABASE_URL" -f supabase/tests/phase15_dashboard.sql` against a disposable database. The rollback-only test covers first-PAID-event revenue, duplicate PAID history, refund semantics, midnight inclusion, daily buckets, source grouping, SOLD snapshots, Phase 10 availability, database role projection, inactive staff and RPC grants.
- Use fixed timestamps around the lower bound and business midnight. Never rely on the test host timezone.
- Playwright requires Phase 15 migration, staff credentials for all five roles and disposable order/payment/inventory/message/notification fixtures. Check 7/30/90-day URLs, every deep link, operational refresh and widths 1440, 1024, 820, 640 and 390 pixels.
- Tiny seed data is not performance proof. Review `EXPLAIN (ANALYZE, BUFFERS)` against representative staging volume before claiming query-performance approval.

## Phase 16 Hardening Verification

- `tests/unit/phase16-hardening.test.ts` covers bounded streaming JSON, media-type rejection, security-header policies, strict catalogue UUID input and the migration least-privilege contract.
- `tests/unit/phase16-accessibility.test.tsx` covers contact-form labels, validation summary, first-error focus and inert customer markup. `tests/unit/phase16-cron.test.ts` covers missing/invalid/valid cron authorization and sanitized processor failure.
- `tests/e2e/phase16-hardening.spec.ts` runs on desktop Chromium and Pixel 7. It checks representative public/admin pages for one `h1`, serious/critical axe violations, defensive response headers, horizontal overflow, contact error focus and cart-drawer focus/scroll cleanup.
- `tests/e2e/phase11-order-management.spec.ts` includes real simultaneous final-unit order creation, notification claiming, conflicting transitions, cancellation versus delivery and inventory-versus-delivery races. Sequential requests are not accepted as race proof.
- After applying Phase 16 to a disposable database, run `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/phase16_security_hardening.sql`. It verifies grants, unauthorized retry, atomic state/audit changes and duplicate retry rejection.
- Run `supabase/tests/phase16_query_plans.sql` only with representative data when deciding on indexes. Sequential scans on tiny fixture tables are not performance defects by themselves.
- External Resend inbox delivery, production WAF/distributed rate limiting, password-leak protection and production-volume query plans require deployment-environment verification and remain `NOT VERIFIED` locally.
