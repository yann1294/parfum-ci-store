# Phase 18 — Controlled catalogue onboarding and launch acceptance

## Goal

Onboard the first approved real catalogue without bypassing the completed catalogue, image, inventory, audit or production-safety architecture, then execute a gated launch acceptance test on the deployed environment.

Phase 18 is split into two separately approved deliverables:

- **18A — Catalogue onboarding tooling**, required only when the real catalogue volume justifies bulk import;
- **18B — Production launch acceptance**, run only after Phase 17 deployment gates are closed.

Do not add a payment gateway in Phase 18. Do not create or invent products, prices, SKUs, business copy, legal copy or copyrighted images.

Do not automatically import, archive, deactivate or delete anything in the linked Supabase project. Live data operations require a fresh backup, reviewed dry run and separate explicit approval.

## Read before editing

- `AGENTS.md`;
- `README.md`;
- all catalogue, inventory, security, testing and deployment documentation;
- `docs/manual-acceptance-test.md`;
- `docs/phase-16-hardening-verification.md`;
- `docs/phase-17-free-tier-deployment-plan.md`;
- `docs/phase-17-deployment-verification.md`;
- `docs/phase-18-readiness-analysis.md`;
- current catalogue validation, authorization, audit and mutation services;
- current image upload/finalization service and Storage policies;
- Phase 10 inventory transaction/initialization service;
- existing inventory/ledger CSV escaping and exports;
- current E2E safety guard and production project hard deny;
- generated Supabase types and SQL-test infrastructure.

Do not modify applied migrations. Do not push migrations. Do not manually edit generated Supabase types. Do not run database-mutating E2E against the linked project.

## 1. Pre-implementation report

Before editing, report:

1. current brand/category/product/variant fields and constraints;
2. current slug and SKU uniqueness behavior;
3. product publication-readiness rules;
4. image upload/storage architecture;
5. inventory initialization and ledger rules;
6. catalogue permissions and audit behavior;
7. existing CSV/export utilities;
8. fixture seed scripts and why they cannot be reused for production;
9. current sanitized catalogue/fixture counts from Phase 17;
10. whether manual admin entry is sufficient for the supplied catalogue size;
11. schema or transaction gaps genuinely required for import;
12. Phase 17 blockers preventing production acceptance.

Stop after the report unless 18A implementation is explicitly approved.

## 2. Decide whether bulk import is necessary

Prefer the existing admin UI for a small launch assortment. Implement import only when the owner supplies reviewed real catalogue data and confirms the volume makes manual entry impractical.

If import is not justified:

- do not add code or migrations;
- provide a manual onboarding runbook using the existing catalogue, image and inventory workflows;
- keep 18B gated by Phase 17 readiness.

## 3. Import scope

If 18A is approved, provide versioned UTF-8 CSV templates for:

- brands;
- categories;
- products;
- variants.

Use normalized slugs as cross-file references. Do not require database UUIDs.

The importer is create-only for MVP. It must not update, merge, publish, archive or delete existing records.

## 4. Required CSV contracts

Use the exact approved contracts from `docs/phase-18-readiness-analysis.md`.

Requirements:

- exact headers and documented comma delimiter;
- UTF-8 with optional BOM;
- bounded file bytes and row counts;
- blank-row policy;
- strict values for booleans, integers, enums and nullable fields;
- bounded text with no silent truncation;
- stable file and row numbers in errors;
- unexpected columns rejected;
- duplicate headers rejected;
- deterministic note-list encoding;
- no HTML or executable content;
- no image URL, stock, reservation or inventory-initialization columns.

Money must remain integer XOF and non-negative.

## 5. Validation and duplicates

Reuse existing catalogue Zod schemas and domain normalizers where possible.

Validate the complete batch before writes:

- every row and cross-file reference;
- parent-category references and cycles;
- brand/category/product references;
- duplicate normalized slugs within each namespace;
- duplicate normalized SKUs;
- conflicts with existing database slugs/SKUs;
- compare-at-price and other established business constraints;
- supported fragrance family and audience values.

Default conflict policy: fail the entire batch. Do not silently suffix, overwrite or upsert.

## 6. Dry run

Dry run must execute the same parse, normalization, relationship, permission and database-conflict checks as commit.

Dry run:

- performs no insert/update/delete;
- creates no catalogue audit event;
- returns counts, normalized previews and row-level errors;
- never returns private database diagnostics.

## 7. Transaction and retries

The committed import must be all-or-nothing across brands, categories, products and variants.

If the current application services cannot guarantee this, add the smallest reviewed forward-only migration/RPC with:

- OWNER/ADMIN actor authorization;
- `SECURITY DEFINER` hardening where applicable;
- `search_path = ''` and qualified identifiers;
- least-privilege execution grants;
- no unsafe dynamic SQL;
- an import identifier/fingerprint;
- idempotent replay or a safe conflict;
- bounded audit metadata;
- rollback on any row failure.

Do not emulate transactionality with row-by-row browser actions.

## 8. Imported lifecycle

- All products are created as `DRAFT`.
- Imported variants start with zero physical/reserved stock and uninitialized inventory according to current schema behavior.
- Import never activates products.
- Import never downloads or inserts images.
- Import never modifies existing catalogue records.
- Publication happens only after images, inventory and readiness are reviewed through established workflows.

## 9. Authorization and audit

Only OWNER and ADMIN may dry-run, import or export the private catalogue dataset.

INVENTORY_MANAGER retains the established read-only catalogue/inventory boundary and cannot import product commercial data.

Record a safe committed-import audit event containing actor, import ID, schema version, entity counts, changed resource identifiers or bounded summaries and timestamp. Do not log uploaded CSV content, descriptions, cost values or unrestricted payloads.

## 10. Error report

Return a bounded downloadable/reportable result containing:

- file;
- row;
- field;
- stable error code;
- safe French message.

Do not expose SQLSTATE, table/function names, Supabase details/hints, stack traces or filesystem paths.

## 11. Catalogue export

Add an OWNER/ADMIN-only, versioned catalogue export suitable for round-trip preparation.

Requirements:

- explicit columns only;
- formula-injection-safe cells;
- no stock/reservation/audit/customer/order/payment data;
- cost price included only in the private authorized export when explicitly approved;
- no signed upload tokens or Storage internals.

Label this as a catalogue export, not a disaster-recovery backup. Phase 17 PostgreSQL and Storage backups remain mandatory.

## 12. Image workflow

After import, document and reuse the existing admin image manager:

1. open the draft product;
2. upload an owned/licensed JPEG, PNG or WebP;
3. pass signed-upload and content validation;
4. provide useful alt text;
5. finalize and approve the image;
6. verify public rendering only after activation.

Do not accept arbitrary remote URLs or scrape images.

## 13. Inventory workflow

Initial stock is a separate Phase 10 operation.

For every launch variant:

1. confirm SKU and commercial fields;
2. initialize/receive physical stock through the transactional inventory service;
3. verify ledger and audit rows;
4. verify `reserved_quantity <= stock_on_hand`;
5. confirm low-stock threshold;
6. verify storefront availability after activation.

Never directly set stock from CSV or UI update code.

## 14. Tests for 18A

Add unit tests for:

- valid files and optional BOM;
- strict headers and unexpected columns;
- malformed/oversized rows and files;
- invalid enums, booleans and integer XOF;
- duplicate slug/SKU in batch;
- existing database conflict;
- missing/cyclic references;
- dry run performs no writes/audit;
- safe row-level errors;
- formula-safe export;
- product status remains `DRAFT`;
- inventory fields cannot be imported;
- unauthorized roles denied;
- idempotent retry and conflicting retry.

Add real isolated database tests for full commit, rollback, concurrent duplicate import, audit and grants. Never run them against the linked production candidate.

## 15. Phase 17 gate before 18B

Do not begin production launch acceptance until all required Phase 17 items are closed, including:

- commercial-compatible hosting;
- Vercel/deployment environment verification;
- canonical domain and Supabase Auth URL configuration;
- encrypted PostgreSQL backup and separate Storage export;
- test staff/data review;
- real store, payment, delivery, SEO and notification settings;
- intended active catalogue and reconciled inventory;
- Resend/custom SMTP and cron strategy;
- production smoke readiness.

If any gate remains open, mark 18B `NOT VERIFIED` and stop before mutations.

## 16. Controlled production onboarding

Requires separate explicit approval.

