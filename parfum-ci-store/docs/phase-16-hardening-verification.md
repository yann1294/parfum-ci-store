# Phase 16 Hardening Verification

Date: 2026-08-14

Status values in this document are limited to `PASS`, `FAIL`, and `NOT VERIFIED`. Phase 16 does not add business features. The forward-only Phase 16 migration is intentionally not applied by the implementation workflow.

## Security

| Check                               | Expected                                                                               | Actual                                                                                                                                         | Status       |
| ----------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Tracked secrets                     | No credential or private key in tracked source/configuration                           | Sanitized repository scan found placeholders and variable names only; ignored environment values were not printed                              | PASS         |
| Client/server boundary              | Client Components cannot import privileged Supabase/provider services                  | Privileged clients and new body/rate helpers retain `server-only`; audited client imports contain no privileged service                        | PASS         |
| RLS                                 | Every exposed sensitive table has RLS and controlled access                            | Linked schema/policy inspection found RLS on exposed public tables                                                                             | PASS         |
| Least-privilege grants              | Browser roles cannot directly mutate sensitive/transactional tables or truncate tables | Forward-only migration contains the required revokes; linked database does not contain them until migration application                        | NOT VERIFIED |
| SECURITY DEFINER                    | Safe search path, qualified references, bounded grants and authorization               | Static migration audit found explicit empty search paths and no dynamic SQL; existing Phase 8–15 SQL suites passed                             | PASS         |
| Notification retry                  | One authorized locked `FAILED -> PENDING` transition with audit                        | Migration and application contract tests pass; real Phase 16 SQL test awaits migration application                                             | NOT VERIFIED |
| Mutation authorization              | Direct unauthorized calls denied independently of UI                                   | Existing unit/SQL/browser role checks pass for implemented modules; Phase 16 retry live check awaits migration                                 | NOT VERIFIED |
| Public JSON limits                  | Reject wrong media type, malformed JSON and oversized streamed bodies                  | Shared bounded reader and unit tests pass                                                                                                      | PASS         |
| Open redirects                      | External/protocol-relative/unsafe return paths rejected                                | Existing redirect tests plus hostile OAuth-origin regression pass                                                                              | PASS         |
| URL construction                    | Canonical OAuth origin and safe configured public schemes                              | OAuth callback uses configured site origin; social/WhatsApp validation remains centralized                                                     | PASS         |
| XSS                                 | Customer content remains text and structured JSON-LD cannot break out                  | Component tests keep script/img payloads inert; no customer `dangerouslySetInnerHTML` path found                                               | PASS         |
| Upload/storage                      | Authorization, size/MIME/magic bytes, safe path and cleanup                            | Existing upload service and Phase 4 SQL/unit tests cover the established boundary                                                              | PASS         |
| Tracking privacy                    | Number plus normalized phone, generic failure and limited DTO                          | Existing route/unit coverage passes; a fresh browser enumeration campaign was not run in Phase 16                                              | NOT VERIFIED |
| Idempotency                         | Replay stable, conflict rejected, namespaces isolated                                  | Phase 8/11–15 SQL and unit suites pass; complete cross-namespace concurrent campaign was not rerun                                             | NOT VERIFIED |
| Raw error leakage                   | No SQLSTATE/details/hint/stack/provider payload in public responses                    | Audited public mappings and new cron/body-reader tests return typed safe responses                                                             | PASS         |
| PII logging                         | Production logs contain stable sanitized codes only                                    | Source scan found only bounded event/database codes in production paths                                                                        | PASS         |
| Security headers/CSP                | Defensive headers without production `unsafe-eval`                                     | Desktop/mobile browser responses include CSP, `nosniff` and frame denial; production policy unit test includes HSTS and excludes `unsafe-eval` | PASS         |
| Cron                                | POST/bearer secret/no-store/bounded safe response                                      | Missing, invalid, valid and processor-failure unit tests pass                                                                                  | PASS         |
| Supabase leaked-password protection | Enabled before launch                                                                  | Linked advisor reports leaked-password protection disabled                                                                                     | FAIL         |
| Distributed rate limiting           | Multi-instance enforcement for public mutation/tracking routes                         | Keys are privacy-hashed, but adapter remains process-local                                                                                     | NOT VERIFIED |

## Concurrency And Database

