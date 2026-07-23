import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const createGuestOrder = vi.fn();
const check = vi.fn();
const recordAttempt = vi.fn();

vi.mock("@/lib/orders/guest-order-service", () => ({
  createGuestOrder,
  GuestOrderError: class GuestOrderError extends Error {
    constructor(
      readonly code: string,
      readonly status = 400,
    ) {
      super(code);
    }
  },
}));

vi.mock("@/lib/orders/rate-limit", () => ({
  checkoutRateLimiter: { check, recordAttempt },
  checkoutRateLimitKey: () => "checkout:test",
}));

const { POST } = await import("@/app/api/orders/route");
const { GuestOrderError } = await import("@/lib/orders/guest-order-service");

const productId = "11111111-1111-4111-8111-111111111111";
const variantId = "22222222-2222-4222-8222-222222222222";

function requestBody(overrides: Record<string, unknown> = {}) {
  return {
    idempotencyKey: "phase8-idempotency-key-1234567890",
    customer: {
      fullName: "Awa Koné",
      phone: "+225 07 00 00 00 00",
      city: "Abidjan",
      commune: "Cocody",
    },
    deliveryMethod: "HOME_DELIVERY",
    paymentMethod: "CASH_ON_DELIVERY",
    lines: [{ productId, variantId, quantity: 1 }],
    honeypot: "",
    ...overrides,
  };
}

function postRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/orders", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("POST /api/orders Phase 8 boundary", () => {
  beforeEach(() => {
    createGuestOrder.mockReset();
    check.mockReset();
    recordAttempt.mockReset();
    check.mockResolvedValue({ allowed: true });
    recordAttempt.mockResolvedValue(undefined);
  });

  it("rejects non-JSON and honeypot submissions safely", async () => {
    const nonJson = await POST(new Request("http://localhost/api/orders", { method: "POST", body: "{}" }));
    expect(nonJson.status).toBe(400);
    expect(await nonJson.json()).toEqual({
      error: {
        code: "ORDER_INVALID_REQUEST",
        message: "La commande n'a pas pu être créée. Vérifiez le panier et réessayez.",
      },
    });

    const honeypot = await POST(postRequest(requestBody({ honeypot: "filled" })));
    expect(honeypot.status).toBe(400);
    expect(createGuestOrder).not.toHaveBeenCalled();
  });

  it("applies rate limiting before creating the order", async () => {
    check.mockResolvedValue({ allowed: false, retryAfterSeconds: 30 });
    const response = await POST(postRequest(requestBody()));

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("30");
    expect((await response.json()).error.code).toBe("ORDER_RATE_LIMITED");
    expect(createGuestOrder).not.toHaveBeenCalled();
  });

  it("returns safe confirmation with no-store headers", async () => {
    createGuestOrder.mockResolvedValue({
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
    });

    const response = await POST(postRequest(requestBody()));

    expect(response.status).toBe(201);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const payload = await response.json();
    expect(payload.orderNumber).toBe("CMD-2026-A1B2C3");
    expect(JSON.stringify(payload)).not.toContain("reserved_quantity");
  });

  it("maps service errors without exposing raw internals", async () => {
    createGuestOrder.mockRejectedValue(new GuestOrderError("ORDER_ITEM_UNAVAILABLE", 409));
    const response = await POST(postRequest(requestBody()));

    expect(response.status).toBe(409);
    const payload = await response.json();
    expect(payload.error.code).toBe("ORDER_ITEM_UNAVAILABLE");
    expect(JSON.stringify(payload)).not.toContain("public.product_variants");
  });
});
