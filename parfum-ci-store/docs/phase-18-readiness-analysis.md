# Phase 18 — Catalogue onboarding and launch acceptance analysis

Status: **AWAITING OWNER APPROVAL**  
Analysis date: 2026-08-15

This document evaluates the original Phase 18 prompt against the completed Phase 1–17 architecture. It authorizes no catalogue import, production cleanup, database mutation, image upload, inventory correction, order creation, or deployment action.

## Executive decision

The original Phase 18 should **not** be implemented as written.

It combines three materially different activities:

1. building a new bulk catalogue-import feature;
2. replacing test/placeholder data in the stateful linked Supabase project;
3. performing external production launch acceptance.

Those activities need separate approval and safety gates. Phase 17 currently records deployment approval as `FAIL`, including commercial-hosting, backup, catalogue cleanup, staff-account, delivery, canonical URL, email, Auth and external smoke-test gaps. Real launch acceptance therefore cannot run yet.

The import feature is **conditional**, not automatically required. The established admin catalogue UI already creates brands, categories, products, variants and images safely. For a small initial assortment, manual entry is lower risk and avoids a new production mutation surface. A bulk importer becomes justified when the owner supplies a reviewed catalogue whose volume makes manual entry impractical.

Recommended decision threshold:

- up to roughly 20 products or a small number of variants: use the existing admin UI;
- a larger or frequently revised launch assortment: approve the controlled create-only CSV importer described in the proposed prompt;
- uncertain catalogue size or incomplete commercial data: prepare and validate CSVs offline, but do not build or run the importer yet.

## Existing foundation that Phase 18 must reuse

| Area                 | Existing implementation                                                                         | Continuity requirement                                                               |
| -------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Catalogue management | OWNER/ADMIN routes and services for brands, categories, products and variants                   | Do not create a second catalogue model or bypass existing validation/authorization   |
| Product lifecycle    | New products are created as `DRAFT`; activation has publication-readiness checks                | Imports must remain `DRAFT`; never auto-publish                                      |
| Variants             | SKU, integer XOF price, size, concentration, low-stock threshold and active state are validated | Reuse the same domain schemas and constraints                                        |
| Inventory            | Phase 10 transactional adjustments and immutable ledger                                         | Import must not set stock, reservations or inventory initialization                  |
| Images               | Signed upload, magic-byte validation, 5 MiB JPEG/PNG/WebP policy, finalized Storage records     | No image URLs or remote downloads in CSV; use the existing upload workflow afterward |
| Audit                | Catalogue mutations are audited                                                                 | A real import needs bounded, safe audit summaries                                    |
| Export               | Authorized, formula-safe inventory and ledger CSV export exists                                 | Reuse CSV escaping; catalogue export remains distinct from disaster backup           |
| Test safety          | Destructive scripts require isolated local/staging and hard-deny the linked project             | Import integration tests must never target the linked production candidate           |
| Launch review        | Phase 17 read-only audit and verification documents                                             | Preserve the KEEP/ARCHIVE/REMOVE/REVIEW classification process                       |

## Current evidence affecting the decision

The Phase 17 sanitized audit recorded:

- 47 brands, 37 categories, 40 products and 83 variants;
- 33 product and 74 variant records matching fixture patterns;
- 26 product-image rows requiring object-level review;
- transactional fixture history that must not be casually deleted or rewritten;
- zero enabled delivery methods;
- incomplete canonical/support/branding settings;
- active test-account candidates requiring manual review;
- no completed backup or external production smoke verification.

Counts are candidate signals only. They do not authorize deletion and do not prove which remaining records are real launch merchandise.

## Problems in the original prompt

### 1. “Seed” is the wrong production concept

The linked Supabase Free project is now stateful and non-disposable. A production catalogue operation should be called a **controlled initial import**, not a seed. Existing Phase 5/6.5 seed scripts are fixture tooling and remain prohibited against this project.

### 2. Import and replacement are dangerously conflated

Creating approved draft records is different from archiving fixture data. Phase 18 must not automatically delete, overwrite, deactivate or merge existing records. Cleanup remains a separately reviewed manual operation with referential-integrity checks.

### 3. Inventory fields cannot be imported with catalogue rows

`stock_on_hand`, `reserved_quantity` and `inventory_initialized_at` belong to Phase 10 transactional inventory workflows. Initial stock must be received/initialized after catalogue creation through the authoritative inventory service so ledger and audit history remain valid.

### 4. “Transactional where practical” is too weak

If a bulk import is approved, persistence of the four related datasets should be all-or-nothing. Parsing and dry-run validation can occur in the application, but production insertion needs a reviewed transaction boundary. If current services cannot guarantee this across the batch, a forward-only migration/RPC is required; row-by-row partial success is not acceptable.

### 5. Duplicate semantics are undefined

For the MVP, the safe policy is create-only:

- duplicate normalized slug or SKU inside the upload: reject;
- conflict with an existing database slug or SKU: reject;
- missing brand/category/product reference: reject;
- no implicit upsert, merge, rename or overwrite;
- repeated committed import: return the original result or reject safely through an import identifier/fingerprint.

Update/merge import can be considered later as a distinct feature.

### 6. CSV safety and bounds are underspecified

The implementation contract must define UTF-8/BOM handling, exact headers, delimiter, blank-row policy, maximum bytes, maximum rows, strict booleans/integers/enums, row numbers, text bounds and unexpected-column rejection. Exported cells must retain formula-injection protection.

### 7. Catalogue export is not a backup

A catalogue CSV export is useful for operational portability. It does not replace the encrypted PostgreSQL logical backup and separate Storage export required by Phase 17.

### 8. The payment checklist hard-codes methods

