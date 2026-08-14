# Phase 15 Dashboard Verification

Date: 2026-08-14

Status values in this document are limited to `PASS`, `FAIL` and `NOT VERIFIED`.

## Continuity Decisions

- The Phase 15 prompt is compatible with the completed product when interpreted as one operational dashboard at `/admin`, not a second analytics product.
- The dashboard reuses Phase 8 order amounts/snapshots, Phase 9 `orders.source`, Phase 10 availability/ledger rules, Phase 11 immutable payment events, Phase 12 notification state, Phase 13 message state and Phase 14 singleton settings.
- The MVP timezone is structured but fixed to `Africa/Abidjan`; no general timezone-management UI is introduced.
- Ninety-day trends remain daily. This keeps one documented bucket policy and avoids different aggregation semantics between ranges.
- OWNER, ADMIN and ORDER_MANAGER retain financial visibility consistent with the existing Phase 11 order/payment policy. CUSTOMER_SUPPORT and INVENTORY_MANAGER receive no aggregate financial DTO fields.
- Gross paid revenue uses the earliest immutable `PAID` transaction per order at `verified_at`. Refund statuses are not subtracted because no authoritative refunded-amount field exists.
- `PREPARING` alone defines orders being prepared. Every current `FAILED` notification requires staff attention. Payment-method distribution means order count by selected method, including unpaid orders, and is labelled that way.
- Top products means units converted to `SOLD` in the inventory ledger, using order-item name snapshots. WhatsApp intents and UTM attribution are excluded from order-channel analytics.

## Verification Matrix

| Area | Expected | Actual | Result |
| --- | --- | --- | --- |
| Dashboard load | Active staff receive one role-aware operational DTO | Server page, aggregate service and loading/error boundaries implemented; rollback-only database call passed | PASS |
| 7-day range | URL `range=7d`, seven inclusive business dates | Unit boundary and URL tests pass | PASS |
| 30-day range | Default and explicit `range=30d` | Invalid input fallback and 30-day unit boundary pass | PASS |
| 90-day range | URL `range=90d`, ninety daily buckets | Unit boundary passes; database suite verifies the shared daily bucketing function | PASS |
| Timezone boundary | Africa/Abidjan midnight, host/browser independent | Pure helper and rollback-only SQL midnight assertions pass | PASS |
| Orders today | Current business-local day, all statuses | Rollback-only SQL proves exact-midnight inclusion and prior-second exclusion | PASS |
| Revenue | Gross authoritative PAID amount by verification time | Rollback-only SQL first-PAID-event assertion passes | PASS |
| Duplicate protection | One economic payment per order | Duplicate PAID replay is excluded in rollback-only SQL | PASS |
| Refund semantics | Gross revenue, no unsupported refund subtraction | Later refund status does not reduce the explicitly gross metric | PASS |
| Pending orders | Current `PENDING_CONFIRMATION` | Enum query and deep-link UI test pass | PASS |
| Pending payments | Manual methods with current `PENDING`, excluding COD/pay-in-store | RPC query and rollback-only fixture pass | PASS |
| Preparing orders | Current `PREPARING` only | Enum query and deep link implemented | PASS |
| Low stock | Phase 10 initialized/active/available rule | Rollback-only reserved-stock assertion passes | PASS |
| New messages | Current Phase 13 `NEW` | Exact enum reused and role section implemented | PASS |
| Failed notifications | Every current `FAILED` outbox row | Exact enum reused and deep-link UI test pass | PASS |
| Recent orders | Bounded fields, no UUID displayed or contact/address payload | Eight-row projection and detail links implemented | PASS |
| Recent messages | Bounded excerpt, no full body payload | Six-row projection uses `left(body,160)` | PASS |
| Low-stock list | Rupture first, normalized ratio, oldest update tie-break | Deterministic SQL and reserved availability pass; representative multi-row ordering remains browser-level | PASS |
| Sales trend | Daily paid count and gross revenue in business timezone | Responsive bars/table and rollback-only SQL buckets pass | PASS |
| Order source | Actual orders only; channel distinct from UTM/intent | WEBSITE/PHONE grouping passes and no WhatsApp intent is counted | PASS |
| Top products | SOLD quantities and historical item snapshots | SOLD aggregation and renamed-product snapshot fixture pass | PASS |
| Payment distribution | Order count by selected method | Query and clear UI label implemented | PASS |
| XOF formatting | Existing integer formatter | Existing `formatXof` reused; no float aggregation | PASS |
| Percentages | Zero-safe, display-only rounding | Unit tests pass | PASS |
| Chart accessibility | Equivalent text/table representation | Trend, source and method tables render in unit test | PASS |
| Card deep links | Existing module filters | OWNER range/deep-link Playwright flow passes | PASS |
| Role permissions | Five roles, inactive and unauthenticated | Unit/database checks plus OWNER, CUSTOMER_SUPPORT, INVENTORY_MANAGER, inactive and direct Phase 11 role browser/database scenarios pass | PASS |
| Sensitive data leakage | Restricted DTOs omit aggregate financial keys | TypeScript and database projections exclude restricted financial sections | PASS |
| Empty states | No empty axes/crashes | Section empty copy implemented; full rendering matrix pending | NOT VERIFIED |
| Error states | Sanitized page/section fallback | Sanitized page boundary implemented; injected aggregate/list failures pending | NOT VERIFIED |
| Cache freshness | Recent operational changes visible | Request-time rendering plus targeted `/admin` revalidation implemented; live mutation flow pending | NOT VERIFIED |
| Query architecture | Database aggregates; bounded explicit lists | One service-only aggregate RPC; no `.select("*")` or browser aggregation | PASS |
| Index review | Only justified dashboard indexes | Paid verification range and order-item join indexes proposed; staging EXPLAIN pending | NOT VERIFIED |
| Mobile | No overflow at 390×844 | Playwright page-level overflow assertion passes | PASS |
| Narrow desktop/tablet | No overflow at requested widths | Playwright assertions pass at 1440, 1024, 820, 640 and 390 widths | PASS |
| Admin indexing | Private and no public analytics metadata | Admin layout declares `noindex, nofollow`; live metadata check pending | NOT VERIFIED |

