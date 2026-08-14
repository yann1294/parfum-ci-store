# Phase 17 — Free-tier CI and deployment readiness

This document is the tightened Phase 17 implementation contract. It replaces the assumption that Vercel Hobby can host a live commercial store.

## Goal

Prepare the completed MVP for a safe private/non-commercial Vercel Hobby deployment backed temporarily by the currently linked Supabase Free project. Establish CI, environment, test-data, backup, health, rollback and future-upgrade procedures without adding product features or mutating external accounts automatically.

Phase 17 does **not** approve a commercial production launch on Vercel Hobby. Before accepting real orders, move the Vercel project to Pro or another plan/platform whose terms permit the intended commercial use. Supabase Free may remain the initial backend only after its capacity, pausing and backup limitations are explicitly accepted.

## Fixed architecture for this phase

```text
Private/non-commercial verification
  → Vercel Hobby
  → existing Supabase Free project
      - Auth
      - PostgreSQL
      - Storage
      - RLS
  → Resend only after custom SMTP/domain setup is verified
```

Future live architecture:

```text
Customers
  → Vercel Pro or another commercial-compatible host
  → current Supabase project (temporary) or Supabase Pro
  → Resend
```

The linked Supabase project reference is `wzwoebydytqxgrwlcjiy`. It is an infrastructure identifier, not a credential. From this phase onward it is treated as stateful and non-disposable.

## Free-plan constraints and gates

- Vercel Hobby is limited to personal, non-commercial use. Commercial traffic is a deployment blocker, not a documentation exception.
- Hobby Cron can run at most once per day with imprecise timing. The Phase 12 processor currently requires authenticated `POST`, while Vercel Cron invokes `GET`; therefore no `vercel.json` cron is added in this phase.
- Supabase Free has limited database, Storage and egress quotas, may pause low-activity projects, and does not provide downloadable managed backups. Recovery therefore depends on a documented manual logical-backup and Storage-export procedure until upgrade.
- Supabase database backups do not include the stored image objects. PostgreSQL and `product-images` recovery are separate operations.
- Supabase's default Auth email sender is not a production mail service. Production Auth email requires custom SMTP; transactional application email uses the verified Resend configuration.
- No real credentials, Vercel project creation, domain change, Auth setting, staff cleanup, backup, email send or production order is performed automatically.

## Required implementation

### CI

Use Node `22.14.0`, pnpm `10.15.0` and the committed lockfile. GitHub Actions runs frozen install, the known-format-debt check, typecheck, ESLint, unit tests and production build with inert placeholder configuration. The job has read-only repository permission, concurrency cancellation and a bounded timeout.

Formatting remains temporarily non-blocking because the repository-wide check currently reports 124 legacy files outside the new Phase 17 artifacts. This is visible debt, not a hidden pass. New Phase 17 files must pass formatting.

CI does not receive production Supabase, Resend, cron or staff credentials and does not run database lifecycle E2E.

### E2E safety

`pnpm test:e2e` is the safe, browser-only default. It may read public pages and check liveness/accessibility but may not create orders, mutate settings, alter inventory, process payments or seed data.

`pnpm test:e2e:destructive` requires all of:

- `PLAYWRIGHT_MODE=destructive`;
- `ALLOW_DESTRUCTIVE_E2E=true`;
- `E2E_TARGET_KIND=local` with a localhost Supabase URL, or `E2E_TARGET_KIND=staging`;
- for staging, an exact `E2E_ALLOWED_SUPABASE_PROJECT_REF` match.

The current production project reference is hard-denied even if all flags are set. Fixture seed and cleanup scripts use the same boundary plus their existing phase-specific opt-in.

When the production backend changes, update the protected reference and its unit test in the same reviewed change. Never remove the hard deny merely to run a test.

### Liveness

`GET` and `HEAD /api/health` return only an uncached liveness result. The route does not query Supabase or expose configuration, counts, build paths or customer data.

### Database and data review

No migration is required. Before any launch:

1. run `pnpm db:migrations` and `pnpm db:push:dry`;
2. run `pnpm audit:production:readiness` for sanitized, read-only counts and configuration flags;
3. inspect each candidate in the dashboard before changing it;
4. disable test staff before considering Auth deletion;
5. archive/unpublish fixture catalogue records unless referentially safe to remove;
6. cancel eligible test orders through the established workflow;
7. preserve orders, payments, inventory ledger, notifications and audit history;
8. never reset, truncate or reseed this project.

The audit is evidence for review, not authority to delete.

### Store launch gate

Keep maintenance mode available and set `accepting_orders=false` until all of the following are true:

- commercial-compatible hosting is active;
- canonical URL and Supabase Auth URLs match;
- intended products and inventory are reviewed;
- at least one delivery method and its authoritative fee rules are enabled;
- intended payment methods and public instructions are complete;
- support, notification, identity and SEO settings contain real values;
- backup/export steps have been performed and recorded;
- custom SMTP/Resend and notification processing have been tested;
- post-deploy public, admin, tracking, cancellation and SOLD smoke checks pass.

## Environment matrix

| Variable                               | Browser | Local                          | Preview                                                          | Live                            | Secret | Purpose                              |
| -------------------------------------- | ------- | ------------------------------ | ---------------------------------------------------------------- | ------------------------------- | ------ | ------------------------------------ |
| `NEXT_PUBLIC_SITE_URL`                 | yes     | required                       | required                                                         | required                        | no     | Trusted canonical application origin |
| `NEXT_PUBLIC_SITE_NAME`                | yes     | required                       | required                                                         | required                        | no     | Fallback brand name                  |
| `NEXT_PUBLIC_SUPABASE_URL`             | yes     | required                       | required                                                         | required                        | no     | Supabase project URL                 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes     | required                       | required                                                         | required                        | no     | Browser-safe Supabase key            |
| `SUPABASE_SECRET_KEY`                  | no      | required for server workflows  | required only if preview server writes are intentionally enabled | required                        | yes    | Privileged server operations         |
| `SUPABASE_STORAGE_BUCKET`              | no      | required                       | required                                                         | required                        | no     | Product image bucket id              |
| `NOTIFICATION_PROVIDER`                | no      | `development` recommended      | `development` recommended                                        | `resend`                        | no     | Notification adapter                 |
| `RESEND_API_KEY`                       | no      | optional                       | avoid real key                                                   | required for Resend             | yes    | Resend provider credential           |
| `EMAIL_FROM`                           | no      | required by Resend             | avoid real sender                                                | required                        | no     | Verified sender identity             |
| `CRON_SECRET`                          | no      | required to exercise processor | optional while cron disabled                                     | required when scheduler enabled | yes    | Notification processor bearer secret |
| `NOTIFICATION_BATCH_SIZE`              | no      | optional                       | optional                                                         | recommended                     | no     | Bounded processor batch              |
| `NOTIFICATION_MAX_ATTEMPTS`            | no      | optional                       | optional                                                         | recommended                     | no     | Retry cap                            |
| `ALLOW_DESTRUCTIVE_E2E`                | no      | false by default               | false                                                            | always false                    | no     | Explicit lifecycle-test gate         |
| `E2E_TARGET_KIND`                      | no      | local when approved            | staging only with isolated DB                                    | unset                           | no     | Declares destructive test target     |
| `E2E_ALLOWED_SUPABASE_PROJECT_REF`     | no      | unset                          | isolated staging ref only                                        | unset                           | no     | Exact staging allowlist              |

Database-managed business values from Phase 14 are not duplicated into Vercel environment variables.

## Completion criteria

Phase 17 repository readiness is complete when CI configuration, safe E2E defaults, the hard production deny, liveness, documentation and local verification pass. External deployment remains `NOT VERIFIED` until Vercel configuration, environment variables, Auth URLs, backup, production data review and post-deploy smoke checks are actually performed.

The MVP is not safe to accept commercial traffic while it remains on Vercel Hobby.

## Plan references

- [Vercel Hobby plan](https://vercel.com/docs/plans/hobby)
- [Vercel Cron usage and pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing)
- [Vercel Cron authorization](https://vercel.com/docs/cron-jobs/manage-cron-jobs)
- [Supabase pricing and plan limits](https://supabase.com/pricing)
- [Supabase Free project pausing](https://supabase.com/docs/guides/platform/free-project-pausing)
- [Supabase database backups](https://supabase.com/docs/guides/platform/backups)
- [Supabase Auth custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Supabase password security](https://supabase.com/docs/guides/auth/password-security)
