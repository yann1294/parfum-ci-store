# Deployment

## Current Platform Gate

Vercel Hobby is used only for private/non-commercial deployment verification. Do not accept commercial orders on this plan. Upgrade to Vercel Pro or another commercial-compatible host before public sales.

The existing Supabase Free project (`wzwoebydytqxgrwlcjiy`) is the temporary production candidate. It is no longer disposable: never reset, truncate, reseed or run destructive E2E against it. Supabase Free's quota, pausing and backup limitations must be accepted explicitly or removed by upgrading before launch.

The authoritative free-tier contract is `docs/phase-17-free-tier-deployment-plan.md`; future plan/project changes are covered by `docs/production-upgrade-roadmap.md`.

## Required Services

- Supabase project with PostgreSQL, Auth, Storage, and RLS policies.
- Resend account and verified sending domain.
- Vercel project connected to the repository.

For a commercial launch, the Vercel project must use Pro or another compatible hosting plan. Supabase may temporarily remain Free, but manual backup/Storage export and capacity monitoring are required.

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
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_SITE_NAME=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
SUPABASE_STORAGE_BUCKET=
```

Legacy Phase 6 environment inputs (Phase 14 contact/social consumers do not use these as operational fallbacks):

- `NEXT_PUBLIC_WHATSAPP_NUMBER`
- `NEXT_PUBLIC_INSTAGRAM_URL`
- `NEXT_PUBLIC_FACEBOOK_URL`
- `NEXT_PUBLIC_TIKTOK_URL`
- `NEXT_PUBLIC_CONTACT_EMAIL`

Destructive test controls are never production values:

- `ALLOW_DESTRUCTIVE_E2E` must remain false/unset in Vercel;
- `E2E_TARGET_KIND` must remain unset in Vercel Production;
- `E2E_ALLOWED_SUPABASE_PROJECT_REF` may name only a future isolated staging project.

Preview deployments that share the live Supabase project are read-only verification surfaces. Do not sign in to mutate settings, create fixture orders or seed them.

Set `NEXT_PUBLIC_SITE_URL` to the canonical production origin. Do not rely on localhost fallbacks in production metadata, sitemap, robots, or WhatsApp product links.

## Google OAuth

Configure Google OAuth manually before production approval:

- Google Cloud Console authorized redirect URI: `https://PROJECT_REF.supabase.co/auth/v1/callback`.
- Supabase Dashboard Google provider: enable Google and store the Google client ID/secret.
- Supabase Auth URL allow list: `http://localhost:3000/auth/callback` for development and the production callback URL, for example `https://www.example.com/auth/callback`.

The application callback is `/auth/callback`; it never receives or stores Google passwords and never assigns staff roles.

## CI And Release Checks

GitHub Actions uses Node `22.14.0`, pnpm `10.15.0`, a frozen lockfile, read-only repository permission, inert environment values and a bounded job. It runs format visibility, typecheck, lint, unit tests and a production build. Format is temporarily non-blocking because the repository-wide check currently reports 124 legacy files; all new Phase 17 files are still formatted.

CI never receives live Supabase/Resend/cron/staff credentials and does not run lifecycle E2E. `pnpm test:e2e` is the safe browser subset; `pnpm test:e2e:destructive` requires isolated local/staging gates.

Before deployment:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Before any release also run:

```bash
pnpm db:migrations
pnpm db:push:dry
pnpm audit:production:readiness
```

## Database Changes

