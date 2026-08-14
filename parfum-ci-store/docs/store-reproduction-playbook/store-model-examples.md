# Store Model Examples

Fit ratings describe compatibility with the current architecture, not market viability.

| Model                             | Fit         | Main work                                                 | Avoid initially                       |
| --------------------------------- | ----------- | --------------------------------------------------------- | ------------------------------------- |
| Beauty and skincare               | High        | Replace fragrance attributes with skin/product attributes | Regulated medical claims              |
| Fashion and accessories           | Medium-high | Size/color variants, exchanges and variant images         | Made-to-measure production            |
| Home fragrance and artisan gifts  | High        | Generalize scent/format fields and gift bundles           | Build-your-own bundle pricing         |
| Phone and electronics accessories | Medium      | Compatibility/spec fields and warranty policy             | Serialized devices and repairs        |
| Shelf-stable gourmet/gift shop    | Medium-low  | Pack/weight attributes and food disclosures               | Perishables, lots and expiry tracking |

## 1. Beauty and skincare boutique

### Example business

A single Côte d’Ivoire merchant sells cleansers, creams, body care, makeup and beauty accessories through guest checkout, local delivery, pickup, COD and manually verified Mobile Money.

### Why it fits

- physical, whole-unit SKUs;
- brand/category catalogue remains useful;
- size-based variants can often reuse millilitre concepts temporarily;
- finite stock, reservation and delivery workflows remain valid;
- staff roles and customer support map closely.

### Required adaptation

- replace `fragrance_family` with approved attributes such as product type, skin concern or finish;
- decide whether volume, weight, shade and pack count are separate structured dimensions;
- prevent medical/therapeutic claims unless legally approved;
- add ingredient, usage and warning content only from owner-supplied sources;
- ensure shade/color is snapshotted in order items;
- adapt filters, admin forms, variant labels, notifications and top-product labels;
- publish a hygiene-sensitive returns policy.

### Suggested MVP limit

Use one or two variant dimensions per SKU, whole-unit stock and no personalized formulation. Treat bundles as predefined SKUs, not dynamically composed carts.

## 2. Fashion and accessories boutique

### Example business

A boutique sells clothing, shoes, bags and accessories using size/color variants, local delivery and pickup.

### Why it fits

- each size/color combination can be an inventory SKU;
- reservation/release/sold semantics remain appropriate;
- images, catalogue publication, cart and order operations are reusable;
- manual payment and support workflows remain useful.

### Required adaptation

- replace required `size_ml` and concentration with size/color/material fields;
- decide whether color-specific images attach to product or variant;
- add deterministic size ordering rather than alphabetical ordering;
- define exchange workflows separately from cancellation/return statuses;
- snapshot size, color and product label at order creation;
- adapt filters for size, color, gender/audience, material and availability;
- define overselling behavior for the final unit of a specific size/color SKU;
- publish approved sizing and returns information.

### Suggested MVP limit

No made-to-measure work, alteration jobs, preorders or supplier drop-shipping. Every purchasable option must resolve to one initialized SKU.

## 3. Home fragrance and artisan gift shop

### Example business

A merchant sells candles, diffusers, room sprays, soaps and fixed gift boxes.

### Why it fits

- this is closest to the perfume catalogue vocabulary;
- scent family, volume and concentration can be generalized with limited disruption;
- predefined gift boxes can be normal SKUs;
- local delivery, pickup and manual payment remain suitable.

### Required adaptation

- rename fragrance family to scent family only where semantically valid;
- support format such as candle, diffuser, spray or soap;
- decide whether burn time, material or vessel size is structured or editorial;
- add safety/care instructions from approved product information;
- model a gift box as its own stocked SKU unless component-level reservation is deliberately implemented;
- adapt imagery, filters, order snapshots and notification wording.

### Suggested MVP limit

Only fixed bundles. Do not promise component-level stock accuracy for build-your-own hampers without a bill-of-materials and atomic component reservation model.

## 4. Phone and electronics accessories shop

### Example business

A retailer sells cases, chargers, cables, power banks, earbuds and screen protectors.

### Why it partially fits

- most accessories are whole-unit SKUs;
- brand/category/search and finite inventory are reusable;
- order, delivery, manual payment and staff workflows still apply.

### Required adaptation

- replace perfume attributes with device compatibility, connector, color, power/capacity and model fields;
- distinguish product brand from compatible device brand;
- validate electrical and safety specifications as owner-supplied data;
- snapshot compatibility/connector/capacity into order items;
- add a precise warranty and defective-item workflow;
- adapt search and filters for device model and connector;
- decide whether high-value items need serial numbers before including them.

### Suggested MVP limit

Sell non-serialized accessories only. Exclude phones, laptops, repair services, IMEI/serial tracking and manufacturer-warranty automation until separately designed.

## 5. Shelf-stable gourmet and gift shop

### Example business

A merchant sells sealed coffee, tea, confectionery, spices and fixed gift hampers with local delivery.

### Why it is a cautious fit

- packaged items can be whole-unit SKUs;
- fixed prices, local zones and order reservation can be reused;
- predefined hampers can be stocked as standalone SKUs.

### Required adaptation

- replace size/concentration with net weight, pack count or format;
- add allergens, ingredients and storage information from verified labels;
- determine whether expiry or lot tracking is legally/operationally required;
- define tax, food-safety, returns and damaged-delivery rules;
- snapshot weight/pack format and disclosures needed at sale time;
- adapt filters, images, notification templates and catalogue copy.

### Suggested MVP limit

Only shelf-stable, prepacked goods whose inventory can be managed without lot or expiry selection. If expiry dates, cold chain, weighted quantities or batch recalls matter, stop and design those capabilities first.

## Models requiring a different foundation

### Marketplace

Needs merchant onboarding, catalogue ownership, commissions, settlement, disputes, per-vendor fulfilment and tenant isolation. Current OWNER/ADMIN roles and one settings singleton assume one merchant.

### Restaurant

Needs menus by time, modifiers, preparation capacity, instant acceptance, delivery dispatch and often real-time state. Current product variants and warehouse-style reservation are not enough.

### Pharmacy or medical store

Needs regulatory classification, prescription handling, sensitive health data, restricted products and stronger professional/legal workflows. Do not derive it from cosmetic labels.

### Rentals and appointments

Needs time-based availability, overlapping reservation prevention, deposits and returns. Current stock counts do not model resource calendars.

### Digital goods or subscriptions

Needs entitlement delivery, account identity, recurring billing, revocation and tax rules. Guest physical-order fulfilment does not provide those boundaries.
