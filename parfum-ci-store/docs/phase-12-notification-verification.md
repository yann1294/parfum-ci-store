# Phase 12 Notification Verification

Use a non-production database with Phase 8, Phase 10, Phase 11 and Phase 12 migrations applied.

```bash
pnpm exec supabase db push
pnpm exec supabase gen types typescript --linked > src/types/database.types.ts
psql "$DATABASE_URL" -f /Users/mimison/Documents/Repos/Github/yann1294/parfum-ci-store/parfum-ci-store/supabase/tests/phase12_notifications.sql
```

If the shell is not started from the repository root, use the absolute SQL-file path above. The repair migration
`20260804124500_phase12_notification_ambiguous_parameter_fix.sql` is required after the initial Phase 12 migration;
without it, notification result recording can fail with PostgreSQL `42702` from ambiguous SQL parameter names.

## Provider Selection
Expected: local/test uses `DevelopmentLogProvider`; production requires `NOTIFICATION_PROVIDER=resend`, `RESEND_API_KEY` and `EMAIL_FROM`.
Actual: Unit tests verify development provider selection and production refusal of the development provider.
PASS/FAIL: PASS

## Development Redaction
Expected: development logs include notification ID, template/subject and masked recipient only.
Actual: Unit tests assert masked recipient logging and absence of the full email address.
PASS/FAIL: PASS

## Resend Configuration
Expected: Resend provider validates sender/recipient and records provider message ID without logging API keys.
Actual: Unit tests verify success and retryable failure mapping. Real Resend sandbox delivery was not run.
PASS/FAIL: NOT VERIFIED

## Templates
Expected: every implemented template has French subject, HTML, text, escaped user values, XOF formatting and no PIN/OTP request.
Actual: Template unit tests verify order/customer rendering, escaping and sensitive-field exclusion.
PASS/FAIL: PASS

## New-Order Notification
Expected: Phase 8 order creation commits pending admin/customer notification intents; processing happens after commit.
Actual: Existing Phase 8 insertion path is reused; post-commit best-effort processing is wired in `/api/orders`. Real database processing requires the Phase 12 migration.
PASS/FAIL: NOT VERIFIED

## Lifecycle Notifications
Expected: Phase 11 lifecycle notifications are processed best-effort after order transitions and never roll back the transition.
Actual: Phase 11 transition/payment actions call best-effort processing after successful actions. Targeted Phase 11 E2E still passes. Provider-failure independence against a migrated database was not run.
PASS/FAIL: NOT VERIFIED

## Payment Notification
Expected: payment-status notification processing does not roll back payment state.
Actual: Best-effort processing is called after successful payment action completion. Real provider-failure database verification was not run.
PASS/FAIL: NOT VERIFIED

## Low-Stock Crossing
Expected: a low-stock notification is created once when availability crosses from above threshold to at or below threshold, then only after recovery and a new crossing.
Actual: A low-stock state table and evaluation helper were added. Real crossing/recovery/concurrency tests were not run.
PASS/FAIL: NOT VERIFIED

## Contact-Message Notification
Expected: contact-message emails are added only when a real contact-message submission flow persists the message transactionally.
Actual: Current app has no contact-message submission flow; only public contact display exists.
PASS/FAIL: NOT VERIFIED

## Concurrent Claim
Expected: concurrent workers claim each eligible email notification once using row locks and `SKIP LOCKED`.
Actual: Migration SQL uses `FOR UPDATE SKIP LOCKED`; real PostgreSQL concurrent claim test was not run because `psql` is unavailable locally.
PASS/FAIL: NOT VERIFIED

## Duplicate Prevention
Expected: `notifications.idempotency_key`, claim tokens and terminal `SENT` checks prevent duplicate sends.
Actual: Implemented in SQL and processor logic; real duplicate-send database verification was not run.
PASS/FAIL: NOT VERIFIED

## Retry
Expected: retryable failures schedule bounded retries and append attempt history.
Actual: Processor unit tests cover retryable failure mapping; SQL attempt-history verification was not run.
PASS/FAIL: NOT VERIFIED

## Max Attempts
Expected: notifications stop retrying after configured attempt cap.
Actual: Config and SQL bounds are implemented. Database execution was not run.
PASS/FAIL: NOT VERIFIED

## Non-Retryable Failure
Expected: invalid payload or recipient failures are not retried indefinitely.
Actual: Provider/template errors are classified as non-retryable where appropriate. Real processor/database verification was not run.
PASS/FAIL: NOT VERIFIED

## Stale Recovery
Expected: old `PROCESSING` claims become eligible after the stale-processing timeout.
Actual: Claim SQL includes stale `PROCESSING` recovery. Database execution was not run.
PASS/FAIL: NOT VERIFIED

## Manual Retry
Expected: authorized staff can retry eligible notifications without creating duplicate notification rows.
Actual: Admin retry action resets eligible records and invokes the shared processor. Browser/database verification was not run.
PASS/FAIL: NOT VERIFIED

## Pending Cancellation
Expected: authorized staff can cancel pending/retryable notifications; order, payment and inventory state is unchanged.
Actual: Service-role RPC cancellation was added and does not touch business entities. Database/browser verification was not run.
PASS/FAIL: NOT VERIFIED

## Cron Authorization
Expected: `/api/cron/notifications` requires `Authorization: Bearer <CRON_SECRET>` and rejects missing/invalid secrets.
Actual: Route implements POST-only bearer-secret validation. Runtime smoke against a migrated app was not run.
PASS/FAIL: NOT VERIFIED

## Cron Overlap
Expected: overlapping cron runs are safe because claims are row-locked and tokenized.
Actual: Claim SQL is concurrency-safe by design. Real overlapping cron/database test was not run.
PASS/FAIL: NOT VERIFIED

## Admin List
Expected: `/admin/notifications` uses server-side search, filters, sorting, pagination and masked recipients.
Actual: Route and list service were implemented with bounded server-side filters and masked recipients. Browser verification was not run.
PASS/FAIL: NOT VERIFIED

## Notification Detail
Expected: detail shows safe structured payload summary and attempt history, not raw JSON or rendered HTML.
Actual: Detail route was implemented with masked recipient, safe payload summary and attempt list. Browser verification was not run.
PASS/FAIL: NOT VERIFIED

## Masked PII
Expected: broad views/logs mask recipients and do not expose full addresses, customer notes, provider responses or secrets.
Actual: Unit tests cover provider redaction and admin masking helpers.
PASS/FAIL: PASS

## Role Permissions
Expected: OWNER/ADMIN can retry/cancel; ORDER_MANAGER can read order notifications; unauthorized roles cannot mutate delivery state.
Actual: Server-side permission checks were implemented. Role-based browser/direct-action verification was not run.
PASS/FAIL: NOT VERIFIED

## Order Independence
Expected: provider failure never rolls back order creation, confirmation, cancellation, delivery or payment confirmation.
Actual: Provider processing is invoked only after business actions complete. Forced provider-failure integration tests were not run.
PASS/FAIL: NOT VERIFIED

## Inventory Independence
Expected: provider failure never rolls back Phase 10 inventory adjustment or Phase 11 stock lifecycle.
Actual: Inventory actions call processing after successful adjustment. Forced provider-failure integration tests were not run.
PASS/FAIL: NOT VERIFIED

## Responsive Layout
Expected: notification list/detail work on desktop, narrow desktop and mobile without body-level horizontal overflow.
Actual: Responsive list/detail components were implemented using admin table/card patterns. Playwright responsive verification was not run.
PASS/FAIL: NOT VERIFIED

## External Resend Acceptance
Expected: one admin and one customer test email are accepted by Resend using a permitted test recipient/domain.
Actual: No real Resend sandbox send was run from this environment.
PASS/FAIL: NOT VERIFIED

## Command Results
Expected: local static and unit verification passes before applying the Phase 12 migration.
Actual: `pnpm typecheck` PASS; `pnpm lint` PASS; targeted Phase 12 unit tests PASS (3 files, 9 tests); `pnpm test` PASS (44 files, 246 tests); `pnpm build` PASS; `git diff --check` PASS. `psql` is unavailable in the Codex shell, so direct SQL-file execution remains NOT VERIFIED here. A Supabase-JS service-role smoke reached the database and identified `42702` in the original result-recording function; the forward-only repair migration above fixes the ambiguous parameter names. Full `pnpm test:e2e` failed on unrelated existing auth/smoke selectors; targeted Phase 11 order-management E2E PASS (8 passed, 1 skipped).
PASS/FAIL: NOT VERIFIED
