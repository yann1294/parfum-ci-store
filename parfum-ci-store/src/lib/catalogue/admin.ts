import "server-only";

import { requireActiveStaff } from "@/lib/auth/server";
import { getAvailabilityStatus, getAvailableQuantity } from "@/lib/catalogue/availability";
import { PRODUCT_IMAGES_BUCKET } from "@/lib/catalogue/constants";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getAdminCataloguePermission,
  type AdminCataloguePermission,
} from "@/lib/catalogue/permissions";

export type AdminBrand = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  active: boolean;
  sortOrder: number;
  productCount: number;
};

export type AdminCategory = AdminBrand & {
  parentId: string | null;
};

export type AdminVariant = {
  id: string;
  productId: string;
  sku: string;
  sizeMl: number;
  concentration: string | null;
  priceXof: number;
  compareAtPriceXof: number | null;
  costPriceXof: number | null;
  stockOnHand: number;
  reservedQuantity: number;
  availableQuantity: number;
  lowStockThreshold: number;
  availabilityStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  active: boolean;
};

export type AdminProductImage = {
  id: string;
  productId: string;
  bucketId: string;
  objectPath: string | null;
  altText: string;
  sortOrder: number;
  approved: boolean;
  active: boolean;
  isPrimary: boolean;
  mimeType: string | null;
  byteSize: number | null;
  publicUrl: string | null;
};

export type AdminProduct = {
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
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  featured: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  brandId: string | null;
  brandName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  variants: AdminVariant[];
  images: AdminProductImage[];
  createdAt: string;
};

export type AdminProductListFilters = {
  q?: string;
  status?: "ALL" | "DRAFT" | "ACTIVE" | "ARCHIVED";
  brandId?: string;
  categoryId?: string;
  availability?: "ALL" | "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  page?: number;
  pageSize?: number;
};

type ProductRow = {
  id: string;
  brand_id: string | null;
  category_id: string | null;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  fragrance_family: string | null;
  top_notes: string[];
  heart_notes: string[];
  base_notes: string[];
  gender_category: string | null;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  featured: boolean;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  brands: { id: string; name: string } | null;
  categories: { id: string; name: string } | null;
  product_variants: Array<{
    id: string;
    product_id: string;
    sku: string;
    size_ml: number;
    concentration: string | null;
    price_xof: number;
    compare_at_price_xof: number | null;
    cost_price_xof: number | null;
    stock_on_hand: number;
    reserved_quantity: number;
    low_stock_threshold: number;
    active: boolean;
  }>;
  product_images: Array<{
    id: string;
    product_id: string;
    bucket_id?: string;
    object_path?: string | null;
    storage_path: string | null;
    alt_text: string;
    sort_order: number;
    approved: boolean;
    active: boolean;
    is_primary?: boolean;
    mime_type?: string | null;
    byte_size?: number | null;
  }>;
};

export async function requireCatalogueReadAccess() {
  const staff = await requireActiveStaff({ mode: "redirect" });
  const permissions = getAdminCataloguePermission(staff);

  if (!permissions.canRead) {
    throw new Error("FORBIDDEN");
  }

  return { staff, permissions };
}

function getImagePublicUrl(bucketId: string, objectPath: string | null) {
  if (!objectPath) {
    return null;
  }

  return createSupabaseAdminClient().storage.from(bucketId).getPublicUrl(objectPath).data.publicUrl;
}

function mapVariant(row: ProductRow["product_variants"][number], includeCost: boolean): AdminVariant {
  return {
    id: row.id,
    productId: row.product_id,
    sku: row.sku,
    sizeMl: row.size_ml,
    concentration: row.concentration,
    priceXof: row.price_xof,
    compareAtPriceXof: row.compare_at_price_xof,
    costPriceXof: includeCost ? row.cost_price_xof : null,
    stockOnHand: row.stock_on_hand,
    reservedQuantity: row.reserved_quantity,
    availableQuantity: getAvailableQuantity(row.stock_on_hand, row.reserved_quantity),
    lowStockThreshold: row.low_stock_threshold,
    availabilityStatus: getAvailabilityStatus(
      row.stock_on_hand,
      row.reserved_quantity,
      row.low_stock_threshold,
    ),
    active: row.active,
  };
}

function mapProduct(row: ProductRow, includeCost: boolean): AdminProduct {
  const images = row.product_images
    .map((image) => {
      const bucketId = image.bucket_id ?? PRODUCT_IMAGES_BUCKET;
      const objectPath = image.object_path ?? image.storage_path;

      return {
        id: image.id,
        productId: image.product_id,
        bucketId,
        objectPath,
        altText: image.alt_text,
        sortOrder: image.sort_order,
        approved: image.approved,
        active: image.active,
        isPrimary: image.is_primary ?? false,
        mimeType: image.mime_type ?? null,
        byteSize: image.byte_size ?? null,
        publicUrl: getImagePublicUrl(bucketId, objectPath),
      };
    })
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder);

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    shortDescription: row.short_description,
    description: row.description,
    fragranceFamily: row.fragrance_family,
    topNotes: row.top_notes,
    heartNotes: row.heart_notes,
    baseNotes: row.base_notes,
    genderCategory: row.gender_category,
    status: row.status,
    featured: row.featured,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    brandId: row.brand_id,
    brandName: row.brands?.name ?? null,
    categoryId: row.category_id,
    categoryName: row.categories?.name ?? null,
    variants: row.product_variants.map((variant) => mapVariant(variant, includeCost)),
    images,
    createdAt: row.created_at,
  };
}

export async function listAdminBrands(): Promise<AdminBrand[]> {
  const { data, error } = await createSupabaseAdminClient()
    .from("brands")
    .select("id, name, slug, description, active, sort_order, products(id)")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    active: row.active,
    sortOrder: row.sort_order,
    productCount: row.products?.length ?? 0,
  }));
}

export async function listAdminCategories(): Promise<AdminCategory[]> {
  const { data, error } = await createSupabaseAdminClient()
    .from("categories")
    .select("id, parent_id, name, slug, description, active, sort_order, products(id)")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    parentId: row.parent_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    active: row.active,
    sortOrder: row.sort_order,
    productCount: row.products?.length ?? 0,
  }));
}

export async function listAdminProducts(
  filters: AdminProductListFilters,
  permissions: AdminCataloguePermission,
) {
  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.min(Math.max(filters.pageSize ?? 20, 1), 50);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = createSupabaseAdminClient()
    .from("products")
    .select(
      `
        id, brand_id, category_id, name, slug, short_description, description, fragrance_family,
        top_notes, heart_notes, base_notes, gender_category, status, featured, seo_title,
        seo_description, created_at,
        brands:brand_id(id, name),
        categories:category_id(id, name),
        product_variants(id, product_id, sku, size_ml, concentration, price_xof, compare_at_price_xof, cost_price_xof, stock_on_hand, reserved_quantity, low_stock_threshold, active),
        product_images(id, product_id, bucket_id, object_path, storage_path, alt_text, sort_order, approved, active, is_primary, mime_type, byte_size)
      `,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.status && filters.status !== "ALL") {
    query = query.eq("status", filters.status);
  }

  if (filters.brandId) {
    query = query.eq("brand_id", filters.brandId);
  }

  if (filters.categoryId) {
    query = query.eq("category_id", filters.categoryId);
  }

  if (filters.q) {
    const q = filters.q.replace(/[%_]/g, "\\$&");
    query = query.or(`name.ilike.%${q}%,slug.ilike.%${q}%,product_variants.sku.ilike.%${q}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    throw error;
  }

  let products = ((data ?? []) as unknown as ProductRow[]).map((row) =>
    mapProduct(row, permissions.canViewCostPrice),
  );

  if (filters.availability && filters.availability !== "ALL") {
    products = products.filter((product) =>
      product.variants.some((variant) => variant.availabilityStatus === filters.availability),
    );
  }

  return {
    products,
    page,
    pageSize,
    total: count ?? products.length,
    totalPages: Math.max(Math.ceil((count ?? products.length) / pageSize), 1),
  };
}

export async function getAdminProductById(id: string, permissions: AdminCataloguePermission) {
  const { data, error } = await createSupabaseAdminClient()
    .from("products")
    .select(
      `
        id, brand_id, category_id, name, slug, short_description, description, fragrance_family,
        top_notes, heart_notes, base_notes, gender_category, status, featured, seo_title,
        seo_description, created_at,
        brands:brand_id(id, name),
        categories:category_id(id, name),
        product_variants(id, product_id, sku, size_ml, concentration, price_xof, compare_at_price_xof, cost_price_xof, stock_on_hand, reserved_quantity, low_stock_threshold, active),
        product_images(id, product_id, bucket_id, object_path, storage_path, alt_text, sort_order, approved, active, is_primary, mime_type, byte_size)
      `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapProduct(data as unknown as ProductRow, permissions.canViewCostPrice);
}
