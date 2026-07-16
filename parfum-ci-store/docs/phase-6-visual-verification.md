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

Expected: Accueil, Catalogue, À propos, Livraison, Contact and Panier links work; optional social links appear only when configured.
Actual:
PASS/FAIL:

## Catalogue

Verify search, brand, category, Public cible, Famille olfactive, sort and pagination.

Expected: Filters update URL parameters, persist after refresh, and can be cleared. No draft or archived products appear.
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

Expected: Add-to-cart creates a client-side cart line without creating orders or reserving stock. Refresh preserves the client cart.
Actual:
PASS/FAIL:

## WhatsApp

Expected: The WhatsApp link is hidden when no number is configured; otherwise the encoded message includes product, variant, price and canonical product URL.
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
