"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatXof } from "@/lib/catalogue/format";
import type { PublicProductDto, PublicVariantDto } from "@/lib/catalogue/types";
import { addCartLine } from "@/lib/storefront/cart";
import { readAttribution } from "@/lib/storefront/attribution";
import { absoluteUrl, buildWhatsAppUrl } from "@/config/site";
import { publicAvailabilityLabel } from "@/lib/catalogue/product-availability";

function availabilityLabel(status: PublicVariantDto["availabilityStatus"]) {
  return publicAvailabilityLabel(status);
}

export function ProductDetailClient({ product }: { product: PublicProductDto }) {
  const initialVariant = product.variants.find((variant) => variant.availableQuantity > 0) ?? product.variants[0];
  const [variantId, setVariantId] = useState(initialVariant?.id ?? "");
  const selectedVariant = product.variants.find((variant) => variant.id === variantId) ?? initialVariant;
  const [quantity, setQuantity] = useState(1);
  const [imageId, setImageId] = useState(product.images[0]?.id ?? "");
  const selectedImage = product.images.find((image) => image.id === imageId) ?? product.images[0];
  const availableMax = selectedVariant ? Math.max(selectedVariant.availableQuantity, 0) : 0;
  const canAdd = Boolean(selectedVariant && availableMax > 0);

  const whatsappUrl = useMemo(() => {
    if (!selectedVariant) return null;
    return buildWhatsAppUrl(
      [
        `Bonjour, je souhaite des informations sur ${product.name}.`,
        `Concentration: ${selectedVariant.concentration ?? "Non renseignée"}`,
        `Taille: ${selectedVariant.sizeMl} ml`,
        `Prix: ${formatXof(selectedVariant.priceXof)}`,
        `Lien: ${absoluteUrl(`/parfums/${product.slug}`)}`,
      ].join("\n"),
    );
  }, [product.name, product.slug, selectedVariant]);

  function updateVariant(nextVariantId: string) {
    const nextVariant = product.variants.find((variant) => variant.id === nextVariantId);
    setVariantId(nextVariantId);
    setQuantity((current) => Math.max(1, Math.min(current, Math.max(nextVariant?.availableQuantity ?? 1, 1))));
  }

  function addToCart() {
    if (!selectedVariant || !canAdd) return;
    addCartLine(
      {
        productId: product.id,
        variantId: selectedVariant.id,
        quantity: Math.min(quantity, availableMax),
      },
      readAttribution(),
    );
    toast.success("Produit ajouté au panier");
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_0.9fr]">
      <div className="grid gap-4">
        <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-surface-muted">
          {selectedImage?.publicUrl ? (
            <Image
              src={selectedImage.publicUrl}
              alt={selectedImage.altText}
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              priority
              className="object-cover"
            />
          ) : null}
        </div>
        {product.images.length > 1 ? (
          <div className="flex gap-3 overflow-x-auto pb-1" aria-label="Images du produit">
            {product.images.map((image) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setImageId(image.id)}
                className="relative size-20 shrink-0 overflow-hidden rounded-md border focus-visible:ring-3 focus-visible:ring-ring/50"
                aria-label={`Afficher ${image.altText}`}
              >
                {image.publicUrl ? (
                  <Image src={image.publicUrl} alt="" fill sizes="80px" className="object-cover" />
                ) : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <section className="grid content-start gap-6">
        <div>
          <p className="text-sm text-muted-foreground">{product.brand?.name ?? "Parfum CI"}</p>
          <h1 className="font-heading text-5xl font-semibold">{product.name}</h1>
          <p className="mt-4 text-muted-foreground">{product.shortDescription ?? product.description}</p>
        </div>

        <dl className="grid grid-cols-2 gap-4 rounded-lg border bg-surface p-4 text-sm">
          <div>
            <dt className="text-muted-foreground">Public cible</dt>
            <dd>{product.genderCategory ?? "Non renseigné"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Famille olfactive</dt>
            <dd>{product.fragranceFamily ?? "Non renseignée"}</dd>
          </div>
        </dl>

        <div className="grid gap-3">
          <label htmlFor="variant" className="text-sm font-medium">
            Variante
          </label>
          <select
            id="variant"
            value={variantId}
            onChange={(event) => updateVariant(event.currentTarget.value)}
            className="h-11 rounded-lg border border-input bg-background px-3"
          >
            {product.variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.sizeMl} ml · {variant.concentration ?? "Parfum"} · {availabilityLabel(variant.availabilityStatus)}
              </option>
            ))}
          </select>
        </div>

        {selectedVariant ? (
          <div className="grid gap-2">
            <p className="font-heading text-4xl font-semibold">{formatXof(selectedVariant.priceXof)}</p>
            {selectedVariant.compareAtPriceXof && selectedVariant.compareAtPriceXof > selectedVariant.priceXof ? (
              <p className="text-sm text-muted-foreground line-through">
                {formatXof(selectedVariant.compareAtPriceXof)}
              </p>
            ) : null}
            <Badge className="w-fit" variant={selectedVariant.availabilityStatus === "OUT_OF_STOCK" ? "destructive" : "secondary"}>
              {availabilityLabel(selectedVariant.availabilityStatus)}
            </Badge>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="grid gap-1 text-sm">
            Quantité
            <input
              type="number"
              min={1}
              max={Math.max(availableMax, 1)}
              value={quantity}
              onChange={(event) =>
                setQuantity(Math.max(1, Math.min(Number.parseInt(event.currentTarget.value, 10) || 1, Math.max(availableMax, 1))))
              }
              disabled={!canAdd}
              className="h-11 w-28 rounded-lg border border-input bg-background px-3"
            />
          </label>
          <div className="flex items-end gap-3">
            <Button type="button" onClick={addToCart} disabled={!canAdd}>
              Ajouter au panier
            </Button>
            {whatsappUrl ? (
              <a href={whatsappUrl} className={buttonVariants({ variant: "outline" })} target="_blank" rel="noreferrer">
                Demander sur WhatsApp
              </a>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
