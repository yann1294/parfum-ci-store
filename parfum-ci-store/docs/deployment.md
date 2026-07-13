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

Supabase values come from the project dashboard:

- `NEXT_PUBLIC_SUPABASE_URL`: Project URL from Project Settings or Connect dialog.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: publishable/anon-style browser-safe key from API settings.
- `SUPABASE_SECRET_KEY`: server-only secret/service-role-style key for privileged server code. Never prefix it with `NEXT_PUBLIC_`.
- `SUPABASE_STORAGE_BUCKET`: Storage bucket name for product images.

Required Supabase env:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
SUPABASE_STORAGE_BUCKET=
```

## Google OAuth

Configure Google OAuth manually before production approval:

- Google Cloud Console authorized redirect URI: `https://PROJECT_REF.supabase.co/auth/v1/callback`.
- Supabase Dashboard Google provider: enable Google and store the Google client ID/secret.
- Supabase Auth URL allow list: `http://localhost:3000/auth/callback` for development and the production callback URL, for example `https://www.example.com/auth/callback`.

The application callback is `/auth/callback`; it never receives or stores Google passwords and never assigns staff roles.

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
