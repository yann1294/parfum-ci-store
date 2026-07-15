import { PRODUCT_IMAGES_BUCKET } from "@/lib/catalogue/constants";
import { getAvailabilityStatus, getAvailableQuantity } from "@/lib/catalogue/availability";
import type {
  BrandRow,
  CategoryRow,
  ProductImageRow,
  ProductRow,
  PublicBrandDto,
  PublicCategoryDto,
  PublicProductDto,
  PublicProductImageDto,
  PublicVariantDto,
  StaffVariantDto,
  VariantRow,
} from "@/lib/catalogue/types";

export function toPublicBrandDto(row: Pick<BrandRow, "id" | "name" | "slug" | "description">) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
  } satisfies PublicBrandDto;
}

export function toPublicCategoryDto(
  row: Pick<CategoryRow, "id" | "parent_id" | "name" | "slug" | "description">,
) {
  return {
    id: row.id,
    parentId: row.parent_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
  } satisfies PublicCategoryDto;
}

export function toPublicVariantDto(
  row: Pick<
    VariantRow,
    | "id"
    | "sku"
    | "size_ml"
    | "concentration"
    | "price_xof"
    | "compare_at_price_xof"
    | "stock_on_hand"
    | "reserved_quantity"
    | "low_stock_threshold"
  >,
) {
  return {
    id: row.id,
    sku: row.sku,
    sizeMl: row.size_ml,
    concentration: row.concentration,
    priceXof: row.price_xof,
    compareAtPriceXof: row.compare_at_price_xof,
    availableQuantity: getAvailableQuantity(row.stock_on_hand, row.reserved_quantity),
    availabilityStatus: getAvailabilityStatus(
      row.stock_on_hand,
      row.reserved_quantity,
      row.low_stock_threshold,
    ),
  } satisfies PublicVariantDto;
}

export function toStaffVariantDto(row: VariantRow) {
  return {
    ...toPublicVariantDto(row),
    productId: row.product_id,
    active: row.active,
    stockOnHand: row.stock_on_hand,
    reservedQuantity: row.reserved_quantity,
    lowStockThreshold: row.low_stock_threshold,
    costPriceXof: row.cost_price_xof,
  } satisfies StaffVariantDto;
}

export function toPublicProductImageDto(row: ProductImageRow) {
  const objectPath = row.object_path ?? row.storage_path;

  if (!objectPath) {
    throw new Error("Product image row is missing an object path");
  }

  return {
    id: row.id,
    productId: row.product_id,
    bucketId: row.bucket_id ?? PRODUCT_IMAGES_BUCKET,
    objectPath,
    altText: row.alt_text,
    sortOrder: row.sort_order,
    isPrimary: row.is_primary ?? false,
    mimeType: row.mime_type ?? null,
    byteSize: row.byte_size ?? null,
  } satisfies PublicProductImageDto;
}

export function toPublicProductDto(input: {
  product: ProductRow;
  brand: BrandRow | null;
  category: CategoryRow | null;
  variants: VariantRow[];
  images: ProductImageRow[];
}) {
  return {
    id: input.product.id,
    name: input.product.name,
    slug: input.product.slug,
    shortDescription: input.product.short_description,
    description: input.product.description,
    fragranceFamily: input.product.fragrance_family,
    topNotes: input.product.top_notes,
    heartNotes: input.product.heart_notes,
    baseNotes: input.product.base_notes,
    genderCategory: input.product.gender_category,
    featured: input.product.featured,
    brand: input.brand ? toPublicBrandDto(input.brand) : null,
    category: input.category ? toPublicCategoryDto(input.category) : null,
    variants: input.variants
      .filter((variant) => variant.active && variant.price_xof > 0)
      .map(toPublicVariantDto),
    images: input.images
      .filter((image) => image.active && image.approved && (image.object_path ?? image.storage_path))
      .map(toPublicProductImageDto),
  } satisfies PublicProductDto;
}
