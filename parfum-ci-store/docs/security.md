# Security

## Authentication

- Admin authentication is required for the MVP back office.
- Public customers do not need accounts for the MVP.
- Supabase Auth is the authentication provider.
- Use Supabase SSR clients with cookie-based auth for server-rendered and server-action flows.
- `src/proxy.ts` refreshes auth cookies using Supabase SSR and `auth.getClaims()`.
- Server code must not trust `auth.getSession()` for authorization decisions.
- `/connexion` authenticates staff with email/password and redirects only to validated local return paths. External, protocol-relative, malformed, `/connexion`, and `/acces-refuse` return paths fall back to `/admin`.
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
- Inventory adjustments
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

## Test Users

Create staff test users manually in Supabase Auth and then insert or update their `profiles` rows with current roles and `active` values. Do not add fake owner UUIDs to seed data and do not commit test credentials.

Recommended Phase 3 dashboard checks:

- Confirm email/password sign-in is enabled only for admin staff usage.
- Confirm production Supabase Auth rate limits are configured.
- Confirm every test admin has a matching `profiles` row with the intended `role` and `active` state.
- Confirm RLS remains enabled after any future migration.
