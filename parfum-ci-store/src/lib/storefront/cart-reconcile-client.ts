"use client";

import type { CartState } from "@/lib/storefront/cart";
import type { ReconciledCart } from "@/lib/storefront/cart-reconciliation-core";

export async function reconcileCartClient(cart: CartState, signal?: AbortSignal) {
  const response = await fetch("/api/cart/reconcile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: cart.items }),
    cache: "no-store",
    signal,
  });
  const payload = (await response.json()) as ReconciledCart | { error?: { code: string; message: string } };
  if ("error" in payload && payload.error) throw new Error(payload.error.code);
  return payload as ReconciledCart;
}

