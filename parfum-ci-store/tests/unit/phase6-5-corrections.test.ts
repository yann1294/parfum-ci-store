import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  getPublicCataloguePagination,
  normalizePublicCataloguePageSize,
  PUBLIC_CATALOGUE_DEFAULT_PAGE_SIZE,
  PUBLIC_CATALOGUE_MAX_PAGE_SIZE,
} from "@/lib/catalogue/pagination";
import { getAdminAvailabilitySummary, publicAvailabilityLabel } from "@/lib/catalogue/product-availability";
import { normalizePublicCatalogueQuery } from "@/lib/catalogue/validation";
import { aggregateFragranceFamilyFacets } from "@/lib/catalogue/fragrance-family-facets";
import { contactContentSchema, deliveryContentSchema, homeContentSchema } from "@/lib/storefront/content-schemas";
import { buildCartWhatsAppMessage } from "@/components/storefront/cart-page-client";
import type { ReconciledCart } from "@/lib/storefront/cart-reconciliation-core";
import type { PublicProductDto } from "@/lib/catalogue/types";

describe("Phase 6.5 public catalogue pagination", () => {
  it("uses the default and maximum public page sizes", () => {
    expect(PUBLIC_CATALOGUE_DEFAULT_PAGE_SIZE).toBe(8);
    expect(PUBLIC_CATALOGUE_MAX_PAGE_SIZE).toBe(32);
    expect(normalizePublicCataloguePageSize(undefined)).toBe(8);
    expect(normalizePublicCataloguePageSize(500)).toBe(32);
  });

  it.each([
    { total: 0, totalPages: 1, rangeStart: 0, rangeEnd: 0 },
    { total: 1, totalPages: 1, rangeStart: 1, rangeEnd: 1 },
    { total: 8, totalPages: 1, rangeStart: 1, rangeEnd: 8 },
    { total: 9, totalPages: 2, rangeStart: 1, rangeEnd: 8 },
    { total: 25, totalPages: 4, rangeStart: 1, rangeEnd: 8 },
    { total: 100, totalPages: 13, rangeStart: 1, rangeEnd: 8 },
  ])("paginates $total products at page size 8", ({ total, totalPages, rangeStart, rangeEnd }) => {
    const pagination = getPublicCataloguePagination({ page: 1, pageSize: 8, total });

    expect(pagination.totalPages).toBe(totalPages);
    expect(pagination.rangeStart).toBe(rangeStart);
    expect(pagination.rangeEnd).toBe(rangeEnd);
  });

  it("returns only the configured page from 100 products", () => {
    const products = Array.from({ length: 100 }, (_, index) => `product-${index + 1}`);
    const pagination = getPublicCataloguePagination({ page: 3, pageSize: 8, total: products.length });
    const page = products.slice(pagination.from, pagination.to + 1);

    expect(page).toHaveLength(8);
    expect(page[0]).toBe("product-17");
    expect(page.at(-1)).toBe("product-24");
    expect(pagination.rangeStart).toBe(17);
    expect(pagination.rangeEnd).toBe(24);
    expect(pagination.totalPages).toBe(13);
  });

  it("falls back safely when the requested page is out of range", () => {
    const pagination = getPublicCataloguePagination({ page: 99, pageSize: 8, total: 30 });

    expect(pagination.page).toBe(4);
    expect(pagination.rangeStart).toBe(25);
    expect(pagination.rangeEnd).toBe(30);
  });
});

