# Security

## Authentication

- Admin authentication is required for the MVP back office.
- Supabase Auth is the authentication provider.
- Use Supabase SSR clients with cookie-based auth for server-rendered and server-action flows.
- `src/proxy.ts` refreshes auth cookies using Supabase SSR and `auth.getClaims()`.
- Server code must not trust `auth.getSession()` for authorization decisions.
- Customer accounts are out of scope for the MVP.

## Authorization

- RLS must be enabled on every exposed Supabase table.
- Public access is limited to published catalogue data and validated public writes.
- Admin mutations require authenticated admin role checks.
- `SUPABASE_SECRET_KEY` is server-only and must never be imported into Client Components.
- The privileged Supabase client is isolated in `src/lib/supabase/admin.ts` and imports `server-only`.

## Secrets and Privacy

- Never expose secret keys to the browser.
- Never commit secrets.
- Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` may be used by browser code.
- Server secrets are validated separately in `src/lib/env/server.ts`.
- Never store card details, Mobile Money PINs, OTPs, or CVVs.
- Never log full customer addresses, secrets, payment credentials, auth tokens, or raw webhook signatures.
- Redact audit and analytics metadata by default.

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
