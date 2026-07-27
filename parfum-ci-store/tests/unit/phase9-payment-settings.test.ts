import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  updatePayload: null as Record<string, unknown> | null,
  insertPayload: null as Record<string, unknown> | null,
  updateError: null as { code?: string; message?: string } | null,
  updateData: {
    id: true,
    store_name: "Parfum CI",
    enabled_payment_methods: ["CASH_ON_DELIVERY", "ORANGE_MONEY"],
    payment_method_configs: {},
  } as Record<string, unknown> | null,
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    from(table: "store_settings") {
      expect(table).toBe("store_settings");
      return {
        update(value: Record<string, unknown>) {
          mocks.updatePayload = value;
          return {
            eq(column: string, value: boolean) {
              expect(column).toBe("id");
              expect(value).toBe(true);
              return {
                select() {
                  return {
                    async single() {
                      return { data: mocks.updateData, error: mocks.updateError };
                    },
                  };
                },
              };
            },
          };
        },
        insert(value: Record<string, unknown>) {
          mocks.insertPayload = value;
          return {
            select() {
              return {
                async single() {
                  return { data: { ...value }, error: null };
                },
              };
            },
          };
        },
      };
    },
  })),
}));

import { defaultPaymentConfigs } from "@/lib/orders/payment-settings-core";
import { PaymentSettingsError, updatePaymentSettings } from "@/lib/orders/payment-settings";

describe("Phase 9 payment settings persistence", () => {
  beforeEach(() => {
    mocks.updatePayload = null;
    mocks.insertPayload = null;
    mocks.updateError = null;
    mocks.updateData = {
      id: true,
      store_name: "Parfum CI",
      enabled_payment_methods: ["CASH_ON_DELIVERY", "ORANGE_MONEY"],
      payment_method_configs: {},
    };
  });

  it("persists multiple supported payment methods with explicit singleton columns", async () => {
    const configs = defaultPaymentConfigs(["CASH_ON_DELIVERY", "ORANGE_MONEY"]);
    configs.ORANGE_MONEY = {
      ...configs.ORANGE_MONEY,
      merchantNumber: "0700000000",
      beneficiaryName: "Parfum CI",
      instructions: "Paiement Orange Money après confirmation.",
    };
    mocks.updateData = {
      id: true,
      store_name: "Parfum CI",
      enabled_payment_methods: ["CASH_ON_DELIVERY", "ORANGE_MONEY"],
      payment_method_configs: configs,
    };

    const saved = await updatePaymentSettings(configs);

    expect(saved.enabledPaymentMethods).toEqual(["CASH_ON_DELIVERY", "ORANGE_MONEY"]);
    expect(mocks.updatePayload).toEqual({
      enabled_payment_methods: ["CASH_ON_DELIVERY", "ORANGE_MONEY"],
      payment_method_configs: configs,
    });
    expect(JSON.stringify(mocks.updatePayload)).not.toContain("store_name");
    expect(mocks.insertPayload).toBeNull();
  });

  it("maps missing payment config column to a typed migration-required failure", async () => {
    const configs = defaultPaymentConfigs(["CASH_ON_DELIVERY"]);
    mocks.updateData = null;
    mocks.updateError = { code: "PGRST204", message: "column payment_method_configs not found" };

    await expect(updatePaymentSettings(configs)).rejects.toMatchObject({
      code: "PAYMENT_SETTINGS_MIGRATION_REQUIRED",
    } satisfies Partial<PaymentSettingsError>);
  });
});