Launch acceptance must test **every enabled production payment method**, not require Orange Money, MTN MoMo, Wave and Moov Money when they are intentionally disabled. It must still verify that enabled manual methods use Phase 14 instructions and never request PIN/OTP/card credentials.

### 9. Legal/privacy routes exist, but approval remains outstanding

The repository now includes `/mentions-legales`, `/politique-de-confidentialite` and `/conditions-generales-de-vente`, linked from the footer and relevant forms. They reflect the implemented MVP and expose missing owner-controlled facts instead of inventing them. `docs/legal-and-licensing.md` is the authoritative completion checklist. Checkout still records UI acceptance without a policy version/timestamp snapshot, so it must not be represented as audit-grade legal consent.

### 10. Launch acceptance cannot precede Phase 17 gates

The original prompt asks for domain, SSL, email and production workflow results. Those can only be marked after a commercial-compatible host, production URL/Auth settings, backup, real settings, staff cleanup and deployed environment exist. Until then they remain `NOT VERIFIED`.

### 11. The payment gateway proposal is a separate future phase

Gateway selection and webhook implementation are not part of catalogue onboarding or launch acceptance. They should remain a post-MVP roadmap item and require a provider/business decision after the manual payment workflow has real operational evidence.

## Proposed catalogue file contract

If bulk import is approved, use four UTF-8 comma-delimited files with exact headers. Human-readable slugs provide stable cross-file references; database UUIDs are never required from the user.

### `brands.csv`

```text
name,slug,description,active,sort_order
```

### `categories.csv`

```text
name,slug,parent_slug,description,active,sort_order
```

`parent_slug` is optional but must reference a category in the batch or an existing category.

### `products.csv`

```text
name,slug,brand_slug,category_slug,short_description,description,fragrance_family,top_notes,heart_notes,base_notes,gender_category,featured,seo_title,seo_description
```

Notes need one documented, escaped list format. Imported products are always `DRAFT`; there is deliberately no status column.

### `variants.csv`

```text
product_slug,sku,size_ml,concentration,price_xof,compare_at_price_xof,cost_price_xof,low_stock_threshold,active
```

Money fields are integer XOF. `cost_price_xof` is private and may be omitted. There are deliberately no stock, reserved, inventory-initialization or image URL columns.

## Required import behavior if approved

1. OWNER/ADMIN only, enforced in the service and database operation.
2. Strict server-side parsing and validation of all four files.
3. Bounded file size and row count before full parsing.
4. Dry run executes the same normalization, relationship and database-conflict checks as commit, but performs no write or audit event.
5. Commit uses one transaction and creates only draft catalogue entities.
6. An import ID/fingerprint protects retries and double-clicks.
7. Any invalid row or conflict rolls back the full batch.
8. Error output contains file, physical row, field, stable error code and safe French explanation; no SQL/Supabase diagnostics.
9. Audit contains actor, import ID, counts and created entity IDs or bounded summaries; not full CSV contents or cost values.
10. Revalidate only catalogue/admin data after a successful commit.
11. Provide an OWNER/ADMIN-only, formula-safe catalogue export with an explicit schema version.
12. Test integration only against isolated local Supabase or future staging, never the linked project.

## Required post-import sequence

Importing rows does not make products sellable.

1. Review every imported draft in admin.
2. Upload licensed/owned images through the existing image manager.
3. Initialize stock through Phase 10 inventory operations.
4. Verify price, threshold, active variant and publication readiness.
5. Activate products individually or through a separately approved controlled workflow.
6. Confirm storefront, cart reconciliation and checkout behavior.

## Gated execution plan

### Gate A — Owner data decision

Required inputs:

- approximate number of real brands, categories, products and variants;
- approved names, descriptions, prices, SKUs and classifications;
- confirmation whether cost price should be imported;
- owned/licensed image files and alt text;
- final owner/legal approval of identity, return/refund and privacy content;
- decision to use manual entry or bulk import.

Status: **NOT VERIFIED**.

### Gate B — Import implementation, only if justified

Implement templates, parser, dry run, transactional create-only persistence, export and tests. No production import.

Status: **AWAITING APPROVAL**.

### Gate C — Pre-launch infrastructure and data safety

Close Phase 17 blockers: commercial-compatible hosting, encrypted PostgreSQL backup, Storage export, account cleanup, canonical/Auth configuration, real settings, delivery, Resend/SMTP and deployment smoke readiness.

Status: **FAIL** based on the current Phase 17 record.

### Gate D — Controlled live catalogue onboarding

Take a fresh backup, dry-run the reviewed files, inspect the report, commit once, upload images, initialize inventory and activate only intended products. Existing fixture cleanup is a distinct manually approved operation.

Status: **NOT VERIFIED**.

### Gate E — Launch acceptance

Execute the proposed manual acceptance plan on the deployed commercial-compatible environment using controlled production fixtures. Record only `PASS`, `FAIL` or `NOT VERIFIED`.

Status: **NOT VERIFIED**.

## Implementation recommendation

Recommendation: **approve documentation now, defer code implementation until catalogue volume and real data are supplied**.

If the initial real assortment is small, skip the importer and use the existing admin UI. This is the smallest, safest route to launch. If the assortment is large, approve only Gate B first; review its migration and isolated tests before granting separate permission for Gate D.

## Approval choices requested

Before implementation, the owner should approve one of these paths:

1. **Manual onboarding:** no importer; use existing admin UI, image workflow and Phase 10 inventory initialization.
2. **Bulk onboarding:** implement the hardened create-only importer/exporter against isolated local/staging tests, with no live execution.
3. **Documentation only for now:** keep Phase 18 pending until real catalogue assets and Phase 17 launch gates are ready.

No Phase 18 implementation should be declared complete until real launch data is reviewed, inventory is established through the ledger, enabled payment/delivery paths pass, production privacy/security checks pass, and deployed acceptance is actually performed.
