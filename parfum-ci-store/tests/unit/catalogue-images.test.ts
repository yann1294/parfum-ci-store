import { describe, expect, it } from "vitest";

import {
  assertSafeProductImageObjectPath,
  createProductImageObjectPath,
  detectImageMimeTypeFromMagicBytes,
  validateImageBytes,
  validateProductImageByteSize,
} from "@/lib/catalogue/images";

const productId = "22222222-2222-4222-8222-222222222222";

describe("product image helpers", () => {
  it("generates server-owned storage paths from MIME type", () => {
    expect(createProductImageObjectPath(productId, "image/jpeg")).toMatch(
      new RegExp(`^products/${productId}/[0-9a-f-]{36}\\.jpg$`),
    );
    expect(createProductImageObjectPath(productId, "image/webp")).toMatch(/\.webp$/);
  });

  it("rejects traversal and arbitrary paths", () => {
    expect(() => assertSafeProductImageObjectPath(productId, `products/${productId}/../x.jpg`)).toThrow(
      "Unsafe product image object path",
    );
    expect(() => assertSafeProductImageObjectPath(productId, `/products/${productId}/x.jpg`)).toThrow(
      "Unsafe product image object path",
    );
    expect(() => assertSafeProductImageObjectPath(productId, `products\\${productId}\\x.jpg`)).toThrow(
      "Unsafe product image object path",
    );
  });

  it("validates byte size", () => {
    expect(validateProductImageByteSize(1)).toBe(1);
    expect(() => validateProductImageByteSize(0)).toThrow("Invalid product image byte size");
    expect(() => validateProductImageByteSize(5 * 1024 * 1024 + 1)).toThrow(
      "Invalid product image byte size",
    );
  });

  it("detects supported magic bytes", () => {
    expect(detectImageMimeTypeFromMagicBytes(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(
      "image/jpeg",
    );
    expect(
      detectImageMimeTypeFromMagicBytes(
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).toBe("image/png");
    expect(
      detectImageMimeTypeFromMagicBytes(
        new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]),
      ),
    ).toBe("image/webp");
  });

  it("rejects MIME mismatches and active content", () => {
    expect(() => validateImageBytes(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), "image/png")).toThrow(
      "does not match",
    );
    expect(() => validateImageBytes(new TextEncoder().encode("<svg><script /></svg>"), "image/png")).toThrow(
      "active or executable",
    );
  });
});
