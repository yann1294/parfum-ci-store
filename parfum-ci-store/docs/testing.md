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

Vitest is configured with jsdom and `passWithNoTests` while the project has no feature tests.

## Browser Tests

Use Playwright for critical flows:

- Storefront browse and product detail
- Cart update
- Guest checkout
- Order tracking
- Admin login
- Admin order verification

Do not add broad browser tests until the corresponding features exist.

## Required Check Before Completion

Run and report:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Never report a command as passing unless it ran and exited successfully.
