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
import type { PublicProductDto } from "@/lib/catalogue/types";
import { generateProductSlug, isUniqueViolation, resolveSlugCollision } from "@/lib/catalogue/slug";
import type { Database } from "@/types/database.types";
import { getPublicProductImageUrl } from "@/lib/catalogue/public-images";

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

type PublicProductViewRow = Database["public"]["Views"]["public_catalogue_products"]["Row"];
type PublicVariantViewRow = Database["public"]["Views"]["public_catalogue_variants"]["Row"];
type PublicImageViewRow = Database["public"]["Views"]["public_catalogue_images"]["Row"];

function mapPublicViewProduct(
  product: PublicProductViewRow,
  variants: PublicVariantViewRow[],
  images: PublicImageViewRow[],
): PublicProductDto {
  if (!product.id || !product.name || !product.slug) {
    throw new Error("Invalid public product row");
  }

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    shortDescription: product.short_description,
    description: product.description,
    fragranceFamily: product.fragrance_family,
    topNotes: product.top_notes ?? [],
    heartNotes: product.heart_notes ?? [],
    baseNotes: product.base_notes ?? [],
    genderCategory: product.gender_category,
    featured: Boolean(product.featured),
    brand: product.brand_id && product.brand_name && product.brand_slug
      ? {
          id: product.brand_id,
          name: product.brand_name,
          slug: product.brand_slug,
          description: null,
        }
      : null,
    category: product.category_id && product.category_name && product.category_slug
      ? {
          id: product.category_id,
          parentId: null,
          name: product.category_name,
          slug: product.category_slug,
          description: null,
        }
      : null,
    variants: variants
      .filter((variant) => variant.id && variant.price_xof && variant.price_xof > 0)
      .map((variant) => ({
        id: variant.id as string,
        sku: variant.sku ?? "",
        sizeMl: variant.size_ml ?? 0,
        concentration: variant.concentration,
        priceXof: variant.price_xof ?? 0,
        compareAtPriceXof: variant.compare_at_price_xof,
        availableQuantity: variant.available_quantity ?? 0,
        availabilityStatus:
          variant.availability_status === "LOW_STOCK" ||
          variant.availability_status === "OUT_OF_STOCK"
            ? variant.availability_status
            : "IN_STOCK",
      })),
    images: images
      .filter((image) => image.id && image.product_id && image.object_path)
      .map((image) => ({
        id: image.id as string,
        productId: image.product_id as string,
        bucketId: image.bucket_id ?? "product-images",
        objectPath: image.object_path as string,
        altText: image.alt_text ?? product.name,
        sortOrder: image.sort_order ?? 0,
        isPrimary: Boolean(image.is_primary),
        mimeType: image.mime_type,
        byteSize: image.byte_size,
        publicUrl: getPublicProductImageUrl(image.object_path as string),
      }))
      .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder),
  } as PublicProductDto & { images: Array<PublicProductDto["images"][number] & { publicUrl: string }> };
}

async function loadPublicProductRelations(productIds: string[]) {
  if (productIds.length === 0) {
    return { variants: new Map<string, PublicVariantViewRow[]>(), images: new Map<string, PublicImageViewRow[]>() };
  }

  const supabase = await createSupabaseServerClient();
  const [{ data: variantRows, error: variantError }, { data: imageRows, error: imageError }] =
    await Promise.all([
      supabase
        .from("public_catalogue_variants")
        .select(
          "id, product_id, sku, size_ml, concentration, price_xof, compare_at_price_xof, available_quantity, availability_status",
        )
        .in("product_id", productIds),
      supabase
        .from("public_catalogue_images")
        .select("id, product_id, bucket_id, object_path, alt_text, sort_order, is_primary, mime_type, byte_size, width, height, created_at")
        .in("product_id", productIds),
    ]);

  if (variantError) throw variantError;
  if (imageError) throw imageError;

  const variants = new Map<string, PublicVariantViewRow[]>();
  for (const row of variantRows ?? []) {
    if (!row.product_id) continue;
    variants.set(row.product_id, [...(variants.get(row.product_id) ?? []), row]);
  }

  const images = new Map<string, PublicImageViewRow[]>();
  for (const row of imageRows ?? []) {
    if (!row.product_id) continue;
    images.set(row.product_id, [...(images.get(row.product_id) ?? []), row]);
  }

  return { variants, images };
}

export async function listActiveProducts(input: Partial<CatalogueQueryInput> = {}) {
  const filters = catalogueQuerySchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;
  let query = supabase
    .from("public_catalogue_products")
    .select(
      "id, name, slug, short_description, description, fragrance_family, top_notes, heart_notes, base_notes, gender_category, featured, created_at, brand_id, brand_name, brand_slug, category_id, category_name, category_slug",
    )
    .range(from, to);

  if (filters.search) {
    const search = `%${filters.search.replace(/[%_]/g, "\\$&")}%`;
    query = query.or(
      `name.ilike.${search},short_description.ilike.${search},description.ilike.${search},fragrance_family.ilike.${search}`,
    );
  }

  if (filters.brandSlug) query = query.eq("brand_slug", filters.brandSlug);
  if (filters.categorySlug) query = query.eq("category_slug", filters.categorySlug);
  if (filters.fragranceFamily) query = query.eq("fragrance_family", filters.fragranceFamily);
  if (filters.genderCategory) query = query.eq("gender_category", filters.genderCategory);

  query = query.order("created_at", { ascending: false }).order("id", { ascending: true });

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const ids = (data ?? []).flatMap((row) => (row.id ? [row.id] : []));
  const { variants, images } = await loadPublicProductRelations(ids);
  let products = (data ?? [])
    .map((row) => mapPublicViewProduct(row, variants.get(row.id ?? "") ?? [], images.get(row.id ?? "") ?? []))
    .filter((product) => product.variants.length > 0 && product.images.length > 0);

  if (filters.concentration) {
    products = products.filter((product) =>
      product.variants.some((variant) => variant.concentration === filters.concentration),
    );
  }
  if (filters.sizeMl) {
    products = products.filter((product) => product.variants.some((variant) => variant.sizeMl === filters.sizeMl));
  }
  if (filters.availability) {
    products = products.filter((product) =>
      product.variants.some((variant) => variant.availabilityStatus === filters.availability),
    );
  }

  if (filters.sort === "price_asc" || filters.sort === "price_desc") {
    products = products.sort((a, b) => {
      const aPrice = Math.min(...a.variants.map((variant) => variant.priceXof));
      const bPrice = Math.min(...b.variants.map((variant) => variant.priceXof));
      return filters.sort === "price_asc" ? aPrice - bPrice : bPrice - aPrice;
    });
  }

  return products;
}

export async function listFeaturedProducts(limit = 8) {
  return listActiveProducts({ page: 1, pageSize: Math.min(limit, 12), sort: "newest" }).then((products) =>
    products.filter((product) => product.featured),
  );
}

export async function getActiveProductBySlug(slug: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("public_catalogue_products")
    .select(
      "id, name, slug, short_description, description, fragrance_family, top_notes, heart_notes, base_notes, gender_category, featured, created_at, brand_id, brand_name, brand_slug, category_id, category_name, category_slug",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const id = data.id;
  if (!id) return null;
  const { variants, images } = await loadPublicProductRelations([id]);
  const product = mapPublicViewProduct(data, variants.get(id) ?? [], images.get(id) ?? []);
  return product.variants.length > 0 && product.images.length > 0 ? product : null;
}

export async function listPublicFacets() {
  const products = await listActiveProducts({ page: 1, pageSize: 48 });
  const brands = new Map<string, NonNullable<PublicProductDto["brand"]>>();
  const categories = new Map<string, NonNullable<PublicProductDto["category"]>>();
  const fragranceFamilies = new Set<string>();
  const genderCategories = new Set<string>();
  const concentrations = new Set<string>();
  const sizes = new Set<number>();

  for (const product of products) {
    if (product.brand) brands.set(product.brand.slug, product.brand);
    if (product.category) categories.set(product.category.slug, product.category);
    if (product.fragranceFamily) fragranceFamilies.add(product.fragranceFamily);
    if (product.genderCategory) genderCategories.add(product.genderCategory);
    for (const variant of product.variants) {
      if (variant.concentration) concentrations.add(variant.concentration);
      if (variant.sizeMl) sizes.add(variant.sizeMl);
    }
  }

  return {
    brands: [...brands.values()].slice(0, 24),
    categories: [...categories.values()].slice(0, 24),
    fragranceFamilies: [...fragranceFamilies].sort().slice(0, 12),
    genderCategories: [...genderCategories].sort().slice(0, 8),
    concentrations: [...concentrations].sort().slice(0, 12),
    sizes: [...sizes].sort((a, b) => a - b).slice(0, 12),
  };
}

export async function listRelatedProducts(product: PublicProductDto, limit = 4) {
  const related = await listActiveProducts({
    page: 1,
    pageSize: 12,
    fragranceFamily: product.fragranceFamily ?? undefined,
  });

  return related.filter((item) => item.id !== product.id).slice(0, limit);
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