1. Enable maintenance mode and disable order acceptance.
2. Take and record fresh database and Storage backups.
3. Dry-run the final reviewed files.
4. Obtain owner approval of the exact report.
5. Commit once.
6. Review draft records.
7. Upload licensed images.
8. initialize inventory through Phase 10.
9. activate only approved products.
10. verify catalogue and cart reconciliation.

Fixture cleanup is separate. Do not rewrite immutable order, payment, inventory, notification or audit history.

## 17. Launch acceptance scope

Update `docs/manual-acceptance-test.md` and create `docs/phase-18-launch-acceptance.md` with Expected, Actual and `PASS`/`FAIL`/`NOT VERIFIED` for:

### Storefront and content

- mobile/desktop home, catalogue and product pages;
- only intended ACTIVE products visible;
- search, filters, variant price/availability and images;
- configured social/WhatsApp links and UTM attribution;
- light/dark design-token consistency and accessibility;
- approved about, delivery, privacy, terms and legal content where supplied;
- canonical production domain, HTTPS, metadata, robots and sitemap.

Do not invent legal text. Missing approved legal routes/content remain `NOT VERIFIED` or `FAIL` according to the owner/legal launch decision.

### Cart, checkout and payments

- cart persistence and authoritative reconciliation;
- changed price/out-of-stock behavior;
- every **enabled** production payment method;
- Phase 14 instructions shared across checkout/confirmation/communication;
- no PIN, OTP, CVV or card credential request;
- duplicate submission creates one order;
- authoritative delivery quote equals stored fee and total;
- old order economics remain unchanged after settings changes.

### Inventory and orders

- receive/damage ledger entries;
- no direct stock editing;
- reservation, cancellation `RELEASED` and delivery `SOLD` exactly once;
- concurrent final-unit protection using isolated evidence, not destructive production races;
- lifecycle/payment state machine and invalid-transition denial;
- tracking requires order number plus normalized phone and exposes no internal data.

### Messages, notifications and roles

- contact message, safe XSS rendering, inbox and internal-note privacy;
- admin/customer notification provider acceptance and separately recorded inbox delivery;
- low-stock deduplication;
- OWNER/ADMIN/ORDER_MANAGER/INVENTORY_MANAGER/CUSTOMER_SUPPORT permissions;
- unauthorized direct mutation denial;
- dashboard role-sensitive financial DTOs.

### Operations

- CI and production build;
- migration alignment and advisors;
- backup artifacts and recovery ownership;
- maintenance/order-acceptance behavior;
- health route, logs and no secret/PII exposure;
- production performance and responsive checks;
- owner can operate catalogue, inventory, orders, settings, notifications and messages without redeployment.

## 18. Verification integrity

Do not claim:

- import success from dry run alone;
- rollback from application cleanup after partial writes;
- inventory success from CSV values;
- image readiness from URLs without the existing upload/finalize workflow;
- payment coverage for disabled methods;
- inbox delivery from provider acceptance;
- production acceptance from local E2E;
- legal compliance from placeholder text;
- backup coverage from catalogue CSV export;
- deployment approval while Phase 17 blockers remain.

Use only `PASS`, `FAIL` or `NOT VERIFIED`.

## 19. Documentation

If 18A is implemented, update README, catalogue/schema/business/security/testing/deployment docs and add:

- CSV field dictionary and example templates containing fictional neutral rows only;
- import/export operator runbook;
- image and inventory post-import runbook;
- migration/type commands if applicable;
- launch acceptance document.

Examples must not be presented as real products and must not include copyrighted images.

## 20. Final report

Return:

1. whether bulk import was justified;
2. existing foundation reused;
3. approved file contracts;
4. validation and bounds;
5. duplicate/conflict policy;
6. dry-run result;
7. transaction/idempotency architecture;
8. authorization/audit handling;
9. inventory separation;
10. image workflow;
11. export scope;
12. migration filename, if any;
13. tests and exact command results;
14. real catalogue classification;
15. Phase 17 gate status;
16. production onboarding result;
17. full acceptance results;
18. remaining risks and `NOT VERIFIED` items;
19. changed files;
20. manual actions;
21. whether the MVP is safe to open to customers.

Do not declare Phase 18 complete until approved real catalogue data is active with ledger-backed inventory and the deployed commercial-compatible environment passes launch acceptance. Tooling completion alone is not Phase 18 completion.
