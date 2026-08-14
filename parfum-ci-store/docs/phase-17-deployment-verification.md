# Phase 17 Deployment Verification

Date: 2026-08-14

Status vocabulary is restricted to `PASS`, `FAIL` and `NOT VERIFIED`. This document separates repository readiness from external deployment and commercial-launch approval.

## Scope decision

The original Phase 17 prompt was not safe as written for the selected plans. Vercel Hobby permits personal/non-commercial use only, its cron is limited to once daily with imprecise timing, and Vercel Cron invokes a GET endpoint. Supabase Free has limited quotas, automatic pausing risk, no automatic backups and no leaked-password protection. The implemented contract is therefore:

- repository and private/non-commercial deployment readiness on Vercel Hobby;
- the existing Supabase Free project retained as a stateful temporary backend;
- commercial launch blocked until Vercel Pro or another compatible host is used;
- no cron configuration until the plan and GET adapter are intentionally upgraded;
- no destructive E2E against the linked project;
- manual database and Storage backups required;
- external account changes and live smoke transactions remain manual.

The replacement prompt is recorded in `docs/phase-17-free-tier-deployment-plan.md`. The future plan/project migration path is `docs/production-upgrade-roadmap.md`.

## Automated and repository checks

| Check                    | Expected                                                                      | Actual                                                                                                                  | Status       |
| ------------------------ | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------ |
| CI definition            | Frozen pnpm install, format visibility, typecheck, lint, unit tests and build | Workflow implements these with read-only permission, concurrency cancellation and 20-minute timeout                     | PASS         |
| CI live-secret isolation | No production keys or staff credentials                                       | Workflow uses inert placeholders only and runs no database lifecycle tests                                              | PASS         |
| CI execution on GitHub   | Remote workflow succeeds                                                      | No workflow run was triggered from this workspace                                                                       | NOT VERIFIED |
| Runtime pin              | Same versions locally, CI and Vercel docs                                     | Node `22.14.0`, `pnpm@10.15.0`, `.nvmrc` and package engines are aligned                                                | PASS         |
| Lockfile install         | Frozen install succeeds                                                       | Lockfile was current; install completed with pnpm 10.15.0                                                               | PASS         |
| Safe E2E default         | Public/read-only subset only                                                  | Playwright defaults to safe projects and does not load `env.test.local`                                                 | PASS         |
| Destructive E2E gate     | Explicit local/staging permission; linked project always denied               | Shared guard is used by Playwright and seed/cleanup helpers; forced linked-project attempt failed before test discovery | PASS         |
| Health                   | Uncached liveness only                                                        | GET/HEAD unit and browser checks return only `status: ok`                                                               | PASS         |
| Migration requirement    | Forward-only migration only if needed                                         | No Phase 17 database change is necessary; no migration created                                                          | PASS         |
| Migration alignment      | Local and remote migration lists equal                                        | All 21 migrations through `20260814160000` match                                                                        | PASS         |
| Migration dry run        | No pending change                                                             | `supabase db push --dry-run` reports remote database up to date                                                         | PASS         |
| Read-only data audit     | Sanitized aggregate review with no PII                                        | Script completed against the linked project and emitted only counts/configuration flags                                 | PASS         |

## Linked Supabase Free project review

Project reference: `wzwoebydytqxgrwlcjiy`.

| Area               | Sanitized evidence                                                                              | Classification                                       | Status       |
| ------------------ | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------ |
| Schema             | 21 local/remote migrations aligned through Phase 16                                             | `KEEP`                                               | PASS         |
| Staff profiles     | 7 profiles: 2 OWNER active, 1 ADMIN active, one active per operational role, 1 inactive support | `REVIEW MANUALLY`                                    | NOT VERIFIED |
| Auth users         | 7 total; 4 recognizable test-account candidates                                                 | `REVIEW MANUALLY`, then disable test staff           | NOT VERIFIED |
| Brands/categories  | 47 brands and 37 categories                                                                     | `REVIEW MANUALLY`                                    | NOT VERIFIED |
| Products/variants  | 40 products/83 variants; 33 product and 74 variant fixture candidates                           | `ARCHIVE OR REMOVE WHEN SAFE`                        | FAIL         |
| Images             | 26 product-image rows                                                                           | `REVIEW MANUALLY`                                    | NOT VERIFIED |
| Customers/orders   | 2 customers/6 orders; 1 customer and 4 order fixture candidates                                 | `ARCHIVE OR KEEP`; use workflows, no casual deletion | FAIL         |
| Payments/inventory | 3 payment transactions and 21 inventory transactions                                            | `KEEP`; immutable history                            | PASS         |
| Messages           | 2 messages; both recognized as fixture candidates                                               | `ARCHIVE OR KEEP`                                    | FAIL         |
| Notifications      | 201 notification rows                                                                           | `REVIEW MANUALLY`; preserve history                  | NOT VERIFIED |
| Audit              | 333 audit rows                                                                                  | `KEEP`                                               | PASS         |
| WhatsApp intents   | 0                                                                                               | No cleanup required                                  | PASS         |
| Storage            | `product-images` exists, public read, 5 MiB, JPEG/PNG/WebP                                      | `KEEP`; object-level review still required           | PASS         |

The audit never prints staff/customer identities. Counts are candidate signals, not authorization to delete.

## Production configuration review

| Check                  | Expected                                               | Actual                                                                           | Status       |
| ---------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------- | ------------ |
| Vercel plan            | Commercial-compatible before live sales                | Current plan is Hobby, personal/non-commercial only                              | FAIL         |
| Supabase plan risk     | Capacity, pausing and recovery accepted or upgraded    | Current plan is Free; limitations documented, acceptance not recorded            | NOT VERIFIED |
| Vercel project         | Repository imported and settings inspected             | No external Vercel project mutation/inspection performed                         | NOT VERIFIED |
| Production variables   | Exact matrix configured in correct scopes              | Matrix documented; dashboard values not inspected                                | NOT VERIFIED |
| Canonical URL          | Real HTTPS production origin in env/settings/Auth      | Store audit reports canonical setting absent                                     | FAIL         |
| Store order acceptance | Disabled until launch gates close                      | Linked settings currently have `accepting_orders=true`                           | FAIL         |
| Maintenance            | Intentional deployment state                           | Currently false; no external deployment sequence performed                       | NOT VERIFIED |
| Identity/contact       | Real complete business settings                        | Store name/address/contact/phone/WhatsApp present; support email and logo absent | FAIL         |
| Payments               | Intended complete methods only                         | Two methods enabled; values/instructions require manual review                   | NOT VERIFIED |
| Delivery               | At least one valid method and authoritative fee policy | Zero delivery methods enabled                                                    | FAIL         |
| Notification recipient | Real recipient configured                              | Present, value intentionally not printed; ownership not confirmed                | NOT VERIFIED |
| Catalogue              | Only intended products active                          | Majority of catalogue is recognizable fixture data                               | FAIL         |
| Inventory              | Launch quantities/reservations reconciled              | Counts obtained; record-level reconciliation not performed                       | NOT VERIFIED |
| Auth URLs              | Exact production Site URL and callback allowlist       | Supabase dashboard not changed/verified                                          | NOT VERIFIED |
| Staff passwords        | Unique strong production credentials                   | Four test-account candidates remain; passwords not inspected                     | FAIL         |
| Auth SMTP              | Custom production SMTP                                 | Not inspected/configured                                                         | NOT VERIFIED |
| Resend                 | Verified domain, key, sender and controlled acceptance | Not changed or externally tested                                                 | NOT VERIFIED |
| Cron                   | Compatible secure production scheduler                 | No cron added; current POST route intentionally retained                         | NOT VERIFIED |
| Custom domain          | HTTPS canonical host                                   | Not provided/configured                                                          | NOT VERIFIED |
| Backup                 | Encrypted logical backup plus separate Storage export  | Procedure documented; no backup created automatically                            | NOT VERIFIED |

## Advisors and database lint

`supabase db advisors --linked` completed. The public settings/delivery projection functions are intentional anonymous safe projections. The authenticated inventory function performs its established actor-role authorization. Multiple permissive-policy and RLS init-plan findings are performance warnings, not a newly verified authorization bypass. Leaked-password protection remains unavailable on Supabase Free and is an accepted verification-stage limitation, not a production security pass.

`supabase db lint --linked` reports the known static-analysis error for the session temporary table `phase8_order_lines`, plus unused record/control-flow warnings. The Phase 8 function creates that temporary table before use and its real SQL/concurrency suites passed in prior closed phases. No Phase 17 migration was created merely to silence these findings.

| Check                      | Expected                      | Actual                                                                  | Status |
| -------------------------- | ----------------------------- | ----------------------------------------------------------------------- | ------ |
| Database advisors run      | Findings classified           | Completed; warnings classified above                                    | PASS   |
| Leaked-password protection | Enabled for production        | Pro-only, unavailable on current Free plan                              | FAIL   |
| Database lint              | No unexplained launch blocker | Known temp-table analyzer finding and nonfunctional warnings documented | PASS   |

## Browser, deployment and operational verification

