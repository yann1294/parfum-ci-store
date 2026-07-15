"use server";

import { revalidatePath } from "next/cache";

import {
  createBrandAction,
  createCategoryAction,
  createProductAction,
  createVariantAction,
  deleteProductImageAction,
  finalizeProductImageUploadAction,
  prepareProductImageUploadAction,
  updateBrandAction,
  updateCategoryAction,
  updateProductAction,
  updateVariantAction,
} from "@/lib/catalogue/actions";
import { parseNotes, parseXofInput } from "@/lib/catalogue/format";

type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string };

function revalidateCatalogueAdmin() {
  revalidatePath("/admin/produits");
  revalidatePath("/admin/marques");
  revalidatePath("/admin/categories");
}

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function nullableText(formData: FormData, key: string) {
  return text(formData, key) ?? null;
}

function bool(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function nullableUuid(formData: FormData, key: string) {
  const value = text(formData, key);
  return value && value !== "none" ? value : null;
}

export async function createProductFromForm(formData: FormData): Promise<ActionResult> {
  const result = await createProductAction({
    name: text(formData, "name") ?? "",
    shortDescription: nullableText(formData, "shortDescription"),
    description: nullableText(formData, "description"),
    brandId: nullableUuid(formData, "brandId"),
    categoryId: nullableUuid(formData, "categoryId"),
    genderCategory: nullableText(formData, "genderCategory"),
    fragranceFamily: nullableText(formData, "fragranceFamily"),
    topNotes: parseNotes(formData.get("topNotes")),
    heartNotes: parseNotes(formData.get("heartNotes")),
    baseNotes: parseNotes(formData.get("baseNotes")),
    seoTitle: nullableText(formData, "seoTitle"),
    seoDescription: nullableText(formData, "seoDescription"),
    featured: bool(formData, "featured"),
    slug: text(formData, "slug"),
  });

  if (result.ok) {
    revalidateCatalogueAdmin();
  }

  return result;
}

export async function updateProductFromForm(id: string, formData: FormData): Promise<ActionResult> {
  const result = await updateProductAction(id, {
    name: text(formData, "name"),
    shortDescription: nullableText(formData, "shortDescription"),
    description: nullableText(formData, "description"),
    brandId: nullableUuid(formData, "brandId"),
    categoryId: nullableUuid(formData, "categoryId"),
    genderCategory: nullableText(formData, "genderCategory"),
    fragranceFamily: nullableText(formData, "fragranceFamily"),
    topNotes: parseNotes(formData.get("topNotes")),
    heartNotes: parseNotes(formData.get("heartNotes")),
    baseNotes: parseNotes(formData.get("baseNotes")),
    seoTitle: nullableText(formData, "seoTitle"),
    seoDescription: nullableText(formData, "seoDescription"),
    featured: bool(formData, "featured"),
    explicitSlug: text(formData, "slug"),
  });

  if (result.ok) {
    revalidateCatalogueAdmin();
    revalidatePath(`/admin/produits/${id}`);
  }

  return result;
}

export async function changeProductStatus(id: string, status: "DRAFT" | "ACTIVE" | "ARCHIVED") {
  const result = await updateProductAction(id, { status });

  if (result.ok) {
    revalidateCatalogueAdmin();
    revalidatePath(`/admin/produits/${id}`);
  }

  return result;
}

export async function createVariantFromForm(productId: string, formData: FormData) {
  const result = await createVariantAction({
    productId,
    sku: text(formData, "sku") ?? "",
    sizeMl: Number.parseInt(text(formData, "sizeMl") ?? "0", 10),
    concentration: nullableText(formData, "concentration"),
    priceXof: parseXofInput(formData.get("priceXof")),
    compareAtPriceXof: text(formData, "compareAtPriceXof")
      ? parseXofInput(formData.get("compareAtPriceXof"))
      : null,
    costPriceXof: text(formData, "costPriceXof") ? parseXofInput(formData.get("costPriceXof")) : null,
    lowStockThreshold: Number.parseInt(text(formData, "lowStockThreshold") ?? "0", 10),
    active: bool(formData, "active"),
  });

  if (result.ok) {
    revalidatePath(`/admin/produits/${productId}`);
    revalidatePath("/admin/produits");
  }

  return result;
}

export async function updateVariantFromForm(variantId: string, productId: string, formData: FormData) {
  const result = await updateVariantAction(variantId, {
    sku: text(formData, "sku"),
    sizeMl: Number.parseInt(text(formData, "sizeMl") ?? "0", 10),
    concentration: nullableText(formData, "concentration"),
    priceXof: parseXofInput(formData.get("priceXof")),
    compareAtPriceXof: text(formData, "compareAtPriceXof")
      ? parseXofInput(formData.get("compareAtPriceXof"))
      : null,
    costPriceXof: text(formData, "costPriceXof") ? parseXofInput(formData.get("costPriceXof")) : null,
    lowStockThreshold: Number.parseInt(text(formData, "lowStockThreshold") ?? "0", 10),
    active: bool(formData, "active"),
  });

  if (result.ok) {
    revalidatePath(`/admin/produits/${productId}`);
    revalidatePath("/admin/produits");
  }

  return result;
}

export async function createBrandFromForm(formData: FormData) {
  const result = await createBrandAction({
    name: text(formData, "name") ?? "",
    slug: text(formData, "slug"),
    description: nullableText(formData, "description"),
    active: bool(formData, "active"),
    sortOrder: Number.parseInt(text(formData, "sortOrder") ?? "0", 10),
  });

  if (result.ok) {
    revalidateCatalogueAdmin();
  }

  return result;
}

export async function updateBrandFromForm(id: string, formData: FormData) {
  const result = await updateBrandAction(id, {
    name: text(formData, "name"),
    slug: text(formData, "slug"),
    description: nullableText(formData, "description"),
    active: bool(formData, "active"),
    sortOrder: Number.parseInt(text(formData, "sortOrder") ?? "0", 10),
  });

  if (result.ok) {
    revalidateCatalogueAdmin();
  }

  return result;
}

export async function createCategoryFromForm(formData: FormData) {
  const result = await createCategoryAction({
    parentId: nullableUuid(formData, "parentId"),
    name: text(formData, "name") ?? "",
    slug: text(formData, "slug"),
    description: nullableText(formData, "description"),
    active: bool(formData, "active"),
    sortOrder: Number.parseInt(text(formData, "sortOrder") ?? "0", 10),
  });

  if (result.ok) {
    revalidateCatalogueAdmin();
  }

  return result;
}

export async function updateCategoryFromForm(id: string, formData: FormData) {
  const result = await updateCategoryAction(id, {
    parentId: nullableUuid(formData, "parentId"),
    name: text(formData, "name"),
    slug: text(formData, "slug"),
    description: nullableText(formData, "description"),
    active: bool(formData, "active"),
    sortOrder: Number.parseInt(text(formData, "sortOrder") ?? "0", 10),
  });

  if (result.ok) {
    revalidateCatalogueAdmin();
  }

  return result;
}

export async function prepareImageUploadForProduct(input: {
  productId: string;
  declaredMimeType: "image/jpeg" | "image/png" | "image/webp";
  declaredByteSize: number;
}) {
  return prepareProductImageUploadAction(input);
}

export async function finalizeImageUploadForProduct(input: {
  productId: string;
  pendingUploadId: string;
  altText: string;
  sortOrder: number;
  isPrimary: boolean;
}) {
  const result = await finalizeProductImageUploadAction(input);

  if (result.ok) {
    revalidatePath(`/admin/produits/${input.productId}`);
    revalidatePath("/admin/produits");
  }

  return result;
}

export async function deleteImageForProduct(productId: string, imageId: string) {
  const result = await deleteProductImageAction({ productId, imageId });

  if (result.ok) {
    revalidatePath(`/admin/produits/${productId}`);
    revalidatePath("/admin/produits");
  }

  return result;
}
