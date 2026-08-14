# Store Reproduction Playbook

Branch-only material for turning the completed Parfum CI Store MVP into separate store projects.

## Isolation status

- Branch: `playbook/store-reproduction-models`
- Source baseline: commit `13d0c60` (`feat(legal): add proprietary licensing and storefront policies`)
- Intended destination: a **new private repository and a new infrastructure stack for each business**
- Merge policy: **do not merge this playbook branch into `develop` or `main`**

These files are intentionally stored only on the playbook branch. Git has no “exclude this directory when merging” flag. Their isolation is preserved by keeping this branch unmerged and by exporting the application baseline into a new repository when starting another store.

Read [branch-isolation.md](branch-isolation.md) before copying anything.

## Purpose

The current MVP is more than a perfume storefront. Its reusable core provides:

- public catalogue and product discovery;
- server-reconciled guest cart;
- transactional order creation and stock reservation;
- immutable inventory, payment and order histories;
- manual payment verification;
- configurable local delivery fees and zones;
- role-aware administration;
- notification outbox and customer-message inbox;
- centralized operational settings and editorial content;
- operational dashboard;
- RLS, grants, authorization, audit and idempotency boundaries;
- deployment, test-isolation and production-hardening practices.

The reusable product is therefore a **single-merchant physical-goods commerce and operations foundation**. It is not a generic marketplace or no-code store builder.

## Best-fit business profile

Use this foundation when the new business has most of these properties:

- one merchant controls the catalogue, money, stock and fulfilment;
- products are physical goods sold in whole-number quantities;
- each SKU has one authoritative price and finite inventory;
- orders can be accepted without customer accounts;
- stock is reserved at order creation and sold or released later;
- payment can begin with COD or manually verified Mobile Money;
- delivery is local, zone-based, pickup-based or both;
- XOF and Côte d’Ivoire contact conventions are appropriate, or there is an approved localization phase;
- staff roles broadly match administration, orders, inventory and support;
- the business accepts a separate Supabase project and deployment for its data.

## Poor-fit business profile

Do not “rename and launch” this repository for:

- multi-vendor marketplaces;
- restaurants or real-time kitchen ordering;
- prescription medicines or regulated health sales;
- rentals, appointments or bookings;
- subscriptions or recurring billing;
- digital downloads or license-key delivery;
- products requiring batch/lot/expiry traceability before that model exists;
- serialized high-value devices when serial and warranty tracking are mandatory;
- multi-currency or tax-inclusive/exclusive accounting without a dedicated design;
- businesses that need customer accounts as the authorization boundary.

Those models require new domain work, not cosmetic adaptation.

## Playbook map

1. [branch-isolation.md](branch-isolation.md) — keep this material out of Parfum CI release branches and safely create another project.
2. [reproduction-blueprint.md](reproduction-blueprint.md) — what is reusable, what must change and the recommended adaptation sequence.
3. [store-model-examples.md](store-model-examples.md) — five realistic store examples, fit ratings and required domain changes.
4. [templates/store-adaptation-brief.md](templates/store-adaptation-brief.md) — owner questionnaire and technical decision record.
5. [prompts/kickoff-prompts.md](prompts/kickoff-prompts.md) — copy/paste prompts for discovery, implementation and each example model.
6. [follow-up-guide.md](follow-up-guide.md) — how to review an analysis, approve bounded phases and resume months later.

## Recommended workflow

```text
Choose a store model
  → complete the adaptation brief
  → create a new private repository
  → create new Supabase/Vercel/Resend resources
  → run the discovery prompt (analysis only)
  → approve one bounded adaptation phase
  → preserve transactional/security invariants
  → import only owner-approved data
  → complete legal and deployed acceptance
```

## Non-negotiable invariants

Every derivative store should preserve these rules unless a deliberate replacement is designed and proven:

1. The browser never supplies authoritative price, fee, stock, payment or lifecycle values.
2. Order creation, stock reservation and totals remain one authoritative transaction.
3. Inventory changes use ledger operations; UI code never writes stock directly.
4. Cancellation releases a reservation once; delivery converts it to sold once.
5. Payment status and fulfilment status remain separate.
6. Historical order items, customer details, payment data and delivery economics remain snapshots.
7. Notification delivery never rolls back a successful business transaction.
8. Public, operational and administrative settings use explicit projections.
9. RLS, grants and server authorization protect sensitive operations independently of UI visibility.
10. Destructive tests never target a live business database.
11. Applied migrations are immutable; changes use reviewed forward-only migrations.
12. Legal identity, privacy, returns, tax and asset rights are supplied by the new business—not copied from Parfum CI.

## What not to copy

Never copy these from the Parfum CI environment into a new store:

- `.env.local`, `.env.test.local` or deployment secrets;
- the linked Supabase project or its production data;
- staff/customer credentials or Playwright authentication state;
- product images, brand assets or catalogue copy without verified rights;
- Resend API keys, sender identity or SMTP credentials;
- Vercel project configuration that points to the Parfum CI backend;
- backups, database dumps, storage exports or test fixtures;
- legal/operator details or policy approval.

## Status vocabulary

Use only:

- `PASS` — directly verified with relevant evidence;
- `FAIL` — verified and incorrect or incomplete;
- `NOT VERIFIED` — not checked, inaccessible or dependent on an external/manual action.

“Inherited from Parfum CI” does not mean `PASS` for a new store. New infrastructure, data, branding, legal terms and deployed workflows require their own evidence.
