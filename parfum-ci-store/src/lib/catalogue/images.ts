import { randomUUID } from "node:crypto";

import {
  PRODUCT_IMAGE_EXTENSIONS,
  PRODUCT_IMAGE_MAX_BYTES,
  PRODUCT_IMAGE_MIME_TYPES,
  PRODUCT_IMAGES_BUCKET,
  type ProductImageMimeType,
} from "@/lib/catalogue/constants";

export function isSupportedProductImageMimeType(value: string): value is ProductImageMimeType {
  return PRODUCT_IMAGE_MIME_TYPES.includes(value as ProductImageMimeType);
}

export function assertSupportedProductImageMimeType(value: string): ProductImageMimeType {
  if (!isSupportedProductImageMimeType(value)) {
    throw new Error("Unsupported product image MIME type");
  }

  return value;
}

export function validateProductImageByteSize(byteSize: number) {
  if (!Number.isInteger(byteSize) || byteSize <= 0 || byteSize > PRODUCT_IMAGE_MAX_BYTES) {
    throw new Error("Invalid product image byte size");
  }

  return byteSize;
}

export function createProductImageObjectPath(productId: string, mimeType: string) {
  const supportedMimeType = assertSupportedProductImageMimeType(mimeType);
  const extension = PRODUCT_IMAGE_EXTENSIONS[supportedMimeType];

  return `products/${productId}/${randomUUID()}.${extension}`;
}

export function assertSafeProductImageObjectPath(productId: string, objectPath: string) {
  const safePattern = new RegExp(
    `^products/${productId}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(jpg|png|webp)$`,
  );
  const normalized = objectPath.toLowerCase();

  if (
    !safePattern.test(objectPath) ||
    objectPath.startsWith("/") ||
    objectPath.includes("\\") ||
    objectPath.includes("..") ||
    normalized.includes("%2e") ||
    normalized.includes("%2f") ||
    normalized.includes("%5c")
  ) {
    throw new Error("Unsafe product image object path");
  }

  return objectPath;
}

export async function readBlobBytes(blob: Blob) {
  return new Uint8Array(await blob.arrayBuffer());
}

export function detectImageMimeTypeFromMagicBytes(bytes: Uint8Array): ProductImageMimeType | null {
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

export function containsSuspiciousActiveContent(bytes: Uint8Array) {
  const prefix = new TextDecoder("utf-8", { fatal: false }).decode(bytes.slice(0, 1024));
  const lowerPrefix = prefix.toLowerCase();

  return (
    lowerPrefix.includes("<script") ||
    lowerPrefix.includes("<svg") ||
    lowerPrefix.includes("<html") ||
    lowerPrefix.includes("<!doctype") ||
    (bytes.length >= 2 && bytes[0] === 0x4d && bytes[1] === 0x5a)
  );
}

export function validateImageBytes(bytes: Uint8Array, expectedMimeType: ProductImageMimeType) {
  validateProductImageByteSize(bytes.byteLength);

  if (containsSuspiciousActiveContent(bytes)) {
    throw new Error("Product image contains active or executable content");
  }

  const detectedMimeType = detectImageMimeTypeFromMagicBytes(bytes);

  if (detectedMimeType !== expectedMimeType) {
    throw new Error("Product image content does not match the declared MIME type");
  }

  return detectedMimeType;
}

export function getProductImagePublicPath(objectPath: string) {
  return `${PRODUCT_IMAGES_BUCKET}/${objectPath}`;
}
