import type { Database, Json } from "@/types/database.types";

export type ProductStatus = Database["public"]["Enums"]["product_status"];

export type BrandRow = Database["public"]["Tables"]["brands"]["Row"];
export type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
export type ProductRow = Database["public"]["Tables"]["products"]["Row"];
export type VariantRow = Database["public"]["Tables"]["product_variants"]["Row"];
export type ProductImageRow = Database["public"]["Tables"]["product_images"]["Row"] & {
  bucket_id?: string;
  object_path?: string | null;
  is_primary?: boolean;
  mime_type?: string | null;
  byte_size?: number | null;
  width?: number | null;
  height?: number | null;
  created_by?: string | null;
};

export type AvailabilityStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

export type PublicBrandDto = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

export type PublicCategoryDto = PublicBrandDto & {
  parentId: string | null;
};

export type PublicVariantDto = {
  id: string;
  sku: string;
  sizeMl: number;
  concentration: string | null;
  priceXof: number;
  compareAtPriceXof: number | null;
  availableQuantity: number;
  availabilityStatus: AvailabilityStatus;
};

export type PublicProductImageDto = {
  id: string;
  productId: string;
  bucketId: string;
  objectPath: string;
  altText: string;
  sortOrder: number;
  isPrimary: boolean;
  mimeType: string | null;
  byteSize: number | null;
};

export type PublicProductDto = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  fragranceFamily: string | null;
  topNotes: string[];
  heartNotes: string[];
  baseNotes: string[];
  genderCategory: string | null;
  featured: boolean;
  brand: PublicBrandDto | null;
  category: PublicCategoryDto | null;
  variants: PublicVariantDto[];
  images: PublicProductImageDto[];
};

export type StaffVariantDto = PublicVariantDto & {
  productId: string;
  active: boolean;
  stockOnHand: number;
  reservedQuantity: number;
  lowStockThreshold: number;
  costPriceXof: number | null;
};

export type StaffProductDto = Omit<PublicProductDto, "variants"> & {
  status: ProductStatus;
  variants: StaffVariantDto[];
};

export type CatalogueServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string };

export type AuditMetadata = Record<string, Json>;