describe("Phase 6.5 availability semantics", () => {
  const variant = (input: { active: boolean; availableQuantity: number; lowStockThreshold: number; inventoryInitialized?: boolean }) => input;

  it("uses publication status before inventory labels", () => {
    expect(getAdminAvailabilitySummary({ status: "DRAFT", variants: [] })).toBe("Brouillon");
    expect(getAdminAvailabilitySummary({ status: "ARCHIVED", variants: [] })).toBe("Archivé");
  });

  it("distinguishes unconfigured, inactive, zero, low, and available stock states", () => {
    expect(getAdminAvailabilitySummary({ status: "ACTIVE", variants: [] })).toBe("Stock non configuré");
    expect(
      getAdminAvailabilitySummary({
        status: "ACTIVE",
        variants: [variant({ active: false, availableQuantity: 10, lowStockThreshold: 2 })],
      }),
    ).toBe("Aucune variante active");
    expect(
      getAdminAvailabilitySummary({
        status: "ACTIVE",
        variants: [variant({ active: true, availableQuantity: 0, lowStockThreshold: 2 })],
      }),
    ).toBe("Rupture de stock");
    expect(
      getAdminAvailabilitySummary({
        status: "ACTIVE",
        variants: [variant({ active: true, availableQuantity: 2, lowStockThreshold: 2 })],
      }),
    ).toBe("Stock faible");
    expect(
      getAdminAvailabilitySummary({
        status: "ACTIVE",
        variants: [variant({ active: true, availableQuantity: 3, lowStockThreshold: 2 })],
      }),
    ).toBe("En stock");
  });

  it("distinguishes never-initialized stock from initialized zero stock", () => {
    expect(
      getAdminAvailabilitySummary({
        status: "ACTIVE",
        variants: [variant({ active: true, availableQuantity: 0, lowStockThreshold: 2, inventoryInitialized: false })],
      }),
    ).toBe("Stock non configuré");

    expect(
      getAdminAvailabilitySummary({
        status: "ACTIVE",
        variants: [variant({ active: true, availableQuantity: 0, lowStockThreshold: 2, inventoryInitialized: true })],
      }),
    ).toBe("Rupture de stock");

    expect(publicAvailabilityLabel("UNCONFIGURED")).toBe("Stock non configuré");
  });
});

describe("Phase 6.5 public filter normalization", () => {
  it("keeps valid filters and discards malformed optional filters", () => {
    expect(
      normalizePublicCatalogueQuery({
        q: " Éclat d'Ivoire ",
        brand: "dior",
        category: "Homme",
        fragranceFamily: "Boisée",
        page: "2",
      }),
    ).toMatchObject({
      search: "Éclat d'Ivoire",
      brandSlug: "dior",
      categorySlug: undefined,
      fragranceFamily: "Boisée",
      page: 2,
    });
  });

  it("handles empty, malformed, multiple, invalid page, and invalid sort values", () => {
    expect(
      normalizePublicCatalogueQuery({
        category: ["men", "women"],
        brand: "bad slug",
        page: "-4",
        sort: "name",
        q: "abc\u0000def",
      }),
    ).toMatchObject({
      categorySlug: "men",
      brandSlug: undefined,
      page: 1,
      sort: "newest",
      search: undefined,
    });
  });
});

describe("Phase 6.5 fragrance-family navigation", () => {
  function product(input: { id: string; status?: "ACTIVE" | "DRAFT" | "ARCHIVED"; family: string }): PublicProductDto & { status?: string } {
    return {
      id: input.id,
      name: input.id,
      slug: input.id,
      shortDescription: null,
      description: null,
      fragranceFamily: input.family,
      topNotes: [],
      heartNotes: [],
      baseNotes: [],
      genderCategory: null,
      featured: false,
      brand: null,
      category: null,
      variants: [],
      images: [],
      status: input.status ?? "ACTIVE",
    };
  }

  it("aggregates bounded active-product family facets with fragrance-family URLs", () => {
    const facets = aggregateFragranceFamilyFacets([
      product({ id: "1", family: "Boisée" }),
      product({ id: "2", family: "Boisée" }),
      product({ id: "3", family: "Florale" }),
      product({ id: "4", family: "Aromatique" }),
      product({ id: "5", family: "Aquatique" }),
    ], 3);

    expect(facets).toEqual([
      { family: "Boisée", count: 2, href: "/catalogue?fragranceFamily=Bois%C3%A9e" },
      { family: "Aquatique", count: 1, href: "/catalogue?fragranceFamily=Aquatique" },
      { family: "Aromatique", count: 1, href: "/catalogue?fragranceFamily=Aromatique" },
    ]);
    expect(facets.every((facet) => !facet.href.includes("category"))).toBe(true);
  });
});

