import { describe, expect, it } from "vitest";

import { assertProductCanActivate } from "@/lib/catalogue/activation";
import { getAvailabilityStatus, getAvailableQuantity } from "@/lib/catalogue/availability";

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

  it("calculates availability without persisting a separate value", () => {
    expect(getAvailableQuantity(8, 3)).toBe(5);
    expect(getAvailabilityStatus(8, 3, 2)).toBe("IN_STOCK");
    expect(getAvailabilityStatus(3, 2, 2)).toBe("LOW_STOCK");
    expect(getAvailabilityStatus(3, 3, 2)).toBe("OUT_OF_STOCK");
  });
});
