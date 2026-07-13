<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Codex Rules

## Before Editing

- Read the relevant project docs before changing code: `README.md`, `docs/product-requirements.md`, `docs/architecture.md`, `docs/business-rules.md`, `docs/security.md`, `docs/testing.md`, and any domain doc affected by the task.
- Read the relevant Next.js guide in `node_modules/next/dist/docs/` before changing App Router, routing, rendering, data fetching, metadata, config, or testing behavior.
- Inspect existing patterns before editing. Prefer the repository's current conventions over introducing new structure.
- Keep each task focused. Do not rewrite unrelated files or reformat files outside the requested scope.

## Implementation Standards

- Use Next.js App Router, TypeScript, pnpm, Tailwind CSS, shadcn/ui, Supabase, Resend, Vitest, Playwright, and Vercel as the permanent direction.
- Prefer Server Components. Add Client Components only when browser state, event handlers, effects, or browser APIs are required.
- Validate every external input boundary with Zod.
- Keep sensitive operations server-side and audited.
- Never mutate stock directly from UI code. Inventory and order transitions must go through transactional server-side services.
- Use a payment provider interface. MVP payment implementations are manual Mobile Money verification and cash on delivery. Do not add Stripe for the MVP.
- Use semantic HTML, accessible controls, visible focus states, keyboard navigation, and reduced-motion support.
- Do not hard-code brand hex values inside components. Use design tokens from `docs/design-system.md` and global CSS.

## Data and Security

- Use Supabase SSR clients with cookie-based auth.
- Enable RLS on every exposed Supabase table.
- Never expose secret keys, service role keys, payment credentials, or privileged Supabase clients to the browser.
- Never store card details, Mobile Money PINs, OTPs, or CVVs.
- Never log full customer addresses, secrets, payment credentials, or authentication tokens.
- Never commit secrets. Keep real values in `.env.local` or deployment environment variables only.
- Stop and explain any destructive migration before running it.

## Testing and Reporting

- Add tests for business rules and risk-bearing behavior.
- Update docs when behavior, architecture, security posture, database shape, or operational flows change.
- Before reporting completion, run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` unless the user explicitly asks otherwise.
- Report commands and exact results. Never claim success for commands that did not run or failed.
