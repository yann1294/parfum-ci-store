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

## Admin Requirements

- Admin users authenticate through Supabase Auth.
- Admins manage brands, categories, products, variants, images, settings, and social links.
- Phase 6.5 adds `/admin/contenu` so OWNER and ADMIN can manage structured public copy for home, about, contact, delivery/payment, social links, and shop coordinates without editing source code.
- Admins review orders, verify manual payments, update fulfillment states, and respond to messages.
- Inventory adjustments are recorded through ledger entries, not direct stock edits.
- Sensitive admin operations are audited.

## Phase 6.5 Corrections

- Public catalogue pagination is server-side with default page size 8 and maximum page size 32.
- Publication status is separate from stock status. Draft products display as `Brouillon` in admin and are hidden publicly; archived products display as `Archivé` in admin and are hidden publicly.
- Public Contact and Delivery pages use managed structured content when configured.
- The cart remains pre-checkout discovery state. `Commander via WhatsApp` opens a manual enquiry and does not create orders, reserve stock, decrement inventory, or confirm payment.

## Non-Goals for MVP

- Stripe or online card processing
- Customer accounts
- Automated Mobile Money gateway integration
- Loyalty program
- Multi-country tax/shipping logic
- Marketplace seller accounts
