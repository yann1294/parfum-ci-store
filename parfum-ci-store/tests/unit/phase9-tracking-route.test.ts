import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const lookupOrderForTracking = vi.fn();
const check = vi.fn();
const recordAttempt = vi.fn();

vi.mock("@/lib/orders/tracking", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/orders/tracking")>();
  return {
    ...actual,
    lookupOrderForTracking,
  };
});

vi.mock("@/lib/orders/rate-limit", () => ({
  InMemoryCheckoutRateLimiter: class InMemoryCheckoutRateLimiter {
    check = check;
    recordAttempt = recordAttempt;
  },
}));

const { POST } = await import("@/app/api/orders/track/route");
const { normalizeTrackingRequest } = await import("@/lib/orders/tracking");

function post(body: unknown) {
  return new Request("http://localhost/api/orders/track", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Phase 9 order tracking route", () => {
  beforeEach(() => {
    lookupOrderForTracking.mockReset();
    check.mockReset();
    recordAttempt.mockReset();
    check.mockResolvedValue({ allowed: true });
    recordAttempt.mockResolvedValue(undefined);
  });

  it("returns no-store safe tracking data for matching order and phone", async () => {
    lookupOrderForTracking.mockResolvedValue({
      found: true,
      order: {
        orderNumber: "CMD-2026-A1B2C3",
        statusLabel: "En attente de confirmation",
        paymentStatusLabel: "Non payé",
        createdAt: "2026-07-27T00:00:00.000Z",
        lastUpdatedAt: "2026-07-27T00:00:00.000Z",
        maskedPhone: "+225 07 ** ** ** 12",
        deliveryMethodLabel: "Livraison à domicile",
        paymentMethodLabel: "Paiement à la livraison",
        subtotalXof: 95000,
        deliveryFeePending: true,
        items: [{ productName: "Sauvage", variantLabel: "100 ml · EDP", quantity: 1 }],
        timeline: [{ label: "En attente de confirmation", createdAt: "2026-07-27T00:00:00.000Z" }],
      },
    });

    const response = await POST(post({ orderNumber: "CMD-2026-A1B2C3", phone: "+225 07 00 00 00 12", honeypot: "" }));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const payload = await response.json();
    expect(payload.found).toBe(true);
    expect(JSON.stringify(payload)).not.toContain("customer_id");
    expect(JSON.stringify(payload)).not.toContain("reserved_quantity");
  });

  it("normalizes tracking phone input with the shared Côte d'Ivoire policy", () => {
    expect(normalizeTrackingRequest({ orderNumber: "CMD-2026-A1B2C3", phone: "00225 07 00 00 00 12", honeypot: "" })).toEqual({
      orderNumber: "CMD-2026-A1B2C3",
      phone: "+2250700000012",
    });
    expect(normalizeTrackingRequest({ orderNumber: "CMD-2026-A1B2C3", phone: "0700000012", honeypot: "" }).phone).toBe(
      "+2250700000012",
    );
  });

  it("uses the same generic no-result shape for invalid and missing lookups", async () => {
    const invalid = await POST(post({ orderNumber: "bad", phone: "bad", honeypot: "" }));
    expect(await invalid.json()).toEqual({
      found: false,
      message: "Aucune commande ne correspond aux informations fournies.",
    });

    lookupOrderForTracking.mockResolvedValue({ found: false });
    const missing = await POST(post({ orderNumber: "CMD-2026-A1B2C3", phone: "+225 07 00 00 00 12", honeypot: "" }));
    expect(await missing.json()).toEqual({
      found: false,
      message: "Aucune commande ne correspond aux informations fournies.",
    });
  });

  it("rate limits tracking attempts without exposing internals", async () => {
    check.mockResolvedValue({ allowed: false, retryAfterSeconds: 20 });

    const response = await POST(post({ orderNumber: "CMD-2026-A1B2C3", phone: "+225 07 00 00 00 12", honeypot: "" }));

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("20");
    const payload = await response.json();
    expect(payload.found).toBe(false);
    expect(lookupOrderForTracking).not.toHaveBeenCalled();
  });
});
