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
- `SUPABASE_STORAGE_BUCKET`: legacy server-side storage bucket setting. Phase 4 product-image code uses the fixed migration-managed bucket id `product-images`.

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
- Apply Phase 4 with `pnpm exec supabase db push`, then regenerate types with `pnpm exec supabase gen types typescript --linked > src/types/database.types.ts`.
- Run `psql "$DATABASE_URL" -f supabase/tests/phase4_catalogue_storage.sql` after applying the Phase 4 migration.

## Product Images

The `product-images` bucket is public, limited to 5 MB, and accepts JPEG, PNG, and WebP only. Do not store confidential imagery in it.

Product images use direct signed uploads:

1. server prepares a signed upload;
2. browser uploads directly to Supabase Storage;
3. server finalizes and validates the object;
4. server inserts the image record and writes an audit event.

Vercel functions must not receive the 5 MB image file body. Storage cleanup is compensating rather than cross-service atomic; monitor `CATALOGUE_IMAGE_CLEANUP_FAILED` audit events.

## Admin Catalogue

Phase 5 adds authenticated admin routes:

- `/admin/produits`
- `/admin/produits/nouveau`
- `/admin/produits/[id]`
- `/admin/marques`
- `/admin/categories`

Before enabling catalogue operations in production, confirm the Phase 4 migration has been applied, generated database types are current, `product-images` exists with the expected policies, and role-specific staff accounts have been tested.

## Post-Deploy Checks

- Public pages load in French.
- Catalogue reads published products only.
- Admin routes require authentication.
- Checkout creates orders without exposing secrets.
- Resend sends transactional messages.
- Supabase Storage images render from approved buckets.
