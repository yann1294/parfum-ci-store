# Follow-up And Resumption Guide

This guide explains how to turn an analysis prompt into a controlled derivative project and how to preserve enough context for another developer or assistant months later.

## 1. Begin with a decision, not a code request

Before starting, choose:

- the store model;
- whether it fits the single-merchant physical-goods foundation;
- a new private repository and infrastructure boundary;
- the owner of business, legal and technical decisions;
- the first intentionally excluded features.

Complete the [store adaptation brief](templates/store-adaptation-brief.md), then run the universal fit prompt. Do not approve implementation when essential fields are `UNKNOWN` if those fields change stock, price, payment, fulfilment, privacy or legal obligations.

## 2. Evaluate the first analysis

An acceptable analysis should contain concrete repository evidence, not generic e-commerce advice.

### Approve only when it identifies

- every perfume-specific schema field and its consumers;
- the intended new product/variant unit;
- authoritative price and inventory behavior;
- historical snapshot changes;
- SQL functions and grants affected;
- public/admin projection changes;
- legal/operational assumptions supplied by the owner;
- isolated infrastructure requirements;
- concurrency and permission regressions;
- explicit exclusions.

### Reject or revise when it proposes

- only renaming UI labels;
- putting all new attributes into unrestricted JSON;
- editing old migrations;
- trusting browser prices, fees or stock;
- direct `stock_on_hand` edits;
- using the Parfum CI Supabase project for convenience;
- copying `.env.local` into the derivative;
- reusing customer/test/staff records;
- claiming old Phase 16 evidence proves the new store;
- importing invented products or unlicensed images;
- copying legal text without new owner review.

## 3. Approve one bounded phase at a time

Recommended approvals:

1. repository and infrastructure isolation;
2. domain/schema contract;
3. catalogue/public/admin UI adaptation;
4. cart/order/inventory integration;
5. payments/delivery/settings/content;
6. communications/dashboard/roles;
7. legal/privacy/retention;
8. real data onboarding;
9. hardening and deployed acceptance.

Do not combine schema redesign, production data import and infrastructure migration into one approval.

## 4. Required report after every phase

Ask for:

1. objective and exclusions;
2. existing foundation reused;
3. behavior changed;
4. migrations created;
5. authorization/RLS/grant impact;
6. authoritative transaction impact;
7. public/private DTO impact;
8. historical data compatibility;
9. tests added;
10. exact command results;
11. failures and `NOT VERIFIED` items;
12. changed files;
13. manual migration/type/deployment commands;
14. rollback/forward-fix plan;
15. whether the phase is safe to approve;
16. suggested commit message.

Never accept “tests pass” without counts and commands. Never accept “permissions pass” because controls are hidden. Never accept “stock works” from sequential requests when a race is possible.

## 5. Derivative decision log

Create a durable handoff in the new repository. For each material decision record:

```text
Decision:
Date:
Owner:
Status: PROPOSED / APPROVED / SUPERSEDED
Business reason:
Technical choice:
Alternatives rejected:
Data/migration impact:
Security/privacy impact:
Tests/evidence:
Future trigger to revisit:
```

High-value decisions include:

- product and variant dimensions;
- stock unit and reservation moment;
- payment verification semantics;
- delivered/sold definition;
- returns/restock behavior;
- customer-account policy;
- business timezone/currency;
- role visibility of revenue/customer data;
- hosting and database separation;
- source-code license;
- policy-version snapshot and retention schedule.

## 6. Keep a current state capsule

At the end of each phase update a short section containing:

```text
Repository:
- remote:
- branch:
- release/HEAD:
- clean worktree: PASS/FAIL

Infrastructure:
- Vercel project/plan/domain:
- Supabase project/plan/migration head:
- staging/local destructive-test target:
- Resend/SMTP/cron status:
- last database backup:
- last Storage export:
- last restore test:

Domain:
- product unit:
- variant dimensions:
- inventory semantics:
- enabled payments:
- fulfilment methods:
- terms/privacy versions:

Evidence:
- unit suite:
- SQL/concurrency suite:
- safe browser suite:
- destructive staging suite:
- deployed acceptance:

Open blockers:
- ...

Accepted exclusions:
- ...
```

This capsule prevents a future assistant from inferring live infrastructure state from old documentation.

## 7. Update rules when the base project evolves

Parfum CI and a derivative are separate products after extraction. Do not assume automatic inheritance.

