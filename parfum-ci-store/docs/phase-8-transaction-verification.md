# Phase 8 Transaction Verification

Do not use production customer data. Do not send email, SMS, WhatsApp, payment requests, or external HTTP calls during Phase 8 verification.

Phase 8 adds a server-side guest-order engine only. It does not add checkout UI, order management UI, payment verification, shipment workflow, reservation expiry, or notification delivery.

Phase 10 inventory adjustments must remain compatible with this reservation model: order creation increments `reserved_quantity` and writes `RESERVED` ledger rows while manual inventory operations may change only `stock_on_hand` and must reject any result where reserved stock would exceed physical stock.

## Request Contract

`POST /api/orders` accepts JSON only, with a 20 KB body limit. Required fields are `idempotencyKey`, customer `fullName`, `phone`, `city`, `commune`, `deliveryMethod`, `paymentMethod`, and cart `lines` containing only `productId`, `variantId`, and `quantity`. Country is always `CI`.

The route rejects unexpected fields, control characters, empty required strings, more than 20 distinct lines, quantities outside `1..20`, invalid UUIDs, invalid phone values, and filled honeypot values. Client product names, SKU, images, prices, stock, totals, customer IDs, statuses, and payment statuses are ignored.

## Customer Normalization

Phone and optional WhatsApp numbers are normalized to `+225XXXXXXXXXX`. Spaces, hyphens, dots, and parentheses are accepted. Ambiguous length or unsupported characters are rejected. Customer records are matched by `customers.normalized_phone`; existing customer email/WhatsApp may be filled from new submitted values, but old order snapshots remain immutable.

## Transaction Engine

Private function: `app_private.create_guest_order(request jsonb)`.

Service-role wrapper: `public.create_guest_order_server(request jsonb)`.

`app_private` is not exposed by Supabase REST, so the public wrapper exists only for the server-secret client. Execute is revoked from `PUBLIC`, `anon`, and `authenticated`, and granted to `service_role`.

Transaction sequence:

1. Validate idempotency key and request fingerprint.
2. Take an advisory transaction lock for the idempotency key.
3. Insert or validate `app_private.guest_order_idempotency`.
4. Normalize and deduplicate submitted lines in SQL.
5. Lock affected product and variant rows in sorted variant-ID order with `FOR UPDATE`.
6. Revalidate product ACTIVE/publication requirements, variant active state, price, initialized inventory, and available stock.
7. Match or create customer by normalized phone.
8. Generate `CMD-YYYY-XXXXXX` order number.
9. Insert order and immutable order-item snapshots.
10. Increment `reserved_quantity`; never decrement `stock_on_hand`.
11. Insert `RESERVED` inventory transactions with positive `quantity_delta`.
12. Insert initial status history.
13. Insert sanitized `ORDER_CREATED` audit.
14. Insert pending notification intents.
15. Mark idempotency completed and return safe confirmation.

## Status And Totals

Initial order status is `PENDING_CONFIRMATION`. `CASH_ON_DELIVERY` and `PAY_IN_STORE` start as `UNPAID`; manual Mobile Money and bank transfer start as `PENDING`.

All amounts are integer XOF. `delivery_fee_xof` is `0` in Phase 8 because the current schema has a non-null fee and delivery fees are manually confirmed later. `total_xof = subtotal_xof`.

## Error Codes

Public errors are typed and safe: `ORDER_INVALID_REQUEST`, `ORDER_INVALID_PHONE`, `ORDER_EMPTY_CART`, `ORDER_TOO_MANY_LINES`, `ORDER_ITEM_UNAVAILABLE`, `ORDER_INSUFFICIENT_STOCK`, `ORDER_INVENTORY_NOT_CONFIGURED`, `ORDER_IDEMPOTENCY_CONFLICT`, `ORDER_RATE_LIMITED`, and `ORDER_CREATION_FAILED`.

Responses must not include SQLSTATE, SQL, table names, Supabase details/hints, stack traces, unpublished product names, stock internals, cost prices, notification IDs, audit IDs, or idempotency rows.

## Rate Limit

The Phase 8 route uses a narrow checkout rate-limit interface with a development in-memory adapter keyed by request context and normalized phone. This is process-local and must be replaced by a durable adapter for horizontally scaled production. CAPTCHA or Turnstile remains optional hardening, not an MVP requirement.

## SQL Verification

After applying migrations to a local or staging database, run:

```bash
psql "$DATABASE_URL" -f supabase/tests/phase8_guest_order_transaction.sql
```

