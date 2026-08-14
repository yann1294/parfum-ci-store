# Legal, Policy And Licensing Handoff

Last reviewed: 2026-08-15

This document records the repository's licensing decision, the public legal pages now implemented, the facts they derive from the application, and the decisions that still require the store owner or a qualified Côte d’Ivoire legal adviser. It is an engineering handoff, not legal advice.

## 1. Source-code license

The repository contains commercial application code intended to remain closed-source. The chosen default is therefore a proprietary **all rights reserved** license, not an open-source license:

- the repository-root [`LICENSE`](../../LICENSE) contains the proprietary grant and warranty disclaimer;
- `package.json` declares `"license": "UNLICENSED"`, which tells package tooling that this is not a publishable open-source package;
- possession of the repository or access to a deployment does not grant reuse, redistribution, hosting or derivative-work rights;
- third-party dependencies retain their own licenses and must continue to be audited independently.

This choice preserves the owner's ability to commercialize the store, license it privately, sell the code, or adopt an open-source license later. A later license change must be approved by every applicable copyright holder. Before transferring or licensing the project, replace the generic copyright-holder wording with the verified legal owner and obtain contributor assignments where needed.

The source-code license does not replace Vercel, Supabase, Resend, font, icon, image or product-brand terms. Service-plan eligibility and asset rights are separate obligations.

The direct runtime dependency metadata was reviewed on 2026-08-15: the declared licenses are MIT, Apache-2.0 or ISC. Transitive packages, native libraries, fonts, images and deployed build artifacts can carry additional notice or redistribution duties. Before selling, transferring, white-labelling or distributing the software, generate a complete dependency inventory, preserve required notices and have the resulting bundle reviewed. The proprietary project license never overrides a third-party license.

If the business later chooses to open the source, make that a deliberate ownership decision. MIT would maximize reuse, while a copyleft or dual commercial model would impose different obligations. Do not replace the present license until the verified copyright holder, contributor rights and commercial strategy are known.

## 2. Implemented public documents

The application now exposes:

| Route                            | Purpose                                                                         | Source of dynamic facts                                             |
| -------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `/mentions-legales`              | Publisher, contact, hosting and intellectual-property notice                    | Phase 14 public settings plus version-controlled provider copy      |
| `/politique-de-confidentialite`  | Data categories, purposes, recipients, storage, retention limitation and rights | Actual MVP data flows and Phase 14 public identity/contact settings |
| `/conditions-generales-de-vente` | Products, XOF prices, order formation, payment, delivery, support and evidence  | Phases 7–14 authoritative business workflows                        |

The routes use static, reviewed JSX rather than database HTML, so customer text cannot inject scripts. They have canonical metadata, appear in the public sitemap, and are linked from the footer. Checkout links to the terms and privacy policy; the contact consent links to the privacy policy.

Legal routes use a separate public layout and remain reachable while storefront maintenance mode is active. This is intentional: maintenance must not hide the identity, privacy or contractual information a visitor may need.

The documents are truthful about the present MVP and visibly identify incomplete requirements. They must not be described as legal approval.

## 3. Côte d’Ivoire source basis

The implementation was informed by the following official or public-authority material:

- [Law No. 2013-546 on electronic transactions (official Treasury PDF)](https://decfinex.tresor.gouv.ci/decfinex/textes/s-d_lutte-crim-finance/lois-reglements/2013-546-Transactions-electroniques.pdf), especially persistent seller identification, clear pricing, reproducible electronic terms, order correction and acknowledgment;
- [ANSSI Côte d’Ivoire national legislation index](https://anssi.gouv.ci/reglementations/textes-nationaux/lois/);
- [Law No. 2013-450 on personal-data protection (Autorité de protection PDF)](https://www.autoritedeprotection.ci/docs/loi_2013_450_journal.pdf), including collection notices, rights, security and international-transfer controls;
- [Autorité de protection — controller obligations](https://www.autoritedeprotection.ci/obligation-du-responsable-du-traitement/);
- [Government summary of Law No. 2016-412 on consumption](https://www.gouv.ci/_ministere-une.php?p=2&recordID=206).

The repository does not interpret these sources as a substitute for advice on the business's exact legal form, tax status, products, returns, cross-border processing or consumer obligations.

## 4. Facts represented from the current implementation

The policies reflect these implemented facts:

- guest customers browse, order, contact and track without customer accounts;
- names, phones, emails, delivery addresses, order contents, payment references and messages can be processed;
- staff access is role-restricted and sensitive database tables use RLS and controlled server operations;
- order, payment, inventory, message, notification and audit histories preserve operational evidence;
- manual Mobile Money and cash-on-delivery flows do not collect PINs, OTPs, CVVs or card credentials;
- Vercel hosts the Next.js application, Supabase provides Auth/PostgreSQL/Storage, and Resend can deliver application email;
- theme, cart and attribution values use browser storage; Supabase staff authentication uses its required session mechanism;
- no behavioral advertising tracker is currently part of the MVP;
- product image assets are publicly readable by design and must not contain confidential information;
- checkout obtains authoritative current prices, delivery fees and stock from the server;
- opening WhatsApp records at most an intent and does not create an order or reserve stock.

## 5. Owner-supplied launch blockers

The Phase 14 schema does not currently contain every statutory publisher field. Before commercial opening, the owner must provide and have reviewed:

- verified legal/operator name and legal form;
- registered office and complete contact information;
- RCCM or other applicable registration number;
- share capital where applicable;
- tax/VAT identifier where applicable;
- publication director or responsible publisher;
- any regulated-activity authorization that applies;
- the exact returns, exchange, cancellation and refund policy;
- customer-complaint/escalation procedure;
- approved privacy contact;
- retention periods per record category;
- legal basis/formalities for personal-data processing;
- international-transfer analysis and any required Autorité de protection authorization;
- processor/data-protection terms for Vercel, Supabase, Resend and any delivery partner;
- rights to every product description, logo, photograph and brand asset.

Until these are completed, the public pages deliberately show an incomplete-information notice. Removing that notice without supplying and reviewing the underlying facts is prohibited.

## 6. Known technical legal gaps

### Terms acceptance version

Checkout validates a `termsAccepted` boolean for the current submission, but the order does not snapshot:

- policy identifier/version;
- acceptance timestamp as a dedicated legal-consent field;
- immutable copy/hash of the accepted terms.

The current CGV states this limitation. Before relying on acceptance as audit-grade contractual proof, implement a forward-only migration and transactional order-creation change that snapshots at least the terms version and acceptance timestamp. Decide with counsel whether to retain a rendered copy or cryptographic digest.

### Retention and deletion

The application preserves immutable transactional and audit histories and has some bounded technical expiry rules, but it has no complete automated privacy retention/deletion schedule. Do not promise fixed deletion periods until the owner approves a record-by-record schedule and the implementation can honor it without breaking accounting, consumer, fraud or audit obligations.

### International processing

The system uses international cloud providers. Repository code cannot establish that contracts, adequacy safeguards or required Côte d’Ivoire authorizations have been completed. This remains an external compliance task.

### Returns and refunds

The order lifecycle supports cancellation/return status concepts, but the MVP has no authoritative refunded-amount accounting model and no owner-approved return policy. The CGV therefore does not invent time limits, exclusions, shipping responsibility or refund timing.

## 7. Recommended follow-up phase

After owner/legal review, perform one bounded legal-completion phase:

1. collect and verify the missing identity and policy values;
2. decide whether identity fields belong in structured Phase 14 settings or version-controlled legal content;
3. add only the required forward migration for structured fields and terms acceptance snapshot;
4. publish final returns/refund text;
5. approve a retention and data-subject-request procedure;
6. document processor contracts and transfer formalities outside Git secrets;
7. update policy version dates;
8. test footer, maintenance access, checkout acceptance, contact consent, metadata and sitemap;
9. retain the approved text and release evidence with the deployment record.

Do not create a general legal CMS merely for convenience. Version-controlled documents provide clearer review history for this MVP. If non-developers later need editing, build a constrained, versioned legal-content workflow with approval and immutable publication history—not unrestricted HTML.

## 8. Change procedure

When a policy changes:

1. update the document text and its version in `src/lib/legal/policies.ts`;
2. record who approved the wording outside the public repository where appropriate;
3. assess whether existing customers must be notified;
4. update checkout consent snapshot behavior once implemented;
5. run unit, accessibility, route, sitemap and build checks;
6. verify the deployed canonical pages and preserve deployment evidence.
