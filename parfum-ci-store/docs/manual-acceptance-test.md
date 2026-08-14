# Manual Acceptance Test

Use this checklist when MVP features are implemented.

## Public Storefront

- Home page loads in French on mobile and desktop.
- Catalogue lists only published products.
- Brand and category filters work.
- Product detail shows images, variant choices, price in XOF, and stock state.
- Keyboard navigation reaches all interactive controls.
- Focus states are visible.
- Footer links open the legal notice, privacy policy and sales terms on the canonical HTTPS host.
- Legal pages remain reachable while storefront maintenance mode is enabled.
- Publisher identity, address, contact, registration/tax information and approved policy dates are complete; no preparatory warning remains before commercial launch.

## Cart and Checkout

- Guest can add an in-stock variant to cart.
- Cart quantity changes recalculate totals.
- Checkout rejects invalid customer, delivery, and contact fields.
- Checkout creates an order with server-calculated totals.
- Manual Mobile Money instructions are shown without collecting PINs, OTPs, CVVs, or card details.
- Cash on delivery can be selected when enabled.
- Checkout links to the published sales terms and privacy policy before acceptance.
- The customer can review the order, delivery fee and total and correct the form before submission.

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

## Legal, Privacy And Licensing

- The repository contains the intended proprietary `LICENSE` and `package.json` remains `UNLICENSED`.
- All product images, descriptions, logos and brand assets have documented usage rights.
- The owner or qualified reviewer approved the sales terms, returns/refund policy and privacy notice.
- Côte d’Ivoire publisher, consumer and data-protection obligations have been reviewed for the actual operator.
- Data processors, international transfers, retention periods and data-subject-request handling are documented.
- A versioned terms-acceptance snapshot is implemented before claiming audit-grade consent; otherwise the limitation is explicitly accepted.
