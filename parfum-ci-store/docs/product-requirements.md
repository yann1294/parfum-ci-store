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
- Complete guest checkout with customer contact and delivery details.
- Choose manual Mobile Money payment or cash on delivery.
- Receive order confirmation and status notifications.
- Track an order by reference and verification token without customer account auth.

## Admin Requirements

- Admin users authenticate through Supabase Auth.
- Admins manage brands, categories, products, variants, images, settings, and social links.
- Admins review orders, verify manual payments, update fulfillment states, and respond to messages.
- Inventory adjustments are recorded through ledger entries, not direct stock edits.
- Sensitive admin operations are audited.

## Non-Goals for MVP

- Stripe or online card processing
- Customer accounts
- Automated Mobile Money gateway integration
- Loyalty program
- Multi-country tax/shipping logic
- Marketplace seller accounts
