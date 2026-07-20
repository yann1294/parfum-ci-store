import type { AdminProduct } from "@/lib/catalogue/admin";

export function getPublicationReadiness(product: AdminProduct) {
  return [
    { label: "Nom requis", ok: product.name.trim().length > 0 },
    { label: "Description requise", ok: Boolean(product.description?.trim()) },
    {
      label: "Variante active requise",
      ok: product.variants.some((variant) => variant.active),
    },
    {
      label: "Prix de vente valide requis",
      ok: product.variants.some((variant) => variant.active && variant.priceXof > 0),
    },
    {
      label: "Image requise",
      ok: product.images.some((image) => image.active && image.approved && image.objectPath),
    },
  ];
}