| Check                                | Expected                                                   | Actual                                                                                                          | Status       |
| ------------------------------------ | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------ |
| Final-unit order race                | Exactly one of two simultaneous orders reserves final unit | Real Playwright/database race passes                                                                            | PASS         |
| Cancellation versus delivery         | Never both RELEASED and SOLD                               | Real simultaneous race passes                                                                                   | PASS         |
| Inventory adjustment versus delivery | `reserved_quantity <= stock_on_hand` always                | Real simultaneous race passes                                                                                   | PASS         |
| Duplicate/conflicting transition     | Exactly one final mutation                                 | Real simultaneous race passes                                                                                   | PASS         |
| Notification claims                  | Workers claim distinct rows                                | Real simultaneous worker test passes                                                                            | PASS         |
| Settings stale update                | No silent overwrite                                        | Phase 14 database/browser approval was closed before Phase 16; no Phase 16 regression found                     | PASS         |
| Phase 8 SQL                          | Authoritative order totals/reservations/idempotency        | Linked rollback-safe SQL test passes                                                                            | PASS         |
| Phase 11 SQL                         | Lifecycle/payment/inventory invariants                     | Linked rollback-safe SQL test passes                                                                            | PASS         |
| Phase 12 SQL                         | Outbox claims/results/retry/cancel/low stock               | Linked rollback-safe SQL test passes                                                                            | PASS         |
| Phase 13 SQL                         | Message permissions/history/notification intent            | Linked rollback-safe SQL test passes                                                                            | PASS         |
| Phase 14 SQL                         | Settings projections/delivery fee/snapshots/concurrency    | Linked rollback-safe SQL test passes                                                                            | PASS         |
| Phase 15 SQL                         | Revenue/timezone/source/roles                              | Linked rollback-safe SQL test passes                                                                            | PASS         |
| Phase 16 SQL                         | New grants and atomic retry                                | Cannot run until `20260814160000_phase16_security_hardening.sql` is applied                                     | NOT VERIFIED |
| Query plans                          | Indexed frequent paths; no evidence-free indexes           | Messages and notifications use existing indexes; tiny orders/catalogue fixtures rationally use sequential scans | PASS         |
| Production-volume plans              | No launch-impacting slow query at realistic volume         | Representative staging/production volume was unavailable                                                        | NOT VERIFIED |

## Accessibility And Responsive UI

| Check                      | Expected                                                             | Actual                                                                                                           | Status       |
| -------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------ |
| Landmarks/headings         | One meaningful `h1`, logical section headings, no nested main        | Representative public/admin browser checks pass; identified duplicate headings/nested main corrected             | PASS         |
| Form labels/errors         | Visible labels, associations, error summary and first-error focus    | Contact and checkout corrections plus unit/browser focus tests pass                                              | PASS         |
| Dialog/sheet focus         | Escape, focus return and scroll release                              | Cart drawer desktop/mobile browser test passes                                                                   | PASS         |
| Keyboard primary smoke     | Primary tested flows are reachable without a pointer                 | Contact validation and cart drawer are browser-tested; complete every-route keyboard walkthrough not performed   | NOT VERIFIED |
| Live feedback              | Mutation result is not toast-only                                    | Contact and checkout use focusable/live error status; every admin mutation was not manually screen-reader tested | NOT VERIFIED |
| Contrast                   | WCAG target and no color-only state                                  | Serious/critical axe scans pass; full manual contrast inventory was not performed                                | NOT VERIFIED |
| Reduced motion             | Nonessential motion respects preference                              | Global styles/components retain reduced-motion behavior; manual OS-level walkthrough not performed               | NOT VERIFIED |
| Images/alt                 | Descriptive product alt, decorative empty alt, stable dimensions     | Component/source audit passes for storefront product imagery                                                     | PASS         |
| Desktop axe                | No serious/critical violations on representative public/admin routes | Chromium scans pass                                                                                              | PASS         |
| Mobile axe                 | No serious/critical violations on representative public/admin routes | Pixel 7 scans pass                                                                                               | PASS         |
| Responsive overflow        | No page-level overflow on representative dashboard/admin pages       | Existing required-width dashboard checks and Pixel 7 representative admin checks pass                            | PASS         |
| Browser zoom/touch targets | Zoom not disabled and practical touch controls                       | No viewport zoom prohibition found; complete physical-device touch review not performed                          | NOT VERIFIED |

## Performance And Runtime

