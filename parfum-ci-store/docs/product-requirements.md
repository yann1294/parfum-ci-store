# Product Requirements

## Product

Parfum CI Store is a perfume storefront and operations back office for Côte d'Ivoire. The public experience is French-first, mobile-friendly, and optimized for product discovery, guest checkout, and order tracking.

## MVP Modules

- Storefront
- Catalogue
- Product variants
- Cart
- Checkout
- Order tracking
- Admin authentication
- Admin dashboard
- Brands, categories, and products
- Inventory ledger
- Orders and payment verification
- Contact and message inbox
- Notifications
- Social links and WhatsApp
- Settings
- Basic analytics
- Audit logs
- Public legal notices, privacy information, and sales terms

## Customer Requirements

- Browse products by brand, category, search, and featured collections.
- View product details, imagery, variant options, stock status, and XOF pricing.
- Add available variants to a cart without creating an account.
- Phase 6 implements public discovery, product detail, WhatsApp enquiry, attribution capture, SEO, sitemap, robots, and a client-side cart foundation.
- Phase 6 does not create orders, reserve inventory, process payments, or perform delivery workflow.
- Complete guest checkout with customer contact and delivery details.
- Choose manual Mobile Money payment or cash on delivery.
- Receive order confirmation and status notifications.
- Track an order by reference and verification token without customer account auth.
- Access versioned legal notices, privacy information and sales terms from the public footer, including while storefront maintenance mode is active.

## Legal And Policy Boundary

- Public legal documents are version-controlled JSX and render configured Phase 14 public identity/contact values; they are not unrestricted CMS HTML.
- Checkout links to the current sales terms and privacy policy, and contact consent links to the privacy policy.
- The repository uses a proprietary all-rights-reserved license and is not an open-source package.
- Missing registration/tax/publisher details, the final returns policy, retention schedule, processor/transfer review and legal approval remain owner-controlled launch gates documented in `docs/legal-and-licensing.md`.
- Checkout records acceptance for request validation but does not yet snapshot a policy version. Do not represent it as audit-grade consent until a reviewed forward migration and transactional snapshot are implemented.

## Admin Requirements

- Admin users authenticate through Supabase Auth.
- Admins manage brands, categories, products, variants, images, settings, and social links.
- Phase 6.5 adds `/admin/contenu` so OWNER and ADMIN can manage structured public copy for home, about, contact, delivery/payment, social links, and shop coordinates without editing source code.
- Admins review orders, verify manual payments, update fulfillment states, and respond to messages.
- Inventory adjustments are recorded through ledger entries, not direct stock edits.
- Sensitive admin operations are audited.
- Phase 8 adds the server-side guest-order transaction engine and `/api/orders` contract. It creates orders and atomically reserves inventory, but it does not add checkout UI, order-management UI, payment verification, shipment workflow, notification delivery workers, or reservation expiry.

## Phase 6.5 Corrections

- Public catalogue pagination is server-side with default page size 8 and maximum page size 32.
- Publication status is separate from stock status. Draft products display as `Brouillon` in admin and are hidden publicly; archived products display as `Archivé` in admin and are hidden publicly.
- Public Contact and Delivery pages use managed structured content when configured.
- The cart remains pre-checkout discovery state. `Commander via WhatsApp` opens a manual enquiry and does not create orders, reserve stock, decrement inventory, or confirm payment.
- Phase 7 hardens the guest cart with versioned local intent storage and authoritative server reconciliation before display-sensitive ordering actions. It still does not create orders, reserve inventory, decrement stock, process payments, or persist anonymous carts server-side.
- Phase 8 reuses the Phase 7 intent-only cart as input. Guest order creation revalidates every submitted line in a PostgreSQL transaction before order creation and reservation.
- Phase 9 adds the guest checkout UI at `/commande`, order confirmation at `/commande/succes/[orderNumber]`, and secure order tracking at `/suivi-commande`. The UI reuses Phase 7 cart reconciliation and Phase 8 `POST /api/orders`; it does not duplicate order creation, pricing, reservation, customer matching, notification, or audit logic.
- Phase 9 correction: WhatsApp is the primary cart ordering path when configured. A WhatsApp click records a lightweight order-intent event after authoritative cart validation, but it does not create an order, reserve inventory, decrement stock, confirm payment, or prove that WhatsApp opened or that the customer sent the message.
- Payment methods shown at checkout come from `store_settings`, must be supported by the Phase 8 contract, and must be enabled/configured by OWNER or ADMIN in `/admin/contenu`.
- Phase 10 adds transactional admin inventory management at `/admin/inventaire`, `/admin/inventaire/[variantId]`, and `/admin/inventaire/stock-faible`. Manual inventory operations reuse `product_variants`, `reserved_quantity`, `inventory_initialized_at`, and `inventory_transactions`; they do not change cart, checkout, order creation, or product publication rules.
- Phase 11 adds admin order management at `/admin/commandes` and `/admin/commandes/[id]`. Order lifecycle transitions and payment verification use private transactional database functions, reuse Phase 8 reservations and Phase 10 ledger conventions, and do not redesign checkout, cart, catalogue or manual inventory.
- Phase 12 adds asynchronous transactional notification delivery and an admin notification center at `/admin/notifications`. It reuses the existing outbox intents created by order and payment transactions, sends email after business commits, and never makes email delivery a prerequisite for order, payment, or inventory success.
- Phase 13 adds public contact submission and the admin message inbox at `/admin/messages`. It reuses `contact_messages`, Phase 12 notification intents, staff authorization and audit logs; manual social messages are staff-entered records, not API synchronization.
- Phase 14 completes `/admin/parametres` as the single operational-settings surface. It reuses Phase 9 payment configuration, keeps editorial copy in `/admin/contenu`, centralizes identity/contact/social/SEO/notification/availability values, and adds authoritative delivery-zone pricing with immutable order-time snapshots.

