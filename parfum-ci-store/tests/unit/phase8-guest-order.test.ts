import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

vi.mock("server-only", () => ({}));

import {
  createGuestOrderFingerprint,
  guestOrderRequestSchema,
  normalizeCoteDIvoirePhone,
  normalizeGuestOrderRequest,
  publicOrderError,
} from "@/lib/orders/guest-order-contract";

const rpc = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({ rpc }),
}));

const { createGuestOrder } = await import("@/lib/orders/guest-order-service");

const productId = "11111111-1111-4111-8111-111111111111";
const variantId = "22222222-2222-4222-8222-222222222222";
const secondVariantId = "33333333-3333-4333-8333-333333333333";

function request(overrides: Record<string, unknown> = {}) {
  return {
    idempotencyKey: "phase8-idempotency-key-1234567890",
    customer: {
      fullName: "Awa Koné",
      phone: "+225 07 00 00 00 00",
      whatsapp: "2250700000000",
      email: "AWA@example.COM",
      city: "Abidjan",
      commune: "Cocody",
      address: "Adresse de test",
      landmark: "Pharmacie",
      deliveryInstructions: "Appeler avant livraison",
      customerNote: "Note courte",
    },
    deliveryMethod: "HOME_DELIVERY",
    paymentMethod: "CASH_ON_DELIVERY",
    lines: [{ productId, variantId, quantity: 1 }],
    attribution: {
      utmSource: "instagram",
      utmMedium: "social",
      utmCampaign: "test",
      capturedAt: "2026-07-23T00:00:00.000Z",
      expiresAt: "2026-08-23T00:00:00.000Z",
    },
    honeypot: "",
    ...overrides,
  };
}

describe("Phase 8 guest order request contract", () => {
  it("strictly validates expected request fields and rejects unexpected values", () => {
    expect(guestOrderRequestSchema.safeParse(request()).success).toBe(true);
    expect(guestOrderRequestSchema.safeParse(request({ productName: "Client supplied" })).success).toBe(false);
    expect(guestOrderRequestSchema.safeParse(request({ honeypot: "bot" })).success).toBe(false);
    expect(guestOrderRequestSchema.safeParse(request({ lines: [] })).success).toBe(false);
    expect(guestOrderRequestSchema.safeParse(request({ lines: Array.from({ length: 21 }, () => ({ productId, variantId, quantity: 1 })) })).success).toBe(false);
    expect(guestOrderRequestSchema.safeParse(request({ lines: [{ productId, variantId, quantity: 21 }] })).success).toBe(false);
  });

  it("normalizes Côte d'Ivoire phone values safely", () => {
    const accepted = [
      "+2250700000000",
      "002250700000000",
      "2250700000000",
      "0700000000",
      "+225 07 00 00 00 00",
      "00225 07 00 00 00 00",
      "225-07-00-00-00-00",
      "(07) 00 00 00 00",
      "(+225) 07 00 00 00 00",
    ];

    for (const value of accepted) {
      expect(normalizeCoteDIvoirePhone(value)).toBe("+2250700000000");
    }

    expect(() => normalizeCoteDIvoirePhone("+225 07 00")).toThrow("ORDER_INVALID_PHONE");
    expect(() => normalizeCoteDIvoirePhone("+225 07 00 00 00 XX")).toThrow("ORDER_INVALID_PHONE");
    expect(() => normalizeCoteDIvoirePhone("+2252250700000000")).toThrow("ORDER_INVALID_PHONE");
    expect(() => normalizeCoteDIvoirePhone("002260700000000")).toThrow("ORDER_INVALID_PHONE");
    expect(normalizeCoteDIvoirePhone("", false)).toBeUndefined();
  });

  it("deduplicates variant lines deterministically and normalizes email and optional WhatsApp", () => {
    const parsed = guestOrderRequestSchema.parse(
      request({
        lines: [
          { productId, variantId: secondVariantId, quantity: 1 },
          { productId, variantId, quantity: 2 },
          { productId, variantId, quantity: 3 },
        ],
      }),
    );
    const normalized = normalizeGuestOrderRequest(parsed);

    expect(normalized.customer.email).toBe("awa@example.com");
    expect(normalized.customer.phone).toBe("+2250700000000");
    expect(normalized.customer.whatsapp).toBe("+2250700000000");
    expect(normalized.lines).toEqual([
      { productId, variantId, quantity: 5 },
      { productId, variantId: secondVariantId, quantity: 1 },
    ]);
  });

  it("converges equivalent phone forms to the same customer fingerprint", () => {
    const forms = ["+2250700000000", "002250700000000", "2250700000000", "0700000000"];
    const fingerprints = forms.map((phone) =>
      createGuestOrderFingerprint(
        normalizeGuestOrderRequest(
          guestOrderRequestSchema.parse(
            request({
              customer: {
                ...request().customer,
                phone,
                whatsapp: phone,
              },
            }),
          ),
        ),
      ),
    );

    expect(new Set(fingerprints).size).toBe(1);
  });

  it("creates a stable material fingerprint and changes for material payload changes", () => {
    const normalized = normalizeGuestOrderRequest(guestOrderRequestSchema.parse(request()));
    const same = normalizeGuestOrderRequest(guestOrderRequestSchema.parse(request()));
    const changed = normalizeGuestOrderRequest(
      guestOrderRequestSchema.parse(request({ paymentMethod: "ORANGE_MONEY" })),
    );

    expect(createGuestOrderFingerprint(normalized)).toMatch(/^[a-f0-9]{64}$/);
    expect(createGuestOrderFingerprint(normalized)).toBe(createGuestOrderFingerprint(same));
    expect(createGuestOrderFingerprint(normalized)).not.toBe(createGuestOrderFingerprint(changed));
  });

  it("returns only safe public error shapes", () => {
    expect(publicOrderError("ORDER_INVALID_PHONE").body.error).toEqual({
      code: "ORDER_INVALID_PHONE",
      message: "Le numéro de téléphone n'est pas valide.",
    });
    expect(publicOrderError("ORDER_CUSTOMER_CONFLICT").body.error.message).toBe(
      "Ce numéro ne peut pas être utilisé pour le moment.",
    );
    expect(publicOrderError("ORDER_PAYMENT_METHOD_UNAVAILABLE").body.error.message).toBe(
      "Ce mode de paiement n'est plus disponible.",
    );
    expect(JSON.stringify(publicOrderError("ORDER_CREATION_FAILED"))).not.toContain("SQL");
    expect(JSON.stringify(publicOrderError("ORDER_CREATION_FAILED"))).not.toContain("details");
  });
});

describe("Phase 8 guest order service", () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it("calls the service-role wrapper with normalized intent and returns safe confirmation", async () => {
    rpc.mockResolvedValue({
      data: {
        orderId: "44444444-4444-4444-8444-444444444444",
        orderNumber: "CMD-2026-A1B2C3",
        orderStatus: "PENDING_CONFIRMATION",
        paymentStatus: "UNPAID",
        currency: "XOF",
        subtotalXof: 95000,
        deliveryFeeXof: 0,
        totalXof: 95000,
        createdAt: "2026-07-23T00:00:00.000Z",
        items: [{ productName: "Nom serveur", variantLabel: "100 ml · EDP", quantity: 1, unitPriceXof: 95000, lineTotalXof: 95000 }],
        nextStepCode: "PENDING_CONFIRMATION",
      },
      error: null,
    });

    const confirmation = await createGuestOrder(guestOrderRequestSchema.parse(request()));

    expect(rpc).toHaveBeenCalledWith("create_guest_order_server", {
      request: expect.objectContaining({
        requestFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
        customer: expect.objectContaining({ phone: "+2250700000000" }),
        lines: [{ productId, variantId, quantity: 1 }],
      }),
    });
    expect(confirmation.orderNumber).toBe("CMD-2026-A1B2C3");
    expect(JSON.stringify(confirmation)).not.toContain("cost_price");
    expect(JSON.stringify(confirmation)).not.toContain("stock_on_hand");
    expect(JSON.stringify(confirmation)).not.toContain("reserved_quantity");
  });

  it("maps expected database errors and suppresses raw Supabase diagnostics", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: "P0001", message: "ERROR: ORDER_INSUFFICIENT_STOCK table public.product_variants" },
    });

    await expect(createGuestOrder(guestOrderRequestSchema.parse(request()))).rejects.toMatchObject({
      code: "ORDER_INSUFFICIENT_STOCK",
      status: 409,
    });
  });

  it("maps missing store settings to a temporary checkout-unavailable error", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: "P0001", message: "ORDER_STORE_SETTINGS_UNAVAILABLE" },
    });

    await expect(createGuestOrder(guestOrderRequestSchema.parse(request()))).rejects.toMatchObject({
      code: "ORDER_STORE_SETTINGS_UNAVAILABLE",
      status: 503,
    });
  });

  it("maps normalized-phone customer conflicts to a safe business error", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: "23505", message: "duplicate key value violates unique constraint customers_normalized_phone_key" },
    });

    await expect(createGuestOrder(guestOrderRequestSchema.parse(request()))).rejects.toMatchObject({
      code: "ORDER_CUSTOMER_CONFLICT",
      status: 409,
    });
  });

  it("maps RPC permission and schema drift failures to a safe server-misconfigured error", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    rpc.mockResolvedValue({
      data: null,
      error: { code: "42501", message: "permission denied for function create_guest_order_server" },
    });

    await expect(createGuestOrder(guestOrderRequestSchema.parse(request()))).rejects.toMatchObject({
      code: "ORDER_SERVER_MISCONFIGURED",
      status: 503,
    });
    expect(consoleError).toHaveBeenCalledWith("ORDER_DATABASE_FAILURE", {
      dbCode: "42501",
      mappedCode: "ORDER_SERVER_MISCONFIGURED",
      status: 503,
      raisedCode: null,
    });
    consoleError.mockRestore();
  });

  it("maps invalid ON CONFLICT targets to a safe server-misconfigured error", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    rpc.mockResolvedValue({
      data: null,
      error: { code: "42P10", message: "there is no unique or exclusion constraint matching the ON CONFLICT specification" },
    });

    await expect(createGuestOrder(guestOrderRequestSchema.parse(request()))).rejects.toMatchObject({
      code: "ORDER_SERVER_MISCONFIGURED",
      status: 503,
    });
    expect(consoleError).toHaveBeenCalledWith("ORDER_DATABASE_FAILURE", {
      dbCode: "42P10",
      mappedCode: "ORDER_SERVER_MISCONFIGURED",
      status: 503,
      raisedCode: null,
    });
    consoleError.mockRestore();
  });

  it("maps unexpected database failures to a generic safe error", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    rpc.mockResolvedValue({
      data: null,
      error: { code: "XX999", message: "unexpected database failure" },
    });

    await expect(createGuestOrder(guestOrderRequestSchema.parse(request()))).rejects.toMatchObject({
      code: "ORDER_CREATION_FAILED",
      status: 500,
    });
    consoleError.mockRestore();
  });
});

describe("Phase 8 migration contract", () => {
  it("keeps the order engine private and exposes only a service-role wrapper", () => {
    const sql = readFileSync("supabase/migrations/20260723080100_phase8_guest_order_transaction.sql", "utf8");

    expect(sql).toContain("create or replace function app_private.create_guest_order(request jsonb)");
    expect(sql).toContain("for update of product_variants, products");
    expect(sql).toContain("grant execute on function public.create_guest_order_server(jsonb) to service_role");
    expect(sql).toContain("revoke all on function public.create_guest_order_server(jsonb) from anon");
    expect(sql).toContain("guest_order_idempotency");
    expect(sql).toContain("'RESERVED'::public.inventory_transaction_type");
    expect(sql).not.toContain("storage.objects");
  });

  it("adds a forward migration for the guest-order ambiguous-column repair", () => {
    const sql = readFileSync(
      "supabase/migrations/20260727163000_phase9_guest_order_ambiguous_column_fix.sql",
      "utf8",
    );

    expect(sql).toContain("create or replace function app_private.create_guest_order(request jsonb)");
    expect(sql).toContain("#variable_conflict use_column");
    expect(sql).toContain("on conflict (normalized_phone) where normalized_phone is not null do update");
    expect(sql).toContain("grant execute on function app_private.create_guest_order(jsonb) to service_role");
    expect(sql).not.toContain("drop table");
    expect(sql).not.toContain("storage.objects");
  });

  it("adds a forward migration for the normalized-phone conflict arbiter", () => {
    const sql = readFileSync(
      "supabase/migrations/20260803120000_phase9_customer_normalized_phone_conflict_target.sql",
      "utf8",
    );

    expect(sql).toContain("create unique index if not exists customers_normalized_phone_unique_idx");
    expect(sql).toContain("on public.customers(normalized_phone)");
    expect(sql).not.toContain("drop table");
    expect(sql).not.toContain("storage.objects");
  });

  it("adds a forward migration that removes fragile customer ON CONFLICT inference", () => {
    const sql = readFileSync(
      "supabase/migrations/20260803123000_phase9_guest_order_customer_upsert_repair.sql",
      "utf8",
    );

    expect(sql).toContain("create or replace function app_private.create_guest_order(request jsonb)");
    expect(sql).toContain("pg_advisory_xact_lock(hashtextextended('guest_customer:' || v_normalized_phone, 0))");
    expect(sql).toContain("where customers.normalized_phone = v_normalized_phone");
    expect(sql).toContain("update public.customers");
    expect(sql).toContain("insert into public.customers");
    expect(sql).not.toContain("on conflict (normalized_phone)");
    expect(sql).not.toContain("drop table");
    expect(sql).not.toContain("storage.objects");
  });

  it("adds a forward migration for the notification idempotency conflict arbiter", () => {
    const sql = readFileSync(
      "supabase/migrations/20260803130000_phase9_notification_idempotency_conflict_target.sql",
      "utf8",
    );

    expect(sql).toContain("create unique index if not exists notifications_idempotency_key_unique_idx");
    expect(sql).toContain("on public.notifications(idempotency_key)");
    expect(sql).not.toContain("drop table");
    expect(sql).not.toContain("storage.objects");
  });
});
