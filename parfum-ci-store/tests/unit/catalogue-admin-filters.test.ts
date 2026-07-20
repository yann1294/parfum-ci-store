import { describe, expect, it } from "vitest";

import {
  ADMIN_ENTITY_DEFAULT_PAGE_SIZE,
  ADMIN_MAX_PAGE_SIZE,
  ADMIN_VARIANT_DEFAULT_PAGE_SIZE,
  normalizeAdminSearch,
  normalizeAdminEntityListFilters,
  normalizeAdminVariantListFilters,
} from "@/lib/catalogue/admin-filters";

describe("admin catalogue filter parsing", () => {
  it("normalizes brand and category pagination with a bounded page size", () => {
    expect(normalizeAdminEntityListFilters({ q: "  maison  ", page: "2", pageSize: "500" })).toEqual({
      q: "maison",
      status: "ALL",
      sort: "name_asc",
      page: 2,
      pageSize: ADMIN_MAX_PAGE_SIZE,
    });
  });

  it("normalizes admin product search without raw PostgREST expression hazards", () => {
    expect(normalizeAdminSearch("  Dior Homme  ")).toBe("Dior Homme");
    expect(normalizeAdminSearch("L'Eau d'Ivoire")).toBe("L'Eau d'Ivoire");
    expect(normalizeAdminSearch("Boisée")).toBe("Boisée");
    expect(normalizeAdminSearch("%,()\"_")).toBe("%,()\"_");
    expect(normalizeAdminSearch("abc\u0000def")).toBeUndefined();
    expect(normalizeAdminSearch("   ")).toBeUndefined();
    expect(normalizeAdminSearch("x".repeat(140))).toHaveLength(120);
  });

  it("falls back to deterministic entity defaults for unsupported URL values", () => {
    expect(
      normalizeAdminEntityListFilters({
        status: "DELETED",
        sort: "random",
        page: "-3",
        pageSize: "0",
      }),
    ).toEqual({
      q: undefined,
      status: "ALL",
      sort: "name_asc",
      page: 1,
      pageSize: ADMIN_ENTITY_DEFAULT_PAGE_SIZE,
    });
  });

  it("normalizes variant filters for server-side search and pagination", () => {
    expect(
      normalizeAdminVariantListFilters({
        q: " SKU-12 ",
        active: "ACTIVE",
        concentration: "EDP",
        sizeMl: "100",
        sort: "price_desc",
        page: "3",
        pageSize: "25",
      }),
    ).toEqual({
      q: "SKU-12",
      active: "ACTIVE",
      concentration: "EDP",
      sizeMl: 100,
      sort: "price_desc",
      page: 3,
      pageSize: 25,
    });
  });

  it("keeps variant result pages bounded and deterministic", () => {
    expect(normalizeAdminVariantListFilters({ pageSize: "900", sort: "unsafe" })).toMatchObject({
      active: "ALL",
      sort: "sku_asc",
      page: 1,
      pageSize: ADMIN_MAX_PAGE_SIZE,
    });

    expect(normalizeAdminVariantListFilters({ pageSize: "-1" }).pageSize).toBe(
      ADMIN_VARIANT_DEFAULT_PAGE_SIZE,
    );
  });
});
