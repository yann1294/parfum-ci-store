import { describe, expect, it } from "vitest";

import { toPublicVariantDto } from "@/lib/catalogue/mappers";

describe("catalogue DTO mapping", () => {
  it("omits cost price from public variant DTOs", () => {
    const dto = toPublicVariantDto({
      id: "variant-id",
      sku: "SKU-1",
      size_ml: 50,
      concentration: "Eau de parfum",
      price_xof: 25000,
      compare_at_price_xof: null,
      stock_on_hand: 5,
      reserved_quantity: 1,
      low_stock_threshold: 2,
    });

    expect(dto).toEqual({
      id: "variant-id",
      sku: "SKU-1",
      sizeMl: 50,
      concentration: "Eau de parfum",
      priceXof: 25000,
      compareAtPriceXof: null,
      availableQuantity: 4,
      availabilityStatus: "IN_STOCK",
    });
    expect("costPriceXof" in dto).toBe(false);
  });
});
