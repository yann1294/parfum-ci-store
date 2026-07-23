# Phase 7 Visual Verification

Do not use real customer data. Do not record passwords, cookies, access tokens, Supabase keys, signed upload URLs, or private Storage paths.

Phase 7 keeps the guest cart as pre-checkout discovery state. It must not create orders, reserve inventory, decrement stock, process payments, or persist anonymous carts server-side.

## Cart Drawer Desktop

Expected: Cart icon opens an accessible drawer with title, close action, count, item preview, subtotal, `Voir le panier`, and `Continuer mes achats`. Clicking or keyboard-activating `Voir le panier` navigates to `/panier` without a full reload, closes the drawer, removes the overlay, releases focus trapping, removes body scroll lock, and keeps cart contents/count unchanged. Browser Back must not reopen the drawer.
Actual:
PASS/FAIL:

## Cart Drawer Mobile

Expected: Drawer traps focus while open, closes with Escape/close action, returns focus to the cart trigger, and also closes cleanly when navigating to `/panier`.
Actual:
PASS/FAIL:

## Empty State

Expected: Empty cart shows customer-friendly copy and a link to `/catalogue`.
Actual:
PASS/FAIL:

## Add Item

Expected: Adding an available variant creates one cart line and updates the cart icon count.
Actual:
PASS/FAIL:

## Duplicate Merge

Expected: Adding the same variant twice keeps one line and merges quantity up to the allowed maximum.
Actual:
PASS/FAIL:

## Two Variants From One Product

Expected: Two variants from one product appear as separate lines keyed by variant.
Actual:
PASS/FAIL:

## Quantity Update

Expected: Quantity controls update totals with integer XOF arithmetic and revalidate against current availability.
Actual:
PASS/FAIL:

## Remove

Expected: Removing one line does not remove other variants.
Actual:
PASS/FAIL:

## Clear

Expected: Clear cart asks for confirmation and then removes all lines.
Actual:
PASS/FAIL:

## Persistence After Refresh

Expected: Refresh preserves product/variant intent and reloads current names, prices, images, and availability from the server.
Actual:
PASS/FAIL:

## Multi-Tab Synchronization

Expected: Adding/removing in one tab updates the other tab without reintroducing removed lines.
Actual:
PASS/FAIL:

## Authoritative Price Update

Expected: After a price change, cart shows the current server price and recalculates subtotal before WhatsApp ordering.
Actual:
PASS/FAIL:

## Reduced Availability

Expected: Reduced availability marks or adjusts the affected line and blocks WhatsApp ordering until resolved.
Actual:
PASS/FAIL:

## Stock Not Configured

Expected: A variant with unconfigured stock displays `Stock non configuré` and cannot be ordered.
Actual:
PASS/FAIL:

## Inactive Variant

Expected: A previously added inactive variant remains visible as unavailable and can be removed.
Actual:
PASS/FAIL:

## Archived Product

Expected: A previously added archived product remains visible as a generic unavailable line without leaking hidden details.
Actual:
PASS/FAIL:

## Temporary Server Failure

Expected: Validation failure shows a safe retry state and preserves cart intent.
Actual:
PASS/FAIL:

## Retry

Expected: Retry revalidates the cart and clears the temporary error when the server responds.
Actual:
PASS/FAIL:

## Subtotal

Expected: Subtotal includes only orderable authoritative lines and uses integer XOF formatting.
Actual:
PASS/FAIL:

## WhatsApp Ordering

Expected: WhatsApp ordering reconciles immediately before opening, uses authoritative names, variants, prices, subtotal and public product URLs, and is disabled for unavailable lines.
Actual:
PASS/FAIL:

## Attribution Persistence

Expected: First valid UTM touch is preserved and not overwritten before expiry.
Actual:
PASS/FAIL:

## Screen-Reader Announcements

Expected: Additions, removals, quantity changes, validation and errors are announced concisely.
Actual:
PASS/FAIL:

## Keyboard Navigation

Expected: Drawer, quantity controls, remove, clear, retry, and WhatsApp controls are keyboard-operable.
Actual:
PASS/FAIL:

## Focus Management

Expected: Drawer focus is contained while open and returns to the trigger when closed.
Actual:
PASS/FAIL:

## No Internal Phase Terminology

Expected: Public cart text contains no `Phase`, roadmap, or checkout placeholder wording.
Actual:
PASS/FAIL:

## No Stock Reservation

Expected: Adding, validating, updating, removing, clearing, and WhatsApp ordering do not create orders, inventory reservations, or stock decrements.
Actual:
PASS/FAIL:

## Content Editor Warning Regression

Expected: OWNER or ADMIN can open `/admin/contenu`, edit `Titre principal`, save, see the saved value remain visible, navigate away and return with the persisted value, and observe no Base UI `FieldControl` changed-default-value warning in browser console output. Failed saves preserve current input. Switching content sections resets the visible fields intentionally.
Actual:
PASS/FAIL:
