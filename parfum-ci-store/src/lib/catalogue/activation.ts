import type { ProductImageRow, ProductRow, VariantRow } from "@/lib/catalogue/types";

export function assertProductCanActivate(input: {
  product: Pick<ProductRow, "name" | "description" | "status">;
  variants: Array<Pick<VariantRow, "active" | "price_xof">>;
  images: Array<Pick<ProductImageRow, "active" | "approved" | "storage_path"> & {
    object_path?: string | null;
    mime_type?: string | null;
    byte_size?: number | null;
  }>;
}) {
  if (input.product.status === "ARCHIVED") {
    throw new Error("Archived products cannot be activated");
  }

  if (!input.product.name.trim()) {
    throw new Error("Active products require a name");
  }

  if (!input.product.description?.trim()) {
    throw new Error("Active products require a description");
  }

  if (!input.variants.some((variant) => variant.active && variant.price_xof > 0)) {
    throw new Error("Active products require at least one active variant with a positive price");
  }

  if (
    !input.images.some(
      (image) =>
        image.active &&
        image.approved &&
        Boolean(image.object_path ?? image.storage_path) &&
        (!image.mime_type || ["image/jpeg", "image/png", "image/webp"].includes(image.mime_type)) &&
        (!image.byte_size || image.byte_size > 0),
    )
  ) {
    throw new Error("Active products require at least one validated image");
  }
}
