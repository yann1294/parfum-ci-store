import { describe, expect, it } from "vitest";

import { assertProductCanActivate } from "@/lib/catalogue/activation";
import { getAvailabilityStatus, getAvailableQuantity } from "@/lib/catalogue/availability";
import { getPublicationReadiness } from "@/lib/catalogue/publication-readiness";
import type { AdminProduct } from "@/lib/catalogue/admin";

const activeCandidate = {
  product: {
    name: "Musc Royal",
    description: "Une fragrance boisée.",
    status: "DRAFT" as const,
  },
  variants: [{ active: true, price_xof: 25000 }],
  images: [
    {
      active: true,
      approved: true,
      storage_path: "products/22222222-2222-4222-8222-222222222222/image.jpg",
      object_path: "products/22222222-2222-4222-8222-222222222222/image.jpg",
      mime_type: "image/jpeg",
      byte_size: 2048,
    },
  ],
};

describe("catalogue activation and availability rules", () => {
  it("accepts products that meet activation requirements", () => {
    expect(() => assertProductCanActivate(activeCandidate)).not.toThrow();
  });

  it("rejects products without valid active variants or images", () => {
    expect(() => assertProductCanActivate({ ...activeCandidate, variants: [] })).toThrow(
      "active variant",
    );
    expect(() => assertProductCanActivate({ ...activeCandidate, images: [] })).toThrow(
      "validated image",
    );
  });

  it("keeps image plus inactive variant non-publishable", () => {
    expect(() =>
      assertProductCanActivate({
        ...activeCandidate,
        variants: [{ active: false, price_xof: 25000 }],
      }),
    ).toThrow("active variant");
  });

  it("allows activation after a valid variant is activated without requiring stock", () => {
    expect(() =>
      assertProductCanActivate({
        ...activeCandidate,
        variants: [{ active: true, price_xof: 25000 }],
      }),
    ).not.toThrow();
  });

  it("calculates availability without persisting a separate value", () => {
    expect(getAvailableQuantity(8, 3)).toBe(5);
    expect(getAvailabilityStatus(8, 3, 2)).toBe("IN_STOCK");
    expect(getAvailabilityStatus(3, 2, 2)).toBe("LOW_STOCK");
    expect(getAvailabilityStatus(3, 3, 2)).toBe("OUT_OF_STOCK");
    expect(getAvailabilityStatus(0, 0, 2, false)).toBe("UNCONFIGURED");
  });

  it("reports publication-readiness blockers separately", () => {
    const product: AdminProduct = {
      id: "product-id",
      name: "Musc Royal",
      slug: "musc-royal",
      shortDescription: null,
      description: "Une fragrance boisée.",
      fragranceFamily: "Boisée",
      topNotes: [],
      heartNotes: [],
      baseNotes: [],
      genderCategory: "Unisexe",
      status: "DRAFT",
      featured: false,
      seoTitle: null,
      seoDescription: null,
      brandId: null,
      brandName: null,
      categoryId: null,
      categoryName: null,
      variants: [
        {
          id: "variant-id",
          productId: "product-id",
          sku: "SKU",
          sizeMl: 50,
          concentration: "EDP",
          priceXof: 25000,
          compareAtPriceXof: null,
          costPriceXof: null,
          stockOnHand: 0,
          reservedQuantity: 0,
          availableQuantity: 0,
          lowStockThreshold: 5,
          availabilityStatus: "UNCONFIGURED",
          active: false,
          inventoryInitialized: false,
        },
      ],
      images: [
        {
          id: "image-id",
          productId: "product-id",
          bucketId: "product-images",
          objectPath: "products/id/image.jpg",
          altText: "Musc Royal",
          sortOrder: 0,
          approved: true,
          active: true,
          isPrimary: true,
          mimeType: "image/jpeg",
          byteSize: 1000,
          publicUrl: null,
        },
      ],
      createdAt: "2026-01-01T00:00:00.000Z",
    };

    expect(getPublicationReadiness(product).find((check) => check.label === "Variante active requise")).toMatchObject({
      ok: false,
    });
    expect(getPublicationReadiness({ ...product, variants: [{ ...product.variants[0], active: true }] }).every((check) => check.ok)).toBe(true);
  });
});
