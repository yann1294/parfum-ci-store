"use client";

import type { AttributionDto } from "@/lib/storefront/attribution";

export type CartLine = {
  variantId: string;
  productSlug: string;
  productName: string;
  imageUrl: string | null;
  imageAlt: string;
  sizeMl: number;
  concentration: string | null;
  unitPriceXof: number;
  quantity: number;
};

export type CartState = {
  lines: CartLine[];
  attribution: AttributionDto | null;
};

const STORAGE_KEY = "parfum-ci:cart";

export function readCart(): CartState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { lines: [], attribution: null };
    const parsed = JSON.parse(raw) as CartState;
    return { lines: Array.isArray(parsed.lines) ? parsed.lines : [], attribution: parsed.attribution ?? null };
  } catch {
    return { lines: [], attribution: null };
  }
}

export function writeCart(state: CartState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent("parfum-ci-cart-change", { detail: state }));
}

export function addCartLine(line: CartLine, attribution: AttributionDto | null) {
  const current = readCart();
  const existing = current.lines.find((item) => item.variantId === line.variantId);
  const lines = existing
    ? current.lines.map((item) =>
        item.variantId === line.variantId
          ? { ...item, quantity: Math.min(item.quantity + line.quantity, 20) }
          : item,
      )
    : [...current.lines, line];

  writeCart({ lines, attribution: current.attribution ?? attribution });
  return lines;
}

export function updateCartQuantity(variantId: string, quantity: number) {
  const current = readCart();
  const safeQuantity = Math.max(Math.min(Math.floor(quantity), 20), 0);
  const lines = current.lines
    .map((line) => (line.variantId === variantId ? { ...line, quantity: safeQuantity } : line))
    .filter((line) => line.quantity > 0);
  writeCart({ ...current, lines });
}

export function clearCartForTests() {
  window.localStorage.removeItem(STORAGE_KEY);
}
