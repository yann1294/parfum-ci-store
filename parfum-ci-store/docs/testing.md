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
PLAYWRIGHT_ADMIN_EMAIL=admin@example.com PLAYWRIGHT_ADMIN_PASSWORD='...' pnpm test:e2e
```

The setup project writes authenticated browser state to `playwright/.auth/admin.json`, which is ignored by Git. Do not commit storage state, traces, videos, screenshots, or reports that contain authenticated cookies or session data.

If `PLAYWRIGHT_ADMIN_EMAIL` and `PLAYWRIGHT_ADMIN_PASSWORD` are missing, the authenticated setup is skipped. Unauthenticated smoke tests may still run, but authenticated admin E2E coverage is not verified.

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
