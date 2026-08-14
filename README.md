# Parfum CI Store

A French-first perfume storefront and operations back office designed for Côte d’Ivoire.

[View the deployed MVP](https://parfum-ci-store.vercel.app) · [Application documentation](parfum-ci-store/docs/) · [Detailed setup guide](parfum-ci-store/README.md)

> The application is currently deployed on Vercel Hobby for deployment verification. Review the deployment constraints before using it for commercial traffic.

## About the project

Parfum CI Store brings the customer storefront and the day-to-day operation of a perfume business into one application. Customers can browse a mobile-friendly catalogue, compare variants, build a cart, submit a guest order, choose a configured delivery and payment method, contact the store, and track an order without creating an account.

Authorized staff use the same system to manage the catalogue, images, inventory, orders, manual payments, customer messages, notification delivery, store settings, delivery zones, and operational analytics.

The application is localized for the Ivorian market:

- French-first customer and admin interfaces;
- integer XOF/FCFA prices and totals;
- Côte d’Ivoire telephone normalization;
- manual Orange Money, MTN MoMo, Wave, Moov Money and other configured payment instructions;
- cash on delivery and store pickup where enabled;
- configurable communes, delivery fees and estimates;
- WhatsApp ordering and support links.

## MVP capabilities

### Customer storefront

- Responsive home, catalogue and product-detail pages
- Brand, category, search, price and availability discovery
- Product variants, images, pricing and authoritative stock availability
- Persistent guest cart with server reconciliation
- Guest checkout with authoritative delivery pricing and order totals
- Configurable manual Mobile Money and cash-on-delivery methods
- Order confirmation and private order tracking using order number and telephone
- WhatsApp cart intent, contact form and managed public content
- SEO defaults, social links, sitemap and robots configuration
- Store maintenance and order-acceptance controls

### Administration

- Supabase Auth with role-aware access
- Operational dashboard with 7-, 30- and 90-day views
- Brand, category, product, variant and image management
- Draft, active and archived product publication lifecycle
- Transactional inventory adjustments and immutable stock ledger
- Order lifecycle and manual payment verification
- Notification outbox, retry/cancellation controls and Resend delivery
- Customer-message inbox, assignment, status and private internal notes
- Centralized identity, contact, payment, delivery, SEO and availability settings
- Delivery zones and authoritative fee calculator
- Audit logging and optimistic settings concurrency

### Security and correctness

- Row Level Security on exposed Supabase tables
- Server-only privileged clients and secrets
- Transactional order reservation and inventory invariants
- Idempotent order, payment, inventory, message and settings operations
- Immutable order-item, delivery-fee and inventory snapshots
- Role-aware DTOs that exclude unauthorized financial/private data
- Strict runtime validation at public and administrative boundaries
- Defensive response headers and practical Content Security Policy
- Desktop and mobile accessibility regression coverage
- Destructive E2E hard-denied against the live Supabase project

## Architecture

```text
Customer and staff browsers
        │
        ▼
Next.js App Router on Vercel
  ├─ Server Components and Route Handlers
  ├─ Supabase SSR authentication
  ├─ Zod validation and typed services
  └─ Resend notification provider
        │
        ▼
Supabase
  ├─ PostgreSQL and transactional functions
  ├─ Auth and role profiles
  ├─ Row Level Security and grants
  └─ Storage for product images
```

Authoritative pricing, order creation, stock reservation, inventory conversion, delivery fees, payment transitions and audit writes execute on the server or inside PostgreSQL transactions. Browser-submitted prices, fees and stock values are never trusted.

## Technology

- Next.js 16 App Router, React 19 and TypeScript
- Tailwind CSS, shadcn/ui and Base UI
- Supabase PostgreSQL, Auth, Storage and SSR clients
- Resend transactional email
- Zod runtime validation
- Vitest and Testing Library
- Playwright with desktop, mobile and accessibility checks
- GitHub Actions and Vercel
- pnpm with Node.js 22

## Repository layout

The Git repository contains the application in a nested directory:

```text
.
├── README.md                 # GitHub project overview
└── parfum-ci-store/          # Next.js application root
    ├── src/                  # Routes, components and domain services
    ├── supabase/             # Forward-only migrations and SQL tests
    ├── tests/                # Unit and Playwright tests
    ├── scripts/              # Guarded operational/test tooling
    ├── docs/                 # Product, architecture and verification docs
    ├── package.json
    └── README.md             # Full developer and operations guide
```

Run application commands from `parfum-ci-store/`, not from the Git repository root.

## Quick start

### Prerequisites

- Node.js 22 (the exact local version is in `.nvmrc`)
- pnpm 10
- Docker for local Supabase
- Supabase CLI
- PostgreSQL `psql` for SQL integration tests

### Local setup

```bash
git clone git@github.com:yann1294/parfum-ci-store.git
cd parfum-ci-store/parfum-ci-store
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm exec supabase start
pnpm exec supabase db reset
pnpm exec supabase gen types typescript --local > src/types/database.types.ts
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

`supabase db reset` is appropriate only for local, disposable Supabase. Never run it against the linked live project.

## Environment configuration

Use [`parfum-ci-store/.env.example`](parfum-ci-store/.env.example) as the reference and keep real values in ignored local files or deployment environment variables.

The main production boundaries are:

- browser-safe Supabase URL and publishable key;
- server-only Supabase secret key;
- canonical site URL;
- Resend API key and verified sender;
- notification/cron configuration;
- product-image Storage bucket.

Contact details, payment instructions, delivery economics, social links, SEO defaults and store availability are managed in the database-backed admin settings. They are not infrastructure secrets.

Never commit credentials or expose server secrets with a `NEXT_PUBLIC_` prefix.

## Quality checks

From the application directory:

```bash
pnpm format:check
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
```

The default Playwright command is limited to safe browser checks. Database lifecycle E2E requires an explicitly allowlisted local or staging Supabase target:

```bash
PLAYWRIGHT_MODE=destructive \
ALLOW_DESTRUCTIVE_E2E=true \
E2E_TARGET_KIND=local \
pnpm test:e2e:destructive
```

The live Supabase project is hard-denied even when these flags are present.

## Deployment status

- Application preview: [parfum-ci-store.vercel.app](https://parfum-ci-store.vercel.app)
- Hosting: Vercel Hobby
- Backend: existing Supabase Free project
- Email: Resend, requiring a verified sender domain for production delivery

The current Supabase project is stateful and non-disposable. Do not reset, truncate, broadly seed or run destructive fixtures against it. Before accepting commercial orders, close the outstanding deployment gates, use a commercially compatible hosting plan, take an encrypted PostgreSQL backup plus a separate Storage export, and complete the production acceptance checklist.

See:

- [Deployment guide](parfum-ci-store/docs/deployment.md)
- [Phase 17 deployment verification](parfum-ci-store/docs/phase-17-deployment-verification.md)
- [Free-tier deployment constraints](parfum-ci-store/docs/phase-17-free-tier-deployment-plan.md)
- [Future infrastructure upgrade roadmap](parfum-ci-store/docs/production-upgrade-roadmap.md)

## Documentation

| Document                                                                       | Purpose                                                     |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| [Developer handoff](parfum-ci-store/docs/mvp-developer-handoff-and-roadmap.md) | Durable MVP state, reasoning and future roadmap             |
| [Product requirements](parfum-ci-store/docs/product-requirements.md)           | MVP scope and completed modules                             |
| [Architecture](parfum-ci-store/docs/architecture.md)                           | Application boundaries and authoritative data flow          |
| [Database schema](parfum-ci-store/docs/database-schema.md)                     | Tables, functions, RLS and snapshots                        |
| [Business rules](parfum-ci-store/docs/business-rules.md)                       | Catalogue, ordering, stock, payment and lifecycle rules     |
| [Security](parfum-ci-store/docs/security.md)                                   | Auth, roles, secrets, validation and production controls    |
| [Design system](parfum-ci-store/docs/design-system.md)                         | Brand tokens, components and responsive conventions         |
| [Testing](parfum-ci-store/docs/testing.md)                                     | Unit, SQL, Playwright and destructive-test policy           |
| [Deployment](parfum-ci-store/docs/deployment.md)                               | Environment, Supabase, Vercel, backup and smoke procedures  |
| [Manual acceptance test](parfum-ci-store/docs/manual-acceptance-test.md)       | Operational acceptance checklist                            |
| [Phase 18 analysis](parfum-ci-store/docs/phase-18-readiness-analysis.md)       | Catalogue onboarding decision and launch gates              |
| [Legal and licensing](parfum-ci-store/docs/legal-and-licensing.md)             | License decision, public policies and owner completion work |

## Project status

The functional MVP and its security/accessibility hardening are implemented. Deployment verification is active, while real catalogue onboarding and final commercial launch acceptance remain controlled operational steps.

Future work is intentionally separated from the MVP, including a dedicated staging Supabase project, commercial hosting upgrade, managed backup improvements and a hosted payment gateway behind the existing provider interface.

## License

This project is proprietary and all rights are reserved. It is not open-source and the application package is marked `UNLICENSED`. See the [project license](LICENSE) and [legal/licensing handoff](parfum-ci-store/docs/legal-and-licensing.md). Third-party dependencies and assets remain subject to their own terms.
