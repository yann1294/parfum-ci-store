import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  PHASE65_MANUAL_PREFIX,
  PHASE65_MANUAL_SKU_SUFFIX,
  activeIntendedProductNames,
  assertCanRunPhase65ManualCleanup,
  assertCanRunPhase65ManualSeed,
  brands,
  buildPhase65ContentRows,
  buildPhase65ProductRows,
  buildPhase65SpecialProductRows,
  buildPhase65SpecialVariantRows,
  buildPhase65VariantRows,
  categoryDisplayNames,
  concentrationForProduct,
  fragranceFamilyForProduct,
  getPhase65CleanupScope,
  normalizePhase65Products,
  parseSizeMl,
  priceToXof,
  products,
  publicTargetForCategory,
  roundDownToNearest500,
} from "../../scripts/fixtures/phase65-catalogue-data";

describe("Phase 6.5 manual seed safety", () => {
  it("refuses production environments and requires explicit flags", () => {
    expect(() =>
      assertCanRunPhase65ManualSeed({
        ALLOW_PHASE65_MANUAL_SEED: "true",
        NODE_ENV: "production",
      } as NodeJS.ProcessEnv),
    ).toThrow("refuses to run in production");

    expect(() => assertCanRunPhase65ManualSeed({ NODE_ENV: "test" } as NodeJS.ProcessEnv)).toThrow(
      "ALLOW_PHASE65_MANUAL_SEED=true",
    );

    expect(() =>
      assertCanRunPhase65ManualCleanup({
        ALLOW_PHASE65_MANUAL_CLEANUP: "true",
        VERCEL_ENV: "production",
      } as unknown as NodeJS.ProcessEnv),
    ).toThrow("refuses to run in production");

    expect(() => assertCanRunPhase65ManualCleanup({ NODE_ENV: "test" } as NodeJS.ProcessEnv)).toThrow(
      "ALLOW_PHASE65_MANUAL_CLEANUP=true",
    );
  });

  it("includes the Louis Vuitton correction and validates all supplied product relations", () => {
    expect(brands.map((brand) => brand.name)).toContain("Louis Vuitton");
    expect(() => normalizePhase65Products()).not.toThrow();
    expect(normalizePhase65Products().find((product) => product.source.name === "Ombre Nomade")?.brandSlug).toBe(
      "louis-vuitton",
    );
  });

  it("translates customer-facing categories while preserving stable slugs", () => {
    expect(categoryDisplayNames).toMatchObject({
      Men: "Homme",
      Women: "Femme",
      Unisex: "Unisexe",
      Luxury: "Luxe",
      Designer: "Créateurs",
      Arabic: "Parfums arabes",
      Fresh: "Frais",
      Woody: "Boisés",
      Oriental: "Orientaux",
      "Gift Set": "Coffrets cadeaux",
    });
  });

  it("converts prices, parses sizes, and calculates deterministic cost price", () => {
    expect(priceToXof(95)).toBe(95_000);
    expect(priceToXof(125)).toBe(125_000);
    expect(priceToXof(420)).toBe(420_000);
    expect(roundDownToNearest500(95_000 * 0.6)).toBe(57_000);
    expect(parseSizeMl("100ml")).toBe(100);
    expect(() => parseSizeMl("100 ml")).toThrow("Invalid fixture size");
  });

  it("generates unique deterministic SKUs and valid variant rows", () => {
    const normalized = normalizePhase65Products();
    const skus = normalized.flatMap((product) => product.variants.map((variant) => variant.sku));

    expect(new Set(skus).size).toBe(skus.length);
    expect(skus.every((sku) => sku.endsWith(PHASE65_MANUAL_SKU_SUFFIX))).toBe(true);
    expect(skus).toContain("SAUVAGE-60-EDP-MANUAL65");
    expect(skus).toContain("BLEU-50-EDP-MANUAL65");
    expect(skus).toContain("KHAMRAH-100-EDP-MANUAL65");
  });

  it("fails with sanitized errors for missing brand or category relations", () => {
    expect(() =>
      normalizePhase65Products([{ ...products[0], brand: "Unknown Brand" }]),
    ).toThrow('Missing fixture brand for product "Sauvage Eau de Parfum".');

    expect(() =>
      normalizePhase65Products([{ ...products[0], category: "Designer" as never, brand: "Unknown Brand" }]),
    ).toThrow("Missing fixture brand");

    expect(() =>
      normalizePhase65Products([{ ...products[0], category: "Unknown" as never }]),
    ).toThrow('Missing fixture category for product "Sauvage Eau de Parfum".');
  });

  it("maps concentration, public target, and fragrance family deterministically", () => {
    expect(concentrationForProduct("Libre Intense")).toBe("EDP");
    expect(concentrationForProduct("La Belle Le Parfum")).toBe("PARFUM");
    expect(concentrationForProduct("Eros Eau de Toilette")).toBe("EDT");
    expect(publicTargetForCategory("Men")).toBe("HOMME");
    expect(publicTargetForCategory("Women")).toBe("FEMME");
    expect(publicTargetForCategory("Arabic")).toBe("UNISEXE");
    expect(fragranceFamilyForProduct({ category: "Men", description: "Fresh spicy masculine fragrance" })).toBe(
      "Aromatique",
    );
    expect(fragranceFamilyForProduct({ category: "Luxury", description: "Cherry almond" })).toBe("Gourmande");
    expect(fragranceFamilyForProduct({ category: "Fresh", description: "Marine aromatic" })).toBe("Aquatique");
  });

  it("applies stock-state overrides for availability testing", () => {
    const byName = new Map(normalizePhase65Products().map((product) => [product.source.name, product]));

    expect(byName.get("Khamrah")?.variants[0]).toMatchObject({
      stockOnHand: 20,
      reservedQuantity: 0,
      lowStockThreshold: 5,
    });
    expect(byName.get("Oud Wood")?.variants.find((variant) => variant.sizeMl === 50)).toMatchObject({
      stockOnHand: 3,
      reservedQuantity: 1,
    });
    expect(byName.get("Lost Cherry")?.variants.find((variant) => variant.sizeMl === 50)).toMatchObject({
      stockOnHand: 2,
      reservedQuantity: 2,
    });
    expect(byName.get("Sauvage Eau de Parfum")?.variants.map((variant) => variant.reservedQuantity)).toEqual([
      0,
      10,
      5,
    ]);
  });

  it("marks featured and active-intended products without making them ACTIVE by default", () => {
    const brandIds = new Map([["dior", "brand-id"]]);
    const categoryIds = new Map([
      ["men", "category-id"],
      ["women", "category-id"],
      ["unisex", "category-id"],
      ["luxury", "category-id"],
      ["designer", "category-id"],
      ["arabic", "category-id"],
      ["fresh", "category-id"],
      ["woody", "category-id"],
      ["oriental", "category-id"],
      ["gift-set", "category-id"],
      ["louis-vuitton", "brand-id"],
    ]);
    const allBrandIds = new Map(brands.map((brand) => [brand.name.toLowerCase().replaceAll(" ", "-"), "brand-id"]));
    allBrandIds.set("yves-saint-laurent", "brand-id");
    allBrandIds.set("maison-francis-kurkdjian", "brand-id");
    allBrandIds.set("jean-paul-gaultier", "brand-id");
    allBrandIds.set("paco-rabanne", "brand-id");
    allBrandIds.set("giorgio-armani", "brand-id");
    allBrandIds.set("tom-ford", "brand-id");
    allBrandIds.set("maison-margiela", "brand-id");
    allBrandIds.set("jo-malone-london", "brand-id");
    allBrandIds.set("narciso-rodriguez", "brand-id");
    allBrandIds.set("hermes", "brand-id");
    allBrandIds.set("louis-vuitton", "brand-id");

    const rows = buildPhase65ProductRows(allBrandIds, categoryIds);

    expect(activeIntendedProductNames).toHaveLength(15);
    expect(rows.find((row) => row.name === "Sauvage Eau de Parfum")).toMatchObject({
      featured: true,
      status: "DRAFT",
    });
    expect(rows.every((row) => row.status === "DRAFT")).toBe(true);
    expect(brandIds.size).toBe(1);
  });

  it("preserves manually activated products on rerun when existing status is ACTIVE", () => {
    const brandIds = new Map(brands.map((brand) => [brand.name.toLowerCase().replaceAll(" ", "-"), "brand-id"]));
    brandIds.set("yves-saint-laurent", "brand-id");
    brandIds.set("maison-francis-kurkdjian", "brand-id");
    brandIds.set("jean-paul-gaultier", "brand-id");
    brandIds.set("paco-rabanne", "brand-id");
    brandIds.set("giorgio-armani", "brand-id");
    brandIds.set("tom-ford", "brand-id");
    brandIds.set("maison-margiela", "brand-id");
    brandIds.set("jo-malone-london", "brand-id");
    brandIds.set("narciso-rodriguez", "brand-id");
    brandIds.set("hermes", "brand-id");
    brandIds.set("louis-vuitton", "brand-id");
    const categoryIds = new Map([
      ["men", "category-id"],
      ["women", "category-id"],
      ["unisex", "category-id"],
      ["luxury", "category-id"],
      ["designer", "category-id"],
      ["arabic", "category-id"],
      ["fresh", "category-id"],
      ["woody", "category-id"],
      ["oriental", "category-id"],
      ["gift-set", "category-id"],
    ]);
    const rows = buildPhase65ProductRows(
      brandIds,
      categoryIds,
      new Map([["sauvage-eau-de-parfum-manual-65-20260716", "ACTIVE"]]),
    );

    expect(rows.find((row) => row.name === "Sauvage Eau de Parfum")?.status).toBe("ACTIVE");
  });

  it("builds special availability products and inactive-only variant", () => {
    const specialProducts = buildPhase65SpecialProductRows("brand-id", "category-id");
    const variants = buildPhase65SpecialVariantRows(
      new Map([["produit-variantes-inactives-manual-65-20260716", "product-id"]]),
    );

    expect(specialProducts.map((product) => product.name)).toEqual([
      `Produit sans variante ${PHASE65_MANUAL_PREFIX}`,
      `Produit variantes inactives ${PHASE65_MANUAL_PREFIX}`,
    ]);
    expect(variants[0]).toMatchObject({ active: false, stock_on_hand: 10, reserved_quantity: 0 });
  });

  it("keeps fixture builders idempotent", () => {
    expect(normalizePhase65Products()).toEqual(normalizePhase65Products());
    expect(buildPhase65ContentRows()).toEqual(buildPhase65ContentRows());
  });

  it("validates content fixture rows and identifies exact cleanup scope", () => {
    const rows = buildPhase65ContentRows();
    expect(rows).toHaveLength(4);
    expect(JSON.stringify(rows)).toContain(PHASE65_MANUAL_PREFIX);
    expect(getPhase65CleanupScope()).toMatchObject({
      prefix: PHASE65_MANUAL_PREFIX,
      productSlugPattern: "%-manual-65-20260716",
      skuPattern: "%-MANUAL65",
    });
  });

  it("does not manipulate storage.objects or fabricate product image rows in scripts", () => {
    const seed = readFileSync(resolve(process.cwd(), "scripts/seed-phase65-manual.ts"), "utf8");
    const cleanup = readFileSync(resolve(process.cwd(), "scripts/cleanup-phase65-manual.ts"), "utf8");

    expect(seed).not.toContain("storage.objects");
    expect(cleanup).not.toContain("storage.objects");
    expect(seed).not.toContain(".from(\"product_images\").insert");
    expect(seed).not.toContain(".from(\"product_images\").upsert");
    expect(cleanup).toContain("storage.from(\"product-images\").remove");
  });

  it("builds variant rows only for scoped product IDs", () => {
    const normalized = normalizePhase65Products();
    const productIds = new Map(normalized.map((product) => [product.slug, "product-id"]));
    const rows = buildPhase65VariantRows(productIds);

    expect(rows.length).toBeGreaterThan(25);
    expect(rows.every((row) => row.product_id === "product-id")).toBe(true);
    expect(rows.every((row) => row.sku.endsWith(PHASE65_MANUAL_SKU_SUFFIX))).toBe(true);
  });
});