## Phase 14 Settings Boundaries

- `/admin/contenu` owns editorial page copy and route-specific editorial SEO.
- `/admin/parametres` owns structured business identity, coordinates, social URLs, payment methods, delivery economics, global SEO defaults, notification recipient and store availability.
- Public consumers use an explicit safe projection; direct anonymous `store_settings` reads are not allowed.
- Online checkout must obtain an authoritative delivery quote and Phase 8 order creation must recalculate and store the fee. Browser-submitted fees are never accepted.
- Disabling online order acceptance leaves catalogue/cart/WhatsApp contact available. Maintenance replaces only public store routes; admin, auth and operational API routes remain available.

## Phase 15 Operational Dashboard

- `/admin` is the role-aware operational dashboard; there is no separate MVP analytics product or analytics event stream.
- Supported shareable periods are `7d`, `30d` and `90d`, defaulting safely to `30d`. All boundaries and daily buckets use `Africa/Abidjan` business-local midnight.
- Revenue means gross XOF successfully paid during the selected period, derived from the first immutable `PAID` transaction per order at `verified_at`. Refund events are not subtracted because the MVP has no authoritative refunded-amount field.
- OWNER and ADMIN receive every dashboard section. ORDER_MANAGER receives order/payment operations and financial aggregates under the existing Phase 11 policy. CUSTOMER_SUPPORT receives order-support and message data without financial aggregates. INVENTORY_MANAGER receives inventory and units-sold data without orders, customers, messages or financial aggregates.
- Source analytics count actual `orders.source` values only. WhatsApp intents and marketing attribution fields are not orders and are not merged into this metric.
- Top products means units converted to `SOLD` in the immutable inventory ledger, grouped using order-item product snapshots.
- Dashboard cards deep-link into existing admin workflows; the dashboard does not mutate orders, payments, stock, messages or notifications.

## Phase 16 MVP Hardening

- Phase 16 adds no business feature. It preserves the completed cart, order, inventory, payment, notification, message, settings, delivery and dashboard contracts.
- Public JSON endpoints reject unsupported media types and stop reading once their route-specific byte limit is exceeded.
- Authentication redirects use validated internal paths and the configured canonical site URL; request `Host`/origin values never choose an OAuth redirect destination.
- Application responses include a practical CSP and defensive browser headers. Production additionally emits HSTS; development alone permits `unsafe-eval` for framework tooling.
- Browser-facing database roles receive no direct destructive privileges on transactional or sensitive tables. Manual notification retries use one authorized, locked, audited database operation.
- The representative public and admin surfaces provide one meaningful heading, keyboard-visible validation/focus behavior, responsive layouts, and serious/critical automated accessibility checks on desktop and mobile.
- Rate-limit identifiers are one-way hashed before process-local storage. A distributed production limiter remains an explicit deployment requirement for multi-instance enforcement.

## Phase 17 Free-Tier Deployment Readiness

- Phase 17 adds deployment safety and operations only; it does not add or redesign business features.
- Vercel Hobby is limited to private/non-commercial verification for this project. A commercial-compatible hosting plan is required before accepting real orders.
- The currently linked Supabase Free project is the temporary live backend and is treated as stateful, non-disposable infrastructure. Database resets, destructive fixtures and lifecycle E2E are prohibited against it.
- Safe public browser E2E is the default. Database-mutating E2E requires an explicit local/staging target and can never target the protected live project reference.
- Supabase Free capacity, project pausing and lack of downloadable managed backups are accepted temporary risks. Manual encrypted PostgreSQL backup plus separate Storage export are required before launch/high-risk changes.
- `/api/health` is liveness only and exposes no dependency, configuration or data details.
- CI uses inert configuration and never receives live database, provider, cron or staff credentials.
- Vercel/Supabase upgrades and future environment separation are documented in `docs/production-upgrade-roadmap.md`.

## Non-Goals for MVP

- Stripe or online card processing
- Customer accounts
- Automated Mobile Money gateway integration
- Loyalty program
- Multi-country tax/shipping logic
- Marketplace seller accounts