- Migrations must be reviewed before production.
- Destructive migrations require an explicit stop and explanation.
- RLS policies must ship with every exposed table.
- Seed data must not contain real customer information.
- Run `pnpm exec supabase db reset` only against a local Supabase instance when migrations change.
- Never reset the linked remote database as part of deployment verification.
- No Phase 17 database migration is required.
- Run `psql "$DATABASE_URL" -f supabase/tests/schema_smoke.sql` after applying migrations.
- Apply Phase 4 with `pnpm exec supabase db push`, then regenerate types with `pnpm exec supabase gen types typescript --linked > src/types/database.types.ts`.
- Run `psql "$DATABASE_URL" -f supabase/tests/phase4_catalogue_storage.sql` after applying the Phase 4 migration.
- Phase 6.5 adds the `store_content` migration. Review it, then apply with `pnpm exec supabase db push` and regenerate types with `pnpm exec supabase gen types typescript --linked > src/types/database.types.ts`.
- Phase 8 adds the guest-order transaction migration. Review `supabase/migrations/20260723080100_phase8_guest_order_transaction.sql`, apply it manually with `pnpm exec supabase db push`, then regenerate types with `pnpm exec supabase gen types typescript --linked > src/types/database.types.ts`. Run `psql "$DATABASE_URL" -f supabase/tests/phase8_guest_order_transaction.sql` against an isolated local or staging database, plus real concurrent final-unit tests, before enabling a checkout UI.
- Phase 9 adds customer checkout, confirmation, and tracking routes. The Phase 9 correction migration `20260727090100_phase9_payment_settings_whatsapp_intents.sql` adds structured payment-method configuration and WhatsApp order-intent analytics. Review it, apply it manually with `pnpm exec supabase db push`, then regenerate types with `pnpm exec supabase gen types typescript --linked > src/types/database.types.ts`.
- Confirm Phase 8 is applied and concurrency-verified before enabling `/commande`. Payment method and delivery method choices come from `store_settings.enabled_payment_methods` and `store_settings.enabled_delivery_methods`; merchant/payment instructions come from managed store settings and content. Configure these values before production checkout testing.
- After applying the Phase 9 correction migration, verify `/admin/contenu` can save multiple payment methods and that `src/types/database.types.ts` includes `payment_method_configs`, `storefront_order_intents`, and `storefront_order_intent_items`.
- Phase 10 adds transactional admin inventory management in `20260803143000_phase10_inventory_adjustments.sql`. Review the migration, apply it manually with `pnpm exec supabase db push`, regenerate types with `pnpm exec supabase gen types typescript --linked > src/types/database.types.ts`, then run SQL/integration concurrency tests before approving inventory operations.
- Phase 11 adds transactional admin order management in `20260803153000_phase11_order_management.sql`. Review the migration, apply it manually with `pnpm exec supabase db push`, regenerate types with `pnpm exec supabase gen types typescript --linked > src/types/database.types.ts`, then run `psql "$DATABASE_URL" -f supabase/tests/phase11_order_management.sql` plus real transition/payment/concurrency tests before approving order operations.

## Product Images

The `product-images` bucket is public, limited to 5 MB, and accepts JPEG, PNG, and WebP only. Do not store confidential imagery in it.

Product images use direct signed uploads:

1. server prepares a signed upload;
2. browser uploads directly to Supabase Storage;
3. server finalizes and validates the object;
4. server inserts the image record and writes an audit event.

Vercel functions must not receive the 5 MB image file body. Storage cleanup is compensating rather than cross-service atomic; monitor `CATALOGUE_IMAGE_CLEANUP_FAILED` audit events.

The storefront uses `next/image` for public product images and restricts remote images to the configured Supabase hostname under `/storage/v1/object/public/product-images/**`.

## Public SEO

Phase 6 generates:

- static metadata for public informational pages;
- product metadata from public product queries only;
- Product JSON-LD for active products;
- `/sitemap.xml` with public static routes and active product URLs;
- public `/mentions-legales`, `/politique-de-confidentialite` and `/conditions-generales-de-vente` routes with canonical metadata and footer links;
- `/robots.txt` that blocks admin/auth/cart paths and blocks all crawling on non-production deployments.

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
- Catalogue pagination returns bounded pages with default size 8 and maximum size 32.
- `/admin/contenu` is accessible only to OWNER and ADMIN; public Contact and Delivery pages reflect saved content after revalidation.
- Public cart copy contains no internal phase terminology and the WhatsApp CTA does not create orders or reserve inventory.
- Phase 7 cart validation uses `/api/cart/reconcile` with `Cache-Control: no-store`. Confirm the route is reachable in production and that public catalogue view grants are applied before validating cart readiness or WhatsApp ordering.
- Phase 8 `/api/orders` must return `Cache-Control: no-store`, call the service-role-only transaction wrapper, and create pending notification intents only. Do not deploy checkout UI until the final-unit concurrency and rollback checks have passed.
- Phase 9 `/commande`, `/commande/succes/[orderNumber]`, and `/suivi-commande` must be `noindex, nofollow` and absent from `/sitemap.xml`. `/api/orders/track` must return `Cache-Control: no-store` and require order number plus phone.
- `/api/storefront/order-intents/whatsapp` must return `Cache-Control: no-store`, create only analytics intent rows from authoritative cart data, and must not create orders or inventory reservations.
- `/admin/inventaire` must be accessible only to authorized staff. Manual inventory operations must call the transactional adjustment function, preserve reserved-stock invariants, create immutable ledger rows and audit rows, and refresh public availability.
- `/admin/commandes` must be accessible only to authorized order staff. Status transitions must call the transactional transition function, cancellation must release reservations exactly once, delivery must convert reservations into `SOLD` exactly once, and returns must not automatically restock inventory.
- Phase 12 notification delivery requires `EMAIL_FROM`, `CRON_SECRET`, `NOTIFICATION_PROVIDER`, `NOTIFICATION_BATCH_SIZE`, and `NOTIFICATION_MAX_ATTEMPTS`. Production must set `NOTIFICATION_PROVIDER=resend` and `RESEND_API_KEY`; local/test may use `NOTIFICATION_PROVIDER=development`. Phase 14 moves the admin notification recipient to `store_settings.notification_email`; `ADMIN_NOTIFICATION_EMAIL` is no longer an application source.
- The Phase 12 route accepts authenticated POST, while Vercel Cron invokes GET. Do not add an incompatible `vercel.json` entry or put `CRON_SECRET` in a URL. On Vercel Pro, add the shared authenticated GET adapter described in `docs/production-upgrade-roadmap.md`, or use an external scheduler that can send the existing POST bearer request. Hobby's once-daily, imprecise schedule is not appropriate for prompt operational notifications.
- Phase 13 adds `20260804133000_phase13_customer_messages.sql`. Apply it manually, regenerate database types, then run `psql "$DATABASE_URL" -f supabase/tests/phase13_messages.sql` against a non-production database before enabling the public contact form in production.
- Phase 14 adds `20260813090000_phase14_store_settings_delivery.sql`. Review it, then manually run `pnpm exec supabase db push` and regenerate `src/types/database.types.ts`; do not hand-edit generated types. Before enabling checkout, configure a default delivery fee or enabled zones, run `supabase/tests/phase14_settings.sql`, rerun the Phase 8 SQL regression, and verify a real order's stored fee/total/snapshot.
- Phase 14 business configuration lives in the database. Environment-only values remain provider/Supabase/cron secrets. `NEXT_PUBLIC_*` contact/social values are legacy fallbacks and should not be treated as the operational source after rollout.
- Phase 15 adds `20260814090000_phase15_admin_dashboard.sql`. Review and apply it manually, regenerate Supabase types, then run `supabase/tests/phase15_dashboard.sql` against a disposable database before enabling `/admin`. Confirm `business_timezone = 'Africa/Abidjan'`, the aggregate RPC is service-role-only and restricted roles receive no financial keys.
- Phase 15 is request-time rendered. No new environment variable, external analytics service, scheduler or cache store is required. After deployment, verify representative query plans, range switching, role variants, deep links and responsive layouts.
- Phase 16 adds `20260814160000_phase16_security_hardening.sql`. Review and apply it manually, regenerate Supabase types, and run `supabase/tests/phase16_security_hardening.sql` before deployment. Confirm browser roles cannot truncate or mutate sensitive tables and that manual notification retry is service-role-only and atomic.
- Configure the production canonical `NEXT_PUBLIC_SITE_URL` and add the matching `/auth/callback` URL to the Supabase Auth allow list. OAuth redirects intentionally ignore request `Host` headers.
- Confirm production responses contain CSP, `nosniff`, clickjacking denial, strict referrer policy, permissions policy and HSTS. Exercise Supabase authentication, Storage images, checkout, admin and charts under the deployed CSP.
- Supabase leaked-password protection is Pro-only. On Free, require strong unique staff passwords and retain the advisor warning; enable the feature immediately after upgrading. Rerun `pnpm exec supabase db lint --linked` plus `pnpm exec supabase db advisors --linked` after the final migration.
- The built-in application limiter is process-local even though its keys are privacy-hashed. Configure a shared rate limiter or platform WAF rules for order creation, tracking, contact and WhatsApp intent before multi-instance launch.
- Run `pnpm test:e2e` for read-only public checks. Run `pnpm test:e2e:destructive` only against local Supabase or a future allowlisted staging project. Do not use production customer records or the linked stateful project as fixtures.
- Perform production post-deploy smoke checks for public browsing, COD checkout, manual Mobile Money instructions/payment verification, cancellation, inventory, support messages, notification processing, settings authority, dashboard roles, tracking privacy and admin/auth access during maintenance.
- Before commercial opening, complete the legal owner checklist in `docs/legal-and-licensing.md`. Verify publisher identity, registration/tax details, privacy contact, return/refund rules, data-retention schedule, international-processing formalities and rights to catalogue assets. Repository policy text is a technical draft, not legal sign-off.
- Verify the legal routes remain reachable while maintenance mode is on, and verify checkout/contact links open the deployed canonical documents. Do not remove incomplete-information warnings until the missing facts and approval are recorded.
- Do not deploy real email delivery until SPF/DKIM/domain setup and a Resend sandbox acceptance test are verified with non-customer data.
- Test a controlled `/api/orders` HTTP 400 before launch. It must leave the cart intact and must not redirect to a confirmation route.
- Admin routes require authentication.
- Checkout creates orders without exposing secrets.
- Resend sends transactional messages.
- Supabase Storage images render from approved buckets.

