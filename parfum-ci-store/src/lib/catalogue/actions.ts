"use server";

import { CatalogueError, isCatalogueError } from "@/lib/catalogue/errors";
import { createBrand, updateBrand } from "@/lib/catalogue/brands";
import { createCategory, updateCategory } from "@/lib/catalogue/categories";
import { createProduct, updateProduct } from "@/lib/catalogue/products";
import {
  deleteProductImage,
  finalizeProductImageUpload,
  prepareProductImageUpload,
  replaceProductImage,
} from "@/lib/catalogue/storage-service";
import { createVariant, updateVariant } from "@/lib/catalogue/variants";
import type {
  CreateBrandInput,
  CreateCategoryInput,
  CreateProductInput,
  CreateVariantInput,
  FinalizeImageUploadInput,
  PrepareImageUploadInput,
  UpdateBrandInput,
  UpdateCategoryInput,
  UpdateProductInput,
  UpdateVariantInput,
} from "@/lib/catalogue/validation";

function toSafeActionError(error: unknown) {
  if (isCatalogueError(error)) {
    return { ok: false as const, code: error.code, message: error.message };
  }

  if (error instanceof CatalogueError) {
    return { ok: false as const, code: error.code, message: error.message };
  }

  return {
    ok: false as const,
    code: "CATALOGUE_ACTION_FAILED",
    message: "L'opération catalogue n'a pas pu être effectuée.",
  };
}

export async function prepareProductImageUploadAction(input: PrepareImageUploadInput) {
  try {
    return { ok: true as const, data: await prepareProductImageUpload(input) };
  } catch (error) {
    return toSafeActionError(error);
  }
}

export async function createBrandAction(input: CreateBrandInput) {
  try {
    return { ok: true as const, data: await createBrand(input) };
  } catch (error) {
    return toSafeActionError(error);
  }
}

export async function updateBrandAction(id: string, input: UpdateBrandInput) {
  try {
    return { ok: true as const, data: await updateBrand(id, input) };
  } catch (error) {
    return toSafeActionError(error);
  }
}

export async function createCategoryAction(input: CreateCategoryInput) {
  try {
    return { ok: true as const, data: await createCategory(input) };
  } catch (error) {
    return toSafeActionError(error);
  }
}

export async function updateCategoryAction(id: string, input: UpdateCategoryInput) {
  try {
    return { ok: true as const, data: await updateCategory(id, input) };
  } catch (error) {
    return toSafeActionError(error);
  }
}

export async function createProductAction(input: CreateProductInput) {
  try {
    return { ok: true as const, data: await createProduct(input) };
  } catch (error) {
    return toSafeActionError(error);
  }
}

export async function updateProductAction(id: string, input: UpdateProductInput) {
  try {
    return { ok: true as const, data: await updateProduct(id, input) };
  } catch (error) {
    return toSafeActionError(error);
  }
}

export async function createVariantAction(input: CreateVariantInput) {
  try {
    return { ok: true as const, data: await createVariant(input) };
  } catch (error) {
    return toSafeActionError(error);
  }
}

export async function updateVariantAction(id: string, input: UpdateVariantInput) {
  try {
    return { ok: true as const, data: await updateVariant(id, input) };
  } catch (error) {
    return toSafeActionError(error);
  }
}

export async function finalizeProductImageUploadAction(input: FinalizeImageUploadInput) {
  try {
    return { ok: true as const, data: await finalizeProductImageUpload(input) };
  } catch (error) {
    return toSafeActionError(error);
  }
}

export async function replaceProductImageAction(input: Parameters<typeof replaceProductImage>[0]) {
  try {
    return { ok: true as const, data: await replaceProductImage(input) };
  } catch (error) {
    return toSafeActionError(error);
  }
}

export async function deleteProductImageAction(input: Parameters<typeof deleteProductImage>[0]) {
  try {
    return { ok: true as const, data: await deleteProductImage(input) };
  } catch (error) {
    return toSafeActionError(error);
  }
}
