"use client";

import { z } from "zod";

import { attributionSchema, type AttributionDto } from "@/lib/storefront/attribution";
import {
  CART_MAX_ITEMS,
  CART_MAX_QUANTITY,
  CART_RECONCILIATION_STALE_MS,
  CART_SCHEMA_VERSION,
  CART_STORAGE_KEY,
} from "@/lib/storefront/cart-constants";

export {
  CART_MAX_ITEMS,
  CART_MAX_QUANTITY,
  CART_RECONCILIATION_STALE_MS,
  CART_SCHEMA_VERSION,
  CART_STORAGE_KEY,
};

const uuid = z.uuid();

const cartItemSchema = z
  .object({
    productId: uuid,
    variantId: uuid,
    quantity: z.number().int().min(1).max(CART_MAX_QUANTITY),
  })
  .strict();

const persistedCartV2Schema = z
  .object({
    version: z.literal(CART_SCHEMA_VERSION),
    items: z.array(cartItemSchema).max(CART_MAX_ITEMS),
    attribution: attributionSchema.nullish(),
    updatedAt: z.iso.datetime(),
  })
  .strict();

const legacyLineSchema = z
  .object({
    productId: uuid.optional(),
    variantId: uuid,
    quantity: z.number().int().min(1).max(CART_MAX_QUANTITY),
  })
  .passthrough();

const legacyCartSchema = z
  .object({
    lines: z.array(legacyLineSchema).max(CART_MAX_ITEMS).optional(),
    items: z.array(legacyLineSchema).max(CART_MAX_ITEMS).optional(),
    attribution: attributionSchema.nullish(),
  })
  .passthrough();

export type CartItem = z.infer<typeof cartItemSchema>;
export type PersistedCartV2 = z.infer<typeof persistedCartV2Schema>;
export type CartState = PersistedCartV2;

export type AddCartLineInput = {
  productId: string;
  variantId: string;
  quantity: number;
};

function nowIso() {
  return new Date().toISOString();
}

function defaultCart(attribution: AttributionDto | null = null): CartState {
  return {
    version: CART_SCHEMA_VERSION,
    items: [],
    attribution,
    updatedAt: nowIso(),
  };
}

function sanitizeQuantity(value: unknown) {
  const number = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  return Number.isFinite(number) ? Math.max(1, Math.min(Math.floor(number), CART_MAX_QUANTITY)) : 1;
}

function mergeItems(items: CartItem[]) {
  const merged = new Map<string, CartItem>();

  for (const item of items) {
    const existing = merged.get(item.variantId);
    merged.set(item.variantId, {
      productId: item.productId,
      variantId: item.variantId,
      quantity: Math.min((existing?.quantity ?? 0) + item.quantity, CART_MAX_QUANTITY),
    });
  }

  return [...merged.values()].slice(0, CART_MAX_ITEMS);
}

export function parsePersistedCart(raw: string | null): CartState {
  if (!raw) return defaultCart();

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return defaultCart();

    const current = persistedCartV2Schema.safeParse(parsed);
    if (current.success) {
      return { ...current.data, items: mergeItems(current.data.items) };
    }

    const legacy = legacyCartSchema.safeParse(parsed);
    if (!legacy.success) return defaultCart();

    const legacyItems = legacy.data.items ?? legacy.data.lines ?? [];
    const items = legacyItems.flatMap((item) => {
      if (!item.productId) return [];
      return [{ productId: item.productId, variantId: item.variantId, quantity: sanitizeQuantity(item.quantity) }];
    });

    return {
      version: CART_SCHEMA_VERSION,
      items: mergeItems(items),
      attribution: legacy.data.attribution ?? null,
      updatedAt: nowIso(),
    };
  } catch {
    return defaultCart();
  }
}

export function serializeCart(state: CartState) {
  return JSON.stringify({
    version: CART_SCHEMA_VERSION,
    items: mergeItems(state.items),
    attribution: state.attribution ?? null,
    updatedAt: state.updatedAt,
  } satisfies CartState);
}

function dispatchCartChange(state: CartState) {
  window.dispatchEvent(new CustomEvent("parfum-ci-cart-change", { detail: state }));
}

export function readCart(): CartState {
  if (typeof window === "undefined") return defaultCart();
  return parsePersistedCart(window.localStorage.getItem(CART_STORAGE_KEY));
}

export function writeCart(state: CartState) {
  const next = {
    ...state,
    version: CART_SCHEMA_VERSION,
    items: mergeItems(state.items),
    updatedAt: nowIso(),
  } satisfies CartState;

  try {
    window.localStorage.setItem(CART_STORAGE_KEY, serializeCart(next));
  } catch {
    if (process.env.NODE_ENV !== "production") {
      console.warn("CART_PERSISTENCE_UNAVAILABLE");
    }
  }

  dispatchCartChange(next);
  return next;
}

export function addCartLine(line: AddCartLineInput, attribution: AttributionDto | null) {
  const current = readCart();
  const parsed = cartItemSchema.safeParse({
    productId: line.productId,
    variantId: line.variantId,
    quantity: sanitizeQuantity(line.quantity),
  });
  if (!parsed.success) return current.items;

  const next = writeCart({
    ...current,
    attribution: current.attribution ?? attribution,
    items: mergeItems([...current.items, parsed.data]),
  });

  return next.items;
}

export function updateCartQuantity(variantId: string, quantity: number) {
  const current = readCart();
  const safeQuantity = Math.max(Math.min(Math.floor(quantity), CART_MAX_QUANTITY), 0);
  const items = current.items
    .map((item) => (item.variantId === variantId ? { ...item, quantity: safeQuantity } : item))
    .filter((item) => item.quantity > 0);
  return writeCart({ ...current, items });
}

export function removeCartLine(variantId: string) {
  const current = readCart();
  return writeCart({ ...current, items: current.items.filter((item) => item.variantId !== variantId) });
}

export function clearCart() {
  const current = readCart();
  return writeCart({ ...current, items: [] });
}

export function clearCartForTests() {
  window.localStorage.removeItem(CART_STORAGE_KEY);
}
