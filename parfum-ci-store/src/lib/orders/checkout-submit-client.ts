"use client";

import { z } from "zod";

import type { DeliveryMethod, PaymentMethod } from "@/lib/orders/display";
import type { CartState } from "@/lib/storefront/cart";
import type { AttributionDto } from "@/lib/storefront/attribution";

const safeInteger = z.preprocess((value) => {
  if (typeof value === "string" && /^\d+$/.test(value)) return Number.parseInt(value, 10);
  return value;
}, z.number().int().min(0).max(Number.MAX_SAFE_INTEGER));

const positiveInteger = z.preprocess((value) => {
  if (typeof value === "string" && /^\d+$/.test(value)) return Number.parseInt(value, 10);
  return value;
}, z.number().int().min(1).max(Number.MAX_SAFE_INTEGER));

const nullableSafeInteger = z.preprocess((value) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number.parseInt(value, 10);
  return value;
}, z.number().int().min(0).max(Number.MAX_SAFE_INTEGER));

const checkoutOrderSuccessObjectSchema = z
  .object({
    orderId: z.uuid().optional(),
    orderNumber: z.string().trim().min(1),
    orderStatus: z.string().trim().min(1),
    paymentStatus: z.string().trim().min(1),
    currency: z.literal("XOF"),
    subtotalXof: safeInteger,
    deliveryFeeXof: nullableSafeInteger,
    totalXof: nullableSafeInteger,
    createdAt: z.iso.datetime(),
    items: z.array(
      z
        .object({
          productName: z.string().trim().min(1),
          variantLabel: z.string().nullable(),
          quantity: positiveInteger,
          unitPriceXof: safeInteger,
          lineTotalXof: safeInteger,
        })
        .strict(),
    ),
    nextStepCode: z.string().trim().min(1),
  })
  .strict();

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function getFirst(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    if (record[key] !== undefined) return record[key];
  }
  return undefined;
}

function normalizeSuccessItem(item: unknown) {
  const record = asRecord(item);
  if (!record) return item;

  return {
    productName: getFirst(record, "productName", "product_name"),
    variantLabel: getFirst(record, "variantLabel", "variant_label", "variantName", "variant_name") ?? null,
    quantity: getFirst(record, "quantity"),
    unitPriceXof: getFirst(record, "unitPriceXof", "unit_price_xof"),
    lineTotalXof: getFirst(record, "lineTotalXof", "line_total_xof", "totalPriceXof", "total_price_xof"),
  };
}

function unwrapSuccessPayload(payload: unknown) {
  const record = asRecord(payload);
  if (!record) return payload;

  const data = record.data;
  if (asRecord(data) && !("orderNumber" in record) && !("order_number" in record)) return data;

  const body = asRecord(record.body);
  if (body?.data && !("orderNumber" in record) && !("order_number" in record)) return body.data;

  return payload;
}

export function normalizeCheckoutOrderSuccessPayload(payload: unknown) {
  const unwrapped = unwrapSuccessPayload(payload);
  const record = asRecord(unwrapped);
  if (!record) return unwrapped;

  const items = getFirst(record, "items", "orderItems", "order_items");

  return {
    orderId: getFirst(record, "orderId", "order_id"),
    orderNumber: getFirst(record, "orderNumber", "order_number"),
    orderStatus: getFirst(record, "orderStatus", "order_status", "status"),
    paymentStatus: getFirst(record, "paymentStatus", "payment_status"),
    currency: getFirst(record, "currency") ?? "XOF",
    subtotalXof: getFirst(record, "subtotalXof", "subtotal_xof"),
    deliveryFeeXof: getFirst(record, "deliveryFeeXof", "delivery_fee_xof") ?? 0,
    totalXof: getFirst(record, "totalXof", "total_xof") ?? getFirst(record, "subtotalXof", "subtotal_xof"),
    createdAt: getFirst(record, "createdAt", "created_at"),
    items: Array.isArray(items) ? items.map(normalizeSuccessItem) : [],
    nextStepCode: getFirst(record, "nextStepCode", "next_step_code") ?? getFirst(record, "orderStatus", "order_status", "status"),
  };
}

export const checkoutOrderSuccessSchema = z.preprocess(
  normalizeCheckoutOrderSuccessPayload,
  checkoutOrderSuccessObjectSchema,
);

export const checkoutOrderErrorSchema = z
  .object({
    error: z
      .object({
        code: z.string().trim().min(1),
        message: z.string().optional(),
      })
      .strict(),
  })
  .strict();

export type CheckoutOrderSuccess = z.infer<typeof checkoutOrderSuccessSchema>;

type CheckoutRequestInput = {
  idempotencyKey: string;
  customer: {
    fullName: string;
    phone: string;
    city: string;
    commune: string;
    email?: string;
    whatsapp?: string;
    address?: string;
    landmark?: string;
    deliveryInstructions?: string;
    customerNote?: string;
  };
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethod;
  cart: CartState;
  attribution: AttributionDto | null;
  honeypot: string;
};

function optionalText(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function withoutUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}

export function buildGuestOrderRequest(input: CheckoutRequestInput) {
  return {
    idempotencyKey: input.idempotencyKey,
    customer: withoutUndefined({
      fullName: input.customer.fullName,
      phone: input.customer.phone,
      city: input.customer.city,
      commune: input.customer.commune,
      email: optionalText(input.customer.email),
      whatsapp: optionalText(input.customer.whatsapp),
      address: optionalText(input.customer.address),
      landmark: optionalText(input.customer.landmark),
      deliveryInstructions: optionalText(input.customer.deliveryInstructions),
      customerNote: optionalText(input.customer.customerNote),
    }),
    deliveryMethod: input.deliveryMethod,
    paymentMethod: input.paymentMethod,
    lines: input.cart.items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
    })),
    attribution: input.attribution ?? undefined,
    honeypot: input.honeypot,
  };
}
