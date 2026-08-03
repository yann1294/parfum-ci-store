# Phase 9 Visual Verification

Do not use production customer data. Do not record passwords, cookies, access tokens, Supabase keys, full addresses, full phone numbers, or payment credentials.

Phase 9 adds checkout UI, confirmation, and secure order tracking. It reuses Phase 7 cart reconciliation and Phase 8 `POST /api/orders`; it must not create a second order engine.

## Checkout Empty State

Expected: `/commande` with an empty cart shows an empty state, links to `/catalogue`, and does not show the checkout form or call `/api/orders`.
Actual:
PASS/FAIL:

## Authoritative Cart Summary

Expected: `/commande` reconciles the cart through `/api/cart/reconcile` and displays authoritative names, variants, prices, quantities, subtotal, and pending delivery fee.
Actual:
PASS/FAIL:

## Unavailable Cart State

Expected: unavailable, unconfigured, adjusted, or out-of-stock lines block submission and link back to `/panier` without removing lines.
Actual:
PASS/FAIL:

## Customer Form

Expected: required French fields are controlled, labelled, mobile-friendly, and preserve values after recoverable failures.
Actual:
PASS/FAIL:

## Phone Validation

Expected: invalid Côte d'Ivoire phone values produce a safe French error and no order is submitted.
Actual:
PASS/FAIL:

## Phone Format Equivalence

Expected: the same disposable Côte d'Ivoire test number succeeds when entered as `+225XXXXXXXXXX`, `00225XXXXXXXXXX`, `225XXXXXXXXXX`, accepted local digits, and with spaces, hyphens, or parentheses; all forms match the canonical stored value `+225XXXXXXXXXX`.
Actual:
PASS/FAIL:

## Phone Customer Conflict

Expected: a normalized-phone customer conflict displays `Ce numéro ne peut pas être utilisé pour le moment. Vérifiez-le ou contactez l’équipe.` and does not expose database constraint names or raw diagnostics.
Actual:
PASS/FAIL:

## Delivery Methods

Expected: only `store_settings.enabled_delivery_methods` supported by Phase 8 are displayed.
Actual:
PASS/FAIL:

## Payment Methods

Expected: only `store_settings.enabled_payment_methods` supported by Phase 8 and correctly configured for customers are displayed. Disabled, unsupported, or underconfigured manual methods are absent.
Actual:
PASS/FAIL:

## Payment Settings

Expected: OWNER/ADMIN can configure payment labels, enabled state, merchant numbers, beneficiaries, instructions, and display order from `/admin/contenu`; unauthorized roles cannot save changes.
Actual:
PASS/FAIL:

## Payment Settings Persistence Failure

Expected: if the Phase 9 payment settings migration is missing or the database rejects the save, `/admin/contenu` shows a failure message, preserves entered values, and does not show a success toast.
Actual:
PASS/FAIL:

## Checkout Reconciliation Lifecycle

Expected: `/commande` shows `Vérification du panier` briefly, then settles without repeated validation requests until the cart intent changes or the user retries.
Actual:
PASS/FAIL:

## Checkout Submit Availability

Expected: `Envoyer la commande` becomes available after cart readiness is READY and required form fields plus terms are valid; it remains disabled while validating, submitting, unavailable, adjusted, or invalid.
Actual:
PASS/FAIL:

## Terms Acceptance

Expected: delivery/return terms checkbox is not prechecked and is required before submission.
Actual:
PASS/FAIL:

## Delivery Fee Pending

Expected: Phase 8 zero delivery fee is shown as `À confirmer`, never as free delivery.
Actual:
PASS/FAIL:

## Duplicate Submission

Expected: rapid double submit results in one Phase 8 order/reservation through idempotency; UI disables while pending.
Actual:
PASS/FAIL:

## Recoverable Failure

Expected: temporary validation or order creation failure preserves cart, form values, and retry path.
Actual:
PASS/FAIL:

## Checkout HTTP 400 Handling

Expected: a 400 response from `POST /api/orders` displays a French error, preserves the cart and form, does not clear the cart, and does not navigate to `/commande/succes`.
Actual:
PASS/FAIL:

## Successful COD

Expected: cash-on-delivery order is created through `/api/orders`, cart clears only after success, and confirmation route opens.
Actual:
PASS/FAIL:

## Successful Confirmation Navigation

Expected: after a successful `POST /api/orders`, the UI stores safe confirmation proof, clears the cart, navigates with the human order number to `/commande/succes/[orderNumber]`, displays `Commande reçue`, and does not create a second order on refresh.
Actual:
PASS/FAIL:

## Confirmation Navigation Fallback

Expected: if the order is created but route replacement fails, checkout stops showing the pending state, displays `Votre commande a bien été enregistrée.` with the order number, provides `Voir la confirmation` and `/suivi-commande`, and does not resubmit the order.
Actual:
PASS/FAIL:

## Successful Manual Mobile Money Order

Expected: enabled Mobile Money method displays configured merchant instructions, requests no PIN/OTP, creates a pending-verification order, and shows order number as reference when configured.
Actual:
PASS/FAIL:

## Cart Clearing

Expected: cart remains until a successful Phase 8 response, then clears and cart count updates.
Actual:
PASS/FAIL:

## Confirmation Security

Expected: direct `/commande/succes/[orderNumber]` visit without checkout-flow proof shows generic recovery content and no private details.
Actual:
PASS/FAIL:

## Confirmation Refresh

Expected: refresh after success recovers only the short-lived safe confirmation state and does not resubmit the order.
Actual:
PASS/FAIL:

## Payment Instructions

Expected: instructions come from store settings/content, include no hard-coded merchant details, and warn never to share PIN or OTP.
Actual:
PASS/FAIL:

## WhatsApp CTA

Expected: confirmation WhatsApp CTA includes only the order number and support request, no internal IDs or full address.
Actual:
PASS/FAIL:

## WhatsApp Primary Cart CTA

Expected: `/panier` shows `Commander via WhatsApp` as the primary action, `Finaliser la commande en ligne` as secondary, and `Continuer mes achats` after ordering actions.
Actual:
PASS/FAIL:

## WhatsApp Intent Tracking

Expected: clicking WhatsApp after READY cart validation creates one intent event from authoritative cart data; rapid duplicate clicks do not create uncontrolled duplicate records.
Actual:
PASS/FAIL:

## WhatsApp Intent Boundary

Expected: WhatsApp intent creation does not create an order, reserve stock, decrement stock, change payment state, or claim WhatsApp was opened/sent.
Actual:
PASS/FAIL:

## WhatsApp Intent Fallback

Expected: if analytics persistence fails after cart validation, the UI allows a controlled WhatsApp fallback without claiming tracking succeeded.
Actual:
PASS/FAIL:

## WhatsApp Validation Failure

Expected: if fresh cart reconciliation fails or readiness is not READY, WhatsApp is blocked with a cart-validation message and no intent/order/reservation is created.
Actual:
PASS/FAIL:

## Tracking Correct Phone

Expected: `/suivi-commande` with matching order number and phone shows limited French timeline and masked phone.
Actual:
PASS/FAIL:

## Tracking Wrong Phone

Expected: wrong phone returns the same generic no-result message as unknown order.
Actual:
PASS/FAIL:

## Tracking Unknown Order

Expected: unknown order returns a generic no-result message without revealing existence.
Actual:
PASS/FAIL:

## Timeline French Labels

Expected: internal order and payment statuses are displayed as French customer labels.
Actual:
PASS/FAIL:

## Noindex Metadata

Expected: `/commande`, `/commande/succes/[orderNumber]`, and `/suivi-commande` render `noindex, nofollow` and are absent from `/sitemap.xml`.
Actual:
PASS/FAIL:

## Mobile Checkout

Expected: checkout form and summary fit a narrow phone viewport without horizontal scrolling.
Actual:
PASS/FAIL:

## Desktop Checkout

Expected: desktop checkout uses a readable form and adjacent summary without overlapping text.
Actual:
PASS/FAIL:

## Keyboard Flow

Expected: all fields, method selectors, terms checkbox, submit, retry, and navigation actions are keyboard-operable.
Actual:
PASS/FAIL:

## Screen-Reader Errors

Expected: field errors are associated with controls and submission/validation states are announced.
Actual:
PASS/FAIL:

## Console Warnings

Expected: checkout, confirmation, and tracking produce no uncontrolled-field, hydration, or script-tag warnings.
Actual:
PASS/FAIL:

## Private-Data Leakage

Expected: public checkout, confirmation, and tracking never display internal order UUIDs, customer IDs, full addresses, cost prices, stock internals, audit data, notification data, Supabase diagnostics, PIN, OTP, or signed URLs.
Actual:
PASS/FAIL:

## Schema Gap: Terms Snapshot

Expected: If audit-grade terms proof is required, a reviewed migration captures accepted timestamp and policy version/reference. Current Phase 9 UI enforcement alone is not legal/audit proof.
Actual:
PASS/FAIL:
