import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PaymentMethod } from "@/lib/orders/display";
import {
  configuredPaymentMethods,
  normalizePaymentConfigs,
  validatePaymentSettingsForSave,
  type PaymentMethodConfig,
} from "@/lib/orders/payment-settings-core";
export {
  configuredPaymentMethods,
  defaultPaymentConfigs,
  normalizePaymentConfigs,
  paymentMethodConfigSchema,
  paymentSettingsSchema,
  supportedPaymentMethods,
  validatePaymentSettingsForSave,
  type PaymentMethodConfig,
  type PaymentMethodConfigs,
} from "@/lib/orders/payment-settings-core";

type SettingsRow = {
  id?: boolean | null;
  store_name?: string | null;
  enabled_payment_methods: PaymentMethod[] | null;
  payment_method_configs: unknown;
};

type SettingsClient = {
  from(table: "store_settings"): {
    select(columns: string): {
      eq(column: "id", value: true): {
        maybeSingle(): Promise<{ data: SettingsRow | null; error: { code?: string; message?: string } | null }>;
      };
    };
    update(value: {
      enabled_payment_methods: PaymentMethod[];
      payment_method_configs: Record<PaymentMethod, PaymentMethodConfig>;
    }): {
      eq(column: "id", value: true): {
        select(columns: string): {
          single(): Promise<{ data: SettingsRow | null; error: { code?: string; message?: string } | null }>;
        };
      };
    };
    insert(value: {
      id: true;
      store_name: string;
      enabled_payment_methods: PaymentMethod[];
      payment_method_configs: Record<PaymentMethod, PaymentMethodConfig>;
    }): {
      select(columns: string): {
        single(): Promise<{ data: SettingsRow | null; error: { code?: string; message?: string } | null }>;
      };
    };
  };
};

export class PaymentSettingsError extends Error {
  constructor(readonly code: "PAYMENT_SETTINGS_INVALID" | "PAYMENT_SETTINGS_MIGRATION_REQUIRED" | "PAYMENT_SETTINGS_SAVE_FAILED") {
    super(code);
  }
}

function isMissingPaymentConfigColumn(error: { code?: string; message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return message.includes("payment_method_configs") || error?.code === "PGRST204" || error?.code === "42703";
}

export async function getPaymentSettings() {
  const supabase = createSupabaseAdminClient() as unknown as SettingsClient;
  const { data } = await supabase
    .from("store_settings")
    .select("id, store_name, enabled_payment_methods, payment_method_configs")
    .eq("id", true)
    .maybeSingle();

  const configs = normalizePaymentConfigs(data?.payment_method_configs, data?.enabled_payment_methods ?? undefined);
  return {
    configs,
    enabledPaymentMethods: configuredPaymentMethods(configs),
  };
}

export async function updatePaymentSettings(configs: Record<PaymentMethod, PaymentMethodConfig>) {
  const validationIssues = validatePaymentSettingsForSave(configs);
  if (validationIssues.length > 0) throw new PaymentSettingsError("PAYMENT_SETTINGS_INVALID");

  const enabledPaymentMethods = configuredPaymentMethods(configs);
  const finalEnabled = enabledPaymentMethods;

  const supabase = createSupabaseAdminClient() as unknown as SettingsClient;
  const updateResult = await supabase
    .from("store_settings")
    .update({
      enabled_payment_methods: finalEnabled,
      payment_method_configs: configs,
    })
    .eq("id", true)
    .select("id, store_name, enabled_payment_methods, payment_method_configs")
    .single();

  let data = updateResult.data;
  let error = updateResult.error;

  if (isMissingPaymentConfigColumn(error)) {
    throw new PaymentSettingsError("PAYMENT_SETTINGS_MIGRATION_REQUIRED");
  }

  if (error?.code === "PGRST116" || (!data && !error)) {
    const insertResult = await supabase
      .from("store_settings")
      .insert({
        id: true,
        store_name: "Parfum CI",
        enabled_payment_methods: finalEnabled,
        payment_method_configs: configs,
      })
      .select("id, store_name, enabled_payment_methods, payment_method_configs")
      .single();
    data = insertResult.data;
    error = insertResult.error;
  }

  if (isMissingPaymentConfigColumn(error)) {
    throw new PaymentSettingsError("PAYMENT_SETTINGS_MIGRATION_REQUIRED");
  }

  if (error || !data) throw new PaymentSettingsError("PAYMENT_SETTINGS_SAVE_FAILED");

  const savedConfigs = normalizePaymentConfigs(data.payment_method_configs, data.enabled_payment_methods ?? undefined);
  return {
    configs: savedConfigs,
    enabledPaymentMethods: configuredPaymentMethods(savedConfigs),
  };
}
