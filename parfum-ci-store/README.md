# Parfum CI Store

Perfume e-commerce and operations platform for customers in Côte d'Ivoire.

The MVP is French-first, uses XOF pricing, supports guest checkout, and accepts manual Mobile Money verification plus cash on delivery. Admin authentication is required for back-office features.

## Stack

- Next.js App Router with TypeScript
- pnpm only
- Tailwind CSS and shadcn/ui
- Supabase PostgreSQL, Auth, Storage, RLS, and SSR cookie-based clients
- Resend transactional email
- Vitest unit tests
- Playwright browser tests
- Vercel deployment (Hobby for private/non-commercial verification; Pro or another commercial-compatible host before live sales)

## Current Deployment Gate

The linked Supabase Free project is the intended temporary MVP backend and is no longer disposable. Never reset, truncate, broadly clean, seed or run database-mutating E2E against it.

Vercel Hobby is used only for private/non-commercial deployment verification. It is not approved here for a commercial storefront. Before accepting real orders, upgrade to Vercel Pro or another host whose plan permits the intended use and complete the external checks in `docs/phase-17-deployment-verification.md`.

See `docs/phase-17-free-tier-deployment-plan.md` for the tightened Phase 17 contract and `docs/production-upgrade-roadmap.md` for the future Vercel/Supabase separation and upgrade path.

## Prerequisites

- Node.js compatible with the version required by `package.json`
- pnpm
- Docker and the Supabase CLI for a local database, or access to a non-production Supabase project
- PostgreSQL `psql` for the SQL integration suite

## Local Development

```bash
pnpm install
cp .env.example .env.local
pnpm exec supabase start
pnpm exec supabase db reset
pnpm exec supabase gen types typescript --local > src/types/database.types.ts
pnpm dev
```

Open `http://localhost:3000`.

`supabase db reset` destroys and rebuilds the local Supabase database. Never run it against a linked production project. The migrations create the `product-images` bucket and its policies; no separate manual bucket creation is required after a complete local reset.

## Configuration

Copy `.env.example` and replace placeholders locally. Never commit real values.

- Required browser-safe values: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Required server values: `SUPABASE_SECRET_KEY`, `CRON_SECRET`, notification provider settings, and the configured mail sender.
- Live-only provider setup: `RESEND_API_KEY` when `NOTIFICATION_PROVIDER=resend`, verified Resend sender/domain and Auth custom SMTP, a scheduler compatible with the POST processor, Supabase Auth redirect URLs, and production staff accounts.
- Optional local/E2E values: the `PLAYWRIGHT_*` role credentials and guarded fixture flags documented in `docs/testing.md`.

Business contact, payment, delivery, SEO, notification-recipient, and availability settings live in the Phase 14 database singleton. Provider credentials remain environment-only.

## Database And Staff Setup

For an existing linked non-production project, review migration SQL before running:

```bash
pnpm exec supabase migration list
pnpm exec supabase db push
pnpm exec supabase gen types typescript --linked > src/types/database.types.ts
```

Do not hand-edit generated database types. Create staff users in Supabase Auth, then create matching active `profiles` rows with one of the established roles: `OWNER`, `ADMIN`, `ORDER_MANAGER`, `INVENTORY_MANAGER`, or `CUSTOMER_SUPPORT`. Never seed a fabricated production owner UUID.

Guarded catalogue fixtures are available only for local Supabase or a future explicitly allowlisted staging project:

```bash
ALLOW_DESTRUCTIVE_E2E=true E2E_TARGET_KIND=local ALLOW_E2E_SEED=true pnpm seed:phase5
ALLOW_DESTRUCTIVE_E2E=true E2E_TARGET_KIND=local ALLOW_E2E_SEED=true pnpm cleanup:phase5
```

The known live Supabase project is hard-denied even if flags are supplied. Use `pnpm audit:production:readiness` for a read-only, sanitized pre-launch inventory; it never deletes or prints identities/customer records.

## Verification

Run the application suite with:

```bash
pnpm format:check
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e # safe public browser checks only
pnpm build
```

Destructive lifecycle E2E is separate and must target local Supabase or an explicitly allowlisted staging project:

```bash
PLAYWRIGHT_MODE=destructive \
ALLOW_DESTRUCTIVE_E2E=true \
E2E_TARGET_KIND=local \
pnpm test:e2e:destructive
```

Run SQL tests only against a disposable local or staging database after its migrations are current:

```bash
for test_file in supabase/tests/schema_smoke.sql supabase/tests/phase4_catalogue_storage.sql supabase/tests/phase8_guest_order_transaction.sql supabase/tests/phase11_order_management.sql supabase/tests/phase12_notifications.sql supabase/tests/phase13_messages.sql supabase/tests/phase14_settings.sql supabase/tests/phase15_dashboard.sql supabase/tests/phase16_security_hardening.sql; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$test_file"
done
```

Use a non-production connection string. The Playwright suite uses desktop Chromium for the complete suite and a focused Pixel 7 project for representative responsive and accessibility hardening checks.

For a production-mode local smoke test:

```bash
pnpm build
pnpm start
```

Then check the representative public and protected routes listed in `docs/phase-16-hardening-verification.md` and stop the server.

## Scripts

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm lint:fix
pnpm typecheck
pnpm test
pnpm test:watch
pnpm test:e2e
pnpm test:e2e:destructive
pnpm test:e2e:ui
pnpm format
pnpm format:check
pnpm audit:production:readiness
pnpm db:migrations
pnpm db:push:dry
pnpm db:types:linked
```

## Documentation

- Product requirements: `docs/product-requirements.md`
- Architecture: `docs/architecture.md`
- Database schema: `docs/database-schema.md`
- Business rules: `docs/business-rules.md`
- Design system: `docs/design-system.md`
- Security: `docs/security.md`
- Testing: `docs/testing.md`
- Deployment: `docs/deployment.md`
- Phase 17 free-tier deployment contract: `docs/phase-17-free-tier-deployment-plan.md`
- Future production upgrade: `docs/production-upgrade-roadmap.md`
- Manual acceptance test: `docs/manual-acceptance-test.md`

Read the relevant document before changing behavior. Read the matching Next.js guide in `node_modules/next/dist/docs/` before changing framework behavior.
