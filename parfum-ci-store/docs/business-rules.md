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
- The Phase 6.5 cart WhatsApp CTA is a manual enquiry. It may include product names, variants, quantities, formatted line totals, subtotal, and canonical product URLs, but it must not claim an order is confirmed.
- Phase 7 cart persistence stores customer intent only: schema version, product ID, variant ID, requested quantity, optional validated first-touch attribution, and timestamps. Product names, images, prices, publication state, and availability are authoritative only after public server reconciliation.
- Cart lines are keyed by `variantId`. Adding the same variant merges quantities; adding a different variant of the same product creates a separate line.
- Unavailable cart lines are not silently removed. Hidden products, inactive or deleted variants, stock not configured, and out-of-stock variants remain visible as unavailable until the customer removes them.
- Cart ordering readiness is authoritative. WhatsApp ordering is disabled while validating, after validation failure, when unavailable lines remain, or when quantity adjustments are unresolved.
- Quantity requests are positive integers capped at the configured cart maximum. Server reconciliation may reduce the effective orderable quantity for totals, but the line remains visible with a correction notice.
- Cart reconciliation is fresh on cart open, `/panier`, add/update/remove, retry, WhatsApp ordering, and tab reactivation after the stale window. It does not poll continuously.

## Public Content

- Public content is structured, validated, and managed from `/admin/contenu`.
- OWNER and ADMIN may edit public content. Other roles are read-only or denied for content editing.
- Contact and Delivery pages display only configured fields. Do not invent delivery promises, guarantees, addresses, certifications, founding dates, or awards.
- Content updates revalidate affected public routes so changes do not require a redeploy.

## Inventory

- No direct stock mutation from UI code.
- Stock changes use inventory ledger entries with reason, actor, and related order when applicable.
- Overselling must be prevented inside the order transaction.
- Manual adjustments require an audit log.
- Catalogue product/variant schemas must not expose direct updates to `stock_on_hand` or `reserved_quantity`.
- New variants default to unconfigured inventory. They are not treated as confirmed out of stock until inventory is initialized through the inventory transaction workflow.
- Initial stock is set by the `Initialiser le stock` operation for authorized OWNER, ADMIN, or INVENTORY_MANAGER users. The operation creates an inventory transaction, records the actor and reason, updates physical stock through the inventory boundary, and stamps the initialization marker.
- Available stock is calculated as `stock_on_hand - reserved_quantity`.

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
