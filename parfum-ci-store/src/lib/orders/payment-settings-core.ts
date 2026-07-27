import { z } from "zod";

import type { PaymentMethod } from "@/lib/orders/display";

export const supportedPaymentMethods: PaymentMethod[] = [
  "CASH_ON_DELIVERY",
  "ORANGE_MONEY",
  "MTN_MOMO",
  "WAVE",
  "MOOV_MONEY",
  "BANK_TRANSFER",
  "PAY_IN_STORE",
];

export const paymentMethodConfigSchema = z
  .object({
    enabled: z.boolean().default(false),
    label: z.string().trim().min(1).max(80),
    merchantNumber: z.string().trim().max(80).optional().default(""),
    beneficiaryName: z.string().trim().max(120).optional().default(""),
    instructions: z.string().trim().max(600).optional().default(""),
    displayOrder: z.number().int().min(0).max(100).default(50),
  })
  .strict();

export const paymentSettingsSchema = z
  .object(Object.fromEntries(supportedPaymentMethods.map((method) => [method, paymentMethodConfigSchema])) as Record<
    PaymentMethod,
    typeof paymentMethodConfigSchema
  >)
  .partial()
  .strict();

export type PaymentMethodConfig = z.infer<typeof paymentMethodConfigSchema>;
export type PaymentMethodConfigs = Partial<Record<PaymentMethod, PaymentMethodConfig>>;

const defaultLabels: Record<PaymentMethod, string> = {
  CASH_ON_DELIVERY: "Paiement à la livraison",
  ORANGE_MONEY: "Orange Money",
  MTN_MOMO: "MTN MoMo",
  WAVE: "Wave",
  MOOV_MONEY: "Moov Money",
  BANK_TRANSFER: "Virement bancaire",
  PAY_IN_STORE: "Paiement en boutique",
};

export function defaultPaymentConfigs(
  enabled: PaymentMethod[] = ["CASH_ON_DELIVERY"],
): Record<PaymentMethod, PaymentMethodConfig> {
  return Object.fromEntries(
    supportedPaymentMethods.map((method, index) => [
      method,
      {
        enabled: enabled.includes(method),
        label: defaultLabels[method],
        merchantNumber: "",
        beneficiaryName: "",
        instructions: "",
        displayOrder: index + 1,
      },
    ]),
  ) as Record<PaymentMethod, PaymentMethodConfig>;
}

export function normalizePaymentConfigs(input: unknown, enabled: PaymentMethod[] = ["CASH_ON_DELIVERY"]) {
  const defaults = defaultPaymentConfigs(enabled);
  const parsed = paymentSettingsSchema.safeParse(input);
  if (!parsed.success) return defaults;

  for (const method of supportedPaymentMethods) {
    const value = parsed.data[method];
    if (value) defaults[method] = { ...defaults[method], ...value };
  }

  return defaults;
}

export function configuredPaymentMethods(configs: Record<PaymentMethod, PaymentMethodConfig>) {
  return supportedPaymentMethods
    .filter((method) => {
      const config = configs[method];
      if (!config.enabled) return false;
      if (method === "CASH_ON_DELIVERY") return true;
      if (method === "PAY_IN_STORE") return Boolean(config.instructions.trim());
      if (method === "BANK_TRANSFER") {
        return Boolean(config.instructions.trim() && config.beneficiaryName.trim());
      }
      return Boolean(config.merchantNumber.trim() && config.instructions.trim());
    })
    .sort((a, b) => configs[a].displayOrder - configs[b].displayOrder);
}

export type PaymentSettingsValidationIssue = {
  method: PaymentMethod;
  field: keyof PaymentMethodConfig;
  message: string;
};

function validPublicMerchantNumber(value: string) {
  return /^[0-9+\s().-]{6,40}$/.test(value);
}

export function validatePaymentSettingsForSave(configs: Record<PaymentMethod, PaymentMethodConfig>) {
  const issues: PaymentSettingsValidationIssue[] = [];
  const displayOrders = new Set<number>();

  for (const method of supportedPaymentMethods) {
    const config = configs[method];
    if (displayOrders.has(config.displayOrder)) {
      issues.push({ method, field: "displayOrder", message: "Chaque ordre d'affichage doit être unique." });
    }
    displayOrders.add(config.displayOrder);

    if (!config.enabled) continue;
    if (!config.label.trim()) {
      issues.push({ method, field: "label", message: "Le libellé client est requis." });
    }

    if (method === "CASH_ON_DELIVERY") continue;

    if (!config.instructions.trim()) {
      issues.push({ method, field: "instructions", message: "Les instructions client sont requises." });
    }

    if (method === "PAY_IN_STORE") continue;

    if (method === "BANK_TRANSFER") {
      if (!config.beneficiaryName.trim()) {
        issues.push({ method, field: "beneficiaryName", message: "Le bénéficiaire est requis." });
      }
      continue;
    }

    if (!config.merchantNumber.trim()) {
      issues.push({ method, field: "merchantNumber", message: "Le numéro marchand est requis." });
    } else if (!validPublicMerchantNumber(config.merchantNumber.trim())) {
      issues.push({ method, field: "merchantNumber", message: "Le numéro marchand n'est pas valide." });
    }
  }

  if (configuredPaymentMethods(configs).length === 0) {
    issues.push({
      method: "CASH_ON_DELIVERY",
      field: "enabled",
      message: "Activez au moins un mode de paiement utilisable.",
    });
  }

  return issues;
}
