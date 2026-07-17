import { z } from "zod";

const optionalText = z.string().trim().max(1200).optional().default("");
const shortText = z.string().trim().max(180).optional().default("");
const urlText = z.union([z.literal(""), z.url()]).optional().default("");
const emailText = z.union([z.literal(""), z.email()]).optional().default("");

const titledItemSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(500).optional().default(""),
  })
  .strict();

export const openingHourSchema = z
  .object({
    label: z.string().trim().min(1).max(80),
    value: z.string().trim().min(1).max(160),
  })
  .strict();

export const deliveryZoneSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    fee: z.string().trim().max(120).optional().default(""),
    timeframe: z.string().trim().max(120).optional().default(""),
    description: z.string().trim().max(500).optional().default(""),
  })
  .strict();

export const faqItemSchema = z
  .object({
    question: z.string().trim().min(1).max(180),
    answer: z.string().trim().min(1).max(700),
  })
  .strict();

export const homeContentSchema = z
  .object({
    heroTitle: z.string().trim().min(1).max(160),
    heroSubtitle: z.string().trim().min(1).max(500),
    primaryCtaLabel: z.string().trim().min(1).max(80),
    secondaryCtaLabel: shortText,
    trustPoints: z.array(titledItemSchema).max(6).default([]),
    orderingSteps: z.array(titledItemSchema).max(6).default([]),
    deliveryTeaser: optionalText,
    socialCtaCopy: optionalText,
    seoTitle: shortText,
    seoDescription: optionalText,
  })
  .strict();

export const aboutContentSchema = z
  .object({
    pageTitle: z.string().trim().min(1).max(120),
    introText: optionalText,
    brandStory: optionalText,
    mission: optionalText,
    values: z.array(z.string().trim().min(1).max(180)).max(8).default([]),
    imageUrl: urlText,
    seoTitle: shortText,
    seoDescription: optionalText,
  })
  .strict();

export const contactContentSchema = z
  .object({
    pageTitle: z.string().trim().min(1).max(120),
    introText: optionalText,
    telephone: shortText,
    whatsappNumber: shortText,
    email: emailText,
    address: optionalText,
    openingHours: z.array(openingHourSchema).max(14).default([]),
    mapUrl: urlText,
    whatsappCtaLabel: z.string().trim().min(1).max(80).default("Écrire sur WhatsApp"),
    emailCtaLabel: z.string().trim().min(1).max(80).default("Envoyer un e-mail"),
    phoneCtaLabel: z.string().trim().min(1).max(80).default("Appeler"),
    seoTitle: shortText,
    seoDescription: optionalText,
  })
  .strict();

export const deliveryContentSchema = z
  .object({
    pageTitle: z.string().trim().min(1).max(120),
    introText: optionalText,
    zones: z.array(deliveryZoneSchema).max(12).default([]),
    freeDeliveryConditions: optionalText,
    pickupInformation: optionalText,
    mobileMoneyDescription: optionalText,
    cashOnDeliveryConditions: optionalText,
    orderConfirmationProcess: optionalText,
    faq: z.array(faqItemSchema).max(12).default([]),
    seoTitle: shortText,
    seoDescription: optionalText,
  })
  .strict();

export const socialContentSchema = z
  .object({
    instagramUrl: urlText,
    facebookUrl: urlText,
    tiktokUrl: urlText,
    whatsappNumber: shortText,
    socialCtaCopy: optionalText,
  })
  .strict();

export const storeContentSchemas = {
  home: homeContentSchema,
  about: aboutContentSchema,
  contact: contactContentSchema,
  delivery: deliveryContentSchema,
  social: socialContentSchema,
} as const;

export const storeContentPageKeys = ["home", "about", "contact", "delivery", "social"] as const;

export type StoreContentPageKey = (typeof storeContentPageKeys)[number];
export type HomeContent = z.infer<typeof homeContentSchema>;
export type AboutContent = z.infer<typeof aboutContentSchema>;
export type ContactContent = z.infer<typeof contactContentSchema>;
export type DeliveryContent = z.infer<typeof deliveryContentSchema>;
export type SocialContent = z.infer<typeof socialContentSchema>;

export type StorefrontContent = {
  home: HomeContent;
  about: AboutContent;
  contact: ContactContent;
  delivery: DeliveryContent;
  social: SocialContent;
  updatedAt: Partial<Record<StoreContentPageKey, string>>;
};
