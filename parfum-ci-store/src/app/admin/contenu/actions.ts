"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auditCatalogueEvent } from "@/lib/audit/catalogue";
import type { CatalogueAuditAction } from "@/lib/audit/catalogue";
import { requireRole } from "@/lib/auth/server";
import {
  storeContentPageKeys,
  type StoreContentPageKey,
} from "@/lib/storefront/content-schemas";
import { updateStorefrontContent } from "@/lib/storefront/content";

export type ContentActionState = {
  ok: boolean;
  message: string;
};

const pageKeySchema = z.enum(storeContentPageKeys);

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseRows(value: string, columns: string[], maxRows: number) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, maxRows)
    .map((line) => {
      const parts = line.split("|").map((part) => part.trim());
      return Object.fromEntries(columns.map((column, index) => [column, parts[index] ?? ""]));
    });
}

function parseList(value: string, maxRows: number) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, maxRows);
}

function valueForPage(pageKey: StoreContentPageKey, formData: FormData) {
  switch (pageKey) {
    case "home":
      return {
        heroTitle: text(formData, "heroTitle"),
        heroSubtitle: text(formData, "heroSubtitle"),
        primaryCtaLabel: text(formData, "primaryCtaLabel"),
        secondaryCtaLabel: text(formData, "secondaryCtaLabel"),
        trustPoints: parseRows(text(formData, "trustPoints"), ["title", "description"], 6),
        orderingSteps: parseRows(text(formData, "orderingSteps"), ["title", "description"], 6),
        deliveryTeaser: text(formData, "deliveryTeaser"),
        socialCtaCopy: text(formData, "socialCtaCopy"),
        seoTitle: text(formData, "seoTitle"),
        seoDescription: text(formData, "seoDescription"),
      };
    case "about":
      return {
        pageTitle: text(formData, "pageTitle"),
        introText: text(formData, "introText"),
        brandStory: text(formData, "brandStory"),
        mission: text(formData, "mission"),
        values: parseList(text(formData, "values"), 8),
        imageUrl: text(formData, "imageUrl"),
        seoTitle: text(formData, "seoTitle"),
        seoDescription: text(formData, "seoDescription"),
      };
    case "contact":
      return {
        pageTitle: text(formData, "pageTitle"),
        introText: text(formData, "introText"),
        telephone: text(formData, "telephone"),
        whatsappNumber: text(formData, "whatsappNumber"),
        email: text(formData, "email"),
        address: text(formData, "address"),
        openingHours: parseRows(text(formData, "openingHours"), ["label", "value"], 14),
        mapUrl: text(formData, "mapUrl"),
        whatsappCtaLabel: text(formData, "whatsappCtaLabel"),
        emailCtaLabel: text(formData, "emailCtaLabel"),
        phoneCtaLabel: text(formData, "phoneCtaLabel"),
        seoTitle: text(formData, "seoTitle"),
        seoDescription: text(formData, "seoDescription"),
      };
    case "delivery":
      return {
        pageTitle: text(formData, "pageTitle"),
        introText: text(formData, "introText"),
        zones: parseRows(text(formData, "zones"), ["name", "fee", "timeframe", "description"], 12),
        freeDeliveryConditions: text(formData, "freeDeliveryConditions"),
        pickupInformation: text(formData, "pickupInformation"),
        mobileMoneyDescription: text(formData, "mobileMoneyDescription"),
        cashOnDeliveryConditions: text(formData, "cashOnDeliveryConditions"),
        orderConfirmationProcess: text(formData, "orderConfirmationProcess"),
        faq: parseRows(text(formData, "faq"), ["question", "answer"], 12),
        seoTitle: text(formData, "seoTitle"),
        seoDescription: text(formData, "seoDescription"),
      };
    case "social":
      return {
        instagramUrl: text(formData, "instagramUrl"),
        facebookUrl: text(formData, "facebookUrl"),
        tiktokUrl: text(formData, "tiktokUrl"),
        whatsappNumber: text(formData, "whatsappNumber"),
        socialCtaCopy: text(formData, "socialCtaCopy"),
      };
  }
}

function revalidateContent(pageKey: StoreContentPageKey) {
  if (pageKey === "home") revalidatePath("/");
  if (pageKey === "about") revalidatePath("/a-propos");
  if (pageKey === "contact") revalidatePath("/contact");
  if (pageKey === "delivery") revalidatePath("/livraison");
  if (pageKey === "social") {
    revalidatePath("/");
    revalidatePath("/catalogue");
    revalidatePath("/a-propos");
    revalidatePath("/contact");
    revalidatePath("/livraison");
    revalidatePath("/panier");
  }
  revalidatePath("/admin/contenu");
}

function auditAction(pageKey: StoreContentPageKey) {
  const actions: Record<StoreContentPageKey, CatalogueAuditAction> = {
    home: "STOREFRONT_HOME_CONTENT_UPDATED",
    about: "STOREFRONT_ABOUT_CONTENT_UPDATED",
    contact: "STOREFRONT_CONTACT_CONTENT_UPDATED",
    delivery: "STOREFRONT_DELIVERY_CONTENT_UPDATED",
    social: "STOREFRONT_SOCIAL_CONTENT_UPDATED",
  };
  return actions[pageKey];
}

export async function updateContentSection(
  _previousState: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const staff = await requireRole(["OWNER", "ADMIN"]);
  const parsedPageKey = pageKeySchema.safeParse(text(formData, "pageKey"));

  if (!parsedPageKey.success) {
    return { ok: false, message: "Section invalide." };
  }

  try {
    const value = valueForPage(parsedPageKey.data, formData);
    await updateStorefrontContent(parsedPageKey.data, value, staff.id);
    await auditCatalogueEvent({
      actorId: staff.id,
      action: auditAction(parsedPageKey.data),
      resourceType: "store_content",
      metadata: { page_key: parsedPageKey.data },
    });
    revalidateContent(parsedPageKey.data);
    return { ok: true, message: "Contenu enregistré." };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false, message: "Vérifiez les champs de cette section." };
    }
    return { ok: false, message: "Le contenu n'a pas pu être enregistré." };
  }
}
