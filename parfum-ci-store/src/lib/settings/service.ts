import "server-only";

import { createHash, randomUUID } from "node:crypto";

import { siteConfig } from "@/config/site";
import type { DeliveryMethod, PaymentMethod } from "@/lib/orders/display";
import { normalizeCoteDIvoirePhoneResult } from "@/lib/orders/phone";
import {
  configuredPaymentMethods,
  defaultPaymentConfigs,
  normalizePaymentConfigs,
  type PaymentMethodConfig,
} from "@/lib/orders/payment-settings-core";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  businessHourSchema,
  sectionSchemas,
  settingsSections,
  type PublicStoreSettings,
  type SettingsSection,
  type SettingsSectionValues,
} from "@/lib/settings/schemas";

const settingsColumns = [
  "store_name",
  "legal_name",
  "logo_url",
  "primary_address",
  "secondary_address",
  "support_email",
  "contact_email",
  "contact_phone",
  "whatsapp_number",
  "business_hours",
  "response_time_guidance",
  "instagram_url",
  "facebook_url",
  "tiktok_url",
  "enabled_payment_methods",
  "payment_method_configs",
  "enabled_delivery_methods",
  "delivery_method_configs",
  "default_delivery_fee_xof",
  "pickup_fee_xof",
  "free_delivery_enabled",
  "free_delivery_threshold_xof",
  "delivery_estimated_min_days",
  "delivery_estimated_max_days",
  "site_title",
  "site_description",
  "og_image_url",
  "canonical_site_url",
  "notification_email",
  "accepting_orders",
  "maintenance_mode",
  "maintenance_message",
  "expected_reopening_at",
  "settings_revision",
  "updated_at",
].join(", ");

type SettingsRow = Record<string, unknown>;
type ZoneRow = {
  id: string;
  name: string;
  city: string;
  commune: string;
  fee_xof: number;
  estimated_min_days: number | null;
  estimated_max_days: number | null;
  enabled: boolean;
  display_order: number;
};

type SettingsDataClient = {
  from(table: "store_settings"): {
    select(columns: string): {
      eq(
        column: "id",
        value: true,
      ): { maybeSingle(): Promise<{ data: SettingsRow | null; error: unknown }> };
    };
  };
  from(table: "delivery_zones"): {
    select(columns: string): {
      order(
        column: string,
        options?: { ascending?: boolean },
      ): Promise<{ data: ZoneRow[] | null; error: unknown }>;
    };
  };
  rpc(
    name: "get_public_store_settings",
    args?: Record<string, never>,
  ): Promise<{ data: unknown; error: unknown }>;
  rpc(
    name: "get_public_delivery_zones",
    args?: Record<string, never>,
  ): Promise<{ data: unknown; error: unknown }>;
  rpc(
    name: "update_store_settings_server",
    args: { request: Record<string, unknown> },
  ): Promise<{ data: unknown; error: { message?: string } | null }>;
};

export type AdminStoreSettings = {
  revision: number;
  updatedAt: string;
  identity: SettingsSectionValues["identity"];
  contact: SettingsSectionValues["contact"];
  social: SettingsSectionValues["social"];
  payments: SettingsSectionValues["payments"];
  delivery: SettingsSectionValues["delivery"];
  seo: SettingsSectionValues["seo"];
  notifications: SettingsSectionValues["notifications"];
  availability: SettingsSectionValues["availability"];
};

export class StoreSettingsError extends Error {
  constructor(
    readonly code:
      | "SETTINGS_STALE_VERSION"
      | "SETTINGS_FORBIDDEN"
      | "SETTINGS_SAVE_FAILED"
      | "SETTINGS_UNAVAILABLE",
  ) {
    super(code);
  }
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}
function nullableNumber(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}
function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}
function safePhone(value: unknown) {
  const raw = stringValue(value);
  if (!raw) return "";
  const result = normalizeCoteDIvoirePhoneResult(raw, false);
  return result.ok ? result.value : "";
}
function safePublicUrl(value: unknown, hosts?: string[]) {
  const raw = stringValue(value);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    if (
      url.protocol !== "https:" ||
      (hosts && !hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`)))
    )
      return null;
    return url.toString();
  } catch {
    return null;
  }
}

function deliveryConfigs(value: unknown) {
  const raw = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const config = (method: DeliveryMethod, label: string) => {
    const item =
      typeof raw[method] === "object" && raw[method] !== null
        ? (raw[method] as Record<string, unknown>)
        : {};
    return { label: stringValue(item.label) || label, publicLabel: stringValue(item.publicLabel) };
  };
  return {
    HOME_DELIVERY: config("HOME_DELIVERY", "Livraison à domicile"),
    PICKUP: config("PICKUP", "Retrait en boutique"),
  };
}

function publicFallback(): PublicStoreSettings {
  const paymentMethodConfigs = defaultPaymentConfigs(["CASH_ON_DELIVERY"]);
  return {
    storeName: siteConfig.name,
    legalName: null,
    logoUrl: null,
    contactEmail: null,
    supportEmail: null,
    contactPhone: null,
    whatsappNumber: null,
    primaryAddress: null,
    secondaryAddress: null,
    businessHours: [],
    responseTimeGuidance: null,
    socialLinks: { instagram: null, facebook: null, tiktok: null },
    enabledPaymentMethods: ["CASH_ON_DELIVERY"],
    paymentMethodConfigs,
    enabledDeliveryMethods: ["HOME_DELIVERY"],
    deliveryMethodConfigs: deliveryConfigs({}),
    defaultDeliveryFeeXof: null,
    pickupFeeXof: 0,
    freeDeliveryEnabled: false,
    freeDeliveryThresholdXof: null,
    deliveryEstimatedMinDays: null,
    deliveryEstimatedMaxDays: null,
    seo: {
      siteTitle: null,
      siteDescription: null,
      ogImageUrl: null,
      canonicalSiteUrl: siteConfig.siteUrl,
    },
    acceptingOrders: true,
    maintenanceMode: false,
    maintenanceMessage: null,
    expectedReopeningAt: null,
  };
}

export function projectPublicStoreSettings(input: unknown): PublicStoreSettings {
  const fallback = publicFallback();
  if (!input || typeof input !== "object") return fallback;
  const value = input as Record<string, unknown>;
  const social =
    typeof value.socialLinks === "object" && value.socialLinks
      ? (value.socialLinks as Record<string, unknown>)
      : {};
  const seo =
    typeof value.seo === "object" && value.seo ? (value.seo as Record<string, unknown>) : {};
  const configs = normalizePaymentConfigs(
    value.paymentMethodConfigs,
    stringArray(value.enabledPaymentMethods) as PaymentMethod[],
  );
  const hours = Array.isArray(value.businessHours)
    ? value.businessHours.flatMap((item) => {
        const parsed = businessHourSchema.safeParse(item);
        return parsed.success ? [parsed.data] : [];
      })
    : [];
  return {
    ...fallback,
    storeName: stringValue(value.storeName) || fallback.storeName,
    legalName: stringValue(value.legalName) || null,
    logoUrl: safePublicUrl(value.logoUrl),
    contactEmail: stringValue(value.contactEmail) || null,
    supportEmail: stringValue(value.supportEmail) || null,
    contactPhone: safePhone(value.contactPhone) || null,
    whatsappNumber: safePhone(value.whatsappNumber) || null,
    primaryAddress: stringValue(value.primaryAddress) || null,
    secondaryAddress: stringValue(value.secondaryAddress) || null,
    businessHours: hours,
    responseTimeGuidance: stringValue(value.responseTimeGuidance) || null,
    socialLinks: {
      instagram: safePublicUrl(social.instagram, ["instagram.com"]),
      facebook: safePublicUrl(social.facebook, ["facebook.com", "fb.com"]),
      tiktok: safePublicUrl(social.tiktok, ["tiktok.com"]),
    },
    enabledPaymentMethods: configuredPaymentMethods(configs),
    paymentMethodConfigs: configs,
    enabledDeliveryMethods: stringArray(value.enabledDeliveryMethods).filter(
      (item): item is DeliveryMethod => item === "HOME_DELIVERY" || item === "PICKUP",
    ),
    deliveryMethodConfigs: deliveryConfigs(value.deliveryMethodConfigs),
    defaultDeliveryFeeXof: nullableNumber(value.defaultDeliveryFeeXof),
    pickupFeeXof: nullableNumber(value.pickupFeeXof) ?? 0,
    freeDeliveryEnabled: value.freeDeliveryEnabled === true,
    freeDeliveryThresholdXof: nullableNumber(value.freeDeliveryThresholdXof),
    deliveryEstimatedMinDays: nullableNumber(value.deliveryEstimatedMinDays),
    deliveryEstimatedMaxDays: nullableNumber(value.deliveryEstimatedMaxDays),
    seo: {
      siteTitle: stringValue(seo.siteTitle) || null,
      siteDescription: stringValue(seo.siteDescription) || null,
      ogImageUrl: safePublicUrl(seo.ogImageUrl),
      canonicalSiteUrl: safePublicUrl(seo.canonicalSiteUrl),
    },
    acceptingOrders: value.acceptingOrders !== false,
    maintenanceMode: value.maintenanceMode === true,
    maintenanceMessage: stringValue(value.maintenanceMessage) || null,
    expectedReopeningAt: stringValue(value.expectedReopeningAt) || null,
  };
}

export async function getPublicStoreSettings() {
  try {
    const client = (await createSupabaseServerClient()) as unknown as SettingsDataClient;
    const { data, error } = await client.rpc("get_public_store_settings", {});
    return error ? publicFallback() : projectPublicStoreSettings(data);
  } catch {
    return publicFallback();
  }
}

export async function getCheckoutSettings() {
  const settings = await getPublicStoreSettings();
  return {
    storeName: settings.storeName,
    legalName: settings.legalName,
    contactEmail: settings.supportEmail ?? settings.contactEmail,
    contactPhone: settings.contactPhone,
    whatsappNumber: settings.whatsappNumber,
    orangeMoneyNumber: null,
    mtnMomoNumber: null,
    waveNumber: null,
    moovMoneyNumber: null,
    deliveryInformation: null,
    deliveryContent: {},
    enabledPaymentMethods: settings.enabledPaymentMethods,
    enabledDeliveryMethods: settings.enabledDeliveryMethods,
    paymentMethodConfigs: settings.paymentMethodConfigs,
    acceptingOrders: settings.acceptingOrders && !settings.maintenanceMode,
    orderUnavailableMessage: settings.maintenanceMode ? settings.maintenanceMessage : null,
    deliveryMethodConfigs: settings.deliveryMethodConfigs,
    authoritativeDeliveryFees: true,
  };
}

export async function getPublicDeliveryZones() {
  try {
    const client = (await createSupabaseServerClient()) as unknown as SettingsDataClient;
    const { data, error } = await client.rpc("get_public_delivery_zones", {});
    if (error || !Array.isArray(data)) return [];
    return data.flatMap((row) => {
      if (!row || typeof row !== "object") return [];
      const value = row as Record<string, unknown>;
      if (
        typeof value.name !== "string" ||
        typeof value.city !== "string" ||
        typeof value.commune !== "string" ||
        typeof value.fee_xof !== "number"
      )
        return [];
      return [
        {
          name: value.name,
          city: value.city,
          commune: value.commune,
          feeXof: value.fee_xof,
          estimatedMinDays: nullableNumber(value.estimated_min_days),
          estimatedMaxDays: nullableNumber(value.estimated_max_days),
        },
      ];
    });
  } catch {
    return [];
  }
}

export async function getAdminStoreSettings(): Promise<AdminStoreSettings> {
  const client = createSupabaseAdminClient() as unknown as SettingsDataClient;
  const [settingsResult, zonesResult] = await Promise.all([
    client.from("store_settings").select(settingsColumns).eq("id", true).maybeSingle(),
    client
      .from("delivery_zones")
      .select(
        "id, name, city, commune, fee_xof, estimated_min_days, estimated_max_days, enabled, display_order",
      )
      .order("display_order", { ascending: true }),
  ]);
  const row = settingsResult.data;
  if (settingsResult.error || zonesResult.error || !row)
    throw new StoreSettingsError("SETTINGS_UNAVAILABLE");
  const paymentMethodConfigs = normalizePaymentConfigs(
    row.payment_method_configs,
    stringArray(row.enabled_payment_methods) as PaymentMethod[],
  );
  const hours = Array.isArray(row.business_hours) ? row.business_hours : [];
  const admin: AdminStoreSettings = {
    revision: Number(row.settings_revision),
    updatedAt: stringValue(row.updated_at),
    identity: {
      storeName: stringValue(row.store_name),
      legalName: stringValue(row.legal_name),
      logoUrl: stringValue(row.logo_url),
      primaryAddress: stringValue(row.primary_address),
      secondaryAddress: stringValue(row.secondary_address),
    },
    contact: {
      supportEmail: stringValue(row.support_email),
      contactEmail: stringValue(row.contact_email),
      contactPhone: safePhone(row.contact_phone),
      whatsappNumber: safePhone(row.whatsapp_number),
      businessHours: hours as Array<{ label: string; value: string }>,
      responseTimeGuidance: stringValue(row.response_time_guidance),
    },
    social: {
      instagramUrl: stringValue(row.instagram_url),
      facebookUrl: stringValue(row.facebook_url),
      tiktokUrl: stringValue(row.tiktok_url),
    },
    payments: { paymentMethodConfigs },
    delivery: {
      enabledDeliveryMethods: stringArray(row.enabled_delivery_methods).filter(
        (item): item is DeliveryMethod => item === "HOME_DELIVERY" || item === "PICKUP",
      ),
      deliveryMethodConfigs: deliveryConfigs(row.delivery_method_configs),
      defaultDeliveryFeeXof: nullableNumber(row.default_delivery_fee_xof),
      pickupFeeXof: nullableNumber(row.pickup_fee_xof) ?? 0,
      freeDeliveryEnabled: row.free_delivery_enabled === true,
      freeDeliveryThresholdXof: nullableNumber(row.free_delivery_threshold_xof),
      deliveryEstimatedMinDays: nullableNumber(row.delivery_estimated_min_days),
      deliveryEstimatedMaxDays: nullableNumber(row.delivery_estimated_max_days),
      zones: (zonesResult.data ?? []).map((zone) => ({
        id: zone.id,
        name: zone.name,
        city: zone.city,
        commune: zone.commune,
        feeXof: zone.fee_xof,
        estimatedMinDays: zone.estimated_min_days,
        estimatedMaxDays: zone.estimated_max_days,
        enabled: zone.enabled,
        displayOrder: zone.display_order,
      })),
    },
    seo: {
      siteTitle: stringValue(row.site_title),
      siteDescription: stringValue(row.site_description),
      ogImageUrl: stringValue(row.og_image_url),
      canonicalSiteUrl: stringValue(row.canonical_site_url),
    },
    notifications: { notificationEmail: stringValue(row.notification_email) },
    availability: {
      acceptingOrders: row.accepting_orders !== false,
      maintenanceMode: row.maintenance_mode === true,
      maintenanceMessage: stringValue(row.maintenance_message),
      expectedReopeningAt: stringValue(row.expected_reopening_at),
    },
  };
  for (const section of settingsSections) sectionSchemas[section].parse(admin[section] as never);
  return admin;
}

type UpdateInput<S extends SettingsSection> = {
  actorId: string;
  section: S;
  expectedRevision: number;
  value: SettingsSectionValues[S];
  mutationId?: string;
};

export async function updateStoreSettings<S extends SettingsSection>(input: UpdateInput<S>) {
  const value = sectionSchemas[input.section].parse(input.value) as SettingsSectionValues[S];
  const persistedValue =
    input.section === "payments"
      ? {
          ...value,
          enabledPaymentMethods: configuredPaymentMethods(
            normalizePaymentConfigs(
              (value as SettingsSectionValues["payments"]).paymentMethodConfigs,
              [],
            ),
          ),
        }
      : value;
  const mutationId = input.mutationId ?? randomUUID();
  const material = JSON.stringify({
    section: input.section,
    expectedRevision: input.expectedRevision,
    value: persistedValue,
  });
  const requestFingerprint = createHash("sha256").update(material).digest("hex");
  const client = createSupabaseAdminClient() as unknown as SettingsDataClient;
  const { data, error } = await client.rpc("update_store_settings_server", {
    request: {
      actorId: input.actorId,
      mutationId,
      requestFingerprint,
      section: input.section,
      expectedRevision: input.expectedRevision,
      value: persistedValue,
    },
  });
  if (error) {
    const code = error.message?.match(/SETTINGS_[A-Z_]+/)?.[0];
    if (code === "SETTINGS_STALE_VERSION") throw new StoreSettingsError("SETTINGS_STALE_VERSION");
    if (code === "SETTINGS_FORBIDDEN") throw new StoreSettingsError("SETTINGS_FORBIDDEN");
    throw new StoreSettingsError("SETTINGS_SAVE_FAILED");
  }
  const result = data as { revision?: unknown; updatedAt?: unknown } | null;
  if (!result || typeof result.revision !== "number")
    throw new StoreSettingsError("SETTINGS_SAVE_FAILED");
  const saved = await getAdminStoreSettings();
  if (saved.revision !== result.revision) throw new StoreSettingsError("SETTINGS_SAVE_FAILED");
  return {
    revision: saved.revision,
    updatedAt: saved.updatedAt || stringValue(result.updatedAt),
    value: saved[input.section],
  };
}

export type { PaymentMethodConfig };