For production review, apply migrations manually:

```bash
pnpm exec supabase db push
pnpm exec supabase gen types typescript --linked > src/types/database.types.ts
```

Do not run these commands automatically against the linked remote project.

## Manual Checklist

## Valid Order Transaction

Expected: One valid request creates exactly one order, customer match/create, item snapshots, reservation, inventory transaction, status history, audit row, and notification intents.
Actual:
PASS/FAIL:

## Correct Customer Snapshot

Expected: Order stores submitted customer values independently of later customer-record updates.
Actual:
PASS/FAIL:

## Existing Customer Match

Expected: Reusing normalized phone matches the existing customer and does not rewrite prior order snapshots.
Actual:
PASS/FAIL:

## Authoritative Price

Expected: Browser-supplied prices are ignored; order items use current database `price_xof`.
Actual:
PASS/FAIL:

## Order Number

Expected: Order number uses `CMD-YYYY-XXXXXX`, is unique, and is not the primary key.
Actual:
PASS/FAIL:

## Initial Order Status

Expected: Initial status is `PENDING_CONFIRMATION`.
Actual:
PASS/FAIL:

## Initial Payment Status

Expected: COD/pay-in-store -> `UNPAID`; manual Mobile Money/bank transfer -> `PENDING`.
Actual:
PASS/FAIL:

## Reservation Update

Expected: `reserved_quantity` increases by submitted quantity.
Actual:
PASS/FAIL:

## Available Stock Calculation

Expected: Available stock remains `stock_on_hand - reserved_quantity`.
Actual:
PASS/FAIL:

## Inventory Transaction

Expected: Each line has one `RESERVED` inventory transaction with stock unchanged and reserved snapshot updated.
Actual:
PASS/FAIL:

## Order History

Expected: Initial `order_status_history` row exists with no staff actor.
Actual:
PASS/FAIL:

## Audit Record

Expected: `ORDER_CREATED` audit metadata is bounded and excludes full addresses/request bodies.
Actual:
PASS/FAIL:

## Admin Notification Intent

Expected: Pending admin in-app and email notification intents are created, not sent.
Actual:
PASS/FAIL:

## Conditional Customer Email Intent

Expected: Customer email intent is created only when customer email is supplied.
Actual:
PASS/FAIL:

## Idempotent Replay

Expected: Exact replay returns the original order and does not reserve stock twice.
Actual:
PASS/FAIL:

## Conflicting Idempotency Key

Expected: Same key with different fingerprint returns conflict and does not mutate order/inventory state.
Actual:
PASS/FAIL:

## Insufficient Stock

Expected: Transaction fails safely with no partial records.
Actual:
PASS/FAIL:

## Uninitialized Stock

Expected: Transaction fails with `ORDER_INVENTORY_NOT_CONFIGURED`.
Actual:
PASS/FAIL:

## Inactive Variant

Expected: Transaction fails with a generic unavailable item response.
Actual:
PASS/FAIL:

## Archived Product

Expected: Transaction fails without leaking hidden product details.
Actual:
PASS/FAIL:

## Final-Unit Concurrency

Expected: Two simultaneous requests for the last unit produce exactly one success, one insufficient-stock result, one order, one order item, one reservation, and one `RESERVED` ledger row.
Actual:
PASS/FAIL:

## Opposite-Lock-Order Concurrency

Expected: Two concurrent carts containing the same variants in opposite order do not deadlock or oversell.
Actual:
PASS/FAIL:

## Forced Rollback

Expected: Test-only temp-table rollback leaves no customer, order, item, reservation, ledger, history, audit, notification, or completed idempotency state.
Actual:
PASS/FAIL:

## Direct Anonymous Function Execution Denied

Expected: `anon` cannot execute `public.create_guest_order_server(jsonb)`.
Actual:
PASS/FAIL:

## Direct Anonymous Table Writes Denied

Expected: `anon` cannot directly insert customers, orders, order items, inventory transactions, notifications, or audit logs.
Actual:
PASS/FAIL:

## Safe Response Fields

Expected: Response contains only confirmation fields and excludes customer ID, idempotency internals, inventory IDs, audit IDs, notification IDs, cost price, and stock internals.
Actual:
PASS/FAIL:

## No External Notification Delivery

Expected: Notifications remain pending durable intents only.
Actual:
PASS/FAIL:

## No Order UI

Expected: No checkout page, submit-order UI, order-confirmation page, or WhatsApp-to-order conversion is added in Phase 8.
Actual:
PASS/FAIL:
