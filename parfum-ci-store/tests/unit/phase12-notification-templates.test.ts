import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const orderRow = {
  id: "11111111-1111-4111-8111-111111111111",
  order_number: "CMD-2026-ABC123",
  customer_name: "Awa <script>",
  customer_phone: "+2250700000000",
  delivery_city: "Abidjan",
  delivery_area: "Cocody",
  delivery_method: "HOME_DELIVERY",
  payment_method: "ORANGE_MONEY",
  payment_status: "PENDING",
  status: "PENDING_CONFIRMATION",
  subtotal_xof: 50000,
  delivery_fee_xof: 0,
  total_xof: 50000,
};

const itemRows = [{
  product_name: "Parfum Test",
  variant_name: null,
  size_ml: 100,
  concentration: "EDP",
  quantity: 1,
  unit_price_xof: 50000,
  total_price_xof: 50000,
}];

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    from(table: string) {
      if (table === "orders") {
        return {
          select: () => ({
            limit: () => ({
              eq: () => ({
                single: async () => ({ data: orderRow, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === "order_items") {
        return {
          select: () => ({
            eq: () => ({
              order: async () => ({ data: itemRows, error: null }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: null }),
          }),
        }),
      };
    },
  }),
}));

describe("Phase 12 notification templates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a safe French customer order email from authoritative order snapshots", async () => {
    const { renderNotificationTemplate } = await import("@/lib/notifications/templates");
    const rendered = await renderNotificationTemplate({
      templateKey: "customer_order_received",
      payload: { order_number: "CMD-2026-ABC123" },
      fallbackSubject: null,
      fallbackBody: null,
      siteUrl: "https://example.com",
    });

    expect(rendered.subject).toContain("CMD-2026-ABC123");
    expect(rendered.text).toContain("Suivi: https://example.com/suivi-commande");
    expect(rendered.text).toContain("Ne partagez jamais de PIN ou OTP.");
    expect(rendered.text).toContain("50 000");
    expect(rendered.html).toContain("Parfum Test");
    expect(rendered.html).not.toContain("<script>");
    expect(rendered.html).not.toContain("11111111-1111-4111-8111-111111111111");
  });

  it("renders an admin order link through authenticated admin access", async () => {
    const { renderNotificationTemplate } = await import("@/lib/notifications/templates");
    const rendered = await renderNotificationTemplate({
      templateKey: "admin_order_created",
      payload: { order_id: "11111111-1111-4111-8111-111111111111", order_number: "CMD-2026-ABC123" },
      fallbackSubject: null,
      fallbackBody: null,
      siteUrl: "https://example.com",
    });

    expect(rendered.text).toContain("Administration: connectez-vous puis recherchez CMD-2026-ABC123.");
    expect(rendered.html).toContain("Ouvrir la commande dans l'administration");
    expect(rendered.text).not.toContain("cost_price");
    expect(rendered.text).not.toContain("11111111-1111-4111-8111-111111111111");
  });
});
