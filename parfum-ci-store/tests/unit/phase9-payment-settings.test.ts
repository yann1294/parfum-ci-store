import { describe, expect, it } from "vitest";

import {
  configuredPaymentMethods,
  defaultPaymentConfigs,
  validatePaymentSettingsForSave,
} from "@/lib/orders/payment-settings-core";

describe("Phase 9 payment settings contract reused by Phase 14", () => {
  it("keeps enum identifiers and deterministic display ordering", () => {
    const configs = defaultPaymentConfigs(["CASH_ON_DELIVERY", "ORANGE_MONEY"]);
    configs.ORANGE_MONEY = { ...configs.ORANGE_MONEY, merchantNumber: "0700000000", instructions: "Après confirmation.", displayOrder: 1 };
    configs.CASH_ON_DELIVERY = { ...configs.CASH_ON_DELIVERY, displayOrder: 2 };
    expect(configuredPaymentMethods(configs)).toEqual(["ORANGE_MONEY", "CASH_ON_DELIVERY"]);
  });

  it("rejects incomplete enabled manual methods without adding a second model", () => {
    const configs = defaultPaymentConfigs(["ORANGE_MONEY"]);
    configs.ORANGE_MONEY = { ...configs.ORANGE_MONEY, instructions: "Après confirmation.", merchantNumber: "" };
    expect(validatePaymentSettingsForSave(configs)).toContainEqual({
      method: "ORANGE_MONEY",
      field: "merchantNumber",
      message: "Le numéro marchand est requis.",
    });
  });
});
