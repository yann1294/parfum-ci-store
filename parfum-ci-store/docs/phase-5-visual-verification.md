# Phase 5 Visual Verification

Do not record passwords, cookies, signed upload URLs, signed upload tokens, access tokens, refresh tokens, Supabase keys, or real customer data.

## Evidence

- Tester:
- Date:
- Environment:
- Git commit:
- Supabase project:
- Browser:
- Automated test results:
- Unresolved defects:

## OWNER Product Creation

1. Sign in as an `OWNER`.
2. Open `/admin/produits`.
3. Click `Nouveau`.
4. Create a draft product with a unique name.
5. Confirm redirect to `/admin/produits/[id]`.

Expected: Product is created as `DRAFT`; no secret values appear in the UI.
Actual:
PASS/FAIL:

## ADMIN Product Creation

Repeat the OWNER creation flow with an `ADMIN`.

Expected: ADMIN can create and edit normal catalogue records.
Actual:
PASS/FAIL:

## Brand Management

1. Open `/admin/marques`.
2. Confirm the page shows compact filters and an `Ajouter une marque` action.
3. Search for an existing brand and confirm the URL search parameters update.
4. Change sort between name and newest.
5. Move between pages when more than 20 brands exist.
6. Create a brand from the dialog.
7. Edit its name, slug, description, order, and active state.

Expected: Filtering and sorting happen through server navigation, not browser-only filtering. Validation errors are shown inline; success/error toasts appear; the create dialog closes or resets after success.
Actual:
PASS/FAIL:

## Category Management

1. Open `/admin/categories`.
2. Confirm the page shows compact filters and an `Ajouter une catégorie` action.
3. Search and sort from the URL-backed controls.
4. Move between pages when more than 20 categories exist.
5. Create a category from the dialog.
6. Edit its parent, name, slug, description, order, and active state.

Expected: Product count remains visible; changes persist after refresh; the page does not load the complete category table into the browser.
Actual:
PASS/FAIL:

## Variant Creation

1. Open a draft product editor.
2. Select `Variantes`.
3. Confirm variants appear in a compact list/table with filters for SKU, status, concentration, size, and sort.
4. Confirm full edit forms are not rendered for every variant at the same time.
5. Click `Ajouter une variante`.
6. Add SKU, size, concentration, selling price, optional compare-at price, optional cost price if authorized, low-stock threshold, active state.
7. Edit one existing variant through the dialog.

Expected: XOF values display as French-formatted amounts in read areas; `stock_on_hand` and `reserved_quantity` are not editable; variant search and pagination preserve URL parameters.
Actual:
PASS/FAIL:

## Catalogue Terminology

1. Open a product editor.
2. Select `Informations`.
3. Confirm the target-audience field is labelled `Public cible`.
4. Confirm `Postponement` and `Positionnement` are absent.
5. Confirm `Famille olfactive` includes help text explaining that it describes the scent family.

Expected: Controlled French options are displayed for target audience and fragrance family.
Actual:
PASS/FAIL:

## Invalid Price Validation

Submit an invalid or empty selling price.

Expected: Safe validation error; no stack trace or SQL error appears.
Actual:
PASS/FAIL:

## Image Upload

1. Select `Images`.
2. Choose a JPEG, PNG, or WebP under 5 MB.
3. Confirm local preview.
4. Upload.
5. Refresh the editor.

Expected: Browser uploads directly to Supabase Storage, finalization validates server-side, persisted preview remains after refresh.
Actual:
PASS/FAIL:

## Multiple Images, Primary, Alt Text, Ordering

1. Upload multiple images.
2. Provide distinct alt text.
3. Confirm order and primary state after refresh.

Expected: Image metadata persists; at most one primary image is present.
Actual:
PASS/FAIL:

## Replacement And Deletion

1. Replace an image.
2. Delete an image with confirmation.

Expected: Replacement uses a new generated path; deletion removes Storage object and database reference when allowed.
Actual:
PASS/FAIL:

## Activation

1. Attempt activation with missing requirements.
2. Complete name, description, one active positive-price variant, and one validated image.
3. Activate again.

Expected: Incomplete activation fails clearly and leaves `DRAFT`; complete activation succeeds and status becomes `ACTIVE`.
Actual:
PASS/FAIL:

## Archival

1. Archive an active or draft product.
2. Refresh the product editor and product list.

Expected: Status is `ARCHIVED`; product disappears from public catalogue queries.
Actual:
PASS/FAIL:

## INVENTORY_MANAGER Read-Only

1. Sign in as `INVENTORY_MANAGER`.
2. Open `/admin/produits`, `/admin/marques`, `/admin/categories`.
3. Open a product editor.
4. Select `Variantes`.
5. Confirm each variant shows SKU, size, concentration, selling price, physical stock, reserved stock, available stock, low-stock threshold, and stock-status badge.
6. Confirm the text `Les quantités sont gérées depuis le module Inventaire.` is visible.

Expected: Read-only data is visible; create/edit/upload/activation/archive controls are absent; cost price is not visible; no broken `Gérer le stock` link is shown unless a real authorized inventory route exists.
Actual:
PASS/FAIL:

## Unauthorized Direct Routes

1. As `INVENTORY_MANAGER`, open `/admin/produits/nouveau`.
2. Try direct mutation invocation where test tooling allows.

Expected: Access is denied server-side.
Actual:
PASS/FAIL:

## Layouts And Feedback

Verify mobile and desktop:

- product list cards/table;
- loading skeleton;
- error state;
- empty state;
- account menu opens without Base UI errors;
- session persists while moving across catalogue pages and after refresh.

Actual:
PASS/FAIL:

## Supabase Verification

1. Open Supabase Dashboard `Storage -> product-images`.
2. Confirm uploaded object exists.
3. Confirm path follows `products/<product-uuid>/<random-uuid>.<jpg|png|webp>`.
4. Open Table Editor `product_images`.
5. Confirm matching row, MIME type, byte size, alt text, and sort order.
6. Confirm the public URL opens while signed out. Do not copy signed URLs or tokens into reports.
7. Replace an image and confirm a new path is created.
8. Delete an image and confirm object and database reference are removed.
9. Confirm audit records exist for finalization/deletion.
10. Attempt unauthorized-role upload and confirm no object is created.

Actual:
PASS/FAIL:
