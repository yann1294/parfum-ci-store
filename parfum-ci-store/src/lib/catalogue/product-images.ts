import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PRODUCT_IMAGES_BUCKET } from "@/lib/catalogue/constants";
import { toPublicProductImageDto } from "@/lib/catalogue/mappers";
import type { ProductImageRow, PublicProductImageDto } from "@/lib/catalogue/types";

const IMAGE_PUBLIC_COLUMNS =
  "id, product_id, storage_path, image_url, alt_text, sort_order, approved, active, created_at, updated_at" as const;

type ProductImageRowWithPhase4Columns = ProductImageRow & {
  bucket_id?: string;
  object_path?: string | null;
  is_primary?: boolean;
  mime_type?: string | null;
  byte_size?: number | null;
  width?: number | null;
  height?: number | null;
};

export async function listPublicImagesForProducts(productIds: string[]) {
  if (productIds.length === 0) {
    return new Map<string, PublicProductImageDto[]>();
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("product_images")
    .select(IMAGE_PUBLIC_COLUMNS)
    .in("product_id", productIds)
    .eq("active", true)
    .eq("approved", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  const byProduct = new Map<string, PublicProductImageDto[]>();

  for (const row of (data ?? []) as ProductImageRowWithPhase4Columns[]) {
    const image = toPublicProductImageDto({
      ...row,
      bucket_id: row.bucket_id ?? PRODUCT_IMAGES_BUCKET,
      object_path: row.object_path ?? row.storage_path,
      is_primary: row.is_primary ?? false,
      mime_type: row.mime_type ?? null,
      byte_size: row.byte_size ?? null,
    });
    const images = byProduct.get(image.productId) ?? [];
    images.push(image);
    byProduct.set(image.productId, images);
  }

  return byProduct;
}
