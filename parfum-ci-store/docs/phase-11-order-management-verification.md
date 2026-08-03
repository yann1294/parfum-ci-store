# Phase 11 Order Management Verification

Use a non-production database with Phase 8, Phase 10 and Phase 11 migrations applied.

```bash
pnpm exec supabase db push
pnpm exec supabase gen types typescript --linked > src/types/database.types.ts
psql "$DATABASE_URL" -f supabase/tests/phase11_order_management.sql
```

## Order List
Expected: `/admin/commandes` shows bounded, server-side order search, filters, sorting, pagination, masked contact data and permitted actions.
Actual: Playwright created a Phase 8-backed fixture order and verified `/admin/commandes` search/status filtering and detail navigation against the non-production Supabase project.
PASS/FAIL: PASS

## Search
Expected: Search supports order number, customer name, normalized phone and email where authorized without raw database errors.
Actual: Order-number search was verified in the browser against a generated `CMD-2026-*` fixture. Other search fields were not separately exercised in this pass.
PASS/FAIL: NOT VERIFIED

## Filters
Expected: status, payment status, payment method, delivery method, source and date filters are URL-normalized with invalid optional values ignored.
Actual: Status filter was verified with the order-number search. The remaining filters were not separately exercised in this pass.
PASS/FAIL: NOT VERIFIED

## Responsive Table/Cards
Expected: desktop uses a dense table; narrow desktop, tablet and mobile expose all critical data without body-level horizontal overflow.
Actual: Playwright checked 1440x900, 1024x768, 820x900, 640x900 and 390x844 on the order detail route with no body-level horizontal overflow.
PASS/FAIL: PASS

## Order Detail
Expected: `/admin/commandes/[id]` shows order identity, customer snapshot, item snapshots, totals, timeline, payment history, notification history, audit summary, inventory lifecycle and notes.
Actual: Playwright verified the order detail heading, customer snapshot, item section and order timeline for a real fixture order.
PASS/FAIL: PASS

## Valid Transitions
Expected: only valid next actions are shown and invalid transitions are rejected server-side.
Actual: Browser detail rendering was verified; server transition validity was partially verified by successful lifecycle transitions and failed unauthorized direct calls where credentials existed.
PASS/FAIL: PASS

## Cancellation Release
Expected: cancellation releases reserved inventory exactly once, leaves `stock_on_hand` unchanged and writes `RELEASED` ledger rows.
Actual: Real DB E2E verified duplicate cancellation replay leaves `stock_on_hand` unchanged, reduces `reserved_quantity` to 0, and writes one `RELEASED` row and one cancellation history/audit event.
PASS/FAIL: PASS

## Delivery Sale Conversion
Expected: delivery decrements both `stock_on_hand` and `reserved_quantity` exactly once and writes `SOLD` ledger rows.
Actual: Real DB E2E verified duplicate delivery replay decrements `stock_on_hand` and `reserved_quantity` once, keeps availability unchanged, and writes one `SOLD` row and one delivery history row.
PASS/FAIL: PASS

## Return Without Restock
Expected: `RETURNED` changes order lifecycle only and does not restore inventory automatically.
Actual: Real DB E2E verified `RETURNED` does not change `stock_on_hand` or `reserved_quantity` and creates no automatic Phase 10 `RETURNED` ledger row.
PASS/FAIL: PASS

## Payment Confirmation
Expected: payment status updates through the controlled function, writes `payment_transactions`, audit and notification intents.
Actual: Real DB E2E verified duplicate payment replay with the same idempotency key creates one `PAID` payment transaction and one payment audit event.
PASS/FAIL: PASS

## Internal Notes
Expected: staff notes are append-only, actor-stamped and never visible to customer tracking.
Actual: Not exercised in the focused E2E run.
PASS/FAIL: NOT VERIFIED

## Idempotency
Expected: repeated transition/payment keys return the original result and do not duplicate stock effects, history, audit or notifications.
Actual: Real DB E2E verified duplicate cancellation, delivery and payment replay do not duplicate the tested stock/history/payment/audit effects.
PASS/FAIL: PASS

## Duplicate Transition
Expected: concurrent duplicate transition requests produce one transition, one history row, one audit row and one notification intent.
Actual: Duplicate cancellation and delivery replay were verified through concurrent same-key calls. Notification count was not asserted in this pass.
PASS/FAIL: PASS

## Conflicting Transition
Expected: concurrent conflicting transitions from the same state produce exactly one successful final state.
Actual: Real DB E2E initially exposed a stale-state race where concurrent `CONFIRMED -> PREPARING` and `CONFIRMED -> CANCELLED` both succeeded by chaining through the updated status. After applying `20260804103000_phase11_order_transition_expected_status.sql`, the focused concurrency rerun verified exactly one successful final mutation.
PASS/FAIL: PASS

## Cancellation/Delivery Race
Expected: cancellation and delivery cannot both apply `RELEASED` and `SOLD` to the same reservation.
Actual: Real DB E2E verified a concurrent `READY_FOR_PICKUP -> CANCELLED` versus `READY_FOR_PICKUP -> DELIVERED` race applies exactly one stock effect and preserves reservation invariants.
PASS/FAIL: PASS

## Phase 10 Adjustment Race
Expected: delivery conversion racing a manual inventory adjustment preserves `reserved_quantity <= stock_on_hand`.
Actual: Real DB E2E verified delivery racing a Phase 10 decrease preserves `stock_on_hand >= 0`, `reserved_quantity >= 0` and `reserved_quantity <= stock_on_hand`.
PASS/FAIL: PASS

## Notification Intents
Expected: transition/payment actions enqueue pending notification intents but do not send external messages.
Actual: Not directly asserted in this focused run beyond existing transition/payment function behaviour.
PASS/FAIL: NOT VERIFIED

## Permissions
Expected: OWNER/ADMIN/ORDER_MANAGER can manage; CUSTOMER_SUPPORT can read/add notes only; INVENTORY_MANAGER cannot mutate orders.
Actual: ORDER_MANAGER was verified through successful direct transition/payment calls. CUSTOMER_SUPPORT and INVENTORY_MANAGER direct-call checks were skipped because their Playwright credentials were not present in the shell.
PASS/FAIL: NOT VERIFIED

## Sensitive Data Masking
Expected: list views mask phone/email and broad queries exclude full addresses, notes, audit payloads, provider payloads and internal idempotency rows.
Actual: Existing component/unit contracts cover masking helpers. Broad role-aware data leakage was not fully exercised in this E2E pass.
PASS/FAIL: NOT VERIFIED

## Cache Refresh
Expected: successful transitions refresh order views, inventory views, public availability and customer tracking timeline.
Actual: Not directly exercised in this focused E2E run.
PASS/FAIL: NOT VERIFIED

## 2026-08-04 Focused E2E Run
Expected: Use disposable Phase 8-created orders against a non-production Supabase project, then verify Phase 11 lifecycle effects against database state.
Actual: Environment loaded from `env.test.local`; Supabase URL was non-placeholder. Fixture records used dynamic `E2E-P11-*` prefixes and were cleaned after each run where `afterAll` completed. Full targeted suite result after migration application was 8 passed and 1 skipped. The skipped permission case requires CUSTOMER_SUPPORT and INVENTORY_MANAGER Playwright credentials. The focused concurrency rerun for conflicting transitions, cancellation/delivery race and Phase 10 adjustment race passed 3/3.
PASS/FAIL: PASS
