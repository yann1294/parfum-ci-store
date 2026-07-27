import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rows: {
    products: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Sauvage",
        slug: "sauvage",
        brand_name: "Dior",
      },
    ],
    variants: [
      {
        id: "22222222-2222-4222-8222-222222222222",
        product_id: "11111111-1111-4111-8111-111111111111",
        size_ml: 100,
        concentration: "EDP",
        price_xof: 95000,
        compare_at_price_xof: null,
        available_quantity: 5,
        availability_status: "AVAILABLE",
      },
    ],
    images: [],
  },
  insertedIntent: null as Record<string, unknown> | null,
  insertedItems: null as Array<Record<string, unknown>> | null,
  failIntentInsert: false,
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    from(table: "public_catalogue_products" | "public_catalogue_variants" | "public_catalogue_images") {
      return {
        select() {
          return {
            async in() {
              if (table === "public_catalogue_products") return { data: mocks.rows.products, error: null };
              if (table === "public_catalogue_variants") return { data: mocks.rows.variants, error: null };
              return { data: mocks.rows.images, error: null };
            },
          };
        },
      };
    },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    from(table: "storefront_order_intents" | "storefront_order_intent_items") {
      if (table === "storefront_order_intent_items") {
        return {
          async insert(values: Array<Record<string, unknown>>) {
            mocks.insertedItems = values;
            return { error: null };
          },
        };
      }

      return {
        insert(values: Record<string, unknown>) {
          mocks.insertedIntent = values;
          return {
            select() {
              return {
                async single() {
                  if (mocks.failIntentInsert) return { data: null, error: { code: "XX000", message: "failed" } };
                  return { data: { id: "33333333-3333-4333-8333-333333333333" }, error: null };
                },
              };
            },
          };
        },
        select() {
          return {
            eq() {
              return {
                eq() {
                  return {
                    eq() {
                      return {
                        async maybeSingle() {
                          return { data: null, error: null };
                        },
                      };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  })),
}));

import { createWhatsAppCartFingerprint, createWhatsAppOrderIntent } from "@/lib/storefront/whatsapp-order-intent";

const input = {
  intentKey: "whatsapp-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa-1234567890abcdef",
  sourcePage: "/panier",
  items: [
    {
      productId: "11111111-1111-4111-8111-111111111111",
      variantId: "22222222-2222-4222-8222-222222222222",
      quantity: 1,
    },
  ],
};

describe("Phase 9 WhatsApp order intent", () => {
  beforeEach(() => {
    mocks.rows.variants[0] = {
      ...mocks.rows.variants[0],
      available_quantity: 5,
      availability_status: "AVAILABLE",
    };
    mocks.insertedIntent = null;
    mocks.insertedItems = null;
    mocks.failIntentInsert = false;
  });

  it("stores only authoritative public cart data when the customer intentionally opens WhatsApp", async () => {
    const result = await createWhatsAppOrderIntent(input);

    expect(result.ok).toBe(true);
    expect(result.ok && result.tracked).toBe(true);
    expect(mocks.insertedIntent).toMatchObject({
      channel: "WHATSAPP",
      status: "OPENED",
      subtotal_xof: 95000,
      source_page: "/panier",
    });
    expect(mocks.insertedItems?.[0]).toMatchObject({
      product_name: "Sauvage",
      variant_label: "100 ml · EDP",
      unit_price_xof: 95000,
      quantity: 1,
      line_total_xof: 95000,
    });
    expect(JSON.stringify(mocks.insertedIntent)).not.toContain("reserved_quantity");
    expect(JSON.stringify(mocks.insertedItems)).not.toContain("cost_price");
  });

  it("does not persist an intent when authoritative cart readiness is not ready", async () => {
    mocks.rows.variants[0] = {
      ...mocks.rows.variants[0],
      available_quantity: 0,
      availability_status: "OUT_OF_STOCK",
    };

    const result = await createWhatsAppOrderIntent(input);

    expect(result).toEqual({ ok: false, code: "WHATSAPP_INTENT_CART_NOT_READY" });
    expect(mocks.insertedIntent).toBeNull();
    expect(mocks.insertedItems).toBeNull();
  });

  it("allows a controlled fallback when analytics persistence fails", async () => {
    mocks.failIntentInsert = true;

    const result = await createWhatsAppOrderIntent(input);

    expect(result.ok).toBe(true);
    expect(result.ok && result.tracked).toBe(false);
    expect(result.ok && result.snapshot.subtotalXof).toBe(95000);
  });

  it("uses a stable cart fingerprint for deduplication", () => {
    expect(createWhatsAppCartFingerprint(input.items)).toBe(
      createWhatsAppCartFingerprint([{ ...input.items[0], quantity: 1 }]),
    );
  });
});
