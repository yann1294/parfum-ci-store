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
6. Confirm the product editor shows breadcrumb `Produits / [product name]`.
7. Confirm the visible `Retour aux produits` action has an arrow icon and text label.

Expected: Product is created as `DRAFT`; no secret values appear in the UI.
Actual:
PASS/FAIL:PASS

## Product Return Navigation

1. Open `/admin/produits?page=2&status=DRAFT` or another filtered list URL.
2. Open a product from the list.
3. Confirm the editor URL includes a `retour` parameter.
4. Click `Retour aux produits`.
5. Confirm the browser returns to the filtered list URL, not only to browser history.
6. Reopen the product.
7. Modify a product field without saving.
8. Click `Retour aux produits`.
9. Cancel the unsaved-change confirmation.
10. Confirm the editor remains open.
11. Save the form.
12. Click `Retour aux produits` again.

Expected: Valid internal list context is preserved; external or malformed return paths fall back to `/admin/produits`; saved forms do not show a false unsaved-change warning.
Actual:
PASS/FAIL:

## ADMIN Product Creation

Repeat the OWNER creation flow with an `ADMIN`.

Expected: ADMIN can create and edit normal catalogue records.
Actual:
PASS/FAIL:PASS

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
PASS/FAIL:PASS

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

Expected: XOF values display as French-formatted amounts in read areas; `stock_on_hand` and `reserved_quantity` are not editable; newly created variants show `Stock non configuré` until inventory is initialized through the inventory operation; variant search and pagination preserve URL parameters; editing `Active`/`Inactive` refreshes the row badge without a full browser reload. In narrow desktop, tablet, split-view, and mobile layouts, critical variant values remain reachable through stacked cards or component-level horizontal scrolling without body-level clipping.
Actual:
PASS/FAIL:PASS

## Catalogue Terminology

1. Open a product editor.
2. Select `Informations`.
3. Confirm the target-audience field is labelled `Public cible`.
4. Confirm `Postponement` and `Positionnement` are absent.
5. Confirm `Famille olfactive` includes help text explaining that it describes the scent family.

Expected: Controlled French options are displayed for target audience and fragrance family.
Actual:
PASS/FAIL:PASS

## Invalid Price Validation

Submit an invalid or empty selling price.

Expected: Safe validation error; no stack trace or SQL error appears.
Actual:
PASS/FAIL:PASS

## Image Upload

1. Select `Images`.
2. Choose a JPEG, PNG, or WebP under 5 MB.
3. Confirm local preview.
4. Upload.
5. Wait for finalization success.
6. Confirm the temporary upload confirmation card disappears without a manual browser reload.
7. Confirm the persisted image card is visible.
8. Refresh the editor manually.

Expected: Browser uploads directly to Supabase Storage, finalization validates server-side, local preview object URLs are cleaned up, stale pending cards disappear, and persisted preview remains after refresh.
Actual:
PASS/FAIL:PASS

## Image Upload Retry

1. Select one valid image and one invalid or intentionally failing image.
2. Upload both.
3. Confirm the successful image is removed from the pending list after finalization.
4. Confirm the failed item remains visible with `Réessayer` or `Retirer`.

Expected: File states are independent; one failure does not leave successful uploads as stale pending cards.
Actual:
PASS/FAIL:PASS

## Multiple Images, Primary, Alt Text, Ordering

1. Upload multiple images.
2. Provide distinct alt text.
3. Confirm order and primary state after refresh.

Expected: Image metadata persists; at most one primary image is present.
Actual:
PASS/FAIL:PASS

## Replacement And Deletion

1. Replace an image.
2. Delete an image with confirmation.

Expected: Replacement uses a new generated path; deletion removes Storage object and database reference when allowed.
Actual:
PASS/FAIL:PASS

## Activation

1. Attempt activation with missing requirements.
2. Complete name, description, one active positive-price variant, and one validated image.
3. Activate again.

Expected: Incomplete activation fails clearly and leaves `DRAFT`; complete activation succeeds and status becomes `ACTIVE`.
Actual:
PASS/FAIL:PASS

## Archival

1. Archive an active or draft product.
2. Refresh the product editor and product list.

Expected: Status is `ARCHIVED`; product disappears from public catalogue queries.
Actual:
PASS/FAIL:PASS

## INVENTORY_MANAGER Read-Only

1. Sign in as `INVENTORY_MANAGER`.
2. Open `/admin/produits`, `/admin/marques`, `/admin/categories`.
3. Open a product editor.
4. Select `Variantes`.
5. Confirm each variant shows SKU, size, concentration, selling price, physical stock, reserved stock, available stock, low-stock threshold, a variant-state badge, and a separate stock-state badge.
6. Confirm the text `Les quantités sont gérées depuis le module Inventaire.` is visible.

Expected: Read-only catalogue data is visible; inventory initialization is available only through the inventory operation when permitted; create/edit/upload/activation/archive controls are absent; cost price is not visible; no broken `Gérer le stock` link is shown unless a real authorized inventory route exists.
Actual:
PASS/FAIL:PASS

## Unauthorized Direct Routes

1. As `INVENTORY_MANAGER`, open `/admin/produits/nouveau`.
2. Try direct mutation invocation where test tooling allows.

Expected: Access is denied server-side.
Actual:
PASS/FAIL:PASS

## Layouts And Feedback

Verify mobile and desktop:

- product list cards/table;
- loading skeleton;
- error state;
- empty state;
- account menu opens without Base UI errors;
- session persists while moving across catalogue pages and after refresh.

Actual:
PASS/FAIL:PASS

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
PASS/FAIL:PASS
