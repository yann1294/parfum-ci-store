# Business Rules

## Catalogue

- Public catalogue shows active brands, active categories, and published products only.
- Phase 6 public catalogue and product-detail pages read through the database public catalogue boundary and never through staff DTOs.
- Public product pages require `ACTIVE` status, at least one active positive-price variant, and at least one finalized approved image.
- Unknown, `DRAFT`, and `ARCHIVED` product slugs must produce the same public not-found behaviour.
- Product variants control purchasability. A product without an active in-stock variant cannot be purchased.
- Prices are displayed in XOF.
- Product imagery must include meaningful alt text.
- Product slugs are normalized, lowercase, collision-safe, and stable after name changes unless an authorized explicit slug update is requested.
- `DRAFT` products are not public or orderable.
- `ACTIVE` products require a non-empty name, non-empty description, at least one active variant with a positive selling price, and at least one validated approved image. Positive stock is not required for publication; an active product may legitimately be out of stock.
- `ARCHIVED` products are not public and cannot receive new images.
- Product image uploads use direct signed Supabase Storage uploads; 5 MB files must not pass through a Server Action or Vercel Function.
- Image object paths are generated server-side. Browser input must never supply bucket names, folders, raw storage paths, or original filenames as stored object names.
- Image finalization validates declared size and MIME type, checks actual magic bytes server-side, rejects active content signatures, then inserts `product_images`.
- Image replacement creates a new validated object and database record before attempting old-object cleanup. Storage/database operations are compensated, not cross-service atomic.
- Phase 5 admin catalogue UI creates products as `DRAFT`.
- `OWNER` and `ADMIN` may create/edit brands, categories, products, variants, images, featured state, slugs, activation, and archival.
- `INVENTORY_MANAGER` has read-only catalogue access in Phase 5. Stock adjustments remain in the inventory module.
- `Public cible` represents the product target audience: Homme, Femme, Unisexe, or Enfant.
- `Famille olfactive` represents the perfume scent family, for example Florale, Boisée, Ambrée, Hespéridée, Aromatique, Fougère, Chyprée, Gourmande, Cuirée, or Aquatique. It is not a catalogue category.
- Brand and category administration uses server-side search, deterministic sorting, and pagination. Default page size is 20 and the maximum accepted page size is 100.
- Product variant administration uses server-side search and pagination. Default page size is 10 and the maximum accepted page size is 100.
- The catalogue module displays physical stock, reserved stock, calculated available stock, and low-stock threshold as read-only inventory context.
- Do not render broken inventory links. Link to `Gérer le stock` only when a real authorized inventory route exists for the variant.
- Public availability is displayed as `Stock non configuré`, `En stock`, `Stock faible`, or `Rupture de stock`; physical and reserved stock quantities are not displayed publicly.
- Admin variant rows display publication/variant state separately from inventory state. Variant state is `Active` or `Inactive`; inventory state is derived independently as `Stock non configuré`, `En stock`, `Stock faible`, or `Rupture de stock`.
- Admin catalogue availability labels are derived from variants and inventory. `DRAFT` shows `Brouillon`; `ARCHIVED` shows `Archivé`; ACTIVE products with no variants show `Stock non configuré`; inactive-only variants show `Aucune variante active`; active variants with no initialized inventory show `Stock non configuré`; initialized active variants with zero available quantity show `Rupture de stock`; available quantity at or below threshold shows `Stock faible`; otherwise `En stock`.
- Public catalogue pagination is server-side. Default page size is 8 and the accepted maximum is 32. Filters, search, sort, and page state are represented in the URL. Invalid optional public URL filters are ignored instead of crashing the page.
- Phase 6 cart is client-side product discovery state only. It does not create orders, process payments, or reserve inventory.

## Cart and Checkout

- Guest checkout is supported for the MVP.
- Customer account creation is not required.
- Checkout input must be validated with Zod server-side.
- Order totals are recalculated server-side from current product variant prices.
- The client must not be trusted for price, stock, payment status, or order status.
- Phase 8 order creation is all-or-nothing. If any line is hidden, inactive, uninitialized, out of stock, insufficient, mismatched, or invalid, no customer/order/item/reservation/ledger/history/audit/notification/idempotency completion may remain.
- Order creation reserves inventory by increasing `reserved_quantity`; it never decrements `stock_on_hand`. The inventory ledger uses `RESERVED` with a positive `quantity_delta` and before/after stock/reserved snapshots.
- Guest checkout idempotency keys are required. Exact replays return the original order; conflicting fingerprints are rejected and must not reserve stock twice.
- Customer records are matched by normalized Côte d'Ivoire phone. Accepted customer input may use `+225XXXXXXXXXX`, `00225XXXXXXXXXX`, `225XXXXXXXXXX`, or an accepted local 10-digit Côte d'Ivoire number, with spaces, hyphens, dots, and parentheses for readability. The canonical stored and matching form is always `+225XXXXXXXXXX`; repeated country codes, ambiguous lengths, unsupported country prefixes, and alphabetic characters are rejected. Orders snapshot submitted customer information so older orders remain immutable if the reusable customer record later changes.
- The Phase 6.5 cart WhatsApp CTA is a manual enquiry. It may include product names, variants, quantities, formatted line totals, subtotal, and canonical product URLs, but it must not claim an order is confirmed.
- Phase 7 cart persistence stores customer intent only: schema version, product ID, variant ID, requested quantity, optional validated first-touch attribution, and timestamps. Product names, images, prices, publication state, and availability are authoritative only after public server reconciliation.
- Cart lines are keyed by `variantId`. Adding the same variant merges quantities; adding a different variant of the same product creates a separate line.
- Unavailable cart lines are not silently removed. Hidden products, inactive or deleted variants, stock not configured, and out-of-stock variants remain visible as unavailable until the customer removes them.
- Cart ordering readiness is authoritative. WhatsApp ordering is disabled while validating, after validation failure, when unavailable lines remain, or when quantity adjustments are unresolved.
- Quantity requests are positive integers capped at the configured cart maximum. Server reconciliation may reduce the effective orderable quantity for totals, but the line remains visible with a correction notice.
- Cart reconciliation is fresh on cart open, `/panier`, add/update/remove, retry, WhatsApp ordering, and tab reactivation after the stale window. It does not poll continuously.
- Checkout lives at `/commande` and may submit only when the authoritative reconciled cart readiness is `READY`. It forces a fresh reconciliation immediately before `POST /api/orders`.
- Checkout submits only cart identifiers/quantities, customer fields, delivery method, payment method, validated attribution, honeypot, and an idempotency key. Product names, prices, SKUs, totals, stock, statuses, and customer IDs are never accepted from the browser.
- Checkout treats order creation as successful only when `POST /api/orders` returns a successful HTTP status and the body matches the Phase 8 confirmation contract. HTTP 400, typed order errors, network failures, and malformed 2xx bodies must preserve the cart and form and must not navigate to confirmation.
- The cart is cleared only after a confirmed Phase 8 success response. Recoverable failures preserve customer fields, cart contents, and the current checkout attempt key when the material request is unchanged.
- Confirmation details are not shown from an order number alone. Detailed `/commande/succes/[orderNumber]` rendering requires the short-lived browser confirmation state created by the successful checkout flow; otherwise the page shows a generic success/recovery state.
- Public order tracking requires both order number and the normalized phone number submitted with the order. Unknown orders and wrong phones use the same generic no-result response.
- Phase 9 delivery fees remain pending because Phase 8 records `delivery_fee_xof = 0` for manual confirmation. The storefront must display `Frais de livraison à confirmer` and must not present zero as free delivery.
- Checkout requires explicit delivery/return terms acceptance in the UI. The current Phase 8 schema does not snapshot a terms version/timestamp; add a reviewed migration before using terms acceptance for audit/legal proof.
- Checkout cart validation uses the material cart intent only: product ID, variant ID, and quantity. Hydration triggers one reconciliation, readiness changes do not trigger a loop, and explicit retry or a material cart change triggers one new request.
- WhatsApp is the primary cart ordering CTA when a WhatsApp number is configured. Formal online checkout remains available as a secondary action and still uses Phase 8 order creation.
- WhatsApp order-intent tracking is analytics only. It stores authoritative reconciled subtotal and safe line snapshots, but it never creates a Phase 8 order, reserves inventory, decrements stock, changes payment status, or confirms order completion.
- WhatsApp blocks only when fresh cart reconciliation/readiness fails, the cart is empty/unavailable/adjusted, the WhatsApp number is invalid/missing, or an authoritative cart summary cannot be generated. Optional intent tracking failures are non-blocking and may continue with a customer-visible notice that tracking was not recorded.

