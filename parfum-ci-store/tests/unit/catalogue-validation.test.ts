import { describe, expect, it } from "vitest";

import {
  createVariantSchema,
  prepareImageUploadSchema,
  updateVariantSchema,
} from "@/lib/catalogue/validation";

describe("catalogue validation", () => {
  it("rejects fractional or negative XOF prices", () => {
    expect(() =>
      createVariantSchema.parse({
        productId: "22222222-2222-4222-8222-222222222222",
        sku: "SKU-1",
        sizeMl: 50,
        priceXof: 1250.5,
      }),
    ).toThrow();

    expect(() =>
      createVariantSchema.parse({
        productId: "22222222-2222-4222-8222-222222222222",
        sku: "SKU-1",
        sizeMl: 50,
        priceXof: -1,
      }),
    ).toThrow();
  });

  it("does not expose direct stock mutation fields in variant updates", () => {
    expect(() => updateVariantSchema.parse({ stockOnHand: 10 })).toThrow();
    expect(() => updateVariantSchema.parse({ reservedQuantity: 2 })).toThrow();
  });

  it("rejects unsupported image declarations", () => {
    expect(() =>
      prepareImageUploadSchema.parse({
        productId: "22222222-2222-4222-8222-222222222222",
        declaredMimeType: "image/svg+xml",
        declaredByteSize: 1000,
      }),
    ).toThrow();
  });
});
