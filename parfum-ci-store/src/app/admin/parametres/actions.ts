"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/server";
import {
  deliveryQuoteRequestSchema,
  quoteDelivery,
  type DeliveryQuote,
} from "@/lib/settings/delivery";
import { StoreSettingsError, updateStoreSettings } from "@/lib/settings/service";
import { sectionSchemas, settingsSections, type SettingsSection } from "@/lib/settings/schemas";

export type SettingsActionState = {
  ok: boolean;
  message: string;
  section?: SettingsSection;
  revision?: number;
  updatedAt?: string;
  value?: unknown;
  conflict?: boolean;
};

const envelopeSchema = z
  .object({
    section: z.enum(settingsSections),
    expectedRevision: z.number().int().positive(),
    mutationId: z.uuid(),
    value: z.unknown(),
  })
  .strict();

function revalidateSettingsSection(section: SettingsSection) {
  revalidatePath("/admin/parametres");
  if (section === "identity") {
    revalidatePath("/", "layout");
  }
  if (section === "contact" || section === "social") {
    revalidatePath("/", "layout");
    revalidatePath("/contact");
    revalidatePath("/panier");
  }
  if (section === "payments") {
    revalidatePath("/commande");
  }
  if (section === "delivery") {
    revalidatePath("/commande");
    revalidatePath("/livraison");
  }
  if (section === "seo") {
    revalidatePath("/", "layout");
  }
  if (section === "availability") {
    revalidatePath("/", "layout");
    revalidatePath("/commande");
  }
}

export async function saveSettingsSection(
  _previous: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const staff = await requireRole(["OWNER", "ADMIN"]);
  const raw = formData.get("payload");
  if (typeof raw !== "string" || raw.length > 100_000)
    return { ok: false, message: "Requête invalide." };

  try {
    const envelope = envelopeSchema.parse(JSON.parse(raw));
    const value = sectionSchemas[envelope.section].parse(envelope.value);
    const saved = await updateStoreSettings({
      actorId: staff.id,
      section: envelope.section,
      expectedRevision: envelope.expectedRevision,
      mutationId: envelope.mutationId,
      value: value as never,
    });
    let cacheWarning = false;
    try {
      revalidateSettingsSection(envelope.section);
    } catch {
      cacheWarning = true;
      console.error("STORE_SETTINGS_REVALIDATION_FAILED", {
        section: envelope.section,
        revision: saved.revision,
      });
    }
    return {
      ok: true,
      message: cacheWarning
        ? "Paramètres enregistrés. L'actualisation publique peut prendre quelques instants."
        : "Paramètres enregistrés.",
      section: envelope.section,
      revision: saved.revision,
      updatedAt: saved.updatedAt,
      value: saved.value,
    };
  } catch (error) {
    if (error instanceof StoreSettingsError && error.code === "SETTINGS_STALE_VERSION") {
      return {
        ok: false,
        message:
          "Ces paramètres ont été modifiés dans une autre session. Rechargez la page avant de réessayer.",
        conflict: true,
      };
    }
    if (error instanceof z.ZodError) {
      return {
        ok: false,
        message: error.issues[0]?.message ?? "Vérifiez les champs signalés dans cette section.",
      };
    }
    if (error instanceof SyntaxError) {
      return { ok: false, message: "Vérifiez les champs signalés dans cette section." };
    }
    return { ok: false, message: "Les paramètres n'ont pas pu être enregistrés." };
  }
}

export type DeliveryPreviewState = { ok: boolean; message: string; quote?: DeliveryQuote };

export async function previewDeliveryQuote(
  _previous: DeliveryPreviewState,
  formData: FormData,
): Promise<DeliveryPreviewState> {
  await requireRole(["OWNER", "ADMIN"]);
  try {
    const value = deliveryQuoteRequestSchema.parse({
      deliveryMethod: formData.get("deliveryMethod"),
      city: formData.get("city"),
      commune: formData.get("commune"),
      subtotalXof: Number(formData.get("subtotalXof")),
    });
    return {
      ok: true,
      message: "Calcul effectué avec les règles enregistrées.",
      quote: await quoteDelivery(value),
    };
  } catch {
    return { ok: false, message: "Impossible de calculer cette livraison." };
  }
}
