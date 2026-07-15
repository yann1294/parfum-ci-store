# Design System

## Brand Direction

The interface should feel restrained, premium, and product-led, with generous whitespace and strong fragrance imagery. The public UI is French-first.

## Palette

Light mode:

```css
--brand-soft: #a0eba5;
--brand-primary: #6ad382;
--brand-forest: #1a4731;
--brand-deep: #2b6a46;
--background: #f7fbf7;
--surface: #ffffff;
--surface-muted: #eef7f0;
--foreground: #132018;
--muted-foreground: #607068;
--border: #d8e7dc;
```

Dark mode:

```css
--background: #0e1711;
--surface: #142219;
--surface-muted: #1b2d21;
--foreground: #f3faf4;
--muted-foreground: #b6c8ba;
--border: #2e4836;
```

## Rules

- Do not use purple, violet, or generic bright blue.
- Do not hard-code brand hex values inside components.
- Use tokens through global CSS, Tailwind theme variables, or shadcn/ui theme variables.
- Avoid excessive gradients, glass effects, and animations.
- Support WCAG AA contrast, keyboard navigation, visible focus states, and reduced motion.
- Use Cormorant Garamond for headings and Manrope for body text through `next/font`, unless replaced by an equally suitable existing font system.
- Use semantic HTML and accessible controls.
- Prefer clear product imagery over decoration.

## Component Direction

- shadcn/ui provides primitives for buttons, dialogs, forms, tables, tabs, menus, and toasts.
- Admin screens should be dense, quiet, and operational.
- Storefront screens can use more whitespace and larger imagery, but should remain fast and readable.
- Buttons and controls must have stable sizing and avoid layout shift.

## Token Table

| Token                | Light     | Dark      | Usage                                          |
| -------------------- | --------- | --------- | ---------------------------------------------- |
| `--brand-soft`       | `#A0EBA5` | `#A0EBA5` | Soft emphasis, selection, subtle brand accents |
| `--brand-primary`    | `#6AD382` | `#6AD382` | Primary brand accent and positive highlights   |
| `--brand-forest`     | `#1A4731` | `#1A4731` | Primary action text/background pairing         |
| `--brand-deep`       | `#2B6A46` | `#2B6A46` | Secondary brand emphasis and focus rings       |
| `--background`       | `#F7FBF7` | `#0E1711` | Page background                                |
| `--surface`          | `#FFFFFF` | `#142219` | Cards, headers, popovers                       |
| `--surface-muted`    | `#EEF7F0` | `#1B2D21` | Muted panels, skeletons, secondary controls    |
| `--foreground`       | `#132018` | `#F3FAF4` | Primary text                                   |
| `--muted-foreground` | `#607068` | `#B6C8BA` | Secondary text                                 |
| `--border`           | `#D8E7DC` | `#2E4836` | Borders and dividers                           |

Semantic shadcn/Tailwind tokens are mapped in `src/app/globals.css`:

- `--primary`, `--primary-foreground`
- `--secondary`, `--secondary-foreground`
- `--accent`, `--accent-foreground`
- `--card`, `--card-foreground`
- `--popover`, `--popover-foreground`
- `--muted`, `--muted-foreground`
- `--destructive`, `--success`, `--warning`
- `--sidebar-*`

Components must use semantic classes such as `bg-primary`, `text-muted-foreground`, `border-border`, `bg-surface`, and `text-foreground`.

## Typography Scale

- Display: Cormorant Garamond, `text-5xl` to `text-7xl`, reserved for page heroes.
- Page title: Cormorant Garamond, `text-4xl` to `text-5xl`.
- Section/card title: Cormorant Garamond, `text-xl` to `text-3xl`.
- Body: Manrope, `text-base`, `leading-7`.
- Small/supporting text: Manrope, `text-sm`, `leading-6`.
- Control text: Manrope, `text-sm`, medium weight.

Do not scale font size directly with viewport width. Use responsive Tailwind breakpoints with explicit sizes.

## Spacing Rules

- Page gutters: `px-4 sm:px-6 lg:px-8`.
- Page vertical rhythm: `py-12` minimum, `py-20` for hero sections.
- Component internal spacing: `p-4`, `p-6`, or `p-8` depending on density.
- Form fields: `gap-2` between label and control, `gap-5` between fields.
- Admin screens should use tighter spacing than storefront sections while preserving scanability.

## Border Radius Rules

- Global radius token: `--radius: 0.5rem`.
- Cards and panels: `rounded-lg` or shadcn defaults.
- Buttons and controls: shadcn defaults based on `--radius`.
- Icon buttons: square dimensions with token radius.
- Avoid oversized pill shapes except for small badges.

## Component Usage Rules

- Use shadcn/ui primitives from `src/components/ui`.
- Use `PageContainer` for page width and gutters.
- Use `SectionHeading` for page and major section introductions.
- Use `EmptyState`, `LoadingSkeleton`, and `ErrorState` for consistent operational states.
- Catalogue administration lists must use URL-backed search/filter controls, server pagination, desktop tables, and mobile cards.
- Brand, category, and variant creation belongs in compact dialogs or drawers, not permanently expanded forms above long lists.
- Use `ThemeToggle` only in app shells or settings surfaces.
- Public header/footer social links must come from `src/config/site.ts` until database settings replace it.
- Menus, sheets, dialogs, selects, tabs, and dropdowns must remain keyboard accessible.
- Respect `prefers-reduced-motion`; avoid decorative motion that is not tied to user feedback.

## Catalogue Terminology

- `Famille olfactive` describes the dominant scent family. Use concise help text near the control.
- `Public cible` is used for Homme, Femme, Unisexe, and Enfant positioning.
- Do not use the English label `Postponement`.
- Use compact status badges for inventory states such as `En stock`, `Stock bas`, and `Rupture`; color must not be the only signal.

## Prohibited Color Usage

Do not write brand values inside components:

```tsx
<div className="bg-[#6AD382]" />
```

Do not introduce purple, violet, or generic bright blue:

```tsx
<Button className="bg-violet-600">Action</Button>
<a className="text-blue-500">Lien</a>
```

Use semantic tokens instead:

```tsx
<Button className="bg-primary text-primary-foreground">Action</Button>
<a className="text-foreground hover:text-muted-foreground">Lien</a>
```
