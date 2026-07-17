import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { siteConfig } from "@/config/site";
import {
  aboutContentSchema,
  contactContentSchema,
  deliveryContentSchema,
  homeContentSchema,
  socialContentSchema,
  storeContentPageKeys,
  storeContentSchemas,
  type StoreContentPageKey,
  type StorefrontContent,
} from "@/lib/storefront/content-schemas";

type StoreContentRow = {
  page_key: StoreContentPageKey;
  content: unknown;
  updated_at: string | null;
};

function asUntypedClient(client: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  return client as unknown as {
    from(table: "store_content"): {
      select(columns: string): {
        in(column: string, values: readonly string[]): Promise<{ data: StoreContentRow[] | null; error: { code?: string; message?: string } | null }>;
      };
      upsert(
        value: {
          page_key: StoreContentPageKey;
          content: unknown;
          public_readable: boolean;
          updated_by: string;
        },
        options: { onConflict: string },
      ): {
        select(columns: string): {
          single(): Promise<{ data: StoreContentRow | null; error: { code?: string; message?: string } | null }>;
        };
      };
    };
  };
}

function defaultContent(): StorefrontContent {
  return {
    home: homeContentSchema.parse({
      heroTitle: siteConfig.heroTitle,
      heroSubtitle: siteConfig.heroDescription,
      primaryCtaLabel: siteConfig.primaryCta,
      secondaryCtaLabel: siteConfig.whatsappNumber ? "Écrire sur WhatsApp" : "",
      trustPoints: siteConfig.trustPoints.map((point) => ({ title: point, description: "" })).filter((point) => point.title),
      orderingSteps: siteConfig.orderingSteps.map((step, index) => ({ title: `Étape ${index + 1}`, description: step })),
      deliveryTeaser: siteConfig.deliveryCopy,
      socialCtaCopy: "",
      seoTitle: "Parfumerie premium en Côte d'Ivoire",
      seoDescription: siteConfig.heroDescription,
    }),
    about: aboutContentSchema.parse({
      pageTitle: "À propos",
      introText: siteConfig.description,
      brandStory: "",
      mission: "",
      values: [],
      imageUrl: "",
      seoTitle: "À propos",
      seoDescription: siteConfig.description,
    }),
    contact: contactContentSchema.parse({
      pageTitle: "Contact",
      introText: "Contactez la boutique par les canaux configurés.",
      telephone: "",
      whatsappNumber: siteConfig.whatsappNumber ?? "",
      email: siteConfig.contactEmail ?? "",
      address: "",
      openingHours: [],
      mapUrl: "",
      whatsappCtaLabel: "Écrire sur WhatsApp",
      emailCtaLabel: "Envoyer un e-mail",
      phoneCtaLabel: "Appeler",
      seoTitle: "Contact",
      seoDescription: "Coordonnées de contact de la boutique.",
    }),
    delivery: deliveryContentSchema.parse({
      pageTitle: "Livraison et paiement",
      introText: siteConfig.deliveryCopy,
      zones: [],
      freeDeliveryConditions: "",
      pickupInformation: "",
      mobileMoneyDescription: siteConfig.paymentCopy,
      cashOnDeliveryConditions: "",
      orderConfirmationProcess: "La disponibilité finale et les modalités de paiement seront confirmées avant validation de la commande.",
      faq: [],
      seoTitle: "Livraison et paiement",
      seoDescription: "Informations de livraison et de paiement.",
    }),
    social: socialContentSchema.parse({
      instagramUrl: siteConfig.socialLinks.find((link) => link.label === "Instagram")?.href ?? "",
      facebookUrl: siteConfig.socialLinks.find((link) => link.label === "Facebook")?.href ?? "",
      tiktokUrl: siteConfig.socialLinks.find((link) => link.label === "TikTok")?.href ?? "",
      whatsappNumber: siteConfig.whatsappNumber ?? "",
      socialCtaCopy: "",
    }),
    updatedAt: {},
  };
}

export async function getStorefrontContent(): Promise<StorefrontContent> {
  const fallback = defaultContent();
  const supabase = asUntypedClient(await createSupabaseServerClient());
  const { data, error } = await supabase
    .from("store_content")
    .select("page_key, content, updated_at")
    .in("page_key", storeContentPageKeys);

  if (error || !data) {
    return fallback;
  }

  const content = { ...fallback, updatedAt: { ...fallback.updatedAt } };

  for (const row of data) {
    const schema = storeContentSchemas[row.page_key];
    const parsed = schema.safeParse(row.content);
    if (parsed.success) {
      Object.assign(content, { [row.page_key]: parsed.data });
      if (row.updated_at) content.updatedAt[row.page_key] = row.updated_at;
    }
  }

  return content;
}

export async function updateStorefrontContent(pageKey: StoreContentPageKey, value: unknown, actorId: string) {
  const schema = storeContentSchemas[pageKey];
  const parsed = schema.parse(value);
  const supabase = asUntypedClient(await createSupabaseServerClient());
  const { data, error } = await supabase
    .from("store_content")
    .upsert(
      {
        page_key: pageKey,
        content: parsed,
        public_readable: true,
        updated_by: actorId,
      },
      { onConflict: "page_key" },
    )
    .select("page_key, content, updated_at")
    .single();

  if (error || !data) {
    throw new Error("STORE_CONTENT_UPDATE_FAILED");
  }

  return data;
}