## Public Content

- Public content is structured, validated, and managed from `/admin/contenu`.
- OWNER and ADMIN may edit public content. Other roles are read-only or denied for content editing.
- Contact and Delivery pages display only configured fields. Do not invent delivery promises, guarantees, addresses, certifications, founding dates, or awards.
- Content updates revalidate affected public routes so changes do not require a redeploy.
- Structured contact/social values and delivery economics are Phase 14 operational settings. `/admin/contenu` preserves legacy JSON fields during editorial saves but no longer edits or consumes them as an operational source.

## Store Settings And Delivery

- Settings updates are section-scoped, idempotent and revision checked. Any stale revision fails with `SETTINGS_STALE_VERSION`; last-write-wins is not allowed.
- Delivery precedence is exact enabled normalized zone, then configured default fee, otherwise unavailable. Pickup uses its configured pickup fee and does not receive the home-delivery free threshold.
- The optional home-delivery threshold applies at `subtotal_xof >= threshold`, uses integer XOF, and is snapshotted at order creation.
- Delivery estimates require non-negative days and `max >= min`.
- Phase 8 order insert recalculates delivery server-side, replaces the legacy zero placeholder, includes the fee in `total_xof`, and snapshots the applied rule. A browser fee is never accepted.
- `accepting_orders = false` blocks new online orders at the database insert boundary while catalogue, cart and WhatsApp contact remain available.
- `maintenance_mode = true` also blocks new orders and renders a maintenance state only for public store routes. Admin, authentication and operational API/cron routes are outside that layout.
- Payment instructions at checkout, confirmation, tracking and customer notification rendering use the same typed settings projection. Instructions never request PIN, OTP, CVV or card credentials.
- Notification recipients are snapshotted into each new outbox intent. Existing pending intents keep their original recipient when settings change.

## Inventory

- No direct stock mutation from UI code.
- Stock changes use inventory ledger entries with reason, actor, and related order when applicable.
- Overselling must be prevented inside the order transaction.
- Manual adjustments require an audit log.
- Catalogue product/variant schemas must not expose direct updates to `stock_on_hand` or `reserved_quantity`.
- New variants default to unconfigured inventory. They are not treated as confirmed out of stock until inventory is initialized through the inventory transaction workflow.
- Initial stock is set by the `Initialiser le stock` operation for authorized OWNER, ADMIN, or INVENTORY_MANAGER users. The operation creates an inventory transaction, records the actor and reason, updates physical stock through the inventory boundary, and stamps the initialization marker.
- Available stock is calculated as `stock_on_hand - reserved_quantity`.
- Phase 10 manual inventory operations are transactional and idempotent. Authorized staff may use `INITIALIZE`, `RECEIVED`, `DAMAGED`, `ADJUSTMENT`, and `RETURNED`; `RESERVED`, `RELEASED`, and `SOLD` are not manually selectable.
- `DAMAGED` accepts a positive quantity in the UI and records a negative on-hand delta. `ADJUSTMENT` requires an explicit increase/decrease direction. `RETURNED` increases stock only after staff confirms the item is resellable.
- Manual inventory operations must never change `reserved_quantity` and must reject any result where `reserved_quantity > stock_on_hand`.
- Ledger history is immutable through the application. Corrections use compensating `ADJUSTMENT` rows.
- CSV inventory and ledger exports are staff-authorized, exclude customer/private data, and escape spreadsheet formula-like values.

## Orders

- Current order statuses are the database enum values: `PENDING_CONFIRMATION`, `CONFIRMED`, `PREPARING`, `READY_FOR_PICKUP`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`, `RETURNED`.
- Current payment statuses are the database enum values: `UNPAID`, `PENDING`, `PAID`, `FAILED`, `REFUNDED`, `PARTIALLY_REFUNDED`.
- Invalid transitions must be rejected server-side and tested.
- Customers see only redacted tracking information.
- Admin order transitions use the controlled Phase 11 transaction boundary. Staff must not update `orders.status` directly.
- Allowed lifecycle: `PENDING_CONFIRMATION → CONFIRMED/CANCELLED`, `CONFIRMED → PREPARING/CANCELLED`, `PREPARING → READY_FOR_PICKUP` for pickup or `OUT_FOR_DELIVERY` for delivery plus `CANCELLED`, `READY_FOR_PICKUP → DELIVERED/CANCELLED`, `OUT_FOR_DELIVERY → DELIVERED/RETURNED`, and `DELIVERED → RETURNED`.
- Cancellation before sale releases reservations with `RELEASED` inventory transactions and never decrements physical stock.
- Delivery converts reserved stock into sold stock with `SOLD` inventory transactions. It decrements both `stock_on_hand` and `reserved_quantity`, so calculated availability remains unchanged by the conversion.
- `RETURNED` does not automatically restock. Authorized staff must use the Phase 10 `RETURNED` inventory operation after physical inspection for resellable items.
- Order transition, payment verification and internal notes require server-side staff authorization. Idempotency keys are required for status and payment mutations.
- Staff internal notes are append-only and separate from immutable customer checkout notes.

## Payments

- MVP methods are manual Mobile Money and cash on delivery.
- Checkout displays only payment methods that are supported by the Phase 8 enum, enabled in store settings, and configured with required public instructions. Mobile Money methods require a public merchant number and instructions; bank transfer requires instructions and a beneficiary; pay-in-store requires instructions. Underconfigured manual methods are hidden.
- Payment settings persistence writes only `enabled_payment_methods` and `payment_method_configs` on the singleton `store_settings` row and preserves unrelated settings. Missing `payment_method_configs` indicates the Phase 9 correction migration is not applied and must be reported as an operational setup failure.
- No Stripe in the MVP.
- Never store card details, Mobile Money PINs, OTPs, or CVVs.
- Manual Mobile Money verification is performed by an authenticated admin.
- Payment logic must use a provider interface to allow a future gateway.
- Payment status remains separate from order status. Phase 11 manual verification records immutable `payment_transactions`, uses authoritative order totals, requires a reference or reason for manual methods where appropriate, and does not call payment gateways or perform refunds.

## Notifications

- Transactional emails use Resend.
- Notification payloads must not include secrets or unnecessary full addresses.
- Failed notification delivery should be retryable and visible to admins.
- Notification intents are inserted inside business transactions, but provider calls happen only after commit through the Phase 12 processor. Provider failure must never roll back order creation, order transitions, payment updates, inventory adjustments, or contact-message persistence.
- Phase 12 supports the existing order and payment template keys plus low-stock alerts. Outbox payloads are treated as references or bounded snapshots, not full unrestricted customer/order rows.
- Low-stock alerts are based on available quantity (`stock_on_hand - reserved_quantity`) and are deduplicated by threshold crossing. A variant can alert again only after recovering above the threshold and crossing below it later.
- Contact-message notification delivery depends on a persisted contact-message flow. Phase 13 provides that flow and writes notification intents; external provider delivery remains asynchronous through Phase 12.
- Phase 13 contact submissions require a name, subject, message, explicit contact-response consent for website submissions, and either a valid Côte d’Ivoire phone/WhatsApp number or a valid email. Message creation is idempotent and atomic with admin notification intents; notification delivery failure cannot delete or roll back the message. Manual social/phone/email messages are staff-entered records only and do not imply platform integration.
- Resend webhooks are excluded until official signature verification, replay protection and sanitized event storage are implemented.
