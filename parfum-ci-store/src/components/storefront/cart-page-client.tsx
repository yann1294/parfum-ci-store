"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { formatXof } from "@/lib/catalogue/format";
import { readCart, updateCartQuantity, type CartState } from "@/lib/storefront/cart";

export function CartPageClient() {
  const [cart, setCart] = useState<CartState>({ lines: [], attribution: null });

  useEffect(() => {
    const update = () => setCart(readCart());
    update();
    window.addEventListener("parfum-ci-cart-change", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("parfum-ci-cart-change", update);
      window.removeEventListener("storage", update);
    };
  }, []);

  const subtotal = useMemo(
    () => cart.lines.reduce((sum, line) => sum + line.unitPriceXof * line.quantity, 0),
    [cart.lines],
  );

  if (cart.lines.length === 0) {
    return (
      <div className="rounded-lg border bg-surface p-8 text-center">
        <h1 className="font-heading text-4xl">Votre panier est vide</h1>
        <p className="mt-2 text-muted-foreground">Ajoutez un parfum depuis le catalogue.</p>
        <Link href="/catalogue" className={buttonVariants({ className: "mt-5" })}>
          Voir le catalogue
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <section className="grid gap-4">
        <h1 className="font-heading text-5xl">Panier</h1>
        {cart.lines.map((line) => (
          <article key={line.variantId} className="grid gap-4 rounded-lg border bg-surface p-4 sm:grid-cols-[6rem_1fr_auto]">
            <div className="relative aspect-square overflow-hidden rounded-md bg-surface-muted">
              {line.imageUrl ? <Image src={line.imageUrl} alt={line.imageAlt} fill sizes="96px" className="object-cover" /> : null}
            </div>
            <div>
              <Link href={`/parfums/${line.productSlug}`} className="font-medium hover:underline">
                {line.productName}
              </Link>
              <p className="text-sm text-muted-foreground">
                {line.sizeMl} ml · {line.concentration ?? "Parfum"}
              </p>
              <p className="mt-2">{formatXof(line.unitPriceXof)}</p>
            </div>
            <label className="grid gap-1 text-sm">
              Quantité
              <input
                type="number"
                min={0}
                max={20}
                value={line.quantity}
                onChange={(event) => updateCartQuantity(line.variantId, Number.parseInt(event.currentTarget.value, 10) || 0)}
                className="h-10 w-24 rounded-lg border border-input bg-background px-3"
              />
            </label>
          </article>
        ))}
      </section>
      <aside className="h-fit rounded-lg border bg-surface p-5">
        <h2 className="font-heading text-3xl">Résumé</h2>
        <div className="mt-4 flex justify-between">
          <span>Sous-total</span>
          <span>{formatXof(subtotal)}</span>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Le checkout et la réservation de stock seront traités dans la phase commande. Les prix et disponibilités
          seront revérifiés côté serveur.
        </p>
        <Link href="/catalogue" className={buttonVariants({ variant: "outline", className: "mt-5 w-full" })}>
          Continuer les achats
        </Link>
      </aside>
    </div>
  );
}
