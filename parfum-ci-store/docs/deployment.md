# Deployment

## Platform

Deploy to Vercel.

## Required Services

- Supabase project with PostgreSQL, Auth, Storage, and RLS policies.
- Resend account and verified sending domain.
- Vercel project connected to the repository.

## Environment Variables

Use `.env.example` as the template. Real values belong in `.env.local` for development and Vercel environment variables for preview/production.

Only `NEXT_PUBLIC_*` values may be exposed to the browser. Supabase secret keys, Resend API keys, order token secrets, and payment configuration are server-only.

Required Supabase env:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
SUPABASE_STORAGE_BUCKET=
```

## Release Checks

Before deployment:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Database Changes

- Migrations must be reviewed before production.
- Destructive migrations require an explicit stop and explanation.
- RLS policies must ship with every exposed table.
- Seed data must not contain real customer information.
- Run `pnpm exec supabase db reset` only against a local Supabase instance when migrations change.
- Never reset the linked remote database as part of deployment verification.
- Run `psql "$DATABASE_URL" -f supabase/tests/schema_smoke.sql` after applying migrations.

## Post-Deploy Checks

- Public pages load in French.
- Catalogue reads published products only.
- Admin routes require authentication.
- Checkout creates orders without exposing secrets.
- Resend sends transactional messages.
- Supabase Storage images render from approved buckets.
