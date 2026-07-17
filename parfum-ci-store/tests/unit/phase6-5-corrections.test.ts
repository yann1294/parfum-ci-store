import { describe, expect, it } from "vitest";

import {
  getPublicCataloguePagination,
  normalizePublicCataloguePageSize,
  PUBLIC_CATALOGUE_DEFAULT_PAGE_SIZE,
  PUBLIC_CATALOGUE_MAX_PAGE_SIZE,
} from "@/lib/catalogue/pagination";
import { getAdminAvailabilitySummary } from "@/lib/catalogue/product-availability";
import { contactContentSchema, deliveryContentSchema, homeContentSchema } from "@/lib/storefront/content-schemas";
import { buildCartWhatsAppMessage } from "@/components/storefront/cart-page-client";
import type { CartState } from "@/lib/storefront/cart";

describe("Phase 6.5 public catalogue pagination", () => {
  it("uses the default and maximum public page sizes", () => {
    expect(PUBLIC_CATALOGUE_DEFAULT_PAGE_SIZE).toBe(12);
    expect(PUBLIC_CATALOGUE_MAX_PAGE_SIZE).toBe(48);
    expect(normalizePublicCataloguePageSize(undefined)).toBe(12);
    expect(normalizePublicCataloguePageSize(500)).toBe(48);
  });

  it("returns only the configured page from 100 products", () => {
    const products = Array.from({ length: 100 }, (_, index) => `product-${index + 1}`);
    const pagination = getPublicCataloguePagination({ page: 3, pageSize: 12, total: products.length });
    const page = products.slice(pagination.from, pagination.to + 1);

    expect(page).toHaveLength(12);
    expect(page[0]).toBe("product-25");
    expect(page.at(-1)).toBe("product-36");
    expect(pagination.rangeStart).toBe(25);
    expect(pagination.rangeEnd).toBe(36);
    expect(pagination.totalPages).toBe(9);
  });

  it("falls back safely when the requested page is out of range", () => {
    const pagination = getPublicCataloguePagination({ page: 99, pageSize: 12, total: 30 });

    expect(pagination.page).toBe(3);
    expect(pagination.rangeStart).toBe(25);
    expect(pagination.rangeEnd).toBe(30);
  });
});

describe("Phase 6.5 availability semantics", () => {
  const variant = (input: { active: boolean; availableQuantity: number; lowStockThreshold: number }) => input;

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
    const cart: CartState = {
      attribution: null,
      lines: [
        {
          variantId: "variant-1",
          productSlug: "musc-royal",
          productName: "Musc Royal",
          imageUrl: null,
          imageAlt: "Musc Royal",
          sizeMl: 50,
          concentration: "EDP",
          unitPriceXof: 25000,
          quantity: 2,
          availabilityStatus: "IN_STOCK",
        },
      ],
    };
    const message = buildCartWhatsAppMessage(cart, 50000);

    expect(message).toContain("Musc Royal");
    expect(message).toContain("Sous-total panier");
    expect(message).toContain("confirmer la disponibilité finale");
    expect(message).not.toContain("Phase");
    expect(message).not.toContain("stock_on_hand");
    expect(message).not.toContain("reserved_quantity");
  });
});

