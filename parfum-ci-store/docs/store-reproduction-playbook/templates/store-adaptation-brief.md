# Store Adaptation Brief Template

Complete this document with the business owner before asking an assistant to implement a derivative.

Use `UNKNOWN` instead of guessing. Mark decisions that require legal/accounting/provider approval as `NOT VERIFIED`.

## A. Project identity

- Working project name:
- Legal/operator name:
- Repository owner:
- Intended source-code license:
- Source baseline commit:
- New repository URL or path:
- Intended launch date:
- Decision owners:

## B. Market and localization

- Country/region:
- Primary language:
- Additional languages:
- Business timezone:
- Currency:
- Money stored as integer minor/whole units:
- Telephone normalization policy:
- Address structure:
- Tax display requirements:
- Canonical domain:

## C. Business model fit

- Single merchant or multiple merchants:
- Physical goods, digital goods, services, rentals or mixed:
- Whole-unit or fractional quantity:
- Stocked, made-to-order, preorder or drop-shipped:
- Does inventory require warehouse, batch, lot, expiry or serial tracking:
- Does fulfilment require time slots, scheduling or dispatch:
- Does the business need customer accounts:
- Why the Parfum CI foundation is suitable:
- Known mismatches:

Any answer involving multiple merchants, fractional stock, scheduling, recurring billing, batch/expiry/serial tracking or required customer identity triggers a design review before reuse.

## D. Catalogue contract

### Product-level fields

- Brand required:
- Category hierarchy:
- Product name:
- Slug policy:
- Short description:
- Full description:
- Main product attributes:
- Search/filter attributes:
- Publication lifecycle:
- Required legal/safety content:

### Variant-level fields

- Variant dimensions:
- SKU policy:
- Variant display label:
- Price field and constraints:
- Compare-at price:
- Cost price access:
- Inventory unit:
- Variant-specific images:
- Barcode/serial/lot/expiry needs:
- Low-stock policy:

### Mapping from perfume fields

| Current field      | New field/action | Reason | Migration approach | Snapshot change |
| ------------------ | ---------------- | ------ | ------------------ | --------------- |
| `fragrance_family` |                  |        |                    |                 |
| `target_audience`  |                  |        |                    |                 |
| `size_ml`          |                  |        |                    |                 |
| `concentration`    |                  |        |                    |                 |

## E. Cart and checkout

- Guest checkout retained:
- Maximum cart lines:
- Maximum quantity per line:
- Authoritative reconciliation behavior:
- Required customer fields:
- Optional customer fields:
- Terms acceptance requirements:
- Policy version snapshot required:
- WhatsApp policy:
- Order source/channel values:

## F. Payment

- Enabled launch methods:
- Which methods require manual verification:
- Merchant number/beneficiary source:
- Reference requirements:
- COD behavior:
- Pay-in-store behavior:
- Refund handling:
- Future hosted provider:
- Accounting/legal approval:

Never include PIN, OTP, CVV, card credentials or provider secrets in database-managed public instructions.

## G. Delivery and fulfilment

- Delivery methods:
- Pickup methods/locations:
- Zone matching fields:
- Default fee:
- Free-delivery policy:
- Estimated delivery fields:
- Unsupported-area behavior:
- Fulfilment statuses:
- Definition of delivered/sold:
- Cancellation/release rules:
- Return/restock rules:

## H. Inventory

- Stock-on-hand meaning:
- Reservation timing:
- Sold timing:
- Receiving adjustment:
- Damage/loss adjustment:
- Return/restock adjustment:
- Concurrency risk:
- Multi-location need:
- Ledger retention:

## I. Roles and permissions

| Capability           | Owner | Admin | Orders | Inventory | Support | Additional role |
| -------------------- | ----- | ----- | ------ | --------- | ------- | --------------- |
| Catalogue write      |       |       |        |           |         |                 |
| Inventory write      |       |       |        |           |         |                 |
| Order transitions    |       |       |        |           |         |                 |
| Payment verification |       |       |        |           |         |                 |
| Customer messages    |       |       |        |           |         |                 |
| Settings write       |       |       |        |           |         |                 |
| Revenue analytics    |       |       |        |           |         |                 |

## J. Communications

- Notification provider:
- Sender domain:
- Admin recipient:
- Customer events:
- Staff events:
- Support sources:
- Message retention:
- Escalation path:

## K. Content, brand and accessibility

- Brand palette tokens:
- Logo ownership/source:
- Product image ownership/source:
- Tone of voice:
- Public pages:
- Dark/light mode:
- Required accessibility languages/standards:
- No-go colors/visual conventions:

## L. Legal and privacy

- Publisher identity complete:
- Registration/tax identifiers:
- Sales terms approved:
- Returns/refunds approved:
- Privacy notice approved:
- Data controller/contact:
- Retention schedule:
- Data processors:
- International transfer review:
- Asset and product-copy rights:
- Required regulated-product warnings:

## M. Infrastructure isolation

- New Supabase project reference:
- New production project hard-denied from destructive E2E:
- Local/staging destructive target:
- New Vercel project:
- New Resend/SMTP setup:
- New cron secret/scheduler:
- Storage bucket policy:
- Backup method:
- Restore test owner/date:
- Production staff cleanup:

## N. Acceptance evidence

For each item record `PASS`, `FAIL` or `NOT VERIFIED` with a link or command result:

- environment isolation:
- migration alignment:
- catalogue schema:
- public projection:
- cart reconciliation:
- authoritative order creation:
- stock reservation concurrency:
- cancellation release:
- delivered/sold conversion:
- each enabled payment method:
- delivery quote/stored fee:
- tracking privacy:
- messages/notifications:
- role permissions:
- legal pages:
- mobile/accessibility:
- production build:
- deployed smoke:
- backup/restore:

## O. Explicit exclusions

List every feature deliberately excluded from the derivative MVP. Examples:

- customer accounts;
- automated gateway;
- multi-warehouse;
- loyalty points;
- subscriptions;
- marketplace sellers;
- batch/expiry/serial tracking;
- returns automation;
- accounting integration.
