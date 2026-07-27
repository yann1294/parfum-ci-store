"use client";

import type { GuestOrderConfirmation } from "@/lib/orders/guest-order-contract";
import type { CartState } from "@/lib/storefront/cart";
import type { DeliveryMethod, PaymentMethod, SafeConfirmation } from "@/lib/orders/display";

export const CHECKOUT_CONFIRMATION_STORAGE_PREFIX = "parfum-ci:order-confirmation:v1:";
export const CHECKOUT_CONFIRMATION_TTL_MS = 30 * 60 * 1000;

export function createCheckoutIdempotencyKey() {
  const random = new Uint8Array(16);
  crypto.getRandomValues(random);
  const entropy = [...random].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `checkout-${crypto.randomUUID()}-${entropy}`;
}

export function createWhatsAppOrderIntentKey() {
  const random = new Uint8Array(16);
  crypto.getRandomValues(random);
  const entropy = [...random].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `whatsapp-${crypto.randomUUID()}-${entropy}`;
}

export function cartMaterialSignature(cart: CartState | null) {
  if (!cart) return "empty";
  return cart.items
    .map((item) => `${item.variantId}:${item.productId}:${item.quantity}`)
    .sort()
    .join("|");
}

function confirmationStorageKey(orderNumber: string) {
  return `${CHECKOUT_CONFIRMATION_STORAGE_PREFIX}${orderNumber}`;
}

export function storeSafeConfirmation(input: {
  confirmation: Omit<GuestOrderConfirmation, "orderId">;
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethod;
  customerPhone: string;
  customerEmail?: string;
}) {
  const now = new Date();
  const safe: SafeConfirmation = {
    orderNumber: input.confirmation.orderNumber,
    orderStatus: input.confirmation.orderStatus,
    paymentStatus: input.confirmation.paymentStatus,
    currency: input.confirmation.currency,
    subtotalXof: input.confirmation.subtotalXof,
    deliveryFeeXof: input.confirmation.deliveryFeeXof,
    totalXof: input.confirmation.totalXof,
    createdAt: input.confirmation.createdAt,
    items: input.confirmation.items,
    nextStepCode: input.confirmation.nextStepCode,
    deliveryMethod: input.deliveryMethod,
    paymentMethod: input.paymentMethod,
    customerPhone: input.customerPhone,
    customerEmail: input.customerEmail,
    storedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + CHECKOUT_CONFIRMATION_TTL_MS).toISOString(),
  };

  try {
    sessionStorage.setItem(confirmationStorageKey(safe.orderNumber), JSON.stringify(safe));
  } catch {
    if (process.env.NODE_ENV !== "production") console.warn("ORDER_CONFIRMATION_SESSION_UNAVAILABLE");
  }

  return safe;
}

export function readSafeConfirmation(orderNumber: string) {
  try {
    const raw = sessionStorage.getItem(confirmationStorageKey(orderNumber));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SafeConfirmation;
    if (!parsed || parsed.orderNumber !== orderNumber || new Date(parsed.expiresAt).getTime() < Date.now()) {
      sessionStorage.removeItem(confirmationStorageKey(orderNumber));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearSafeConfirmation(orderNumber: string) {
  try {
    sessionStorage.removeItem(confirmationStorageKey(orderNumber));
  } catch {
    // Session storage is best-effort confirmation recovery only.
  }
}
