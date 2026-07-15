import { describe, expect, it } from "vitest";

import {
  PHASE5_E2E_PREFIX,
  assertCanRunPhase5E2eScript,
  assertPhase5Prefix,
  buildPhase5Brands,
  buildPhase5Categories,
  buildPhase5Products,
  buildPhase5Variants,
  getPhase5CleanupScope,
} from "../../scripts/phase5-e2e-data";

describe("Phase 5 E2E seed safety", () => {
  it("refuses production environments", () => {
    expect(() =>
      assertCanRunPhase5E2eScript({
        ALLOW_E2E_SEED: "true",
        NODE_ENV: "production",
      } as NodeJS.ProcessEnv),
    ).toThrow("refuse to run in production");

    expect(() =>
      assertCanRunPhase5E2eScript({
        ALLOW_E2E_SEED: "true",
        VERCEL_ENV: "production",
      } as unknown as NodeJS.ProcessEnv),
    ).toThrow("refuse to run in production");
  });

  it("requires the explicit seed flag", () => {
    expect(() => assertCanRunPhase5E2eScript({ NODE_ENV: "test" } as NodeJS.ProcessEnv)).toThrow(
      "ALLOW_E2E_SEED=true",
    );

    expect(() =>
      assertCanRunPhase5E2eScript({
        ALLOW_E2E_SEED: "true",
        NODE_ENV: "test",
      } as NodeJS.ProcessEnv),
    ).not.toThrow();
  });

  it("enforces the exact E2E prefix", () => {
    expect(() => assertPhase5Prefix(`${PHASE5_E2E_PREFIX} Example`)).not.toThrow();
    expect(() => assertPhase5Prefix("Ordinary customer data")).toThrow(PHASE5_E2E_PREFIX);
  });

  it("builds idempotent unique keys for seed rows", () => {
    const brands = buildPhase5Brands();
    const categories = buildPhase5Categories();
    const products = buildPhase5Products();
    const variants = buildPhase5Variants();

    expect(brands).toHaveLength(25);
    expect(categories).toHaveLength(25);
    expect(variants).toHaveLength(25);
    expect(products.some((product) => product.status === "DRAFT")).toBe(true);
    expect(products.some((product) => product.status === "ACTIVE")).toBe(true);
    expect(products.some((product) => product.status === "ARCHIVED")).toBe(true);

    expect(new Set(brands.map((brand) => brand.slug)).size).toBe(25);
    expect(new Set(categories.map((category) => category.slug)).size).toBe(25);
    expect(new Set(products.map((product) => product.slug)).size).toBe(products.length);
    expect(new Set(variants.map((variant) => variant.sku)).size).toBe(25);
  });

  it("limits cleanup scope to exact prefixed rows", () => {
    expect(getPhase5CleanupScope()).toEqual({
      prefix: PHASE5_E2E_PREFIX,
      namePattern: `${PHASE5_E2E_PREFIX}%`,
      skuPattern: `${PHASE5_E2E_PREFIX}-%`,
      slugPattern: "e2e-20260716-a-%",
    });
  });
});
