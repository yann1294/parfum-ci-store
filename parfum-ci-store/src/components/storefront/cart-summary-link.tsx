"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { formatXof } from "@/lib/catalogue/format";
import { readCart, type CartState } from "@/lib/storefront/cart";
import type { ReconciledCart } from "@/lib/storefront/cart-reconciliation-core";

async function reconcileDrawerCart(cart: CartState) {
  const response = await fetch("/api/cart/reconcile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: cart.items }),
    cache: "no-store",
  });
  const payload = (await response.json()) as ReconciledCart | { error?: { code: string } };
  if ("error" in payload && payload.error) throw new Error(payload.error.code);
  return payload as ReconciledCart;
}

function releaseDrawerSideEffects() {
  document.body.style.removeProperty("overflow");
  document.body.style.removeProperty("padding-right");
}

export function CartSummaryLink() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [cart, setCart] = useState<CartState | null>(null);
  const [snapshot, setSnapshot] = useState<ReconciledCart | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const updateCount = useCallback(() => {
    setCart(readCart());
  }, []);

  const validate = useCallback(async () => {
    const current = readCart();
    setCart(current);
    if (current.items.length === 0) {
      setSnapshot(null);
      return;
    }

    setLoading(true);
    setError(false);
    try {
      setSnapshot(await reconcileDrawerCart(current));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(updateCount, 0);
    window.addEventListener("parfum-ci-cart-change", updateCount);
    window.addEventListener("storage", updateCount);
    return () => {
      window.clearTimeout(initial);
      window.removeEventListener("parfum-ci-cart-change", updateCount);
      window.removeEventListener("storage", updateCount);
    };
  }, [updateCount]);

  const count = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  function handleViewCart() {
    setOpen(false);
    releaseDrawerSideEffects();
    router.push("/panier");
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) void validate();
        if (!nextOpen) releaseDrawerSideEffects();
      }}
    >
      <SheetTrigger render={<Button type="button" variant="outline" size="sm" />}>
        <ShoppingBag className="size-4" aria-hidden="true" />
        <span>{count}</span>
        <span className="sr-only">Ouvrir le panier, {count} article(s)</span>
      </SheetTrigger>
      <SheetContent side="right" className="w-[min(26rem,calc(100vw-1rem))] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Panier</SheetTitle>
        </SheetHeader>
        <div className="grid gap-3 px-4">
          {loading ? <p className="text-sm text-muted-foreground">Vérification du panier...</p> : null}
          {error ? (
            <div className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive">
              Le panier n&apos;a pas pu être vérifié.
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => void validate()}>
                Réessayer
              </Button>
            </div>
          ) : null}
          {count === 0 ? (
            <p className="text-sm text-muted-foreground">Votre panier est vide.</p>
          ) : null}
          {snapshot?.lines.slice(0, 4).map((line) => (
            <article key={line.variantId} className="grid grid-cols-[4rem_1fr] gap-3 rounded-lg border p-3">
              <div className="relative aspect-square overflow-hidden rounded-md bg-surface-muted">
                {line.imageUrl ? <Image src={line.imageUrl} alt={line.imageAlt} fill sizes="64px" className="object-cover" /> : null}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium">{line.productName}</p>
                <p className="text-xs text-muted-foreground">{line.variantLabel}</p>
                <p className="text-sm">{line.unitPriceXof ? formatXof(line.unitPriceXof) : "Indisponible"}</p>
                {!line.orderable ? <p className="text-xs text-destructive">Indisponible</p> : null}
              </div>
            </article>
          ))}
          {snapshot && snapshot.lines.length > 4 ? (
            <p className="text-sm text-muted-foreground">Voir tous les articles sur la page panier.</p>
          ) : null}
        </div>
        <SheetFooter className="border-t">
          <div className="flex items-center justify-between text-sm">
            <span>Sous-total</span>
            <span>{formatXof(snapshot?.subtotalXof ?? 0)}</span>
          </div>
          <Button type="button" className="w-full" onClick={handleViewCart}>
            Voir le panier
          </Button>
          <Link
            href="/catalogue"
            onClick={() => {
              setOpen(false);
              releaseDrawerSideEffects();
            }}
            className={buttonVariants({ variant: "outline", className: "w-full" })}
          >
            Continuer mes achats
          </Link>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
