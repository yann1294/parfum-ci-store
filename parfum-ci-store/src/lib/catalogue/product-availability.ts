import type { AdminProduct, AdminVariant } from "@/lib/catalogue/admin";
import type { PublicProductDto, PublicVariantDto } from "@/lib/catalogue/types";

export type AdminAvailabilitySummary =
  | "Brouillon"
  | "Archivé"
  | "Stock non configuré"
  | "Aucune variante active"
  | "Rupture de stock"
  | "Stock faible"
  | "En stock";

type VariantAvailabilityInput = Pick<AdminVariant, "active" | "availableQuantity" | "lowStockThreshold">;

export function getAdminAvailabilitySummary(input: {
  status: AdminProduct["status"];
  variants: VariantAvailabilityInput[];
}): AdminAvailabilitySummary {
  if (input.status === "DRAFT") return "Brouillon";
  if (input.status === "ARCHIVED") return "Archivé";
  if (input.variants.length === 0) return "Stock non configuré";

  const activeVariants = input.variants.filter((variant) => variant.active);
  if (activeVariants.length === 0) return "Aucune variante active";
  if (activeVariants.every((variant) => variant.availableQuantity <= 0)) return "Rupture de stock";
  if (
    activeVariants.some(
      (variant) =>
        variant.availableQuantity > 0 &&
        variant.availableQuantity <= Math.max(variant.lowStockThreshold, 0),
    )
  ) {
    return "Stock faible";
  }

  return "En stock";
}

export function getPublicAvailabilityStatus(variants: PublicVariantDto[]) {
  if (variants.some((variant) => variant.availableQuantity > 0 && variant.availabilityStatus === "IN_STOCK")) {
    return "IN_STOCK";
  }

  if (variants.some((variant) => variant.availableQuantity > 0 && variant.availabilityStatus === "LOW_STOCK")) {
    return "LOW_STOCK";
  }

  return "OUT_OF_STOCK";
}

export function publicAvailabilityLabel(status: PublicVariantDto["availabilityStatus"]) {
  return {
    IN_STOCK: "En stock",
    LOW_STOCK: "Stock faible",
    OUT_OF_STOCK: "Rupture de stock",
  }[status];
}

export function getPublicProductAvailabilityLabel(product: Pick<PublicProductDto, "variants">) {
  return publicAvailabilityLabel(getPublicAvailabilityStatus(product.variants));
}

