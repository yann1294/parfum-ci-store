import { z } from "zod";

import { normalizeCoteDIvoirePhoneResult } from "@/lib/orders/phone";
import {
  defaultPaymentConfigs,
  paymentSettingsSchema,
  supportedPaymentMethods,
  validatePaymentSettingsForSave,
} from "@/lib/orders/payment-settings-core";
import type { DeliveryMethod, PaymentMethod } from "@/lib/orders/display";

export const settingsSections = [
  "identity",
  "contact",
  "social",
  "payments",
  "delivery",
  "seo",
  "notifications",
  "availability",
] as const;
export type SettingsSection = (typeof settingsSections)[number];

const optionalText = (max: number) => z.string().trim().max(max).default("");
const optionalEmail = z.union([z.literal(""), z.email().max(254)]).default("");
const optionalHttpsUrl = (max = 500) =>
  z.union([
    z.literal(""),
    z
      .url()
      .max(max)
      .refine((value) => new URL(value).protocol === "https:", "Une URL HTTPS est requise."),
  ]);

function socialUrl(hosts: string[]) {
  return optionalHttpsUrl(300).refine((value) => {
    if (!value) return true;
    const hostname = new URL(value).hostname.toLowerCase().replace(/^www\./, "");
    return hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`));
  }, "Le domaine du réseau social ne correspond pas au champ.");
}

function normalizedOptionalPhone(value: string, ctx: z.RefinementCtx) {
  if (!value.trim()) return "";
  const result = normalizeCoteDIvoirePhoneResult(value, false);
  if (!result.ok) {
    ctx.addIssue({ code: "custom", message: "Saisissez un numéro ivoirien valide." });
    return z.NEVER;
  }
  return result.value;
}

const optionalCiPhone = z.string().max(40).transform(normalizedOptionalPhone);

export const businessHourSchema = z
  .object({
    label: z.string().trim().min(1).max(80),
    value: z.string().trim().min(1).max(160),
  })
  .strict();

export const identitySettingsSchema = z
  .object({
    storeName: z.string().trim().min(1).max(120),
    legalName: optionalText(180),
    logoUrl: optionalHttpsUrl(),
    primaryAddress: optionalText(500),
    secondaryAddress: optionalText(500),
  })
  .strict();

export const contactSettingsSchema = z
  .object({
    supportEmail: optionalEmail,
    contactEmail: optionalEmail,
    contactPhone: optionalCiPhone,
    whatsappNumber: optionalCiPhone,
    businessHours: z.array(businessHourSchema).max(14).default([]),
    responseTimeGuidance: optionalText(240),
  })
  .strict();

export const socialSettingsSchema = z
  .object({
    instagramUrl: socialUrl(["instagram.com"]),
    facebookUrl: socialUrl(["facebook.com", "fb.com"]),
    tiktokUrl: socialUrl(["tiktok.com"]),
  })
  .strict();

export const paymentSectionSchema = z
  .object({
    paymentMethodConfigs: paymentSettingsSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    const configs = { ...defaultPaymentConfigs([]), ...value.paymentMethodConfigs };
    for (const issue of validatePaymentSettingsForSave(configs)) {
      ctx.addIssue({
        code: "custom",
        path: ["paymentMethodConfigs", issue.method, issue.field],
        message: issue.message,
      });
    }
  });

export const deliveryMethodConfigSchema = z
  .object({
    label: z.string().trim().min(1).max(80),
    publicLabel: optionalText(180),
  })
  .strict();

export const deliveryZoneSettingsSchema = z
  .object({
    id: z.uuid(),
    name: z.string().trim().min(1).max(120),
    city: z.string().trim().min(1).max(120),
    commune: z.string().trim().min(1).max(120),
    feeXof: z.number().int().min(0).max(9_000_000_000),
    estimatedMinDays: z.number().int().min(0).max(365).nullable(),
    estimatedMaxDays: z.number().int().min(0).max(365).nullable(),
    enabled: z.boolean(),
    displayOrder: z.number().int().min(0).max(10_000),
  })
  .strict()
  .refine(
    (value) =>
      value.estimatedMinDays === null ||
      value.estimatedMaxDays === null ||
      value.estimatedMaxDays >= value.estimatedMinDays,
    {
      path: ["estimatedMaxDays"],
      message: "Le délai maximum doit être supérieur ou égal au minimum.",
    },
  );

export const deliverySettingsSchema = z
  .object({
    enabledDeliveryMethods: z
      .array(z.enum(["HOME_DELIVERY", "PICKUP"]))
      .min(1)
      .max(2),
    deliveryMethodConfigs: z
      .object({
        HOME_DELIVERY: deliveryMethodConfigSchema,
        PICKUP: deliveryMethodConfigSchema,
      })
      .strict(),
    defaultDeliveryFeeXof: z.number().int().min(0).max(9_000_000_000).nullable(),
    pickupFeeXof: z.number().int().min(0).max(9_000_000_000),
    freeDeliveryEnabled: z.boolean(),
    freeDeliveryThresholdXof: z.number().int().min(0).max(9_000_000_000).nullable(),
    deliveryEstimatedMinDays: z.number().int().min(0).max(365).nullable(),
    deliveryEstimatedMaxDays: z.number().int().min(0).max(365).nullable(),
    zones: z.array(deliveryZoneSettingsSchema).max(200),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.freeDeliveryEnabled && value.freeDeliveryThresholdXof === null) {
      ctx.addIssue({
        code: "custom",
        path: ["freeDeliveryThresholdXof"],
        message: "Le seuil est requis.",
      });
    }
    if (
      value.deliveryEstimatedMinDays !== null &&
      value.deliveryEstimatedMaxDays !== null &&
      value.deliveryEstimatedMaxDays < value.deliveryEstimatedMinDays
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["deliveryEstimatedMaxDays"],
        message: "Le délai maximum doit être supérieur ou égal au minimum.",
      });
    }
    const activeLocations = new Set<string>();
    for (const zone of value.zones.filter((item) => item.enabled)) {
      const key = `${normalizeLocation(zone.city)}::${normalizeLocation(zone.commune)}`;
      if (activeLocations.has(key)) {
        ctx.addIssue({
          code: "custom",
          path: ["zones"],
          message: "Deux zones actives ne peuvent pas viser la même ville et commune.",
        });
      }
      activeLocations.add(key);
    }
  });

export const seoSettingsSchema = z
  .object({
    siteTitle: optionalText(80),
    siteDescription: optionalText(320),
    ogImageUrl: optionalHttpsUrl(),
    canonicalSiteUrl: optionalHttpsUrl(300),
  })
  .strict();

export const notificationSettingsSchema = z
  .object({
    notificationEmail: optionalEmail,
  })
  .strict();

export const availabilitySettingsSchema = z
  .object({
    acceptingOrders: z.boolean(),
    maintenanceMode: z.boolean(),
    maintenanceMessage: optionalText(500),
    expectedReopeningAt: z.union([z.literal(""), z.iso.datetime({ offset: true })]),
  })
  .strict();

export const sectionSchemas = {
  identity: identitySettingsSchema,
  contact: contactSettingsSchema,
  social: socialSettingsSchema,
  payments: paymentSectionSchema,
  delivery: deliverySettingsSchema,
  seo: seoSettingsSchema,
  notifications: notificationSettingsSchema,
  availability: availabilitySettingsSchema,
} as const;

export type IdentitySettings = z.infer<typeof identitySettingsSchema>;
export type ContactSettings = z.infer<typeof contactSettingsSchema>;
export type SocialSettings = z.infer<typeof socialSettingsSchema>;
export type PaymentSectionSettings = z.infer<typeof paymentSectionSchema>;
export type DeliverySettings = z.infer<typeof deliverySettingsSchema>;
export type SeoSettings = z.infer<typeof seoSettingsSchema>;
export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;
export type AvailabilitySettings = z.infer<typeof availabilitySettingsSchema>;

export type SettingsSectionValues = {
  identity: IdentitySettings;
  contact: ContactSettings;
  social: SocialSettings;
  payments: PaymentSectionSettings;
  delivery: DeliverySettings;
  seo: SeoSettings;
  notifications: NotificationSettings;
  availability: AvailabilitySettings;
};

export type PublicStoreSettings = {
  storeName: string;
  legalName: string | null;
  logoUrl: string | null;
  contactEmail: string | null;
  supportEmail: string | null;
  contactPhone: string | null;
  whatsappNumber: string | null;
  primaryAddress: string | null;
  secondaryAddress: string | null;
  businessHours: Array<{ label: string; value: string }>;
  responseTimeGuidance: string | null;
  socialLinks: { instagram: string | null; facebook: string | null; tiktok: string | null };
  enabledPaymentMethods: PaymentMethod[];
  paymentMethodConfigs: Record<
    PaymentMethod,
    import("@/lib/orders/payment-settings-core").PaymentMethodConfig
  >;
  enabledDeliveryMethods: DeliveryMethod[];
  deliveryMethodConfigs: Record<DeliveryMethod, { label: string; publicLabel: string }>;
  defaultDeliveryFeeXof: number | null;
  pickupFeeXof: number;
  freeDeliveryEnabled: boolean;
  freeDeliveryThresholdXof: number | null;
  deliveryEstimatedMinDays: number | null;
  deliveryEstimatedMaxDays: number | null;
  seo: {
    siteTitle: string | null;
    siteDescription: string | null;
    ogImageUrl: string | null;
    canonicalSiteUrl: string | null;
  };
  acceptingOrders: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  expectedReopeningAt: string | null;
};

export function normalizeLocation(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, " ");
}

export function enabledPaymentsFromSection(value: PaymentSectionSettings) {
  const configs = { ...defaultPaymentConfigs([]), ...value.paymentMethodConfigs };
  return supportedPaymentMethods.filter((method) => configs[method].enabled);
}
