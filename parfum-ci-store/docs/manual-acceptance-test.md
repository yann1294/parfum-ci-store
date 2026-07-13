# Manual Acceptance Test

Use this checklist when MVP features are implemented.

## Public Storefront

- Home page loads in French on mobile and desktop.
- Catalogue lists only published products.
- Brand and category filters work.
- Product detail shows images, variant choices, price in XOF, and stock state.
- Keyboard navigation reaches all interactive controls.
- Focus states are visible.

## Cart and Checkout

- Guest can add an in-stock variant to cart.
- Cart quantity changes recalculate totals.
- Checkout rejects invalid customer, delivery, and contact fields.
- Checkout creates an order with server-calculated totals.
- Manual Mobile Money instructions are shown without collecting PINs, OTPs, CVVs, or card details.
- Cash on delivery can be selected when enabled.

## Order Tracking

- Customer can track an order with valid reference and token.
- Invalid tracking details do not reveal whether an order exists.
- Tracking page shows redacted delivery information.

## Admin

- Unauthenticated visitors cannot access admin pages.
- Admin can manage brands, categories, products, variants, and images.
- Admin can verify manual payments.
- Admin can transition orders only through valid statuses.
- Inventory changes create ledger entries.
- Sensitive actions create audit logs.

## Notifications and Operations

- Order confirmation email is sent through Resend.
- Failed notifications are visible to admins.
- Contact form submissions appear in the inbox.
- Social links and WhatsApp settings render correctly.
