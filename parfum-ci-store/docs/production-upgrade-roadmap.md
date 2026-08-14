# Production upgrade roadmap

This is an operational roadmap, not a Phase 17 migration script. It keeps the current free-tier work reversible and identifies the changes required when traffic, reliability or commercial use grows.

## Recommended target

```text
Production
  Vercel Pro (or another commercial-compatible host)
    → production Supabase Pro
    → verified Resend domain/custom SMTP

Testing
  local Supabase for routine SQL/E2E
    or
  a separate staging Supabase project
```

The first low-risk step is upgrading the Vercel project before opening a commercial store. The current Supabase Free project can temporarily remain live if its quota, pause and recovery risks are accepted. The recommended durable target is a paid Supabase production project plus an isolated local/staging test target.

## Upgrade triggers

Upgrade hosting before any commercial launch. Upgrade or separate Supabase before one of these conditions becomes material:

- managed backups or point-in-time recovery are required;
- database, Storage, egress, Auth or email quotas approach their plan limits;
- pause risk is unacceptable;
- test and production data must be isolated;
- uptime/support requirements exceed the free tier;
- a reliable sub-daily notification schedule is required;
- preview deployments need safe write access.

## Vercel Hobby to Pro

1. Upgrade the existing Vercel project or import it into an approved commercial account.
2. Retain Node `22.14.0`, pnpm `10.15.0` and the standard Next.js build settings.
3. Configure Production and Preview environment scopes separately.
4. Protect the production branch and require CI.
5. Add the custom domain and choose one canonical host.
6. Update `NEXT_PUBLIC_SITE_URL`, Supabase Auth Site URL and explicit redirect URLs.
7. Redeploy and repeat all Phase 17 smoke checks.

### Notification cron adapter

The current processor is an authenticated `POST /api/cron/notifications`. Vercel Cron invokes `GET`; do not weaken the existing route or put the secret in a query string.

When enabling Vercel Cron:

1. extract the authorization and processor call into a shared server-only handler;
2. retain the existing POST route for controlled operational calls if still needed;
3. add a GET route that accepts only Vercel's `Authorization: Bearer <CRON_SECRET>` behavior;
4. return the same bounded, no-store, PII-free response;
5. test missing, invalid and valid authorization plus overlapping claims;
6. add `vercel.json` only after confirming the chosen plan supports the required frequency.

The Phase 12 retry and claiming rules remain unchanged.

## Current project: Free to Pro in place

An in-place Supabase plan upgrade is the simplest continuity option:

1. take a manual logical database backup and export Storage first;
2. record the current migration list and project reference;
3. upgrade the project in the Supabase dashboard;
4. verify backup/retention capabilities and configure the desired recovery policy;
5. verify Auth custom SMTP, redirect URLs and staff accounts;
6. rerun lint/advisors and bounded smoke tests;
7. keep the project reference and Vercel Supabase variables unchanged unless keys are rotated.

Rotate server keys if the upgrade/review exposes any credential concern. Never put a replacement secret under a `NEXT_PUBLIC_` name.

## Move to a separate production Supabase project

Use this path when production/test isolation or a clean long-term boundary is required:

1. create the destination project and record region/plan/recovery settings;
2. freeze schema changes and take a source checkpoint;
3. apply the committed migrations to the destination in order;
4. generate and compare destination types;
5. export/import PostgreSQL data with an approved logical-backup process;
6. copy `product-images` objects separately and verify checksums/counts;
7. recreate or migrate Auth users with a supported Supabase process—never by copying password hashes ad hoc;
8. verify RLS, grants, functions, storage policies, settings and staff roles;
9. set destination Site URL/custom SMTP configuration;
10. run SQL tests only before customer traffic and only if the destination is still isolated;
11. update Vercel variables, redeploy under maintenance and run read-only smoke checks;
12. place controlled cancellation/SOLD smoke orders;
13. switch traffic and retain the source according to the rollback/data-retention policy.

Update `CURRENT_PRODUCTION_SUPABASE_PROJECT_REF` in `scripts/e2e-safety.ts` and its regression test as part of the cutover. Never allowlist either live project for destructive E2E.

## Staging project

For a hosted staging environment:

- use a distinct project reference and non-production staff accounts;
- set `E2E_TARGET_KIND=staging` and `E2E_ALLOWED_SUPABASE_PROJECT_REF` to that exact ref only in the approved test runner;
- keep `ALLOW_DESTRUCTIVE_E2E=false` everywhere else;
- use synthetic `example.test` customer data and a development notification provider;
- reset/seed only the staging project;
- do not copy production PII into staging.

Local Supabase remains the preferred zero-cost target for destructive SQL and browser lifecycle work.

## Backups and Storage

Until managed backups are available:

- create encrypted logical backups outside Git before releases and high-risk operations;
- record timestamp, source project, tool version, encrypted location, checksum and authorized custodian;
- periodically test restoration into an isolated project/database;
- export the `product-images` bucket separately;
- never store dumps in public buckets, repository artifacts or unencrypted shared folders.

Once Pro is active, document managed backup retention and recovery ownership. Managed PostgreSQL backup still does not replace a Storage-object recovery plan.

## Post-upgrade acceptance

Repeat the Phase 17 checklist for migration alignment, Auth URLs, store settings, catalogue/inventory, Storage, Resend, cron, role access, tracking privacy, cancellation, SOLD conversion, dashboard freshness, canonical metadata and production performance. Record `PASS`, `FAIL` or `NOT VERIFIED`; an account upgrade alone is not deployment proof.
