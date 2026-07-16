import { readFileSync } from "node:fs";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ImageManager } from "@/components/admin/catalogue/image-manager";
import type { AdminProduct } from "@/lib/catalogue/admin";

const refresh = vi.fn();
const prepareImageUploadForProduct = vi.fn();
const finalizeImageUploadForProduct = vi.fn();
const uploadToSignedUrl = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock("@/app/admin/catalogue-actions", () => ({
  deleteImageForProduct: vi.fn(),
  prepareImageUploadForProduct: (...args: unknown[]) => prepareImageUploadForProduct(...args),
  finalizeImageUploadForProduct: (...args: unknown[]) => finalizeImageUploadForProduct(...args),
}));

vi.mock("@/lib/supabase/browser", () => ({
  createSupabaseBrowserClient: () => ({
    storage: {
      from: () => ({ uploadToSignedUrl }),
    },
  }),
}));

const product: AdminProduct = {
  id: "product-id",
  name: "Musc Royal",
  slug: "musc-royal",
  shortDescription: null,
  description: "Description",
  fragranceFamily: null,
  topNotes: [],
  heartNotes: [],
  baseNotes: [],
  genderCategory: null,
  status: "DRAFT",
  featured: false,
  seoTitle: null,
  seoDescription: null,
  brandId: null,
  brandName: null,
  categoryId: null,
  categoryName: null,
  variants: [],
  images: [
    {
      id: "persisted-image",
      productId: "product-id",
      bucketId: "product-images",
      objectPath: "products/product-id/persisted.jpg",
      altText: "Image persistée",
      sortOrder: 0,
      approved: true,
      active: true,
      isPrimary: true,
      mimeType: "image/jpeg",
      byteSize: 1000,
      publicUrl: "https://example.test/persisted.jpg",
    },
  ],
  createdAt: "2026-01-01T00:00:00.000Z",
};

function imageFile(name: string) {
  return new File([new Uint8Array([0xff, 0xd8, 0xff, 0x00])], name, { type: "image/jpeg" });
}

describe("ImageManager", () => {
  beforeEach(() => {
    refresh.mockClear();
    prepareImageUploadForProduct.mockReset();
    finalizeImageUploadForProduct.mockReset();
    uploadToSignedUrl.mockReset();
    vi.spyOn(URL, "createObjectURL").mockImplementation((file) => `blob:${(file as File).name}`);
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
  });

  it("removes a successful pending card, resets input, revokes preview, and refreshes persisted data", async () => {
    prepareImageUploadForProduct.mockResolvedValue({
      ok: true,
      data: {
        bucketId: "product-images",
        objectPath: "products/product-id/new.jpg",
        token: "redacted-token",
        pendingUploadId: "pending-id",
      },
    });
    uploadToSignedUrl.mockResolvedValue({ error: null });
    finalizeImageUploadForProduct.mockResolvedValue({
      ok: true,
      data: { imageId: "new-image" },
    });

    render(<ImageManager product={product} canMutate />);

    const input = screen.getByLabelText(/Ajouter des images/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [imageFile("new.jpg")] } });

    expect(await screen.findByText("new.jpg")).toBeDefined();
    expect(input.value).toBe("");

    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

    await waitFor(() => {
      expect(screen.queryByText("new.jpg")).toBeNull();
    });

    expect(screen.getByText("Image persistée")).toBeDefined();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:new.jpg");
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("removes one successful upload while retaining a failed upload for retry", async () => {
    prepareImageUploadForProduct
      .mockResolvedValueOnce({
        ok: true,
        data: {
          bucketId: "product-images",
          objectPath: "products/product-id/success.jpg",
          token: "redacted-token",
          pendingUploadId: "pending-success",
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        data: {
          bucketId: "product-images",
          objectPath: "products/product-id/fail.jpg",
          token: "redacted-token",
          pendingUploadId: "pending-fail",
        },
      });
    uploadToSignedUrl.mockResolvedValue({ error: null });
    finalizeImageUploadForProduct
      .mockResolvedValueOnce({ ok: true, data: { imageId: "new-image" } })
      .mockResolvedValueOnce({ ok: false, message: "Validation impossible" });

    render(<ImageManager product={product} canMutate />);

    const input = screen.getByLabelText(/Ajouter des images/i);
    fireEvent.change(input, { target: { files: [imageFile("success.jpg"), imageFile("fail.jpg")] } });

    fireEvent.click(screen.getAllByRole("button", { name: "Envoyer" })[0]);
    await waitFor(() => expect(screen.queryByText("success.jpg")).toBeNull());

    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));
    expect(await screen.findByText("Validation impossible")).toBeDefined();
    expect(screen.getByText("fail.jpg")).toBeDefined();
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeDefined();
  });

  it("does not use a full document reload for upload refresh", () => {
    const source = readFileSync("src/components/admin/catalogue/image-manager.tsx", "utf8");

    expect(source).not.toContain("window.location.reload");
    expect(source).not.toContain("location.reload");
  });
});