describe("Phase 6.5 JSON-LD placement", () => {
  it("keeps Product JSON-LD out of catalogue cards and on the product-detail route boundary", () => {
    const root = process.cwd();
    const cardSource = readFileSync(join(root, "src/components/storefront/product-card.tsx"), "utf8");
    const detailSource = readFileSync(join(root, "src/app/(store)/parfums/[slug]/page.tsx"), "utf8");
    const catalogueSource = readFileSync(join(root, "src/app/(store)/catalogue/page.tsx"), "utf8");
    const themeProviderSource = readFileSync(join(root, "src/components/theme/theme-provider.tsx"), "utf8");

    expect(cardSource).not.toContain("<script");
    expect(catalogueSource).not.toContain("<script");
    expect(themeProviderSource).not.toContain("<script");
    expect(themeProviderSource).not.toContain("next-themes");
    expect(detailSource).toContain("application/ld+json");
  });
});

describe("Phase 6.5 public catalogue database grants", () => {
  it("grants public roles access to base columns referenced by security-invoker views", () => {
    const root = process.cwd();
    const grantSource = readFileSync(
      join(root, "supabase/migrations/20260720093000_public_variant_inventory_initialized_grant.sql"),
      "utf8",
    );

    expect(grantSource).toContain("grant select (inventory_initialized_at)");
    expect(grantSource).toContain("on public.product_variants to anon, authenticated");
  });
});

describe("Phase 6.5 managed content validation", () => {
  it("validates structured home content and maximum repeatable counts", () => {
    expect(() =>
      homeContentSchema.parse({
        heroTitle: "Titre",
        heroSubtitle: "Sous-titre",
        primaryCtaLabel: "Catalogue",
        trustPoints: Array.from({ length: 7 }, (_, index) => ({ title: `Point ${index}`, description: "" })),
        orderingSteps: [],
      }),
    ).toThrow();
  });

  it("keeps contact and delivery fields structured", () => {
    expect(
      contactContentSchema.parse({
        pageTitle: "Contact",
        introText: "Texte",
        email: "bonjour@example.com",
        openingHours: [{ label: "Lundi", value: "9h-17h" }],
      }),
    ).toMatchObject({ email: "bonjour@example.com" });

    expect(
      deliveryContentSchema.parse({
        pageTitle: "Livraison",
        introText: "Texte",
        zones: [{ name: "Abidjan", fee: "À confirmer", timeframe: "24h", description: "" }],
      }),
    ).toMatchObject({ zones: [{ name: "Abidjan" }] });
  });
});

describe("Phase 6.5 cart WhatsApp boundary", () => {
  it("builds a customer-safe WhatsApp summary without inventory reservation fields", () => {
    const cart: ReconciledCart = {
      readiness: "READY",
      subtotalXof: 50000,
      validatedAt: "2026-01-01T00:00:00.000Z",
      lines: [
        {
          productId: "11111111-1111-4111-8111-111111111111",
          productSlug: "musc-royal",
          productName: "Musc Royal",
          brandName: null,
          variantId: "22222222-2222-4222-8222-222222222222",
          variantLabel: "50 ml · EDP",
          imageUrl: null,
          imageAlt: "Musc Royal",
          sizeMl: 50,
          concentration: "EDP",
          unitPriceXof: 25000,
          compareAtPriceXof: null,
          availability: "AVAILABLE",
          orderable: true,
          unavailableReason: null,
          requestedQuantity: 2,
          adjustedQuantity: 2,
          maxQuantity: 20,
          notices: [],
        },
      ],
    };
    const message = buildCartWhatsAppMessage(cart);

    expect(message).toContain("Musc Royal");
    expect(message).toContain("Sous-total panier");
    expect(message).toContain("confirmer la disponibilité finale");
    expect(message).not.toContain("Phase");
    expect(message).not.toContain("stock_on_hand");
    expect(message).not.toContain("reserved_quantity");
  });
});
