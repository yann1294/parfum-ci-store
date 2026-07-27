"use client";

import { z } from "zod";

import type { DeliveryMethod, PaymentMethod } from "@/lib/orders/display";
import type { CartState } from "@/lib/storefront/cart";
import type { AttributionDto } from "@/lib/storefront/attribution";

export const checkoutOrderSuccessSchema = z
  .object({
    orderId: z.uuid().optional(),
    orderNumber: z.string().trim().min(1),
    orderStatus: z.string().trim().min(1),
    paymentStatus: z.string().trim().min(1),
    currency: z.literal("XOF"),
    subtotalXof: z.number().int().min(0),
    deliveryFeeXof: z.number().int().min(0),
    totalXof: z.number().int().min(0),
    createdAt: z.iso.datetime(),
    items: z.array(
      z
        .object({
          productName: z.string().trim().min(1),
          variantLabel: z.string().nullable(),
          quantity: z.number().int().min(1),
          unitPriceXof: z.number().int().min(0),
          lineTotalXof: z.number().int().min(0),
        })
        .strict(),
    ),
    nextStepCode: z.string().trim().min(1),
  })
  .strict();

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