## Free-Tier Backup And Recovery

Supabase Free does not provide downloadable managed backups. Before release or high-risk maintenance, create an encrypted logical database backup using an approved Supabase/PostgreSQL process, record its timestamp/checksum/custodian and test restoration into an isolated environment. Never commit it; `backups/`, `production-backups/`, `*.dump` and `*.dump.gz` are ignored.

Database backups do not contain the actual `product-images` objects. Export and verify the bucket separately. Preserve staff/audit references and immutable transactional histories; use order cancellation and compensating inventory workflows instead of table cleanup.

## Vercel Project Setup

- Framework preset: Next.js; standard build/output behavior.
- Install: `pnpm install --frozen-lockfile`.
- Build: `pnpm build`.
- Node: `22.14.0`; package manager: `pnpm@10.15.0`.
- Production branch: protected `main` with CI required where repository settings allow.
- Production `NEXT_PUBLIC_SITE_URL`: the exact HTTPS canonical origin, never localhost.
- Preview: read-only when it shares the live Supabase project.
- Automatic database migration/seed: disabled. Migrations remain a reviewed manual step.

Do not configure the deployment as commercial traffic while it remains on Hobby.

## Health And Observability

`GET` or `HEAD /api/health` proves application liveness only and returns no dependency/configuration details. Monitor Vercel build/function/cron logs for sanitized route failure codes, `/api/orders` 5xx responses, notification processor failures, Supabase connectivity errors and unexpected authorization denials. Do not add customer details to logs.

## Production Data Review

Run `pnpm audit:production:readiness`. The script is read-only and outputs counts, completeness flags, bucket policy and fixture-candidate counts without identities or PII. Then manually classify records:

- intended catalogue/settings: `KEEP` after review;
- active synthetic staff: disable, then review Auth deletion separately;
- recognizable fixture catalogue: archive/unpublish or remove only when referentially safe;
- orders/payments/inventory/notifications: `ARCHIVE` or keep; never casually delete;
- audit/ledger history: `KEEP`.

The audit output is not a cleanup command.

## Deployment And Rollback Sequence

1. Upgrade to a commercial-compatible host before real traffic.
2. Set `accepting_orders=false`; enable maintenance if needed.
3. Create/record database and Storage backups.
4. Verify migrations and dry-run pending changes.
5. Review data, staff, catalogue, inventory and Phase 14 settings.
6. Configure Vercel variables, Supabase Auth URLs, custom SMTP/Resend and canonical domain.
7. Deploy the application; apply reviewed database migrations separately if any.
8. Check `/api/health`, public/admin routes, CSP/assets/metadata and role boundaries.
9. Run controlled cancellation and SOLD smoke orders only with designated stock.
10. Verify tracking privacy, notification acceptance and dashboard changes.
11. Restore intended maintenance/order-acceptance settings.

Application rollback uses Vercel deployment rollback/redeploy. Database rollback uses a reviewed forward fix; never delete an applied migration. For destructive incidents, stop writes and follow the recorded backup restore procedure.
