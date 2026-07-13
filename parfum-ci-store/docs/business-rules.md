# Business Rules

## Catalogue

- Public catalogue shows active brands, active categories, and published products only.
- Product variants control purchasability. A product without an active in-stock variant cannot be purchased.
- Prices are displayed in XOF.
- Product imagery must include meaningful alt text.

## Cart and Checkout

- Guest checkout is supported for the MVP.
- Customer account creation is not required.
- Checkout input must be validated with Zod server-side.
- Order totals are recalculated server-side from current product variant prices.
- The client must not be trusted for price, stock, payment status, or order status.

## Inventory

- No direct stock mutation from UI code.
- Stock changes use inventory ledger entries with reason, actor, and related order when applicable.
- Overselling must be prevented inside the order transaction.
- Manual adjustments require an audit log.

## Orders

- Order statuses: `draft`, `pending_payment`, `confirmed`, `preparing`, `ready`, `out_for_delivery`, `delivered`, `cancelled`.
- Payment statuses: `unpaid`, `pending_verification`, `paid`, `failed`, `refunded`, `cancelled`.
- Invalid transitions must be rejected server-side and tested.
- Customers see only redacted tracking information.

## Payments

- MVP methods are manual Mobile Money and cash on delivery.
- No Stripe in the MVP.
- Never store card details, Mobile Money PINs, OTPs, or CVVs.
- Manual Mobile Money verification is performed by an authenticated admin.
- Payment logic must use a provider interface to allow a future gateway.

## Notifications

- Transactional emails use Resend.
- Notification payloads must not include secrets or unnecessary full addresses.
- Failed notification delivery should be retryable and visible to admins.
