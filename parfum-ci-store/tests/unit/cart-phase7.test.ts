import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  CART_MAX_ITEMS,
  CART_MAX_QUANTITY,
  CART_SCHEMA_VERSION,
  CART_STORAGE_KEY,
  addCartLine,
  clearCartForTests,
  parsePersistedCart,
  readCart,
  updateCartQuantity,
  writeCart,
} from "@/lib/storefront/cart";
import {
  reconcileCartRows,
  type ReconcileCartItemInput,
  type ReconciledCart,
} from "@/lib/storefront/cart-reconciliation-core";
import { buildCartWhatsAppMessage } from "@/components/storefront/cart-page-client";

const productId = "11111111-1111-4111-8111-111111111111";
const variantId = "22222222-2222-4222-8222-222222222222";
const secondVariantId = "33333333-3333-4333-8333-333333333333";

function request(input: Partial<ReconcileCartItemInput> = {}): ReconcileCartItemInput {
  return {
    productId,
    variantId,
    quantity: 2,
    ...input,
  };
}

function rows(overrides: {
  availabilityStatus?: string;
  availableQuantity?: number;
  priceXof?: number;
  productVisible?: boolean;
  variantVisible?: boolean;
} = {}) {
  return {
    products: overrides.productVisible === false ? [] : [
      { id: productId, name: "Nom serveur", slug: "nom-serveur", brand_name: "Maison" },
    ],
    variants: overrides.variantVisible === false ? [] : [
      {
        id: variantId,
        product_id: productId,
        size_ml: 100,
        concentration: "EDP",
        price_xof: overrides.priceXof ?? 125000,
        compare_at_price_xof: 150000,
        available_quantity: overrides.availableQuantity ?? 8,
        availability_status: overrides.availabilityStatus ?? "IN_STOCK",
      },
    ],
    images: [
      {
        product_id: productId,
        object_path: "products/item/image.jpg",
        alt_text: "Nom serveur",
        is_primary: true,
        sort_order: 0,
      },
    ],
    imageUrl: (path: string) => `/storage/v1/object/public/product-images/${path}`,
    validatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("Phase 7 cart persistence schema", () => {
  beforeEach(() => {
    window.localStorage.clear();
    clearCartForTests();
  });

  it("uses versioned intent-only persistence", () => {
    addCartLine({ productId, variantId, quantity: 2 }, null);
    const stored = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? "{}");

    expect(stored.version).toBe(CART_SCHEMA_VERSION);
    expect(stored.items).toEqual([{ productId, variantId, quantity: 2 }]);
    expect(JSON.stringify(stored)).not.toContain("Nom serveur");
    expect(JSON.stringify(stored)).not.toContain("price");
    expect(JSON.stringify(stored)).not.toContain("stock_on_hand");
    expect(JSON.stringify(stored)).not.toContain("reserved_quantity");
  });

  it("merges duplicate variant identifiers and keeps different variants separate", () => {
    addCartLine({ productId, variantId, quantity: 2 }, null);
    addCartLine({ productId, variantId, quantity: 3 }, null);
    addCartLine({ productId, variantId: secondVariantId, quantity: 1 }, null);

    expect(readCart().items).toEqual([
      { productId, variantId, quantity: 5 },
      { productId, variantId: secondVariantId, quantity: 1 },
    ]);
  });

  it("validates malformed JSON, unsupported shapes, invalid IDs, and quantity bounds safely", () => {
    expect(parsePersistedCart("{bad json").items).toHaveLength(0);
    expect(parsePersistedCart(JSON.stringify({ version: 99, items: [] })).items).toHaveLength(0);
    expect(parsePersistedCart(JSON.stringify({ version: 2, items: [{ productId, variantId: "bad", quantity: 1 }], updatedAt: new Date().toISOString() })).items).toHaveLength(0);

    addCartLine({ productId, variantId, quantity: 999 }, null);
    expect(readCart().items[0].quantity).toBe(CART_MAX_QUANTITY);
    updateCartQuantity(variantId, 0);
    expect(readCart().items).toHaveLength(0);
  });

  it("migrates known legacy items when product ID is present and drops impossible legacy snapshots", () => {
    expect(
      parsePersistedCart(JSON.stringify({ lines: [{ productId, variantId, quantity: 2 }] })).items,
    ).toEqual([{ productId, variantId, quantity: 2 }]);
    expect(parsePersistedCart(JSON.stringify({ lines: [{ variantId, quantity: 2 }] })).items).toHaveLength(0);
  });

  it("continues in memory when storage writes fail", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota");
    });

    expect(() => writeCart({ version: 2, items: [{ productId, variantId, quantity: 1 }], attribution: null, updatedAt: new Date().toISOString() })).not.toThrow();
    spy.mockRestore();
  });

  it("enforces maximum line count during parsing", () => {
    const tooMany = Array.from({ length: CART_MAX_ITEMS + 1 }, (_, index) => ({
      productId,
      variantId: `${String(index).padStart(8, "0")}-2222-4222-8222-222222222222`,
      quantity: 1,
    }));

    expect(parsePersistedCart(JSON.stringify({ version: 2, items: tooMany, updatedAt: new Date().toISOString() })).items).toHaveLength(0);
  });
});

