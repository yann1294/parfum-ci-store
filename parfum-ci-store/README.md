# Parfum CI Store

Perfume e-commerce and operations platform for customers in Côte d'Ivoire.

The MVP is French-first, uses XOF pricing, supports guest checkout, and accepts manual Mobile Money verification plus cash on delivery. Admin authentication is required for back-office features.

## Stack

- Next.js App Router with TypeScript
- pnpm only
- Tailwind CSS and shadcn/ui
- Supabase PostgreSQL, Auth, Storage, RLS, and SSR cookie-based clients
- Resend transactional email
- Vitest unit tests
- Playwright browser tests
- Vercel deployment

## Local Development

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3000`.

## Scripts

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm lint:fix
pnpm typecheck
pnpm test
pnpm test:watch
pnpm test:e2e
pnpm test:e2e:ui
pnpm format
pnpm format:check
```

## Documentation

- Product requirements: `docs/product-requirements.md`
- Architecture: `docs/architecture.md`
- Database schema: `docs/database-schema.md`
- Business rules: `docs/business-rules.md`
- Design system: `docs/design-system.md`
- Security: `docs/security.md`
- Testing: `docs/testing.md`
- Deployment: `docs/deployment.md`
- Manual acceptance test: `docs/manual-acceptance-test.md`

Read the relevant document before changing behavior. Read the matching Next.js guide in `node_modules/next/dist/docs/` before changing framework behavior.
