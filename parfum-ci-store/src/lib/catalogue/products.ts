import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { auditCatalogueEvent } from "@/lib/audit/catalogue";
import { requireCatalogueManager } from "@/lib/catalogue/authorization";
import {
  catalogueQuerySchema,
  createProductSchema,
  updateProductSchema,
  type CatalogueQueryInput,
  type CreateProductInput,
  type UpdateProductInput,
} from "@/lib/catalogue/validation";
import { toPublicProductDto } from "@/lib/catalogue/mappers";
import type { BrandRow, CategoryRow, ProductRow, PublicProductDto } from "@/lib/catalogue/types";
import { generateProductSlug, isUniqueViolation, resolveSlugCollision } from "@/lib/catalogue/slug";
import type { Database } from "@/types/database.types";

const PRODUCT_PUBLIC_COLUMNS = `
  id,
  brand_id,
  category_id,
  name,
  slug,
  short_description,
  description,
  fragrance_family,
  top_notes,
  heart_notes,
  base_notes,
  gender_category,
  status,
  featured,
  created_at,
  updated_at
` as const;

const PRODUCT_WITH_RELATIONS_COLUMNS = `
  ${PRODUCT_PUBLIC_COLUMNS},
  brands:brand_id(id, name, slug, description, active, sort_order, created_at, updated_at),
  categories:category_id(id, parent_id, name, slug, description, active, sort_order, created_at, updated_at),
  product_variants(id, product_id, sku, size_ml, concentration, price_xof, compare_at_price_xof, stock_on_hand, reserved_quantity, low_stock_threshold, active, created_at, updated_at),
  product_images(id, product_id, bucket_id, object_path, storage_path, image_url, alt_text, sort_order, approved, active, is_primary, mime_type, byte_size, width, height, created_by, created_at, updated_at)
` as const;

type ProductQueryResult = {
  data: unknown[] | null;
  error: Error | null;
};

type CatalogueFilterQuery = PromiseLike<ProductQueryResult> & {
  or(filters: string): CatalogueFilterQuery;
  eq(column: string, value: string): CatalogueFilterQuery;
  ilike(column: string, pattern: string): CatalogueFilterQuery;
  order(column: string, options: { ascending: boolean }): CatalogueFilterQuery;
};

type ProductQueryRow = ProductRow & {
  brands: BrandRow | null;
  categories: CategoryRow | null;
  product_variants: ProductRow extends never ? never : Array<{
    id: string;
    product_id: string;
    sku: string;
    size_ml: number;
    concentration: string | null;
    price_xof: number;
    compare_at_price_xof: number | null;
    stock_on_hand: number;
    reserved_quantity: number;
    low_stock_threshold: number;
    active: boolean;
    created_at: string;
    updated_at: string;
    cost_price_xof?: never;
  }>;
  product_images: Array<{
    id: string;
    product_id: string;
    bucket_id: string;
    object_path: string | null;
    storage_path: string | null;
    image_url: string | null;
    alt_text: string;
    sort_order: number;
    approved: boolean;
    active: boolean;
    is_primary: boolean;
    mime_type: string | null;
    byte_size: number | null;
    width: number | null;
    height: number | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
  }>;
};

function mapProductRow(row: ProductQueryRow): PublicProductDto {
  return toPublicProductDto({
    product: row,
    brand: row.brands,
    category: row.categories,
    variants: row.product_variants.map((variant) => ({ ...variant, cost_price_xof: null })),
    images: row.product_images,
  });
}

function applyCatalogueFilters(query: CatalogueFilterQuery, filters: CatalogueQueryInput) {
  let nextQuery = query;

  if (filters.search) {
    const search = `%${filters.search.replace(/[%_]/g, "\\$&")}%`;
    nextQuery = nextQuery.or(
      `name.ilike.${search},short_description.ilike.${search},description.ilike.${search},fragrance_family.ilike.${search}`,
    );
  }

  if (filters.brandSlug) {
    nextQuery = nextQuery.eq("brands.slug", filters.brandSlug);
  }

  if (filters.categorySlug) {
    nextQuery = nextQuery.eq("categories.slug", filters.categorySlug);
  }

  if (filters.fragranceFamily) {
    nextQuery = nextQuery.ilike("fragrance_family", filters.fragranceFamily);
  }

  switch (filters.sort) {
    case "price_asc":
    case "price_desc":
      nextQuery = nextQuery.order("created_at", { ascending: false });
      break;
    case "newest":
      nextQuery = nextQuery.order("created_at", { ascending: false });
      break;
  }

  return nextQuery;
}

