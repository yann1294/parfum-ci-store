# Phase 6.5 Seeded Manual Testing

Dataset prefix: `MANUAL-65-20260716`

Fixture module: `scripts/fixtures/phase65-catalogue-data.ts`

Naming convention:

- Product names from the supplied commercial fixture remain unchanged.
- Generated product slugs end with `manual-65-20260716`.
- Variant SKUs end with `MANUAL65`.
- Special availability products include `MANUAL-65-20260716` in their names.
- Store content rows include the prefix in SEO/test metadata so cleanup can identify fixture content.

The seed is development/test only. It refuses production and requires an explicit flag. It does not upload images, insert `product_images`, write to `storage.objects`, or activate products automatically. Public pagination is `NOT VERIFIED` until at least 13 products are genuinely `ACTIVE` with finalized valid images.

## Commands

Seed:

```bash
ALLOW_PHASE65_MANUAL_SEED=true pnpm seed:phase65:manual
```

Run locally after seeding:

```bash
rm -rf .next
pnpm dev
```

Cleanup dry run:

```bash
ALLOW_PHASE65_MANUAL_CLEANUP=true \
pnpm cleanup:phase65:manual:dry
```

Cleanup:

```bash
ALLOW_PHASE65_MANUAL_CLEANUP=true \
pnpm cleanup:phase65:manual
```

## Seeded Catalogue Checks

- [ ] Confirm `Louis Vuitton` exists for `Ombre Nomade`.
  Expected: Brand relation is present.
  Actual:
  PASS/FAIL:
- [ ] Confirm category names are French while slugs remain stable: `Homme/men`, `Femme/women`, `Unisexe/unisex`, `Luxe/luxury`, `Créateurs/designer`, `Parfums arabes/arabic`, `Frais/fresh`, `Boisés/woody`, `Orientaux/oriental`, `Coffrets cadeaux/gift-set`.
  Expected: No duplicate English/French category pair unless manually created outside the seed.
  Actual:
  PASS/FAIL:
- [ ] Confirm prices are integer XOF.
  Expected: `95` becomes `95 000 XOF`, `125` becomes `125 000 XOF`, `420` becomes `420 000 XOF`.
  Actual:
  PASS/FAIL:
- [ ] Confirm cost prices are visible only to authorized staff.
  Expected: Staff with cost permission sees deterministic cost price; public DTOs do not expose it.
  Actual:
  PASS/FAIL:
- [ ] Confirm all 25 supplied products plus 2 special availability products exist.
  Expected: 27 seeded products.
  Actual:
  PASS/FAIL:
- [ ] Confirm all newly seeded commercial products begin as `DRAFT`.
  Expected: No automatic activation without finalized images.
  Actual:
  PASS/FAIL:

## Mappings

Concentration mapping:

- Product names containing `Eau de Parfum`: `EDP`
- Product names containing `Eau de Toilette`: `EDT`
- Product names containing `Le Parfum`: `PARFUM`
- Development default when no explicit concentration is present: `EDP`

Public cible mapping:

- `Men`: `HOMME`
- `Women`: `FEMME`
- all other seeded categories: `UNISEXE`

Famille olfactive mapping is deterministic from description/category:

- fresh spicy/aromatic/mint/citrus: `Aromatique`
- woody/oud: `Boisée`
- floral/lavender/musk bouquet: `Florale`
- coffee/vanilla/cherry/almond: `Gourmande`
- marine/aquatic: `Aquatique`
- leather: `Cuirée`
- amber/cardamom: `Ambrée`
- oriental: `Orientale`

## Featured And Activation

Featured test products:

- `Sauvage Eau de Parfum`
- `Libre Intense`
- `Baccarat Rouge 540`
- `Aventus`
- `Khamrah`
- `By the Fireplace`

Activation-intended products are the first 15 supplied products. Upload finalized images and activate at least 9 products to test page 2 when public page size is 8. Activate all 25 supplied products to test four public pages. Keep the two special availability products as `DRAFT`.

- [ ] Upload a real image for at least one product through the signed-upload UI.
  Expected: Temporary card disappears without manual refresh; persisted image survives refresh.
  Actual:
  PASS/FAIL:
- [ ] Activate at least one complete product through the OWNER admin UI.
  Expected: Product appears publicly only after real image finalization and activation.
  Actual:
  PASS/FAIL:

## OWNER Manual Test

Use `owner@test.com`.

- [ ] Sign in and verify session persistence.
  Expected: Session persists after refresh and admin navigation.
  Actual:
  PASS/FAIL:
- [ ] Open brands and categories.
  Expected: Pagination, search and sorting work.
  Actual:
  PASS/FAIL:
- [ ] Open products.
  Expected: 25 supplied products plus 2 special test products are visible.
  Actual:
  PASS/FAIL:
- [ ] Open `Sauvage Eau de Parfum`.
  Expected: variants show `60 ml`, `100 ml`, `200 ml`, EDP, XOF prices, read-only stock fields.
  Actual:
  PASS/FAIL:
- [ ] Upload a valid image through the real signed-upload flow.
  Expected: Finalized image persists after refresh.
  Actual:
  PASS/FAIL:
- [ ] Complete required information and activate the product.
  Expected: Activation succeeds only when requirements are met.
  Actual:
  PASS/FAIL:
- [ ] Edit About, Contact and Delivery content.
  Expected: Public pages update without deploy.
  Actual:
  PASS/FAIL:
- [ ] Verify breadcrumbs, `Retour aux produits`, and unsaved-change warning.
  Expected: Navigation is deterministic and protects unsaved edits.
  Actual:
  PASS/FAIL:

## ADMIN Manual Test

Use `admin@test.com`.

- [ ] Edit a product and add/edit a variant.
  Expected: Allowed.
  Actual:
  PASS/FAIL:
- [ ] View cost price.
  Expected: Visible to ADMIN.
  Actual:
  PASS/FAIL:
- [ ] Upload and replace an image.
  Expected: Real signed-upload and replacement flow works.
  Actual:
  PASS/FAIL:
- [ ] Activate a complete product and archive a product.
  Expected: Audit events are recorded.
  Actual:
  PASS/FAIL:
- [ ] Edit public content.
  Expected: Allowed.
  Actual:
  PASS/FAIL:

## INVENTORY_MANAGER Manual Test

Use `inventory-test@example.com`.

- [ ] Open `/admin/produits`.
  Expected: Accessible with products, variants, SKU, selling price, physical stock, reserved stock, calculated availability, threshold, and stock-status badge visible.
  Actual:
  PASS/FAIL:
- [ ] Confirm restricted fields/actions.
  Expected: No cost price, no image upload, no product mutation, no variant mutation, no content editing, no direct stock editing.
  Actual:
  PASS/FAIL:
- [ ] Confirm inventory-module explanation.
  Expected: Explanatory read-only inventory text is visible.
  Actual:
  PASS/FAIL:

## Availability Checks

- [ ] Product with no variants.
  Expected: `Stock non configuré` when active; `Brouillon` while draft.
  Actual:
  PASS/FAIL:
- [ ] Product with inactive-only variants.
  Expected: `Aucune variante active` when active; `Brouillon` while draft.
  Actual:
  PASS/FAIL:
- [ ] `Lost Cherry` after activation.
  Expected: `Rupture de stock` for 50 ml.
  Actual:
  PASS/FAIL:
- [ ] `Oud Wood` 50 ml.
  Expected: `Stock faible`.
  Actual:
  PASS/FAIL:
- [ ] `Khamrah` 100 ml.
  Expected: `En stock`.
  Actual:
  PASS/FAIL:
- [ ] Draft products.
  Expected: primarily show `Brouillon`, not misleading rupture.
  Actual:
  PASS/FAIL:

## Public Catalogue Tests

Prerequisite: at least 13 valid products are genuinely `ACTIVE` with finalized images.

- [ ] Open `/catalogue`.
  Expected: only 12 products initially and a correct result summary.
  Actual:
  PASS/FAIL:
- [ ] Open page 2 and refresh.
  Expected: `page` query parameter persists.
  Actual:
  PASS/FAIL:
- [ ] Search `Sauvage`.
  Expected: results reset to page 1.
  Actual:
  PASS/FAIL:
- [ ] Filter by Dior, Homme, and a seeded family such as `Boisée`.
  Expected: filters are URL-backed and reset page to 1.
  Actual:
  PASS/FAIL:
- [ ] Sort newest, price ascending, and price descending.
  Expected: sorting applies without exposing staff-only data.
  Actual:
  PASS/FAIL:
- [ ] Clear filters.
  Expected: catalogue returns to unfiltered page 1.
  Actual:
  PASS/FAIL:

## Product Detail Tests

Open an `ACTIVE` seeded product.

- [ ] Verify gallery, brand, French category, Public cible, Famille olfactive, variant selector, size, concentration, XOF price, and availability.
  Expected: All customer-safe fields render.
  Actual:
  PASS/FAIL:
- [ ] Verify quantity constraints and unavailable variants.
  Expected: unavailable variant cannot be added.
  Actual:
  PASS/FAIL:
- [ ] Verify WhatsApp enquiry URL.
  Expected: encoded message includes product and variant details.
  Actual:
  PASS/FAIL:
- [ ] Verify related products, canonical metadata, and Product JSON-LD.
  Expected: related products are bounded and JSON-LD uses XOF.
  Actual:
  PASS/FAIL:
- [ ] Confirm no staff-only values appear.
  Expected: no cost price or internal stock quantities.
  Actual:
  PASS/FAIL:

## Content Pages

- [ ] `/a-propos`.
  Expected: managed About content appears without internal phase terminology.
  Actual:
  PASS/FAIL:
- [ ] `/contact`.
  Expected: telephone, WhatsApp, email, address, and opening hours appear.
  Actual:
  PASS/FAIL:
- [ ] `/livraison`.
  Expected: zones, delivery estimates, confirmation language, payment methods, ordering steps, and FAQ appear.
  Actual:
  PASS/FAIL:

## Cart Tests

- [ ] Add two seeded products with different variants.
  Expected: cart persists after refresh.
  Actual:
  PASS/FAIL:
- [ ] Update quantities.
  Expected: line totals and subtotal use integer XOF.
  Actual:
  PASS/FAIL:
- [ ] Remove and clear cart.
  Expected: remove works; clear requires confirmation.
  Actual:
  PASS/FAIL:
- [ ] Use `Continuer mes achats`.
  Expected: links to `/catalogue`.
  Actual:
  PASS/FAIL:
- [ ] Open WhatsApp cart CTA.
  Expected: encoded message contains products, variants, quantities and subtotal.
  Actual:
  PASS/FAIL:
- [ ] Confirm stock is not reserved or decremented.
  Expected: cart remains discovery state only.
  Actual:
  PASS/FAIL:

## Verification Status

- Seed script: NOT VERIFIED until run manually against development/test Supabase.
- Cleanup script: NOT VERIFIED until dry run and actual cleanup are run manually.
- Real image upload: NOT VERIFIED until completed through OWNER/ADMIN UI.
- Public pagination: NOT VERIFIED until at least 13 products are truly ACTIVE with finalized images.
