# Testing

## Tooling

- TypeScript: `pnpm typecheck`
- ESLint: `pnpm lint`
- Vitest: `pnpm test`
- Playwright: `pnpm test:e2e`
- Production build: `pnpm build`

## Unit Tests

Use Vitest for business rules and pure logic:

- Zod schemas
- Price and XOF formatting
- Order totals
- Order state transitions
- Payment provider contract behavior
- Inventory ledger calculations
- Redaction helpers

Vitest is configured with jsdom. Current unit coverage includes foundational component/config tests; domain tests should be added with each business rule.

## Browser Tests

Use Playwright for critical flows:

- Storefront browse and product detail
- Cart update
- Guest checkout
- Order tracking
- Admin login
- Admin order verification

Do not add broad browser tests until the corresponding features exist.

Admin authentication setup reads credentials only from ignored environment variables:

```bash
PLAYWRIGHT_OWNER_EMAIL=owner@example.com PLAYWRIGHT_OWNER_PASSWORD='...' pnpm test:e2e
```

The setup project writes authenticated browser state to `playwright/.auth/admin.json`, which is ignored by Git. Do not commit storage state, traces, videos, screenshots, or reports that contain authenticated cookies or session data.

Use these optional role-specific variables for broader Phase 3 browser coverage:

- `PLAYWRIGHT_OWNER_EMAIL`, `PLAYWRIGHT_OWNER_PASSWORD`
- `PLAYWRIGHT_INVENTORY_MANAGER_EMAIL`, `PLAYWRIGHT_INVENTORY_MANAGER_PASSWORD`
- `PLAYWRIGHT_ORDER_MANAGER_EMAIL`, `PLAYWRIGHT_ORDER_MANAGER_PASSWORD`
- `PLAYWRIGHT_SUPPORT_EMAIL`, `PLAYWRIGHT_SUPPORT_PASSWORD`
- `PLAYWRIGHT_INACTIVE_EMAIL`, `PLAYWRIGHT_INACTIVE_PASSWORD`

`PLAYWRIGHT_ADMIN_EMAIL` and `PLAYWRIGHT_ADMIN_PASSWORD` remain a backward-compatible owner/admin fallback. If role credentials are missing, the affected authenticated tests are skipped. Unauthenticated smoke tests may still run, but skipped authenticated coverage is not verified.

Google's real consent screen is not automated in CI. Browser tests verify the Google button and safe failure paths; manual verification covers the real provider flow.

## Phase 4 Catalogue And Storage

Unit tests cover slug generation, slug collision behavior, XOF validation, image path safety, image size and magic-byte validation, activation rules, availability calculation, public DTO cost-price omission, and Phase 4 migration contents.

After applying the Phase 4 migration to a local or staging Supabase database, run:

```bash
psql "$DATABASE_URL" -f supabase/tests/phase4_catalogue_storage.sql
```

That script verifies the `product-images` bucket configuration, Storage policy shape, anonymous cost-price column protection, public view shape, and activation trigger presence.

Full Storage RLS behavior requires configured Supabase auth users and must not be marked as passed unless it actually runs against Supabase:

- anonymous upload denied;
- inactive staff upload denied;
- unauthorized role upload denied;
- authorized product manager upload allowed;
- unauthorized delete denied;
- authorized delete allowed;
- anonymous direct access cannot retrieve `cost_price_xof`.

## Phase 5 Admin Catalogue

Unit/component coverage includes:

- French XOF formatting and parsing;
- URL filter parsing and maximum page-size enforcement for brands, categories, and variants;
- server-side pagination assumptions for brand/category/variant screens;
- corrected `Public cible` terminology and `Famille olfactive` help text;
- role-aware catalogue navigation and permissions;
- read-only inventory-manager access;
- inventory stock summaries staying read-only in the catalogue module;
- variant create/edit dialogs replacing always-rendered forms for every variant;
- product-editor breadcrumb and deterministic `Retour aux produits` navigation;
- validated `/admin/produits` return-path preservation from list filters;
- unsaved-change interception before leaving the editor;
- image upload pending-state cleanup after successful finalization;
- object URL cleanup for local image previews;
- product list rendering without cost-price leakage.

Playwright should use ignored environment variables for role credentials and a non-sensitive fixture image under test fixtures. Live image integration is verified only when a real image passes through preparation, `uploadToSignedUrl`, finalization, row persistence, public retrieval, and deletion.

Image upload tests should treat temporary pending cards and persisted image cards as separate states:

- pending cards hold the selected `File`, local object URL, draft alt text, and current upload/finalization status;
- successful finalization revalidates the product editor route, calls a client refresh, removes the pending card, resets the file input, and revokes the object URL;
- upload or finalization failures leave the pending card visible with a safe retry/removal path;
- tests must not require `window.location.reload()`.

### Phase 5 E2E Seed Data

Development/test catalogue pagination and role checks can use the guarded seed scripts:

```bash
ALLOW_E2E_SEED=true pnpm seed:phase5
ALLOW_E2E_SEED=true pnpm cleanup:phase5
```

Required environment-variable names:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `ALLOW_E2E_SEED=true`

The scripts refuse to run when `NODE_ENV=production` or `VERCEL_ENV=production`, never print secret values, and operate only on records containing the exact prefix `E2E-20260716-A`.

Seeded records:

- 25 fictional brands;
- 25 fictional categories;
- one primary draft product;
- additional draft, archived, and active-intended products;
- 25 variants across `EDP`, `EDT`, and `extrait`;
- in-stock, low-stock, and out-of-stock inventory states.

Phase 4 activation rules require a validated product image for `ACTIVE` products. The seed does not insert rows into `storage.objects` and does not fabricate image records. Active-intended products are only moved to `ACTIVE` when a real finalized image already exists for that product. Real Storage image tests still run through the authenticated signed-upload UI/Playwright flow so Storage policies, upload tokens, MIME validation, finalization, public retrieval, and deletion are exercised honestly.

Cleanup deletes only prefixed products, variants, brands, categories, image upload rows, image rows, and related Storage objects belonging to prefixed products. It respects foreign-key ordering and does not target non-E2E data.

## Environment Diagnostics

Run:

```bash
pnpm env:check
```

The command reports only `SET` or `MISSING` for expected variables and never prints values.

## Required Check Before Completion

Run and report:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
```

Never report a command as passing unless it ran and exited successfully.