export async function listActiveProducts(input: Partial<CatalogueQueryInput> = {}) {
  const filters = catalogueQuerySchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;
  let query = supabase
    .from("products")
    .select(PRODUCT_WITH_RELATIONS_COLUMNS)
    .eq("status", "ACTIVE")
    .range(from, to) as unknown as CatalogueFilterQuery;

  query = applyCatalogueFilters(query, filters);
  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapProductRow(row as unknown as ProductQueryRow));
}

export async function listFeaturedProducts(limit = 8) {
  return listActiveProducts({ page: 1, pageSize: Math.min(limit, 12), sort: "newest" }).then((products) =>
    products.filter((product) => product.featured),
  );
}

export async function getActiveProductBySlug(slug: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_WITH_RELATIONS_COLUMNS)
    .eq("status", "ACTIVE")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapProductRow(data as unknown as ProductQueryRow);
}

async function productSlugExists(slug: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("products").select("id").eq("slug", slug).limit(1);

  if (error) {
    throw error;
  }

  return Boolean(data?.length);
}

export async function createProduct(input: CreateProductInput) {
  const staff = await requireCatalogueManager();
  const parsed = createProductSchema.parse(input);
  const desiredSlug = parsed.slug ?? generateProductSlug(parsed.name);
  const supabase = await createSupabaseServerClient();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const slug = await resolveSlugCollision(
      attempt === 0 ? desiredSlug : `${desiredSlug}-${attempt + 1}`,
      productSlugExists,
    );
    const { data, error } = await supabase
      .from("products")
      .insert({
        brand_id: parsed.brandId ?? null,
        category_id: parsed.categoryId ?? null,
        name: parsed.name,
        slug,
        short_description: parsed.shortDescription ?? null,
        description: parsed.description ?? null,
        fragrance_family: parsed.fragranceFamily ?? null,
        top_notes: parsed.topNotes,
        heart_notes: parsed.heartNotes,
        base_notes: parsed.baseNotes,
        gender_category: parsed.genderCategory ?? null,
        status: "DRAFT",
        featured: parsed.featured,
        seo_title: parsed.seoTitle ?? null,
        seo_description: parsed.seoDescription ?? null,
      })
      .select(PRODUCT_PUBLIC_COLUMNS)
      .single();

    if (data) {
      await auditCatalogueEvent({
        actorId: staff.id,
        action: "CATALOGUE_PRODUCT_CREATED",
        resourceType: "product",
        resourceId: data.id,
        metadata: { changed_fields: ["name", "slug", "status"] },
      });

      return data;
    }

    if (!isUniqueViolation(error)) {
      throw error;
    }
  }

  throw new Error("Unable to create product with a unique slug");
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  const staff = await requireCatalogueManager();
  const parsed = updateProductSchema.parse(input);
  const update: Database["public"]["Tables"]["products"]["Update"] = {};

  if (parsed.brandId !== undefined) update.brand_id = parsed.brandId;
  if (parsed.categoryId !== undefined) update.category_id = parsed.categoryId;
  if (parsed.name !== undefined) update.name = parsed.name;
  if (parsed.explicitSlug !== undefined) update.slug = parsed.explicitSlug;
  if (parsed.shortDescription !== undefined) update.short_description = parsed.shortDescription;
  if (parsed.description !== undefined) update.description = parsed.description;
  if (parsed.fragranceFamily !== undefined) update.fragrance_family = parsed.fragranceFamily;
  if (parsed.topNotes !== undefined) update.top_notes = parsed.topNotes;
  if (parsed.heartNotes !== undefined) update.heart_notes = parsed.heartNotes;
  if (parsed.baseNotes !== undefined) update.base_notes = parsed.baseNotes;
  if (parsed.genderCategory !== undefined) update.gender_category = parsed.genderCategory;
  if (parsed.featured !== undefined) update.featured = parsed.featured;
  if (parsed.seoTitle !== undefined) update.seo_title = parsed.seoTitle;
  if (parsed.seoDescription !== undefined) update.seo_description = parsed.seoDescription;
  if (parsed.status !== undefined) update.status = parsed.status;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .update(update)
    .eq("id", id)
    .select(PRODUCT_PUBLIC_COLUMNS)
    .single();

  if (error || !data) {
    throw error;
  }

  await auditCatalogueEvent({
    actorId: staff.id,
    action:
      parsed.status === "ACTIVE"
        ? "CATALOGUE_PRODUCT_ACTIVATED"
        : parsed.status === "ARCHIVED"
          ? "CATALOGUE_PRODUCT_ARCHIVED"
          : "CATALOGUE_PRODUCT_UPDATED",
    resourceType: "product",
    resourceId: id,
    metadata: { changed_fields: Object.keys(update) },
  });

  return data;
}
