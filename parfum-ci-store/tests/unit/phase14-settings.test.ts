import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { normalizeLocation, sectionSchemas } from "@/lib/settings/schemas";
import { projectPublicStoreSettings } from "@/lib/settings/service";

describe("Phase 14 settings", () => {
  it("normalizes accents, case and whitespace for delivery matching", () => {
    expect(normalizeLocation("  Cocody  Angré  ")).toBe("cocody angre");
    expect(normalizeLocation("MARCORY-RÉSIDENTIEL")).toBe("marcory residentiel");
  });

  it("normalizes Côte d'Ivoire contact phones with the shared Phase 9 policy", () => {
    const parsed = sectionSchemas.contact.parse({
      supportEmail: "support@example.com",
      contactEmail: "",
      contactPhone: "07 00 00 00 00",
      whatsappNumber: "002250500000000",
      businessHours: [],
      responseTimeGuidance: "Sous 24 h",
    });
    expect(parsed.contactPhone).toBe("+2250700000000");
    expect(parsed.whatsappNumber).toBe("+2250500000000");
  });

  it("rejects unsafe social schemes and wrong hosts", () => {
    expect(
      sectionSchemas.social.safeParse({
        instagramUrl: "javascript:alert(1)",
        facebookUrl: "",
        tiktokUrl: "",
      }).success,
    ).toBe(false);
    expect(
      sectionSchemas.social.safeParse({
        instagramUrl: "https://example.com/account",
        facebookUrl: "",
        tiktokUrl: "",
      }).success,
    ).toBe(false);
  });

  it("rejects ambiguous active delivery zones and invalid estimates", () => {
    const base = {
      enabledDeliveryMethods: ["HOME_DELIVERY"] as const,
      deliveryMethodConfigs: {
        HOME_DELIVERY: { label: "Livraison", publicLabel: "" },
        PICKUP: { label: "Retrait", publicLabel: "" },
      },
      defaultDeliveryFeeXof: 2000,
      pickupFeeXof: 0,
      freeDeliveryEnabled: false,
      freeDeliveryThresholdXof: null,
      deliveryEstimatedMinDays: 2,
      deliveryEstimatedMaxDays: 1,
      zones: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          name: "A",
          city: "Abidjan",
          commune: "Cocody Angré",
          feeXof: 1500,
          estimatedMinDays: 1,
          estimatedMaxDays: 2,
          enabled: true,
          displayOrder: 1,
        },
        {
          id: "22222222-2222-4222-8222-222222222222",
          name: "B",
          city: " ABIDJAN ",
          commune: "Cocody-Angre",
          feeXof: 1600,
          estimatedMinDays: 1,
          estimatedMaxDays: 2,
          enabled: true,
          displayOrder: 2,
        },
      ],
    };
    const result = sectionSchemas.delivery.safeParse(base);
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues.map((issue) => issue.message)).toEqual(
        expect.arrayContaining([
          "Le délai maximum doit être supérieur ou égal au minimum.",
          "Deux zones actives ne peuvent pas viser la même ville et commune.",
        ]),
      );
  });

  it("projects public settings without private recipient, revision, audit or secret fields", () => {
    const projected = projectPublicStoreSettings({
      storeName: "Parfum CI",
      enabledPaymentMethods: ["CASH_ON_DELIVERY"],
      paymentMethodConfigs: {
        CASH_ON_DELIVERY: {
          enabled: true,
          label: "À la livraison",
          merchantNumber: "",
          beneficiaryName: "",
          instructions: "À réception",
          displayOrder: 1,
        },
      },
      enabledDeliveryMethods: ["HOME_DELIVERY"],
      acceptingOrders: true,
      notificationEmail: "private@example.com",
      settingsRevision: 12,
      resendApiKey: "secret",
      audit: { actor: "x" },
      socialLinks: {
        instagram: "javascript:bad",
        facebook: "https://facebook.com/parfumci",
        tiktok: null,
      },
    });
    const json = JSON.stringify(projected);
    expect(json).not.toContain("private@example.com");
    expect(json).not.toContain("settingsRevision");
    expect(json).not.toContain("secret");
    expect(projected.socialLinks.instagram).toBeNull();
    expect(projected.socialLinks.facebook).toBe("https://facebook.com/parfumci");
  });

  it("migration uses forward-only authoritative order pricing and safe RPC boundaries", () => {
    const sql = readFileSync(
      "supabase/migrations/20260813090000_phase14_store_settings_delivery.sql",
      "utf8",
    );
    expect(sql).toContain("before insert on public.orders");
    expect(sql).toContain(
      "new.total_xof := new.subtotal_xof + new.delivery_fee_xof - new.discount_xof",
    );
    expect(sql).toContain("delivery_rule_snapshot");
    expect(sql).toContain("SETTINGS_STALE_VERSION");
    expect(sql).toContain("STORE_SETTINGS_UPDATED");
    expect(sql).toContain("revoke select on table public.store_settings from anon, authenticated");
    expect(sql).not.toContain("RESEND_API_KEY");
    expect(sql).not.toContain("CRON_SECRET");
  });
});
