import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PaymentMethod } from "@/lib/orders/display";
import {
  configuredPaymentMethods,
  normalizePaymentConfigs,
  type PaymentMethodConfig,
} from "@/lib/orders/payment-settings-core";
export {
  configuredPaymentMethods,
  defaultPaymentConfigs,
  normalizePaymentConfigs,
  paymentMethodConfigSchema,
  paymentSettingsSchema,
  supportedPaymentMethods,
  type PaymentMethodConfig,
  type PaymentMethodConfigs,
} from "@/lib/orders/payment-settings-core";

type SettingsRow = {
  enabled_payment_methods: PaymentMethod[] | null;
  payment_method_configs: unknown;
};

type SettingsClient = {
  from(table: "store_settings"): {
    select(columns: string): {
      eq(column: "id", value: true): {
        maybeSingle(): Promise<{ data: SettingsRow | null; error: { message?: string } | null }>;
      };
    };
    update(value: {
      enabled_payment_methods: PaymentMethod[];
      payment_method_configs: Record<PaymentMethod, PaymentMethodConfig>;
    }): {
      eq(column: "id", value: true): {
        select(columns: string): {
          single(): Promise<{ data: SettingsRow | null; error: { message?: string } | null }>;
        };
      };
    };
  };
};

export async function getPaymentSettings() {
  const supabase = createSupabaseAdminClient() as unknown as SettingsClient;
  const { data } = await supabase
    .from("store_settings")
    .select("enabled_payment_methods, payment_method_configs")
    .eq("id", true)
    .maybeSingle();

  const configs = normalizePaymentConfigs(data?.payment_method_configs, data?.enabled_payment_methods ?? undefined);
  return {
    configs,
    enabledPaymentMethods: configuredPaymentMethods(configs),
  };
}

export async function updatePaymentSettings(configs: Record<PaymentMethod, PaymentMethodConfig>) {
  const enabledPaymentMethods = configuredPaymentMethods(configs);
  const finalEnabled = enabledPaymentMethods.length > 0 ? enabledPaymentMethods : (["CASH_ON_DELIVERY"] satisfies PaymentMethod[]);
  if (enabledPaymentMethods.length === 0) {
    configs.CASH_ON_DELIVERY = { ...configs.CASH_ON_DELIVERY, enabled: true };
  }

  const supabase = createSupabaseAdminClient() as unknown as SettingsClient;
  const { data, error } = await supabase
    .from("store_settings")
    .update({
      enabled_payment_methods: finalEnabled,
      payment_method_configs: configs,
    })
    .eq("id", true)
    .select("enabled_payment_methods, payment_method_configs")
    .single();

  if (error || !data) throw new Error("PAYMENT_SETTINGS_UPDATE_FAILED");

  const savedConfigs = normalizePaymentConfigs(data.payment_method_configs, data.enabled_payment_methods ?? undefined);
  return {
    configs: savedConfigs,
    enabledPaymentMethods: configuredPaymentMethods(savedConfigs),
  };
}