## Automated Results

- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS.
- `pnpm exec vitest run tests/unit/phase15-dashboard.test.ts tests/unit/phase15-dashboard-ui.test.tsx`: PASS — 2 files, 16 tests.
- `pnpm test`: PASS — 48 files, 273 tests.
- `pnpm build`: PASS — Next.js 16.2.10 production build; `/admin` is dynamically rendered on demand.
- `git diff --check`: PASS.
- `pnpm exec supabase db push --dry-run --linked`: PASS — only `20260814090000_phase15_admin_dashboard.sql` would be pushed; no database change was made.
- `pnpm exec playwright test tests/e2e/phase15-dashboard.spec.ts --list`: PASS — four Phase 15 browser tests discovered.
- Corrected migration plus `supabase/tests/phase15_dashboard.sql` through a single linked rollback-only transaction: PASS — no schema or fixture persisted.
- `pnpm test:e2e`: PASS — 29 passed, 0 skipped, 0 failed in 44.8 seconds. All four Phase 15 tests passed.
- Representative staging `EXPLAIN (ANALYZE, BUFFERS)`: NOT VERIFIED.

## Manual Database Commands

After review:

```bash
pnpm exec supabase db push
pnpm exec supabase gen types typescript --linked > src/types/database.types.ts
psql "$DATABASE_URL" -f supabase/tests/phase15_dashboard.sql
```

Do not hand-edit the generated types. The migration was not pushed by the implementation agent.

## Manual Browser Flow

1. Sign in as OWNER and open `/admin`; test 7, 30 and 90 days and every card/list link.
2. Create and progress a disposable order, confirm its payment, cross an inventory threshold, create a message and produce a controlled notification failure; reload `/admin` after each operation.
3. Compare first-PAID-event revenue against payment transaction rows, including an idempotent duplicate/history row.
4. Repeat as ADMIN, ORDER_MANAGER, CUSTOMER_SUPPORT and INVENTORY_MANAGER. Inspect rendered payloads, not only visible cards.
5. Test 1440×900, 1024×768, 820×900, 640×900 and 390×844. Confirm internal card scrolling and no page-level horizontal overflow.
6. Confirm `/admin` metadata is `noindex, nofollow` and it is absent from the public sitemap.

## Approval

The migration, rollback-only SQL suite, application tests and Phase 15 browser/responsive flows pass. Representative staging query-plan review and the full operational-refresh fixture flow remain `NOT VERIFIED` before final Phase 15 approval.