| Check                         | Expected                                     | Actual                                                                                                        | Status       |
| ----------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------ |
| Safe desktop E2E              | Public smoke/a11y/health pass                | 16 total checks passed across projects; 2 admin checks intentionally skipped                                  | PASS         |
| Safe mobile E2E               | Representative mobile smoke/a11y/health pass | Included in the same safe run                                                                                 | PASS         |
| Local production smoke        | Built server serves representative routes    | Health/home/catalogue/contact returned 200; `/admin` returned the expected 307 login redirect; server stopped | PASS         |
| Vercel preview                | Private/non-commercial deployment works      | Not deployed in this phase workspace                                                                          | NOT VERIFIED |
| Production health             | Deployed `/api/health` responds              | Local browser/unit only                                                                                       | NOT VERIFIED |
| Production public/admin smoke | Routes, CSP, images, settings and roles      | No deployed origin available                                                                                  | NOT VERIFIED |
| Production smoke order        | Correct fee/total/reservation/notifications  | Prohibited until plan/data/settings gates close                                                               | NOT VERIFIED |
| Cancellation smoke            | RELEASED exactly once                        | Not run against production candidate                                                                          | NOT VERIFIED |
| SOLD smoke                    | SOLD exactly once and dashboard refreshes    | Not run against production candidate                                                                          | NOT VERIFIED |
| Contact smoke                 | One persisted message and notification       | Not run against production candidate                                                                          | NOT VERIFIED |
| WhatsApp smoke                | Configured number, intent only               | Not run on deployed origin                                                                                    | NOT VERIFIED |
| Tracking privacy              | Correct works; wrong/unknown reveal nothing  | Closed Phase 16 evidence retained; production deployment not tested                                           | NOT VERIFIED |
| Resend acceptance             | Provider accepts controlled messages         | Not run                                                                                                       | NOT VERIFIED |
| Inbox delivery                | Designated recipients receive messages       | Not run                                                                                                       | NOT VERIFIED |
| Production performance        | Representative routes checked on Vercel      | Not deployed                                                                                                  | NOT VERIFIED |

## Command results

| Command                                   | Result                                                                                  | Status       |
| ----------------------------------------- | --------------------------------------------------------------------------------------- | ------------ |
| `pnpm audit:production:readiness`         | Completed; sanitized counts above                                                       | PASS         |
| `pnpm exec supabase migration list`       | 21/21 local and remote migrations aligned                                               | PASS         |
| `pnpm exec supabase db push --dry-run`    | Remote database is up to date                                                           | PASS         |
| `pnpm exec supabase db lint --linked`     | Completed with classified findings                                                      | PASS         |
| `pnpm exec supabase db advisors --linked` | Completed with classified warnings                                                      | PASS         |
| Targeted Phase 17/fixture tests           | 3 files, 24 tests passed                                                                | PASS         |
| `pnpm typecheck`                          | Exit 0                                                                                  | PASS         |
| `pnpm lint`                               | Exit 0                                                                                  | PASS         |
| `pnpm test`                               | 52 files, 294 tests passed                                                              | PASS         |
| `pnpm test:e2e`                           | 16 passed, 2 intentionally skipped                                                      | PASS         |
| Forced destructive linked-project attempt | Exit 1 before discovery with production-project denial                                  | PASS         |
| `pnpm install --frozen-lockfile`          | Exit 0; lockfile already current                                                        | PASS         |
| `pnpm format:check`                       | Exit 1; 124 legacy files reported; new Phase 17 files were absent from the warning list | FAIL         |
| `pnpm build`                              | Exit 0; Next.js 16.2.10 generated all routes including `/api/health`                    | PASS         |
| Inert CI-environment build simulation     | Exit 1 in the restricted shell because `next/font/google` could not reach Google Fonts  | NOT VERIFIED |
| `git diff --check`                        | Exit 0; no whitespace errors                                                            | PASS         |
| `git status --short`                      | Completed; only the documented Phase 17 changes are present                             | PASS         |

## Manual actions still required

1. Upgrade Vercel to Pro or select another commercial-compatible host before sales.
2. Disable online order acceptance now; use maintenance during external configuration.
3. Create an encrypted logical database backup and a separate `product-images` export, then record/test recovery.
4. Review 4 Auth test candidates and 7 profiles; disable synthetic active staff without breaking audit references.
5. Archive/unpublish fixture catalogue records and review transactional fixture history without rewriting ledgers.
6. Configure at least one delivery method and validate fees/zones/estimates.
7. Complete canonical URL, support email, logo, real payment, identity, contact, SEO and notification values.
8. Import into Vercel, configure scoped variables, branch protection and canonical/custom domain.
9. Configure Supabase Auth Site URL, explicit callback allowlist and custom SMTP.
10. Verify Resend domain/DNS/sender and controlled provider/inbox acceptance.
11. Upgrade/add the secure GET cron adapter on a plan with a suitable interval, or configure a compatible POST scheduler.
12. Run deployed public/admin/role/health/CSP/image/metadata smoke checks.
13. Run designated cancellation and SOLD smoke orders, contact, WhatsApp and tracking privacy checks.
14. Restore the intentionally approved maintenance/order-acceptance state only after every blocker closes.

## Approval

Repository readiness is on track, but deployment approval is `FAIL`. The current combination is suitable only for private/non-commercial verification. The MVP is **not safe to accept live commercial orders** because Vercel Hobby is not a commercial plan, the current database contains substantial fixture/test state, delivery is disabled, canonical/support/branding values are incomplete, active test accounts require review, backups and external provider/Auth settings are unverified, and order acceptance is currently enabled.
