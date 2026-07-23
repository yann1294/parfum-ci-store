import { createHash } from "node:crypto";
import { z } from "zod";

import { CART_MAX_QUANTITY } from "@/lib/storefront/cart-constants";

export const GUEST_ORDER_MAX_LINES = 20;
export const GUEST_ORDER_MAX_BODY_BYTES = 20_000;

export const guestOrderErrorCodes = [
  "ORDER_INVALID_REQUEST",
  "ORDER_INVALID_PHONE",
  "ORDER_EMPTY_CART",
  "ORDER_TOO_MANY_LINES",
  "ORDER_ITEM_UNAVAILABLE",
  "ORDER_INSUFFICIENT_STOCK",
  "ORDER_INVENTORY_NOT_CONFIGURED",
  "ORDER_IDEMPOTENCY_CONFLICT",
  "ORDER_RATE_LIMITED",
  "ORDER_CREATION_FAILED",
  "ORDER_PAYMENT_METHOD_DISABLED",
  "ORDER_DELIVERY_METHOD_DISABLED",
] as const;

export type GuestOrderErrorCode = (typeof guestOrderErrorCodes)[number];

const textField = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), "Control characters are not allowed");

const optionalTextField = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), "Control characters are not allowed")
    .optional()
    .transform((value) => (value ? value : undefined));

const guestOrderAttributionSchema = z
  .object({
    utmSource: optionalTextField(120),
    utmMedium: optionalTextField(120),
    utmCampaign: optionalTextField(120),
    utmTerm: optionalTextField(120),
    utmContent: optionalTextField(120),
    capturedAt: z.iso.datetime().optional(),
    expiresAt: z.iso.datetime().optional(),
  })
  .strict();

export const guestOrderLineSchema = z
  .object({
    productId: z.uuid(),
    variantId: z.uuid(),
    quantity: z.number().int().min(1).max(Math.min(CART_MAX_QUANTITY, 20)),
  })
  .strict();

export const guestOrderRequestSchema = z
  .object({
    idempotencyKey: z.string().trim().min(32).max(160).regex(/^[A-Za-z0-9._:-]+$/),
    customer: z
      .object({
        fullName: textField(120),
        phone: textField(40),
        city: textField(80),
        commune: textField(120),
        email: optionalTextField(180),
        whatsapp: optionalTextField(40),
        address: optionalTextField(240),
        landmark: optionalTextField(180),
        deliveryInstructions: optionalTextField(500),
        customerNote: optionalTextField(500),
      })
      .strict(),
    deliveryMethod: z.enum(["HOME_DELIVERY", "PICKUP"]),
    paymentMethod: z.enum([
      "CASH_ON_DELIVERY",
      "ORANGE_MONEY",
      "MTN_MOMO",
      "WAVE",
      "MOOV_MONEY",
      "BANK_TRANSFER",
      "PAY_IN_STORE",
    ]),
    lines: z.array(guestOrderLineSchema).min(1).max(GUEST_ORDER_MAX_LINES),
    attribution: guestOrderAttributionSchema.optional(),
    honeypot: z.string().max(0).optional().default(""),
  })
  .strict();

export type GuestOrderRequestInput = z.input<typeof guestOrderRequestSchema>;
export type GuestOrderRequest = z.infer<typeof guestOrderRequestSchema>;

export type NormalizedGuestOrderRequest = Omit<GuestOrderRequest, "customer" | "lines" | "honeypot"> & {
  customer: GuestOrderRequest["customer"] & {
    phone: string;
    whatsapp?: string;
    email?: string;
  };
  lines: Array<z.infer<typeof guestOrderLineSchema>>;
};

export type GuestOrderConfirmation = {
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
  currency: "XOF";
  subtotalXof: number;
  deliveryFeeXof: number;
  totalXof: number;
  createdAt: string;
  items: Array<{
    productName: string;
    variantLabel: string | null;
    quantity: number;
    unitPriceXof: number;
    lineTotalXof: number;
  }>;
  nextStepCode: string;
};

export function normalizeCoteDIvoirePhone(value: string, required = true) {
  const trimmed = value.trim();
  if (!trimmed) {
    if (required) throw new Error("ORDER_INVALID_PHONE");
    return undefined;
  }

  if (/[^0-9+\s().-]/.test(trimmed)) throw new Error("ORDER_INVALID_PHONE");
  const digits = trimmed.replace(/[^\d+]/g, "");
  let normalizedDigits: string;

  if (digits.startsWith("+225")) {
    normalizedDigits = digits.slice(4);
  } else if (digits.startsWith("225")) {
    normalizedDigits = digits.slice(3);
  } else {
    normalizedDigits = digits;
  }

  if (!/^[0-9]{10}$/.test(normalizedDigits)) throw new Error("ORDER_INVALID_PHONE");
  if (!/^(01|05|07|21|25|27)/.test(normalizedDigits)) throw new Error("ORDER_INVALID_PHONE");

  return `+225${normalizedDigits}`;
}

export function normalizeGuestOrderRequest(input: GuestOrderRequest): NormalizedGuestOrderRequest {
  const merged = new Map<string, z.infer<typeof guestOrderLineSchema>>();
  const phone = normalizeCoteDIvoirePhone(input.customer.phone);
  if (!phone) throw new Error("ORDER_INVALID_PHONE");

  for (const line of input.lines) {
    const existing = merged.get(line.variantId);
    merged.set(line.variantId, {
      productId: line.productId,
      variantId: line.variantId,
      quantity: (existing?.quantity ?? 0) + line.quantity,
    });
  }

  const lines = [...merged.values()].sort((a, b) => a.variantId.localeCompare(b.variantId));
  if (lines.length === 0) throw new Error("ORDER_EMPTY_CART");
  if (lines.length > GUEST_ORDER_MAX_LINES) throw new Error("ORDER_TOO_MANY_LINES");
  if (lines.some((line) => line.quantity < 1 || line.quantity > 20)) throw new Error("ORDER_INVALID_REQUEST");

  const email = input.customer.email?.trim().toLowerCase();

  return {
    idempotencyKey: input.idempotencyKey.trim(),
    customer: {
      ...input.customer,
      email: email || undefined,
      phone,
      whatsapp: input.customer.whatsapp ? normalizeCoteDIvoirePhone(input.customer.whatsapp, false) : undefined,
    },
    deliveryMethod: input.deliveryMethod,
    paymentMethod: input.paymentMethod,
    attribution: input.attribution,
    lines,
  };
}

export function createGuestOrderFingerprint(input: NormalizedGuestOrderRequest) {
  const material = {
    customer: {
      fullName: input.customer.fullName,
      phone: input.customer.phone,
      email: input.customer.email ?? null,
      whatsapp: input.customer.whatsapp ?? null,
      city: input.customer.city,
      commune: input.customer.commune,
      address: input.customer.address ?? null,
      landmark: input.customer.landmark ?? null,
      deliveryInstructions: input.customer.deliveryInstructions ?? null,
      customerNote: input.customer.customerNote ?? null,
    },
    deliveryMethod: input.deliveryMethod,
    paymentMethod: input.paymentMethod,
    lines: input.lines,
  };

  return createHash("sha256").update(JSON.stringify(material)).digest("hex");
}

export function publicOrderError(code: GuestOrderErrorCode, status = 400) {
  return {
    status,
    body: {
      error: {
        code,
        message:
          code === "ORDER_RATE_LIMITED"
            ? "Trop de tentatives. Réessayez dans un instant."
            : code === "ORDER_INVALID_PHONE"
              ? "Le numéro de téléphone n'est pas valide."
              : "La commande n'a pas pu être créée. Vérifiez le panier et réessayez.",
      },
    },
  };
}
