# Phase 11 Order Management Verification

Use a non-production database with Phase 8, Phase 10 and Phase 11 migrations applied.

```bash
pnpm exec supabase db push
pnpm exec supabase gen types typescript --linked > src/types/database.types.ts
psql "$DATABASE_URL" -f supabase/tests/phase11_order_management.sql
```

## Order List
Expected: `/admin/commandes` shows bounded, server-side order search, filters, sorting, pagination, masked contact data and permitted actions.
Actual:
PASS/FAIL:

## Search
Expected: Search supports order number, customer name, normalized phone and email where authorized without raw database errors.
Actual:
PASS/FAIL:

## Filters
Expected: status, payment status, payment method, delivery method, source and date filters are URL-normalized with invalid optional values ignored.
Actual:
PASS/FAIL:

## Responsive Table/Cards
Expected: desktop uses a dense table; narrow desktop, tablet and mobile expose all critical data without body-level horizontal overflow.
Actual:
PASS/FAIL:

## Order Detail
Expected: `/admin/commandes/[id]` shows order identity, customer snapshot, item snapshots, totals, timeline, payment history, notification history, audit summary, inventory lifecycle and notes.
Actual:
PASS/FAIL:

## Valid Transitions
Expected: only valid next actions are shown and invalid transitions are rejected server-side.
Actual:
PASS/FAIL:

## Cancellation Release
Expected: cancellation releases reserved inventory exactly once, leaves `stock_on_hand` unchanged and writes `RELEASED` ledger rows.
Actual:
PASS/FAIL:

## Delivery Sale Conversion
Expected: delivery decrements both `stock_on_hand` and `reserved_quantity` exactly once and writes `SOLD` ledger rows.
Actual:
PASS/FAIL:

## Return Without Restock
Expected: `RETURNED` changes order lifecycle only and does not restore inventory automatically.
Actual:
PASS/FAIL:

## Payment Confirmation
Expected: payment status updates through the controlled function, writes `payment_transactions`, audit and notification intents.
Actual:
PASS/FAIL:

## Internal Notes
Expected: staff notes are append-only, actor-stamped and never visible to customer tracking.
Actual:
PASS/FAIL:

## Idempotency
Expected: repeated transition/payment keys return the original result and do not duplicate stock effects, history, audit or notifications.
Actual:
PASS/FAIL:

## Duplicate Transition
Expected: concurrent duplicate transition requests produce one transition, one history row, one audit row and one notification intent.
Actual:
PASS/FAIL:

## Conflicting Transition
Expected: concurrent conflicting transitions from the same state produce exactly one successful final state.
Actual:
PASS/FAIL:

## Cancellation/Delivery Race
Expected: cancellation and delivery cannot both apply `RELEASED` and `SOLD` to the same reservation.
Actual:
PASS/FAIL:

## Phase 10 Adjustment Race
Expected: delivery conversion racing a manual inventory adjustment preserves `reserved_quantity <= stock_on_hand`.
Actual:
PASS/FAIL:

## Notification Intents
Expected: transition/payment actions enqueue pending notification intents but do not send external messages.
Actual:
PASS/FAIL:

## Permissions
Expected: OWNER/ADMIN/ORDER_MANAGER can manage; CUSTOMER_SUPPORT can read/add notes only; INVENTORY_MANAGER cannot mutate orders.
Actual:
PASS/FAIL:

## Sensitive Data Masking
Expected: list views mask phone/email and broad queries exclude full addresses, notes, audit payloads, provider payloads and internal idempotency rows.
Actual:
PASS/FAIL:

## Cache Refresh
Expected: successful transitions refresh order views, inventory views, public availability and customer tracking timeline.
Actual:
PASS/FAIL:
