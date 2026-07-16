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
- `ACTIVE` products require a non-empty name, non-empty description, at least one active variant with a positive selling price, and at least one validated approved image.
- `ARCHIVED` products are not public and cannot receive new images.
- Product image uploads use direct signed Supabase Storage uploads; 5 MB files must not pass through a Server Action or Vercel Function.
- Image object paths are generated server-side. Browser input must never supply bucket names, folders, raw storage paths, or original filenames as stored object names.
- Image finalization validates declared size and MIME type, checks actual magic bytes server-side, rejects active content signatures, then inserts `product_images`.
- Image replacement creates a new validated object and database record before attempting old-object cleanup. Storage/database operations are compensated, not cross-service atomic.
- Phase 5 admin catalogue UI creates products as `DRAFT`.
- `OWNER` and `ADMIN` may create/edit brands, categories, products, variants, images, featured state, slugs, activation, and archival.
- `INVENTORY_MANAGER` has read-only catalogue access in Phase 5. Stock adjustments remain in the inventory module.
- `Public cible` represents the product target audience: Homme, Femme, Unisexe, or Enfant.
- `Famille olfactive` represents the perfume scent family, for example Florale, Boisée, Ambrée, Hespéridée, Aromatique, Fougère, Chyprée, Gourmande, Cuirée, or Aquatique.
- Brand and category administration uses server-side search, deterministic sorting, and pagination. Default page size is 20 and the maximum accepted page size is 100.
- Product variant administration uses server-side search and pagination. Default page size is 10 and the maximum accepted page size is 100.
- The catalogue module displays physical stock, reserved stock, calculated available stock, and low-stock threshold as read-only inventory context.
- Do not render broken inventory links. Link to `Gérer le stock` only when a real authorized inventory route exists for the variant.
- Public availability is displayed as `En stock`, `Stock faible`, or `Rupture de stock`; physical and reserved stock quantities are not displayed publicly.
- Phase 6 cart is client-side product discovery state only. It does not create orders, process payments, or reserve inventory.

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
- Catalogue product/variant schemas must not expose direct updates to `stock_on_hand` or `reserved_quantity`.
- New variants default to zero inventory. Stock changes belong to the inventory ledger workflow.
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
