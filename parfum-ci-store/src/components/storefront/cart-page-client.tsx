"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { formatXof } from "@/lib/catalogue/format";
import { publicAvailabilityLabel } from "@/lib/catalogue/product-availability";
import { absoluteUrl, buildWhatsAppUrlForNumber, normalizeWhatsAppNumber, siteConfig } from "@/config/site";
import { clearCart, readCart, updateCartQuantity, type CartLine, type CartState } from "@/lib/storefront/cart";

function cartLineAvailability(line: CartLine) {
  return publicAvailabilityLabel(line.availabilityStatus ?? "IN_STOCK");
}

export function buildCartWhatsAppMessage(cart: CartState, subtotal: number) {
  return [
    "Bonjour, je souhaite commander ces articles :",
    ...cart.lines.flatMap((line, index) => [
      "",
      `${index + 1}. ${line.productName}`,
      `Taille: ${line.sizeMl} ml`,
      `Concentration: ${line.concentration ?? "Non renseignée"}`,
      `Quantité: ${line.quantity}`,
      `Prix unitaire: ${formatXof(line.unitPriceXof)}`,
      `Total ligne: ${formatXof(line.unitPriceXof * line.quantity)}`,
      `Lien: ${absoluteUrl(`/parfums/${line.productSlug}`)}`,
    ]),
    "",
    `Sous-total panier: ${formatXof(subtotal)}`,
    "Merci de confirmer la disponibilité finale, les frais de livraison et les instructions de paiement.",
  ].join("\n");
}

export function CartPageClient({ whatsappNumber }: { whatsappNumber?: string }) {
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
  const normalizedWhatsAppNumber = normalizeWhatsAppNumber(whatsappNumber) ?? siteConfig.whatsappNumber;
  const whatsappUrl = useMemo(
    () => buildWhatsAppUrlForNumber(normalizedWhatsAppNumber, buildCartWhatsAppMessage(cart, subtotal)),
    [cart, normalizedWhatsAppNumber, subtotal],
  );

  if (cart.lines.length === 0) {
    return (
      <div className="rounded-lg border bg-surface p-8 text-center">
        <h1 className="font-heading text-4xl">Votre panier est vide</h1>
        <p className="mt-2 text-muted-foreground">Ajoutez un parfum depuis le catalogue.</p>
        <Link href="/catalogue" className={buttonVariants({ className: "mt-5" })}>
          Continuer mes achats
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
              <p className="mt-1 text-sm text-muted-foreground">{cartLineAvailability(line)}</p>
              {line.availabilityStatus === "OUT_OF_STOCK" ? (
                <p className="mt-1 text-sm text-destructive">Disponibilité à confirmer avant commande.</p>
              ) : null}
            </div>
            <div className="grid gap-3">
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
              <Button type="button" variant="outline" size="sm" onClick={() => updateCartQuantity(line.variantId, 0)}>
                Retirer
              </Button>
            </div>
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
          La disponibilité finale et les modalités de paiement seront confirmées avant validation de la commande.
        </p>
        <div className="mt-5 grid gap-3">
          {whatsappUrl ? (
            <a href={whatsappUrl} target="_blank" rel="noreferrer" className={buttonVariants({ className: "w-full" })}>
              Commander via WhatsApp
            </a>
          ) : null}
          <Link href="/catalogue" className={buttonVariants({ variant: "outline", className: "w-full" })}>
            Continuer mes achats
          </Link>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (window.confirm("Vider le panier ?")) clearCart();
            }}
          >
            Vider le panier
          </Button>
        </div>
      </aside>
    </div>
  );
}
