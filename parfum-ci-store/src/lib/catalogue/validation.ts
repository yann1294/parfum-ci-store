import { z } from "zod";

import {
  DEFAULT_CATALOGUE_PAGE_SIZE,
  MAX_CATALOGUE_PAGE_SIZE,
  PRODUCT_IMAGE_MAX_BYTES,
  PRODUCT_IMAGE_MIME_TYPES,
} from "@/lib/catalogue/constants";
import { normalizeSlugSource } from "@/lib/catalogue/slug";

const trimmedString = z.string().trim();
const nonEmptyString = trimmedString.min(1);
const optionalText = trimmedString.transform((value) => value || null).nullable().optional();
const uuid = z.uuid();
const xofAmount = z.number().int().min(0);

const slug = z
  .string()
  .trim()
  .transform(normalizeSlugSource)
  .refine((value) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value), "Invalid slug");

const notes = z.array(nonEmptyString.max(80)).max(12).default([]);

export const createBrandSchema = z
  .object({
    name: nonEmptyString.max(120),
    slug: slug.optional(),
    description: optionalText,
    imageUrl: z.url().nullable().optional(),
    active: z.boolean().default(true),
    sortOrder: z.number().int().min(0).default(0),
  })
  .strict();

export const updateBrandSchema = createBrandSchema.partial().strict();

export const createCategorySchema = z
  .object({
    parentId: uuid.nullable().optional(),
    name: nonEmptyString.max(120),
    slug: slug.optional(),
    description: optionalText,
    active: z.boolean().default(true),
    sortOrder: z.number().int().min(0).default(0),
  })
  .strict();

export const updateCategorySchema = createCategorySchema.partial().strict();

export const createProductSchema = z
  .object({
    brandId: uuid.nullable().optional(),
    categoryId: uuid.nullable().optional(),
    name: nonEmptyString.max(180),
    slug: slug.optional(),
    shortDescription: optionalText,
    description: optionalText,
    fragranceFamily: optionalText,
    topNotes: notes,
    heartNotes: notes,
    baseNotes: notes,
    genderCategory: optionalText,
    featured: z.boolean().default(false),
    seoTitle: optionalText,
    seoDescription: optionalText,
  })
  .strict();

export const updateProductSchema = createProductSchema
  .partial()
  .extend({
    explicitSlug: slug.optional(),
    status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
  })
  .strict();

export const createVariantSchema = z
  .object({
    productId: uuid,
    sku: nonEmptyString.max(80),
    sizeMl: z.number().int().positive(),
    concentration: optionalText,
    priceXof: xofAmount,
    compareAtPriceXof: xofAmount.nullable().optional(),
    costPriceXof: xofAmount.nullable().optional(),
    lowStockThreshold: z.number().int().min(0).default(0),
    active: z.boolean().default(true),
  })
  .strict();

export const updateVariantSchema = createVariantSchema
  .omit({ productId: true })
  .partial()
  .strict();

export const prepareImageUploadSchema = z
  .object({
    productId: uuid,
    declaredMimeType: z.enum(PRODUCT_IMAGE_MIME_TYPES),
    declaredByteSize: z.number().int().positive().max(PRODUCT_IMAGE_MAX_BYTES),
  })
  .strict();

export const finalizeImageUploadSchema = z
  .object({
    productId: uuid,
    pendingUploadId: uuid,
    altText: nonEmptyString.max(180),
    sortOrder: z.number().int().min(0).default(0),
    isPrimary: z.boolean().default(false),
  })
  .strict();

export const updateImageMetadataSchema = z
  .object({
    imageId: uuid,
    altText: nonEmptyString.max(180).optional(),
    sortOrder: z.number().int().min(0).optional(),
    isPrimary: z.boolean().optional(),
    active: z.boolean().optional(),
  })
  .strict();

export const catalogueQuerySchema = z
  .object({
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(MAX_CATALOGUE_PAGE_SIZE).default(DEFAULT_CATALOGUE_PAGE_SIZE),
    search: trimmedString.max(120).optional(),
    brandSlug: slug.optional(),
    categorySlug: slug.optional(),
    concentration: trimmedString.max(80).optional(),
    sizeMl: z.number().int().positive().optional(),
    fragranceFamily: trimmedString.max(80).optional(),
    availability: z.enum(["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"]).optional(),
    sort: z.enum(["newest", "price_asc", "price_desc"]).default("newest"),
  })
  .strict();

export type CreateBrandInput = z.infer<typeof createBrandSchema>;
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateVariantInput = z.infer<typeof createVariantSchema>;
export type UpdateVariantInput = z.infer<typeof updateVariantSchema>;
export type PrepareImageUploadInput = z.infer<typeof prepareImageUploadSchema>;
export type FinalizeImageUploadInput = z.infer<typeof finalizeImageUploadSchema>;
export type UpdateImageMetadataInput = z.infer<typeof updateImageMetadataSchema>;
export type CatalogueQueryInput = z.infer<typeof catalogueQuerySchema>;
