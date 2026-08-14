# Architecture

## Technical Direction

- Next.js App Router and TypeScript.
- Server Components by default.
- Client Components only for browser state, event handlers, effects, or browser APIs.
- Supabase PostgreSQL, Auth, and Storage.
- Supabase SSR clients with cookie-based auth.
- Resend for transactional email.
- Tailwind CSS and shadcn/ui for UI primitives.
- Vitest for unit tests and Playwright for browser tests.
- Vercel for hosting.

## Application Boundaries

- `src/app/` contains routes, route layouts, loading/error states, route handlers, and `src/proxy.ts`.
- `src/components/` contains reusable UI composition and shadcn/ui components.
- `src/features/` contains domain modules such as catalogue, cart, checkout, orders, inventory, admin, and notifications.
- `src/lib/` contains shared infrastructure clients, validation helpers, formatting, auth, auditing, and payment provider contracts.
- `src/server/` contains server-only domain services, transactions, and data access.
- `supabase/` contains migrations, seed data, and RLS policies.
- `tests/` contains unit and browser tests.

## Proposed Route Tree

```txt
src/app/
  layout.tsx
  page.tsx
  (store)/
    layout.tsx
    catalogue/page.tsx
    marques/page.tsx
    marques/[slug]/page.tsx
    categories/[slug]/page.tsx
    produits/[slug]/page.tsx
    panier/page.tsx
    commande/page.tsx
    commande/confirmation/[reference]/page.tsx
    suivi/page.tsx
    contact/page.tsx
  admin/
    connexion/page.tsx
    layout.tsx
    page.tsx
    marques/page.tsx
    categories/page.tsx
    produits/page.tsx
    inventaire/page.tsx
    commandes/page.tsx
    commandes/[id]/page.tsx
    paiements/page.tsx
    messages/page.tsx
    notifications/page.tsx
    parametres/page.tsx
    audit/page.tsx
  api/
    webhooks/resend/route.ts
src/proxy.ts
```

## Proposed Source Tree

```txt
src/components/
  ui/
  layout/
  product/
src/features/
  admin/
  analytics/
  audit/
  cart/
  catalogue/
  checkout/
  contact/
  inventory/
  notifications/
  orders/
  payments/
  settings/
src/lib/
  auth/
  env/
  format/
  payments/
  supabase/
  validation/
src/server/
  audit/
  catalogue/
  checkout/
  inventory/
  orders/
  payments/
supabase/
  migrations/
  seed.sql
  tests/
tests/
  unit/
  e2e/
```

## Data Flow

Public catalogue pages read published product data through server-side Supabase clients. Cart state may live in browser storage until checkout, then checkout submits to a server-side action or route handler validated by Zod.

Order creation, payment state changes, fulfillment transitions, and inventory ledger writes must happen inside server-side transactions. UI code can request an operation but cannot directly change stock, order totals, or payment verification state.

## Supabase Clients and Auth Refresh

- `src/lib/supabase/browser.ts` creates the browser client from public Supabase env only.
- `src/lib/supabase/server.ts` creates the cookie-based SSR server client for Server Components, Server Actions, and Route Handlers.
- `src/lib/supabase/admin.ts` creates a privileged `server-only` client with `SUPABASE_SECRET_KEY`; never import it into Client Components.
- `src/proxy.ts` refreshes Supabase auth cookies using `@supabase/ssr` and `getClaims()` before route rendering.
- Public env validation lives in `src/lib/env/public.ts`; server secret validation lives in `src/lib/env/server.ts`.

## Payment Abstraction

Payment logic must use a provider interface under `lib/payments/` and server implementations under `server/payments/`. The MVP provider is `manual`, with methods for instructions, pending payment records, admin verification, and cash-on-delivery marking. A future gateway must be added behind the same interface.

## Phase 14 Settings Architecture

`src/lib/settings/service.ts` is the typed settings boundary. Its public, checkout and admin projections select or map only required fields. Section updates call the service-role-only `update_store_settings_server(jsonb)` RPC after application authorization and Zod validation. The database function rechecks the actor, locks the singleton, enforces `settings_revision`, applies only the named section, writes the bounded audit event and records the mutation identifier in one transaction.

The logo field currently accepts only a bounded HTTPS URL because the established media pipeline has no dedicated branding bucket. Unsafe or invalid values are omitted from the public projection. A future branding upload flow should use Supabase Storage rather than permitting arbitrary browser uploads.

`delivery_zones` stores queryable city/commune rules. `quote_delivery_server` and the `orders_apply_operational_settings` insert trigger share `app_private.quote_delivery`, so admin preview, checkout display and stored order economics use one rule implementation. The trigger rejects disabled ordering/maintenance and snapshots the fee, method, zone and estimate without replacing the applied Phase 8 function.

Maintenance is rendered in the `(store)` layout rather than Proxy. This deliberately preserves `/admin`, `/connexion`, auth callbacks, cron and API routes.

## Phase 15 Dashboard Architecture

`src/lib/analytics/date-range.ts` is the single business-calendar helper. It maps validated `7d`, `30d` and `90d` URL values to UTC timestamps for `Africa/Abidjan` local midnights. `src/lib/analytics/service.ts` loads the structured timezone, calls one service-role-only aggregate RPC and applies a defense-in-depth role projection.

The Server Component at `/admin` opts into request-time rendering with `connection()`. It passes one typed, already-aggregated DTO to presentational dashboard components; no browser component has database credentials or aggregates raw rows. The existing admin layout performs its navigation message-count query independently, while all dashboard sections are produced in one database round trip.

The MVP uses direct indexed SQL aggregates. It adds no Redis, materialized view, warehouse, cron rollup or real-time subscription. Existing order/payment/inventory/message/notification actions revalidate `/admin`; request-time rendering also ensures a return or reload reads current operational state.
