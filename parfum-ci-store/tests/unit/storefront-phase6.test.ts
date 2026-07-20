import { describe, expect, it, beforeEach, vi } from "vitest";

import { catalogueQuerySchema, normalizePublicCatalogueQuery } from "@/lib/catalogue/validation";
import { addCartLine, clearCartForTests, readCart } from "@/lib/storefront/cart";
import {
  captureFirstTouch,
  clearAttributionForTests,
  readAttribution,
} from "@/lib/storefront/attribution";

describe("Phase 6 storefront foundations", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com";
    process.env.NEXT_PUBLIC_SITE_NAME = "Parfum CI";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable";
    window.localStorage.clear();
    clearCartForTests();
    clearAttributionForTests();
  });

  it("bounds public catalogue page size and validates filters", () => {
    expect(() => catalogueQuerySchema.parse({ pageSize: 500 })).toThrow();
    expect(catalogueQuerySchema.parse({ genderCategory: "Unisexe", pageSize: 8 })).toMatchObject({
      genderCategory: "Unisexe",
      pageSize: 8,
    });
    expect(() => catalogueQuerySchema.parse({ genderCategory: "Postponement" })).toThrow();
    expect(normalizePublicCatalogueQuery({ category: "Homme", brand: "dior" })).toMatchObject({
      categorySlug: undefined,
      brandSlug: "dior",
      pageSize: 8,
    });
  });

  it("encodes WhatsApp messages when a number is configured", async () => {
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = "2250700000000";
    const { buildWhatsAppUrl, siteConfig } = await import("@/config/site");
    const url = buildWhatsAppUrl("Bonjour, je cherche Musc Royal 50 ml à 25 000 F CFA.");

    if (siteConfig.whatsappNumber) {
      expect(url).toContain("https://wa.me/");
      expect(url).toContain("text=Bonjour");
      expect(url).not.toContain(" ");
    } else {
      expect(url).toBeNull();
    }
  });

  it("stores first-touch attribution without overwriting it", () => {
    const first = captureFirstTouch("?utm_source=instagram&utm_campaign=lancement");
    const second = captureFirstTouch("?utm_source=tiktok&utm_campaign=second");

    expect(first).toMatchObject({ utmSource: "instagram", utmCampaign: "lancement" });
    expect(second).toBeNull();
    expect(readAttribution()).toMatchObject({ utmSource: "instagram", utmCampaign: "lancement" });
  });

  it("does not store arbitrary or unsafe attribution parameters", () => {
    captureFirstTouch("?utm_source=ads&role=OWNER&utm_medium=line%0Abreak");
    const attribution = readAttribution();

    expect(attribution).toMatchObject({ utmSource: "ads" });
    expect(JSON.stringify(attribution)).not.toContain("OWNER");
    expect(attribution?.utmMedium).toBeUndefined();
  });

  it("cart stores variant snapshots without reservation fields", () => {
    addCartLine(
      {
        variantId: "variant-id",
        productSlug: "musc-royal",
        productName: "Musc Royal",
        imageUrl: null,
        imageAlt: "Musc Royal",
        sizeMl: 50,
        concentration: "EDP",
        unitPriceXof: 25000,
        quantity: 2,
      },
      null,
    );

    const cart = readCart();
    expect(cart.lines).toHaveLength(1);
    expect(JSON.stringify(cart)).not.toContain("stock_on_hand");
    expect(JSON.stringify(cart)).not.toContain("reserved_quantity");
  });
});
