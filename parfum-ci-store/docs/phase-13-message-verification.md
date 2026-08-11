# Phase 13 Message Verification

Use a non-production database with Phase 13 migrations applied.

```bash
pnpm exec supabase db push
pnpm exec supabase gen types typescript --linked > src/types/database.types.ts
psql "$DATABASE_URL" -f /Users/mimison/Documents/Repos/Github/yann1294/parfum-ci-store/parfum-ci-store/supabase/tests/phase13_messages.sql
```

## Public Contact Page
Expected: `/contact` displays managed contact content and a controlled message form.
Actual:
PASS/FAIL:

## Telephone-Only Submission
Expected: a valid Côte d’Ivoire phone without email submits successfully.
Actual:
PASS/FAIL:

## Email-Only Submission
Expected: a valid email without phone submits successfully.
Actual:
PASS/FAIL:

## Consent
Expected: consent is explicit, not prechecked, and required for website submissions.
Actual:
PASS/FAIL:

## Honeypot
Expected: filled honeypot returns a safe validation failure and creates no row.
Actual:
PASS/FAIL:

## Rate Limit
Expected: repeated submissions are bounded and return a safe retry response.
Actual:
PASS/FAIL:

## Product Enquiry
Expected: product/variant URL context is server-verified and stored only as safe references/snapshots.
Actual:
PASS/FAIL:

## Order Reference Privacy
Expected: optional order number links only when contact details match; mismatches do not reveal order existence.
Actual:
PASS/FAIL:

## Success Response
Expected: public response is generic and does not expose UUIDs, staff, assignment or notification IDs.
Actual:
PASS/FAIL:

## Message Persistence
Expected: message row, initial status history, audit and notification intents commit atomically.
Actual:
PASS/FAIL:

## In-App Notification
Expected: one admin in-app notification intent is inserted per idempotent submission.
Actual:
PASS/FAIL:

## Email Notification Intent
Expected: one admin email notification intent is inserted per idempotent submission; provider calls occur after commit.
Actual:
PASS/FAIL:

## Notification Failure Independence
Expected: provider failure cannot lose the customer message.
Actual:
PASS/FAIL:

## Inbox List
Expected: `/admin/messages` shows server-side search, filters, pagination, masked contacts and bounded excerpts.
Actual:
PASS/FAIL:

## Search
Expected: search covers sender, subject, contact, safe order number and does not crash on invalid input.
Actual:
PASS/FAIL:

## Filters
Expected: source, status, assignment and date filters are safe and bounded.
Actual:
PASS/FAIL:

## Pagination
Expected: list pagination is server-side.
Actual:
PASS/FAIL:

## Message Detail
Expected: detail shows full authorized contact data, customer content, context, timelines and notes.
Actual:
PASS/FAIL:

## XSS Rendering
Expected: script tags, event handlers and JavaScript-looking content render as inert text.
Actual:
PASS/FAIL:

## Assignment
Expected: authorized staff can assign to self/eligible staff and assignment history is append-only.
Actual:
PASS/FAIL:

## Reassignment
Expected: reassignment creates a new history row.
Actual:
PASS/FAIL:

## Status Flow
Expected: NEW→OPEN→RESOLVED and spam/reopen transitions follow the controlled service.
Actual:
PASS/FAIL:

## Spam Flow
Expected: marking spam requires a reason and is audited.
Actual:
PASS/FAIL:

## Internal Notes
Expected: internal notes are append-only and never displayed publicly.
Actual:
PASS/FAIL:

## Manual Instagram Message
Expected: staff can record a manual Instagram conversation without claiming API sync.
Actual:
PASS/FAIL:

## Manual WhatsApp Message
Expected: staff can record a manual WhatsApp conversation without creating an order.
Actual:
PASS/FAIL:

## Customer Linking
Expected: existing customer links are matched safely by normalized phone/email without destructive merge.
Actual:
PASS/FAIL:

## Order Linking
Expected: optional public order link requires matching contact details; staff links do not alter order lifecycle.
Actual:
PASS/FAIL:

## Product Linking
Expected: product and variant context is validated, with variant ownership checked.
Actual:
PASS/FAIL:

## Unread Count
Expected: admin navigation count is role-aware and equals NEW messages, capped at 99+.
Actual:
PASS/FAIL:

## Permission Matrix
Expected: OWNER, ADMIN and CUSTOMER_SUPPORT manage messages; unauthorized roles cannot read or mutate.
Actual:
PASS/FAIL:

## Responsive Layouts
Expected: public form and admin inbox/detail work on desktop, narrow desktop and mobile.
Actual:
PASS/FAIL:

## Idempotency
Expected: exact retry returns the same safe result and creates one row/notification set.
Actual:
PASS/FAIL:

## Concurrent Submission
Expected: concurrent duplicate submissions with one idempotency key create one message.
Actual:
PASS/FAIL:

## History Immutability
Expected: status history, assignment history and internal notes are append-only through the app.
Actual:
PASS/FAIL:
