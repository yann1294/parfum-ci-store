"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";

import { readCart } from "@/lib/storefront/cart";

export function CartSummaryLink() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const update = () => setCount(readCart().lines.reduce((sum, line) => sum + line.quantity, 0));
    update();
    window.addEventListener("parfum-ci-cart-change", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("parfum-ci-cart-change", update);
      window.removeEventListener("storage", update);
    };
  }, []);

  return (
    <Link
      href="/panier"
      className="inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm focus-visible:ring-3 focus-visible:ring-ring/50"
      aria-label={`Ouvrir le panier, ${count} article(s)`}
    >
      <ShoppingBag className="size-4" aria-hidden="true" />
      <span>{count}</span>
    </Link>
  );
}
