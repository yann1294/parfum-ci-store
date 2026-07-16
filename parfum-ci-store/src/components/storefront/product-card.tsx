import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatXof } from "@/lib/catalogue/format";
import type { PublicProductDto } from "@/lib/catalogue/types";

function availabilityLabel(status: string) {
  return {
    IN_STOCK: "En stock",
    LOW_STOCK: "Stock faible",
    OUT_OF_STOCK: "Rupture de stock",
  }[status] ?? "Disponibilité à confirmer";
}

export function productPriceLabel(product: PublicProductDto) {
  const prices = product.variants.map((variant) => variant.priceXof).filter((price) => price > 0);
  if (prices.length === 0) return "Prix à confirmer";
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatXof(min) : `${formatXof(min)} - ${formatXof(max)}`;
}

export function ProductCard({ product, priority = false }: { product: PublicProductDto; priority?: boolean }) {
  const image = product.images[0];
  const availability = product.variants.some((variant) => variant.availabilityStatus === "IN_STOCK")
    ? "IN_STOCK"
    : product.variants.some((variant) => variant.availabilityStatus === "LOW_STOCK")
      ? "LOW_STOCK"
      : "OUT_OF_STOCK";

  return (
    <Card className="overflow-hidden p-0">
      <Link href={`/parfums/${product.slug}`} className="block focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <div className="relative aspect-[4/5] bg-surface-muted">
          {image?.publicUrl ? (
            <Image
              src={image.publicUrl}
              alt={image.altText}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover"
              priority={priority}
            />
          ) : null}
        </div>
        <CardContent className="grid gap-2 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">{product.brand?.name ?? "Maison parfum"}</p>
              <h2 className="font-heading text-2xl font-semibold">{product.name}</h2>
            </div>
            {product.featured ? <Badge variant="secondary">Sélection</Badge> : null}
          </div>
          <p className="text-sm text-muted-foreground">{product.fragranceFamily ?? "Famille olfactive à découvrir"}</p>
          <p className="font-medium">{productPriceLabel(product)}</p>
          <p className="text-sm text-muted-foreground">{availabilityLabel(availability)}</p>
        </CardContent>
      </Link>
    </Card>
  );
}
