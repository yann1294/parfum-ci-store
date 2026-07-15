export const PRODUCT_IMAGES_BUCKET = "product-images" as const;

export const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const PRODUCT_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type ProductImageMimeType = (typeof PRODUCT_IMAGE_MIME_TYPES)[number];

export const PRODUCT_IMAGE_EXTENSIONS: Record<ProductImageMimeType, "jpg" | "png" | "webp"> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const MAX_CATALOGUE_PAGE_SIZE = 48;
export const DEFAULT_CATALOGUE_PAGE_SIZE = 24;
