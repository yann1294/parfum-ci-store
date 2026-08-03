# Phase 10 Inventory Verification

Use a non-production database. Apply the Phase 10 migration manually, regenerate Supabase types, and use disposable inventory fixtures.

```bash
pnpm exec supabase db push
pnpm exec supabase gen types typescript --linked > src/types/database.types.ts
```

## Inventory List

Expected: `/admin/inventaire` shows product, variant, SKU, publication state, variant state, stock initialization, physical stock, reserved stock, calculated availability, threshold, inventory status, latest movement and action.
Actual:
PASS/FAIL:

## Search

Expected: Search by product, SKU, or brand filters server-side without loading the full inventory into the browser.
Actual:
PASS/FAIL:

## Filters

Expected: Active/inactive, initialized/uninitialized, inventory status, reserved-present, sort and page filters preserve URL state and invalid optional filters do not crash rendering.
Actual:
PASS/FAIL:

## Pagination

Expected: Inventory list and ledger use bounded server-side pagination.
Actual:
PASS/FAIL:

## Low-Stock Page

Expected: `/admin/inventaire/stock-faible` shows initialized variants with low or zero availability and keeps unconfigured stock separate.
Actual:
PASS/FAIL:

## Uninitialized Stock

Expected: Uninitialized variants show `Stock non configuré`, not `Rupture de stock`, and allow only the initialization operation.
Actual:
PASS/FAIL:

## Receive

Expected: `RECEIVED` accepts a positive quantity, increases `stock_on_hand`, preserves `reserved_quantity`, writes one ledger row and one audit row.
Actual:
PASS/FAIL:

## Damage

Expected: `DAMAGED` accepts a positive UI quantity, records a negative on-hand delta, requires a reason, and rejects results below reserved quantity.
Actual:
PASS/FAIL:

## Positive Adjustment

Expected: `ADJUSTMENT` with increase applies a positive delta and requires explicit confirmation and reason.
Actual:
PASS/FAIL:

## Negative Adjustment

Expected: `ADJUSTMENT` with decrease applies a negative delta and never makes `reserved_quantity > stock_on_hand`.
Actual:
PASS/FAIL:

## Return

Expected: `RETURNED` increases stock only after staff confirms the item is resellable and provides a reason.
Actual:
PASS/FAIL:

## Required Reasons

Expected: initialization, damage, adjustment and return reject blank reasons.
Actual:
PASS/FAIL:

## Reserved Invariant

Expected: A variant with `stock_on_hand = 10` and `reserved_quantity = 7` rejects any negative operation greater than 3.
Actual:
PASS/FAIL:

## Ledger Order

Expected: Ledger records are reverse chronological and immutable.
Actual:
PASS/FAIL:

## Ledger Immutability

Expected: staff cannot update or delete `inventory_transactions`; corrections require compensating `ADJUSTMENT` rows.
Actual:
PASS/FAIL:

## Actor Recording

Expected: Successful manual movements store the authenticated staff actor ID.
Actual:
PASS/FAIL:

## Audit Recording

Expected: Successful manual movements create a bounded `INVENTORY_ADJUSTED` audit event without secrets or unrestricted payloads.
Actual:
PASS/FAIL:

## Idempotency

Expected: Repeating the same idempotency key and payload returns the original result and does not apply stock twice. Same key with different payload returns conflict.
Actual:
PASS/FAIL:

## Concurrent Adjustments

Expected: simultaneous manual operations do not lose updates and final stock equals the ledger snapshots.
Actual:
PASS/FAIL:

## Reservation Race

Expected: an order reservation racing a manual negative operation cannot leave `reserved_quantity > stock_on_hand`.
Actual:
PASS/FAIL:

## CSV Current Inventory

Expected: CSV export is UTF-8, authorized, deterministic, contains safe operational columns, and excludes cost/customer data.
Actual:
PASS/FAIL:

## CSV Ledger

Expected: ledger CSV export includes timestamp, product, SKU, operation, deltas, before/after values, reason, safe reference and actor.
Actual:
PASS/FAIL:

## Formula-Injection Protection

Expected: CSV cells beginning with `=`, `+`, `-`, or `@` are escaped.
Actual:
PASS/FAIL:

## Responsive Table/Cards

Expected: wide desktop uses tables; narrow desktop, tablet and mobile keep all critical values accessible without page-level horizontal overflow.
Actual:
PASS/FAIL:

## Role Permissions

Expected: OWNER, ADMIN and INVENTORY_MANAGER can view and operate inventory. CUSTOMER_SUPPORT is denied. ORDER_MANAGER is read-only only if explicitly permitted by future business rules.
Actual:
PASS/FAIL:

## Public Availability Refresh

Expected: after stock changes, admin inventory, admin catalogue, public catalogue, product detail and cart reconciliation use fresh availability.
Actual:
PASS/FAIL:
