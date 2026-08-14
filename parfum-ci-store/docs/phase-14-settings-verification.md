# Phase 14 Settings Verification

Migration `20260813090000` is applied to the linked project. The SQL suites below run inside `BEGIN`/`ROLLBACK` and retain no fixtures or settings changes.

```bash
pnpm exec supabase db query --linked --file supabase/tests/phase14_settings.sql
pnpm exec supabase db query --linked --file supabase/tests/phase8_guest_order_transaction.sql
```

## Identity Settings

Expected: OWNER/ADMIN can save store/legal name, HTTPS logo policy and addresses; public header/footer update.
Actual: NOT VERIFIED
PASS/FAIL: NOT VERIFIED

## Contact

Expected: support/public email, telephone, WhatsApp, addresses, hours and response guidance come from the structured safe projection.
Actual: NOT VERIFIED
PASS/FAIL: NOT VERIFIED

## Phone Normalization

Expected: accepted CI forms save as `+225XXXXXXXXXX`; invalid values fail without truncation.
Actual: Unit schema coverage only.
PASS/FAIL: PASS

## WhatsApp

Expected: header/footer/contact/cart/product/confirmation actions use only the configured normalized number; missing number hides actions.
Actual: NOT VERIFIED
PASS/FAIL: NOT VERIFIED

## Social Links

Expected: HTTPS supported hosts render with `noopener noreferrer`; empty/unsafe links are hidden.
Actual: Unit projection/schema coverage only.
PASS/FAIL: PASS

## Payment Configuration

Expected: Phase 9 enum/config storage is reused from `/admin/parametres`; incomplete enabled methods cannot save.
Actual: Unit contract coverage plus linked-database persistence and enabled-only public projection coverage.
PASS/FAIL: PASS

## Payment Instructions

Expected: checkout, confirmation, tracking and customer notification rendering use the typed checkout settings source and never request PIN/OTP.
Actual: Unit integration coverage passed; a customer-facing browser flow remains NOT VERIFIED.
PASS/FAIL: NOT VERIFIED

## Delivery Methods

Expected: only HOME_DELIVERY/PICKUP configured methods appear with customer labels.
Actual: Linked-database method configuration and quote behavior passed; customer rendering remains NOT VERIFIED.
PASS/FAIL: NOT VERIFIED

## Default Fee

Expected: unmatched enabled home delivery uses the integer default; null default returns unavailable.
Actual: Linked-database exact/default/null-default quote assertions passed.
PASS/FAIL: PASS

## Zones

Expected: normalized exact active match wins; active normalized duplicates fail; disabled zones do not match.
Actual: Linked-database normalization, disabled fallback, active uniqueness and non-negative constraints passed.
PASS/FAIL: PASS

## Free-Delivery Threshold

Expected: home-delivery subtotal at/above threshold receives zero fee; pickup is excluded.
Actual: Linked-database below/exact threshold and pickup-exclusion assertions passed.
PASS/FAIL: PASS

## Authoritative Checkout Fee

Expected: checkout calls `/api/storefront/delivery-quote`; no client formula determines the fee.
Actual: The shared database quote and order trigger passed; browser/API quote-to-submit equality remains NOT VERIFIED.
PASS/FAIL: NOT VERIFIED

## Stored Order Fee

Expected: Phase 8 order insert trigger recalculates fee, stores it and includes it in total.
Actual: Real Phase 8 order insert stored the recalculated fee and authoritative total in the linked database transaction.
PASS/FAIL: PASS

## Historical Order Snapshot

Expected: changing/disabling a zone leaves old fee/total/snapshot unchanged and affects only new orders.
Actual: Linked-database test changed the matched zone fee, proved the old order unchanged, and proved a new order used the new fee.
PASS/FAIL: PASS

## SEO

Expected: global title/description/OG/canonical defaults update while product metadata retains product fields.
Actual: NOT VERIFIED
PASS/FAIL: NOT VERIFIED

## Notification Email

Expected: future intents snapshot database notification recipient; existing intents retain their recipient; secrets are absent from UI.
Actual: Linked Phase 8 regression proved the configured recipient was snapshotted into the new admin notification intent. Browser secret exclusion remains NOT VERIFIED.
PASS/FAIL: NOT VERIFIED

## Order Acceptance