describe("Phase 7 authoritative cart reconciliation", () => {
  it("uses authoritative public names, variants, images, prices, and integer totals", () => {
    const reconciled = reconcileCartRows([request()], rows({ priceXof: 125000 }));

    expect(reconciled.lines[0]).toMatchObject({
      productName: "Nom serveur",
      variantLabel: "100 ml · EDP",
      unitPriceXof: 125000,
      imageUrl: "/storage/v1/object/public/product-images/products/item/image.jpg",
      orderable: true,
    });
    expect(reconciled.subtotalXof).toBe(250000);
    expect(JSON.stringify(reconciled)).not.toContain("cost_price");
    expect(JSON.stringify(reconciled)).not.toContain("stock_on_hand");
    expect(JSON.stringify(reconciled)).not.toContain("reserved_quantity");
  });

  it("does not leak hidden products or hidden variants", () => {
    expect(reconcileCartRows([request()], rows({ productVisible: false })).lines[0]).toMatchObject({
      productName: "Article indisponible",
      productSlug: null,
      orderable: false,
      availability: "UNAVAILABLE",
    });
    expect(reconcileCartRows([request()], rows({ variantVisible: false })).lines[0]).toMatchObject({
      variantLabel: "Variante indisponible",
      orderable: false,
    });
  });

  it("distinguishes stock not configured, out of stock, low stock, and quantity reduction", () => {
    expect(reconcileCartRows([request()], rows({ availabilityStatus: "UNCONFIGURED", availableQuantity: 0 })).lines[0]).toMatchObject({
      availability: "STOCK_NOT_CONFIGURED",
      orderable: false,
    });
    expect(reconcileCartRows([request()], rows({ availabilityStatus: "OUT_OF_STOCK", availableQuantity: 0 })).lines[0]).toMatchObject({
      availability: "OUT_OF_STOCK",
      orderable: false,
    });
    expect(reconcileCartRows([request()], rows({ availabilityStatus: "LOW_STOCK", availableQuantity: 2 })).readiness).toBe("READY");
    expect(reconcileCartRows([request({ quantity: 5 })], rows({ availableQuantity: 2 })).lines[0]).toMatchObject({
      adjustedQuantity: 2,
      notices: ["CART_QUANTITY_REDUCED"],
    });
  });

  it("blocks WhatsApp-ready state when lines are unavailable and uses authoritative values otherwise", () => {
    const unavailable = reconcileCartRows([request()], rows({ availabilityStatus: "OUT_OF_STOCK", availableQuantity: 0 }));
    expect(unavailable.readiness).toBe("HAS_UNAVAILABLE_ITEMS");

    const ready: ReconciledCart = reconcileCartRows([request()], rows());
    const message = buildCartWhatsAppMessage(ready);

    expect(message).toContain("Nom serveur");
    expect(message).toContain("125 000");
    expect(message).toContain("Sous-total panier");
    expect(message).not.toContain("stock_on_hand");
    expect(message).not.toContain("reserved_quantity");
  });
});