When Parfum CI receives a security fix:

1. identify the exact commit and affected invariant;
2. inspect whether derivative code still has the same architecture;
3. port the smallest equivalent change;
4. use a derivative-specific forward migration where needed;
5. rerun the derivative tests;
6. update its handoff.

Do not merge Parfum CI wholesale after the derivative's schema and vocabulary diverge.

When a derivative discovers a reusable fix, apply it to Parfum CI only through a separate reviewed product change. Never merge this playbook branch to transfer code.

## 8. Launch review for each new store

### Repository and infrastructure

- new repository/remote confirmed;
- no Parfum CI secret or project reference except documented historical hard deny;
- production/staging/local targets separated;
- migration history aligned;
- backup and Storage export captured;
- production staff accounts reviewed;
- CI cannot mutate production.

### Catalogue and inventory

- all active products are intended launch items;
- every SKU uses the approved new variant fields;
- images and descriptions have usage rights;
- stock initialized through the ledger;
- reservations correspond to legitimate orders;
- no placeholder/test data is unintentionally active.

### Checkout and operations

- every enabled payment method tested;
- authoritative delivery fee displayed and stored;
- one controlled order reserves once;
- cancellation releases once;
- delivery sells once;
- tracking needs the approved verification factors and leaks no private data;
- notifications and support inbox work;
- role-aware dashboard excludes unauthorized financial data.

### Legal and customer trust

- publisher identity complete;
- terms, returns/refunds and privacy approved;
- policy version and acceptance behavior documented;
- processor/international-transfer and retention decisions recorded;
- product warnings and claims approved;
- canonical domain, HTTPS, metadata, sitemap and noindex rules checked.

### Accessibility and deployment

- mobile and desktop customer journeys completed;
- keyboard, focus, labels, errors and dialogs checked;
- no serious automated accessibility violation;
- production build and representative route smoke pass;
- no console/CSP/image/network blocker;
- maintenance and order-acceptance controls restored to intended launch state.

## 9. When to stop adapting and start a new architecture

Stop derivative implementation and request a redesign when the business introduces:

- multiple sellers or settlement owners;
- quantities that are not whole stock units;
- lots, expiry, recalls or serial-level custody;
- scheduling, seats, rooms or time slots;
- subscriptions or recurring entitlement;
- multi-warehouse allocation;
- offline POS with conflict reconciliation;
- legally sensitive health/prescription data;
- automated tax across jurisdictions;
- refunds/chargebacks that require a real money ledger.

Continuing by adding flags and JSON fields would make the original transaction guarantees misleading.

## 10. Suggested prompts during follow-up

### Ask for a smaller phase

```text
The proposal is too broad. Split it into independent phases for:
1. schema/domain contract;
2. catalogue/public/admin UI;
3. cart/order/inventory integration;
4. legal/data onboarding.

For each phase list exact migrations, authoritative functions, projections, tests, rollback/forward-fix strategy and stop conditions. Do not edit yet.
```

### Challenge a claimed pass

```text
Re-evaluate every PASS using direct evidence. Hidden UI is not authorization proof, sequential calls are not concurrency proof, a displayed fee is not stored-order proof, an outbox row is not inbox delivery, and inherited Parfum CI evidence is not derivative evidence. Downgrade unsupported claims to NOT VERIFIED and list the exact verification needed.
```

### Ask for a safe implementation continuation

```text
Continue only the approved <phase> on the derivative repository. Preserve unrelated worktree changes. Do not push migrations, deploy, seed live data or change external services. Stop if the current repository, Supabase project or E2E target cannot be proven isolated from Parfum CI. Run the relevant tests and return exact results plus the next bounded approval point.
```

### Prepare for a pause

```text
Prepare a durable handoff for the derivative as it exists now. Record implemented behavior, architectural reasoning, schema/migration head, authoritative invariants, role matrix, environment boundaries, external state last verified, tests and exact results, open blockers, accepted exclusions, future roadmap and a copy/paste resume prompt. Do not implement new features.
```

## 11. Branch-only maintenance reminder

This guide belongs only to `playbook/store-reproduction-models`. To keep it out of Parfum CI:

- do not merge this branch to `develop` or `main`;
- do not cherry-pick its `docs(playbook)` commit into product branches;
- create each derivative in a new repository;
- inspect `git diff --name-only develop...HEAD` before any branch operation;
- if product fixes are needed, move those specific product commits independently—not this directory.