| Check                       | Expected                                               | Actual                                                                                                                       | Status       |
| --------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Client boundaries           | Interactive components only where justified            | Audit found no high-impact safe conversion requiring workflow refactor                                                       | PASS         |
| Product images              | Selective eager LCP, lazy below fold, responsive sizes | Above-fold duplicate preload corrected; product imagery uses `next/image` and declared sizes                                 | PASS         |
| Query payloads              | Explicit fields and bounded lists                      | Inventory wildcard select removed; audited operational list services use bounded explicit projections                        | PASS         |
| N+1/aggregation             | Database aggregates and bounded detail queries         | Dashboard uses aggregate RPC; no verified launch-impacting N+1 found                                                         | PASS         |
| Cache/revalidation          | Existing targeted operational refresh retained         | No global no-cache workaround added; complete production transition refresh campaign not repeated                            | NOT VERIFIED |
| Production bundle           | No launch-blocking build/chunk regression              | Next.js 16.2.10 optimized build compiled, type-checked and generated all routes successfully                                 | PASS         |
| Production-mode route smoke | Representative routes serve from `pnpm start`          | Public/real product routes returned 200; protected admin routes safely redirected to login; CSP/HSTS present; server stopped | PASS         |

## End-to-End Business Regressions

| Check                         | Expected                                                         | Actual                                                                                                           | Status       |
| ----------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------ |
| Desktop suite                 | Deterministic configured Playwright tests pass                   | 39/39 Chromium/setup/mobile-project tests pass in the full run                                                   | PASS         |
| Mobile suite                  | Representative customer/admin/a11y paths pass                    | Pixel 7 Phase 16 project passes                                                                                  | PASS         |
| Full COD lifecycle            | Customer checkout through SOLD and tracking timeline             | Transactional portions are covered by SQL/race tests; complete UI lifecycle was not run in one Phase 16 scenario | NOT VERIFIED |
| Manual Mobile Money lifecycle | Settings instruction through immutable PAID history and tracking | Payment transaction SQL/browser module tests pass; complete UI lifecycle was not run end to end                  | NOT VERIFIED |
| Cancellation lifecycle        | Reservation released exactly once and tracking updated           | Real cancellation/idempotency database verification passes; complete customer/admin UI journey was not run       | NOT VERIFIED |
| Inventory lifecycle           | Receive/damage/ledger/audit/storefront/dashboard                 | Database rules and dashboard low-stock tests pass; complete UI journey was not run                               | NOT VERIFIED |
| Contact/support lifecycle     | Public message through private internal resolution               | Phase 13 SQL and contact UI checks pass; complete role UI journey was not run                                    | NOT VERIFIED |
| Notification center           | Process/fail/retry/cancel with attempts                          | Phase 12 SQL passes; new retry live test awaits Phase 16 migration and external Resend is not exercised          | NOT VERIFIED |
| Settings regression           | Payment/delivery/WhatsApp/availability/stale conflict            | Phase 14 was browser-approved and its SQL regression passes                                                      | PASS         |
| Dashboard regression          | Ranges, roles, counters and responsive behavior                  | Owner/restricted-role/range/responsive browser tests pass                                                        | PASS         |

## Documentation And Launch Operations

| Check                      | Expected                                                                        | Actual                                                                                                             | Status       |
| -------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------ |
| README reproducibility     | Install, database, types, storage, staff, fixtures, tests and build documented  | Root README updated without secrets                                                                                | PASS         |
| Deployment procedure       | Migration, types, environment, Auth, Storage, Resend, cron and smoke documented | Deployment guide updated with Phase 16 gates                                                                       | PASS         |
| Console hygiene            | No debug/placeholder launch residue                                             | Production-source scan found no debugger/TODO/FIXME/HACK/customer placeholder; sanitized operational logs retained | PASS         |
| Repository formatting      | New Phase 16 artifacts formatted and repository-wide check clean                | New Phase 16 artifacts are formatted; `pnpm format:check` reports 114 legacy files with pre-existing style debt    | FAIL         |
| External Resend acceptance | Provider and inbox delivery verified                                            | No real provider/inbox test was performed                                                                          | NOT VERIFIED |
| Production deployment      | No production mutation/deployment during Phase 16                               | Intentionally out of scope                                                                                         | NOT VERIFIED |

## Manual Commands After Review

```bash
pnpm exec supabase db push
pnpm exec supabase gen types typescript --linked > src/types/database.types.ts
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/phase16_security_hardening.sql
pnpm exec supabase db lint --linked
pnpm exec supabase db advisors --linked
```

Then enable leaked-password protection in Supabase Auth, configure a distributed production rate limiter/WAF, rerun the full command suite, verify real Resend acceptance, and perform the `NOT VERIFIED` customer/admin lifecycle checks with disposable records.

## Approval

The code-level hardening regression is passing, but deployment approval is `FAIL` until the Phase 16 migration is applied and its SQL test passes, Supabase leaked-password protection is enabled, and the explicitly launch-relevant production checks above are closed.
