# Security

## Authentication

- Admin authentication is required for the MVP back office.
- Public customers do not need accounts for the MVP.
- Supabase Auth is the authentication provider.
- Use Supabase SSR clients with cookie-based auth for server-rendered and server-action flows.
- `src/proxy.ts` refreshes auth cookies using Supabase SSR and `auth.getClaims()`.
- Server code must not trust `auth.getSession()` for authorization decisions.
- `/connexion` authenticates staff with email/password and redirects only to validated local return paths. External, protocol-relative, malformed, `/connexion`, and `/acces-refuse` return paths fall back to `/admin`.
- `/connexion` starts Google OAuth from the browser Supabase client with `signInWithOAuth({ provider: "google" })` and an application callback at `/auth/callback`.
- `/auth/callback` exchanges OAuth codes with `exchangeCodeForSession`, copies Supabase cookie mutations onto the returned redirect response, validates the return path, verifies identity with `auth.getClaims()`, loads `public.profiles`, requires an active staff profile, signs out denied users, and redirects denied users to `/acces-refuse`.
- Logout is implemented as a server action that signs out through Supabase and records an audit event.
- Customer accounts are out of scope for the MVP.

## Authorization

- RLS must be enabled on every exposed Supabase table.
- Public access is limited to published catalogue data and validated public writes.
- Admin mutations require authenticated admin role checks.
- `/admin` routes are protected server-side in the admin layout with `requireActiveStaff`.
- Server actions must call authorization helpers such as `requireRole`; hidden buttons are never authorization.
- `SUPABASE_SECRET_KEY` is server-only and must never be imported into Client Components.
- The privileged Supabase client is isolated in `src/lib/supabase/admin.ts` and imports `server-only`.
- Proxy may preserve a safe current path and refresh cookies, but it is only an optimistic filter. Authorization must happen in Server Components, Server Actions, Route Handlers, or data-access code close to the protected data or mutation.
- The admin layout also checks the current admin path against the role-aware route policy, so direct URL entry to unauthorized modules is denied server-side.
- Phase 14 settings reads/writes use separate projections. Anonymous users execute only `get_public_store_settings()`/`get_public_delivery_zones()` and cannot select the singleton row directly. OWNER/ADMIN mutations pass through a service-role RPC that rechecks the actor and revision; other roles and anonymous users have no execute grant.

## Phase 14 Operational Settings

- Public settings exclude notification routing, audit metadata, revisions, environment variables and legacy private columns. Social/branding/SEO URLs are HTTPS validated; unsupported social hosts are hidden.
- `RESEND_API_KEY`, `CRON_SECRET`, Supabase secrets and database credentials remain environment-only. The editable notification recipient is database business configuration; provider credentials are never shown in admin UI.
- Delivery fees and order acceptance are enforced by a database insert trigger, not hidden controls or client calculations.
- Delivery zones have RLS enabled, no anonymous writes and no application delete operation. Historical order labels/snapshots survive zone disablement or reference removal.
- Settings audit metadata includes only section, changed field names and revision; it omits full phone/email values, instructions and request payloads.
- Maintenance is not implemented as an indiscriminate Proxy interception. The public route-group layout is the allowlist boundary, preserving admin/auth/API/cron operations.
- Admin navigation links point only to protected admin routes. Temporary module pages do not expose business data or mutations; they exist so navigation exercises the authorization boundary without adding storefront, inventory, order, or payment features.
- Catalogue mutation services and catalogue Server Actions call `requireActiveStaff` and enforce `canManageProducts` internally.
- Product image Storage writes are limited by `storage.objects` policies to authenticated active `OWNER` and `ADMIN` profiles for `bucket_id = 'product-images'`.
- `ORDER_MANAGER`, `CUSTOMER_SUPPORT`, anonymous users, inactive staff, and authenticated users without active staff profiles cannot upload, replace, move, copy, or delete product images.
- Public catalogue reads use safe DTOs and Phase 4 public views that do not expose `cost_price_xof`.
- Phase 5 admin catalogue routes are `/admin/produits`, `/admin/produits/nouveau`, `/admin/produits/[id]`, `/admin/marques`, and `/admin/categories`.
- `OWNER` and `ADMIN` may mutate catalogue data and view cost prices. `INVENTORY_MANAGER` has read-only catalogue access in Phase 5 and cannot view cost prices or image mutation controls. `ORDER_MANAGER` and `CUSTOMER_SUPPORT` do not receive catalogue mutation access.

## Admin Roles

- `OWNER`: all access.
- `ADMIN`: operational access except destructive owner/security settings.
- `INVENTORY_MANAGER`: catalogue read plus inventory management.
- `ORDER_MANAGER`: orders, customers, and payment verification.
- `CUSTOMER_SUPPORT`: order read access and customer messages. This role must not verify payments, mutate inventory, or change settings.

## Secrets and Privacy

- Never expose secret keys to the browser.
- Never commit secrets.
- Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` may be used by browser code.
- Server secrets are validated separately in `src/lib/env/server.ts`.
- Never store card details, Mobile Money PINs, OTPs, or CVVs.
- Never log full customer addresses, secrets, payment credentials, auth tokens, or raw webhook signatures.
- Redact audit and analytics metadata by default.
- Login audit events store actor IDs where available and email hashes only; passwords, tokens, and raw email values are not stored.
- Google OAuth callback audit events never store OAuth codes, provider tokens, Supabase access tokens, refresh tokens, cookies, authorization headers, or Google client secrets.
- Development-only auth diagnostics emit event codes and optional route/reason metadata only. They must not include cookie values, OAuth URLs, authorization codes, tokens, raw profiles, raw users, email addresses, or secrets.
- Product-image signed upload URLs and tokens are secret for their short lifetime. Do not log them, audit them, or store them outside the upload flow.
- Product images are stored in a public bucket and are not confidential if the URL is known.
- Storefront content editing is restricted to active OWNER and ADMIN staff through `/admin/contenu` and the `store_content` RLS policies. Public reads are limited to rows explicitly marked `public_readable`.
- Storefront content schemas accept structured text fields and repeatable items only. They do not render arbitrary HTML and must never store scripts, secrets, tokens, signed URLs, customer data, or private settings.
- Inventory initialization is a server-side staff operation. `OWNER`, `ADMIN`, and `INVENTORY_MANAGER` may call the `initialize_variant_inventory` RPC; other roles are denied server-side. Product and variant forms must not directly update `stock_on_hand` or `reserved_quantity`.
- Phase 10 manual inventory operations are restricted to authenticated active `OWNER`, `ADMIN`, and `INVENTORY_MANAGER` staff. The UI calls server actions, which use the server-secret client to invoke the service-role-only `public.adjust_inventory_server(jsonb)` wrapper around `app_private.adjust_inventory(jsonb)`.
- Anonymous users and normal authenticated users cannot directly insert, update, or delete inventory ledger rows. Ledger corrections must be new authorized movements, never history rewrites.
- Inventory CSV exports are generated server-side after authorization and escape formula-like values. They must not contain customer data, cost price, raw audit metadata, SQL diagnostics, secrets, or private payment information.
- Phase 11 order management is restricted to active staff. OWNER, ADMIN and ORDER_MANAGER may transition orders and verify payments. CUSTOMER_SUPPORT may read orders and add internal notes, but cannot change order or payment status. INVENTORY_MANAGER cannot mutate orders.
- Order transitions call the service-role-only `public.transition_order_server(jsonb)` wrapper around `app_private.transition_order(jsonb)`. Payment verification calls `public.record_order_payment_server(jsonb)`. Direct browser/database writes to order status, payment history, stock reservation and inventory ledger remain denied.
- Order list DTOs mask broad contact details and avoid full addresses, customer notes, payment references, audit payloads, provider responses and internal idempotency rows. Full snapshots appear only on protected order detail pages for authorized staff.
- Public catalogue DTOs and pages must never expose `cost_price_xof`, physical stock, reserved stock, SQL/PostgREST diagnostics, or raw Supabase error objects.
- Login rate limiting uses a development-safe in-memory adapter behind an interface. The adapter normalizes by caller/email at the action boundary, expires entries, and caps stored keys, but it is process-local and not distributed across serverless instances.
- Supabase Auth also applies provider-level authentication rate limits. Configure those limits in the Supabase dashboard for production alongside application-level controls.
- Production can upgrade the adapter to a durable store such as Supabase, Redis, Upstash free-tier/low-cost Redis, Vercel KV, Cloudflare Turnstile plus WAF rules, or another inexpensive edge rate-limit provider without changing login action call sites.

## Audit Boundaries

- Supabase Auth remains the source for provider-level authentication audit logs.
- Application audit events are used for admin login success, denied login, failed login, and logout where they add operational value.
- Audit metadata must never include passwords, access tokens, refresh tokens, authorization headers, session cookies, raw emails, or payment credentials.
- Optional audit write failures must not bypass authentication or expose credentials.

## Sensitive Operations

Sensitive operations must be server-side and audited:

- Admin role changes
- Product, variant, price, and status updates
- Product image finalization, replacement, and deletion
- Inventory adjustments and initial stock initialization
- Order status transitions
- Payment verification
- Settings changes

## Validation

Use Zod at every external input boundary:

- Route handlers
- Server actions
- Webhooks
- Admin forms
- Checkout forms
- Contact forms
- Search and tracking parameters

## Catalogue Image Upload Flow

1. `prepareProductImageUpload` validates the active staff profile, requires product-management permission, verifies the product, validates declared size/MIME type, generates a safe object path, creates a pending upload row, and requests a Supabase signed upload URL with the cookie-backed server client.
2. The browser uploads directly to Supabase Storage using the signed upload token.
3. `finalizeProductImageUpload` re-authorizes staff, reloads the pending upload, confirms the object exists, downloads it, validates byte size and magic bytes, rejects active content signatures, inserts `product_images`, and writes sanitized audit metadata.
4. Invalid uploaded objects are deleted. If the database insert fails after validation, the object is removed as compensation.

Storage and PostgreSQL changes are not a single atomic transaction. Cleanup failures are audited with sanitized metadata only.

Phase 5 UI calls the same server-side preparation and finalization operations. The browser receives a signed upload token only to call Supabase Storage directly; it is never displayed or logged by the UI.

## Public Storefront Boundary

Phase 6 public catalogue pages read through the established public catalogue boundary:

- `public.public_catalogue_products`
- `public.public_catalogue_variants`
- `public.public_catalogue_images`

Public DTOs must not expose `cost_price_xof`, `stock_on_hand`, `reserved_quantity`, staff IDs, audit records, signed upload tokens, Storage write URLs, or internal notes. Public pages may display calculated availability states and public image URLs only.

The Phase 6/7 cart is client-side discovery state. It does not create orders, process payments, or reserve inventory. Phase 7 stores only product IDs, variant IDs, quantities, schema version, timestamp, and optional validated first-touch attribution in local storage. Product names, image URLs, prices, publication state, and availability are refreshed through the public cart reconciliation boundary before WhatsApp ordering.

The cart reconciliation route accepts only bounded product/variant IDs and quantities, reads through the public catalogue views, uses `Cache-Control: no-store`, and returns only safe public fields. It must not expose hidden product details, `cost_price_xof`, `stock_on_hand`, `reserved_quantity`, staff records, audit data, Supabase diagnostics, SQL, signed URLs, or private Storage paths.

First-touch attribution accepts only normalized UTM fields and must never be used for authorization.

Content update audit events store the content section key only. They must not include complete page payloads, secrets, or customer data.

## Phase 8 Guest Order Boundary

`POST /api/orders` is the only public checkout write boundary in Phase 8. Anonymous browsers cannot directly insert customers, orders, order items, order history, inventory transactions, notifications, audit logs, or idempotency records.

The route validates JSON content type, body size, strict request shape, honeypot, phone normalization, line bounds, and a checkout rate-limit interface before calling the database. Phone normalization uses the shared Côte d'Ivoire policy and converges accepted `+225`, `00225`, bare `225`, and local formats to the database constraint form `+225XXXXXXXXXX`; malformed values return `ORDER_INVALID_PHONE`. The server-secret Supabase client calls only the service-role wrapper `public.create_guest_order_server(jsonb)`.

The real order engine lives in `app_private.create_guest_order(jsonb)`. `app_private` is not in the Supabase exposed API schema list. The wrapper is revoked from `PUBLIC`, `anon`, and `authenticated`, and granted only to `service_role`.

Guest-order audit metadata is bounded and excludes full request bodies, full addresses, customer notes beyond order snapshots, payment secrets, cost prices, SQL diagnostics, stack traces, and notification internals. Notification rows are pending intents only; no external delivery occurs in Phase 8.

## Phase 9 Checkout And Tracking

`/commande`, `/commande/succes/[orderNumber]`, and `/suivi-commande` are `noindex, nofollow` customer routes and are excluded from the sitemap. `/commande` reads cart intent from the Phase 7 client cart, reconciles through `/api/cart/reconcile`, and submits only the Phase 8 request contract to `POST /api/orders`.

The checkout UI never imports the privileged Supabase client and never calculates authoritative prices, totals, publication state, or reservation state. It clears the cart only after a successful Phase 8 response.

Payment choices displayed at checkout are derived from `store_settings.enabled_payment_methods` plus structured `payment_method_configs`. Manual methods are hidden unless their public customer instructions are configured. OWNER and ADMIN may update this configuration from `/admin/contenu`; other roles must not mutate it.

Payment settings saves use the server-side admin client and update only the explicit payment columns on the boolean singleton row (`id = true`). If `payment_method_configs` is missing, the application reports the pending migration instead of falling back to hard-coded or local-only settings.

Detailed confirmation data is a short-lived session-storage recovery aid written after successful checkout. It excludes the internal order UUID and must not be treated as an authorization token. Direct visits to `/commande/succes/[orderNumber]` show a generic recovery state and do not query protected order tables by order number alone.

`POST /api/orders/track` is the server-only customer tracking lookup. It validates bounded JSON, normalizes Côte d'Ivoire phone numbers with the same shared Phase 8 policy used by checkout and customer matching, rate limits attempts, queries with the server-secret client, and returns data only when both order number and submitted phone match. Wrong phone, unknown order, malformed lookup, and rate-limited attempts use safe generic responses and do not expose SQL, Supabase details, customer IDs, full addresses, cost prices, inventory data, audit logs, notification payloads, or staff notes.

`POST /api/storefront/order-intents/whatsapp` is a server-controlled analytics boundary. It accepts only bounded cart identifiers/quantities, revalidates through the public catalogue views, stores safe authoritative intent snapshots with the server-secret client, and returns no internal IDs. It never calls the Phase 8 order transaction, never changes `reserved_quantity`, and never decrements `stock_on_hand`. Direct anonymous inserts into intent tables are not allowed; RLS limits staff reads to authorized operational roles.

The checkout client must require both `response.ok` and a valid Phase 8 confirmation body before writing confirmation state, clearing the cart, or navigating to success. Typed 400 responses and malformed success bodies are customer-safe failures.

## Phase 12 Notifications

`RESEND_API_KEY` and `CRON_SECRET` are server-only and must never use a `NEXT_PUBLIC_` prefix. `/api/cron/notifications` accepts only POST requests with `Authorization: Bearer <CRON_SECRET>` and returns safe counts only.

Notification delivery state is mutated through service-role-only database functions. Anonymous users and ordinary authenticated users cannot directly insert, update, cancel, or mark notifications sent. Admin list/detail DTOs mask recipients and expose bounded payload summaries instead of raw JSON, email HTML, provider responses, secrets, full customer addresses, or internal idempotency material.

The development notification provider logs only notification ID, subject/template context, and masked recipient. Production must use Resend and must not silently fall back to the development provider.

## Phase 13 Messages

Public contact submissions go through `POST /api/contact/messages`, which validates bounded JSON, honeypot, rate limit, explicit consent, and the telephone-or-email contact rule before calling the service-role-only message transaction. Anonymous users cannot directly read or insert `contact_messages`; normal authenticated non-staff users cannot read messages. Admin list DTOs mask contacts and use excerpts, while full message content and internal notes are restricted to active OWNER, ADMIN and CUSTOMER_SUPPORT staff. Customer/manual message content is rendered as text only and is never passed through `dangerouslySetInnerHTML`.

## Phase 15 Dashboard

`/admin` authenticates an active staff profile before loading analytics. The application calls `get_admin_dashboard_server(jsonb)` only through the server-only Supabase client, and the database independently checks the supplied actor against the active `profiles` row. The RPC is revoked from `PUBLIC`, `anon` and `authenticated` and granted only to `service_role`.

Role authorization occurs before each SQL section and again in the typed application projection. Unauthorized keys and arrays are absent from the DTO rather than hidden with CSS. CUSTOMER_SUPPORT and INVENTORY_MANAGER never receive aggregate revenue, paid trend or payment-method data. Lists select only dashboard fields and omit addresses, contacts, internal notes, audit/notification payloads, provider responses and cost prices.

Date boundaries are produced server-side, then validated by the database as exact business-local midnights and expected 7/30/90-day lengths. Client-provided arbitrary SQL, timezone or bucket expressions are never accepted. Admin metadata is `noindex, nofollow` and emits no public analytics metadata.

## Test Users

Create staff test users manually in Supabase Auth and then insert or update their `profiles` rows with current roles and `active` values. Do not add fake owner UUIDs to seed data and do not commit test credentials.

Recommended Phase 3 dashboard checks:

- Confirm email/password sign-in is enabled only for admin staff usage.
- Confirm production Supabase Auth rate limits are configured.
- Confirm every test admin has a matching `profiles` row with the intended `role` and `active` state.
- Confirm RLS remains enabled after any future migration.

## Google OAuth Configuration

Google OAuth is configured in two places:

- Google Cloud Console OAuth client authorized redirect URI: `https://PROJECT_REF.supabase.co/auth/v1/callback`.
- Supabase Auth URL allow list for the application callback: `http://localhost:3000/auth/callback` and the production equivalent, for example `https://www.example.com/auth/callback`.

Do not configure the application to trust Google email domains, Google metadata, or Supabase Auth metadata for staff authorization. The only authorization source is the current `public.profiles` row after server-side identity verification.

For local Supabase CLI provider testing, `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET` can be set outside source control. Production Google client ID and client secret belong in the Supabase Dashboard provider settings, not in browser-exposed variables.

## Phase 16 Hardening Controls

- `src/lib/http/read-bounded-json.ts` is the shared server-only body reader for public JSON routes. It validates JSON media types, rejects malformed UTF-8/JSON and stops reading at the configured byte limit instead of buffering an unbounded request first.
- Rate-limit material is normalized and SHA-256 hashed before entering the process-local adapter. This prevents raw phone/email/IP values from becoming in-memory keys or diagnostic material. It does not make the adapter distributed; production must add a shared edge or durable limiter for reliable multi-instance enforcement.
- `/auth/callback` uses `NEXT_PUBLIC_SITE_URL` as its canonical redirect origin after safe-path validation. Untrusted `Host`, forwarded-host and request-origin values do not select the OAuth redirect destination.
- Application headers include CSP, `nosniff`, strict-origin referrer policy, a restrictive permissions policy and clickjacking denial. Production adds HSTS and excludes `unsafe-eval`; development alone permits `unsafe-eval` for Next.js tooling. The current static CSP retains `unsafe-inline` for scripts/styles because moving the entire application to request nonces is disproportionate for this MVP; inline JSON-LD escapes `<` and customer data is never injected as HTML.
- The Phase 16 migration removes destructive/nonessential browser-role grants and makes notification retry a locked, active-staff-authorized, service-role-only operation. RLS remains required on every exposed table; application authentication never substitutes for database policy.
- Cron authorization remains POST plus bearer secret, returns `no-store` safe counts only, and maps unexpected processor failures to a sanitized response. Provider errors, database details and customer payloads are never returned.
- Production logs use stable event codes and bounded database codes only. They must not include raw request bodies, customer contacts, payment references, cookies, authorization headers, provider payloads or secret values.

### Production security gates

- Enable Supabase leaked-password protection before launch; the linked advisor currently reports it disabled.
- Apply and verify `20260814160000_phase16_security_hardening.sql` before deployment.
- Run linked Supabase lint/advisors after migration and classify intentional security-definer public projections separately from real privilege findings.
- Configure a distributed rate-limit/WAF layer for public order, tracking, contact and WhatsApp-intent endpoints.
