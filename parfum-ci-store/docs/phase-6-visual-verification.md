# Phase 6 Visual Verification

Do not record passwords, cookies, access tokens, Supabase keys, signed upload URLs, or real customer data.

## Prerequisite

Create a public test product through the normal OWNER or ADMIN flow:

1. Run the Phase 5 seed if useful.
2. Sign in as OWNER or ADMIN.
3. Open a draft product.
4. Upload a real JPEG, PNG, or WebP through the signed-upload UI.
5. Wait for server finalization and persisted image display.
6. Add at least one active positive-price variant.
7. Activate the product through the publication action.

Expected: The product appears through public catalogue queries only after the real finalized image exists.
Actual:
PASS/FAIL:

## Home Desktop

Expected: Hero, catalogue CTA, featured products, trust points and ordering steps render in French.
Actual:
PASS/FAIL:

## Home Mobile

Expected: Header, mobile navigation, CTA and product imagery are usable without overlap.
Actual:
PASS/FAIL:

## Public Navigation

Expected: Accueil, Catalogue, À propos, Livraison and Contact links work. The cart appears once per navigation context as the cart icon with an accessible label and count badge; optional social links appear only when configured.
Actual:
PASS/FAIL:

## Catalogue

Verify search, brand, category, Public cible, Famille olfactive, sort and pagination.

Expected: Filters update URL parameters, persist after refresh, reset to page 1 when changed, and can be cleared. `Effacer les filtres` clears search, brand, category, Public cible, Famille olfactive, concentration, size, availability, sorting, page, active chips, desktop controls, and mobile sheet draft state, then navigates to `/catalogue`. Removing one active chip clears only that filter and preserves the others. Results are bounded to 8 per page by default, show a summary such as `Produits 1-8 sur 100`, and no draft or archived products appear. Invalid optional filters do not trigger a Zod/runtime error.
Actual:
PASS/FAIL:

## Admin Content

Expected: OWNER or ADMIN can open `/admin/contenu`, edit Contact and Delivery fields, save, and see public pages update without a redeploy. Editable fields stay controlled after save, saved values remain visible, failed saves preserve input, and browser console output contains no Base UI changed-default-value warning. INVENTORY_MANAGER, ORDER_MANAGER, CUSTOMER_SUPPORT and inactive users cannot edit content.
Actual:
PASS/FAIL:

## Contact

Expected: Contact displays only configured telephone, WhatsApp, e-mail, address, hours, map and social links. No fake form appears.
Actual:
PASS/FAIL:

## Livraison Et Paiement

Expected: Delivery zones, fees, timeframes, pickup, Mobile Money, cash-on-delivery and FAQ appear only when configured. No unsupported promises appear.
Actual:
PASS/FAIL:

## Empty Results

Expected: A safe French empty state appears with no SQL or Supabase details.
Actual:
PASS/FAIL:

## Product Detail

Expected: Gallery, alt text, brand, Public cible, Famille olfactive, notes, variants, price, availability and delivery copy render.
Actual:
PASS/FAIL:

## Variant And Quantity

Expected: Available variants can be selected; unavailable variants disable add-to-cart; quantity is clamped.
Actual:
PASS/FAIL:

## Cart

Expected: Add-to-cart creates a client-side cart line without creating orders or reserving stock. Refresh preserves the client cart. `Continuer mes achats` opens `/catalogue`. No public text mentions implementation phases.
Actual:
PASS/FAIL:

## WhatsApp

Expected: The WhatsApp link is hidden when no number is configured; otherwise the encoded message includes product, variant, quantity, line totals, subtotal and canonical product URLs. It states availability, delivery fees and payment instructions will be confirmed manually.
Actual:
PASS/FAIL:

## Admin Availability Labels

Expected: A new draft product with no variants displays `Brouillon`, not `Rupture de stock`. An active product with no variants displays `Stock non configuré`; inactive-only variants display `Aucune variante active`; zero available stock displays `Rupture de stock`; low stock displays `Stock faible`; available stock displays `En stock`.
Actual:
PASS/FAIL:

## SEO

Check title, description, canonical, Open Graph, Product JSON-LD, `/sitemap.xml`, and `/robots.txt`.

Expected: Active products are indexable; hidden products return not found and do not leak metadata.
Actual:
PASS/FAIL:

## Public Images

Expected: Images load through `next/image` from `/storage/v1/object/public/product-images/**` and never use signed URLs.
Actual:
PASS/FAIL:

## Attribution

1. Open the site with `?utm_source=instagram&utm_campaign=test`.
2. Navigate to catalogue and product detail.
3. Add an item to cart.
4. Open another URL with different UTM values.

Expected: First-touch values persist and are not overwritten.
Actual:
PASS/FAIL:

## Hidden Product Behaviour

Expected: Unknown, DRAFT and ARCHIVED product slugs all show the same public not-found behaviour.
Actual:
PASS/FAIL:

## Archived Product Cache

Expected: After archiving a product in admin, public catalogue and product detail no longer show it after revalidation.
Actual:
PASS/FAIL:
