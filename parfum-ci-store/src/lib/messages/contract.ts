import { createHash } from "node:crypto";

import { z } from "zod";

import { normalizeCoteDIvoirePhone } from "@/lib/orders/phone";

const contactAttributionSchema = z
  .object({
    utmSource: z.string().trim().min(1).max(120).optional(),
    utmMedium: z.string().trim().min(1).max(120).optional(),
    utmCampaign: z.string().trim().min(1).max(120).optional(),
    utmTerm: z.string().trim().min(1).max(120).optional(),
    utmContent: z.string().trim().min(1).max(120).optional(),
    capturedAt: z.iso.datetime().optional(),
    expiresAt: z.iso.datetime().optional(),
  })
  .strict()
  .optional();

const optionalText = (max: number) =>
  z.preprocess((value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }, z.string().max(max).optional());

const contactSourceSchema = z.enum(["WEBSITE", "INSTAGRAM", "FACEBOOK", "TIKTOK", "WHATSAPP", "PHONE", "EMAIL", "OTHER"]);
const preferredContactMethodSchema = z.enum(["PHONE", "EMAIL", "WHATSAPP"]).optional();

export const contactProductContextSchema = z
  .object({
    productId: z.uuid().optional(),
    variantId: z.uuid().optional(),
    productSlug: optionalText(140),
  })
  .strict()
  .optional();

export const contactMessageRequestSchema = z
  .object({
    idempotencyKey: z.string().trim().regex(/^[A-Za-z0-9._:-]{32,180}$/),
    source: contactSourceSchema.default("WEBSITE"),
    name: z.string().trim().min(2).max(100),
    email: optionalText(254).pipe(z.email().optional()),
    phone: optionalText(40),
    whatsapp: optionalText(40),
    preferredContactMethod: preferredContactMethodSchema,
    subject: z.string().trim().min(3).max(160),
    message: z.string().trim().min(10).max(4000),
    consent: z.boolean(),
    honeypot: z.string().max(0).optional().default(""),
    productContext: contactProductContextSchema,
    orderNumber: optionalText(40),
    sourcePage: optionalText(240),
    sourceReference: optionalText(180),
    externalHandle: optionalText(120),
    assignedTo: z.uuid().optional(),
    actorId: z.uuid().optional(),
    attribution: contactAttributionSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.source === "WEBSITE" && !value.consent) {
      context.addIssue({ code: "custom", path: ["consent"], message: "Le consentement est requis." });
    }
    if (!value.email && !value.phone && !value.whatsapp && !value.externalHandle) {
      context.addIssue({
        code: "custom",
        path: ["phone"],
        message: "Ajoutez un numéro de téléphone ou une adresse e-mail.",
      });
    }
  });

export type ContactMessageRequest = z.infer<typeof contactMessageRequestSchema>;

export const contactMessageSuccessSchema = z
  .object({
    ok: z.literal(true),
    message: z.string(),
    reference: z.string().optional(),
  })
  .strict();

export type ContactMessageSuccess = z.infer<typeof contactMessageSuccessSchema>;

export type NormalizedContactMessageRequest = Omit<ContactMessageRequest, "phone" | "whatsapp" | "honeypot"> & {
  phone?: string;
  whatsapp?: string;
  requestFingerprint: string;
};

export function normalizeContactMessageRequest(input: ContactMessageRequest): NormalizedContactMessageRequest {
  const phone = input.phone ? normalizeCoteDIvoirePhone(input.phone) : undefined;
  const whatsapp = input.whatsapp ? normalizeCoteDIvoirePhone(input.whatsapp) : undefined;
  if (!input.email && !phone && !whatsapp && !input.externalHandle) throw new Error("MESSAGE_CONTACT_REQUIRED");

  const normalized: Omit<NormalizedContactMessageRequest, "requestFingerprint"> = {
    ...input,
    email: input.email?.toLowerCase(),
    phone,
    whatsapp,
    orderNumber: input.orderNumber?.toUpperCase(),
  };

  return {
    ...normalized,
    requestFingerprint: createContactMessageFingerprint(normalized),
  };
}

export function createContactMessageFingerprint(input: Omit<NormalizedContactMessageRequest, "requestFingerprint">) {
  const material = {
    source: input.source,
    name: input.name,
    email: input.email ?? null,
    phone: input.phone ?? null,
    whatsapp: input.whatsapp ?? null,
    preferredContactMethod: input.preferredContactMethod ?? null,
    subject: input.subject,
    message: input.message,
    productContext: input.productContext ?? null,
    orderNumber: input.orderNumber ?? null,
    sourceReference: input.sourceReference ?? null,
    externalHandle: input.externalHandle ?? null,
    actorId: input.actorId ?? null,
    assignedTo: input.assignedTo ?? null,
  };
  return createHash("sha256").update(JSON.stringify(material)).digest("hex");
}

export function contactErrorMessage(code: string) {
  const messages: Record<string, string> = {
    MESSAGE_INVALID_REQUEST: "Vérifiez les informations saisies.",
    MESSAGE_CONTACT_REQUIRED: "Ajoutez un numéro de téléphone ou une adresse e-mail.",
    MESSAGE_INVALID_PHONE: "Saisissez un numéro de téléphone ivoirien valide.",
    MESSAGE_CONSENT_REQUIRED: "Confirmez que nous pouvons utiliser ces informations pour vous répondre.",
    MESSAGE_RATE_LIMITED: "Trop de messages ont été envoyés. Réessayez plus tard.",
    MESSAGE_IDEMPOTENCY_CONFLICT: "Le contenu du message a changé. Rechargez le formulaire avant de réessayer.",
    MESSAGE_UNAUTHORIZED: "Action non autorisée.",
    MESSAGE_FAILED: "Le message n’a pas pu être envoyé. Réessayez.",
  };
  return messages[code] ?? messages.MESSAGE_FAILED;
}