Expected: catalogue/cart remain available, checkout explains pause and direct order insert/API is rejected; WhatsApp remains available.
Actual: Linked-database direct order rejection passed; storefront, cart and WhatsApp behavior remain NOT VERIFIED.
PASS/FAIL: NOT VERIFIED

## Maintenance Mode

Expected: public `(store)` routes show maintenance; admin/auth/API/cron remain reachable; order inserts fail.
Actual: Linked-database order rejection passed; route allowlist behavior remains NOT VERIFIED.
PASS/FAIL: NOT VERIFIED

## Public/Private Projections

Expected: public RPC excludes notification routing, revision, audit and secrets; direct anonymous row select is denied.
Actual: Linked-database public projection and direct anon table/function privilege assertions passed.
PASS/FAIL: PASS

## Permissions

Expected: OWNER/ADMIN update; ORDER_MANAGER, CUSTOMER_SUPPORT, INVENTORY_MANAGER, inactive and anonymous actors fail direct mutation.
Actual: Linked-database OWNER and ADMIN updates passed; ORDER_MANAGER, CUSTOMER_SUPPORT, INVENTORY_MANAGER, inactive ADMIN and anonymous access were denied.
PASS/FAIL: PASS

## Audit

Expected: one bounded `STORE_SETTINGS_UPDATED` event per successful idempotent mutation; no full contacts/instructions/secrets.
Actual: Linked-database idempotent replay produced one bounded audit event without submitted values.
PASS/FAIL: PASS

## Stale Update Conflict

Expected: session A saves; stale session B receives `SETTINGS_STALE_VERSION` and cannot overwrite.
Actual: Linked-database stale revision rejection passed transactionally. A true two-client race remains NOT VERIFIED because one Supabase CLI client stalled during login initialization.
PASS/FAIL: NOT VERIFIED

## Responsive UI

Expected: desktop, narrow desktop, tablet and mobile have no page-level overflow; long URLs/instructions wrap.
Actual: NOT VERIFIED
PASS/FAIL: NOT VERIFIED

## Cache Revalidation

Expected: each section refreshes only its affected admin/public routes after persistence; cache failure does not misreport database rollback.
Actual: NOT VERIFIED
PASS/FAIL: NOT VERIFIED

## Verification Command Results — 2026-08-13

- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS.
- `pnpm test`: PASS — 46 files, 257 tests.
- Targeted Phase 14/payment/checkout/tracking/notification tests: PASS — 5 files, 37 tests.
- `pnpm build`: PASS — Next.js 16.2.10 production build, including `/admin/parametres` and `/api/storefront/delivery-quote`.
- `git diff --check`: PASS.
- `pnpm test:e2e`: FAIL — 23 passed, 1 skipped, 1 existing admin logout test timed out waiting for `/connexion`; the isolated retry failed identically. Phase 14 browser flows remain NOT VERIFIED.
- `pnpm exec supabase status`: NOT VERIFIED — the local Docker daemon is unavailable.
- `pnpm exec supabase migration list --linked`: PASS — migration `20260813090000` is present locally and remotely.
- `supabase/tests/phase14_settings.sql` through `supabase db query --linked`: PASS — rollback-only settings, payment, delivery, order snapshot, permission, projection and audit assertions.
- `supabase/tests/phase8_guest_order_transaction.sql` through `supabase db query --linked`: PASS — rollback-only transaction, idempotency, reservation, rollback, notification-recipient and Phase 14 trigger regression assertions.
- Linked Supabase security advisor with `--fail-on error`: PASS — no error-level finding. WARN findings include the two intentionally public safe-projection RPCs plus pre-existing inventory/auth configuration warnings.
- Linked Supabase performance advisor with `--fail-on error`: PASS — no error-level finding. Reported WARN findings are pre-existing RLS initialization/multiple-policy optimizations; no Phase 14 delivery-zone warning was reported.
- Real two-client settings race: NOT VERIFIED — the second CLI process stalled during login bootstrap. The successful side preserved the current notification email, incremented the revision once and wrote the expected bounded audit event.

## Closure — 2026-08-14

The project owner confirmed that the remaining Phase 14 browser/E2E acceptance was verified and Phase 14 is closed. The historical command results above are retained as the record of the earlier run and are not retroactively rewritten.
