import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "../src/types/database.types";
import {
  PHASE65_MANUAL_DESCRIPTION,
  activeIntendedProductNames,
  buildPhase65Brands,
  buildPhase65Categories,
  buildPhase65ContentRows,
  buildPhase65ProductRows,
  buildPhase65SpecialProductRows,
  buildPhase65SpecialVariantRows,
  buildPhase65VariantRows,
  categories,
  getPhase65CleanupScope,
  normalizePhase65Products,
  products,
  assertCanRunPhase65ManualSeed,
} from "./fixtures/phase65-catalogue-data";

type SupabaseAdmin = ReturnType<typeof createClient<Database>>;
type ProductStatus = Database["public"]["Enums"]["product_status"];

function loadEnvLocal() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function createAdminClient() {
  return createClient<Database>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SECRET_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

function sanitizeError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null) {
    const record = error as Record<string, unknown>;
    const parts = [record.message, record.code, record.details, record.hint]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .map((value) => value.trim());
    if (parts.length > 0) return parts.join(" ");
  }
  return "Phase 6.5 manual seed failed.";
}

async function selectExistingSlugs(
  supabase: SupabaseAdmin,
  table: "brands" | "categories" | "products",
  slugs: string[],
) {
  if (slugs.length === 0) return new Set<string>();
  const { data, error } = await supabase.from(table).select("slug").in("slug", slugs);
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.slug));
}

async function seedBrands(supabase: SupabaseAdmin) {
  const rows = buildPhase65Brands();
  const existing = await selectExistingSlugs(supabase, "brands", rows.map((row) => row.slug));
  const inserts = rows.filter((row) => !existing.has(row.slug));
  const updates = rows.filter((row) => existing.has(row.slug));

  if (inserts.length > 0) {
    const { error } = await supabase.from("brands").insert(inserts);
    if (error) throw error;
  }

  for (const row of updates) {
    const { error } = await supabase
      .from("brands")
      .update({ name: row.name, active: row.active, sort_order: row.sort_order })
      .eq("slug", row.slug);
    if (error) throw error;
  }

  const { data, error } = await supabase.from("brands").select("id, slug").in("slug", rows.map((row) => row.slug));
  if (error) throw error;

  return {
    ids: new Map((data ?? []).map((row) => [row.slug, row.id])),
    inserted: inserts.length,
    updated: updates.length,
  };
}

async function seedCategories(supabase: SupabaseAdmin) {
  const rows = buildPhase65Categories();
  const existing = await selectExistingSlugs(supabase, "categories", rows.map((row) => row.slug));
  const inserts = rows.filter((row) => !existing.has(row.slug));
  const updates = rows.filter((row) => existing.has(row.slug));

  if (inserts.length > 0) {
    const { error } = await supabase.from("categories").insert(inserts);
    if (error) throw error;
  }

  for (const row of updates) {
    const { error } = await supabase
      .from("categories")
      .update({ name: row.name, active: row.active, sort_order: row.sort_order })
      .eq("slug", row.slug);
    if (error) throw error;
  }

  const { data, error } = await supabase
    .from("categories")
    .select("id, slug")
    .in("slug", rows.map((row) => row.slug));
  if (error) throw error;

  return {
    ids: new Map((data ?? []).map((row) => [row.slug, row.id])),
    inserted: inserts.length,
    updated: updates.length,
  };
}

async function selectExistingProductStatuses(supabase: SupabaseAdmin, slugs: string[]) {
  if (slugs.length === 0) return new Map<string, ProductStatus>();
  const { data, error } = await supabase.from("products").select("slug, status").in("slug", slugs);
  if (error) throw error;
  return new Map((data ?? []).map((row) => [row.slug, row.status]));
}

async function seedProducts(
  supabase: SupabaseAdmin,
  brandIds: Map<string, string>,
  categoryIds: Map<string, string>,
) {
  const normalizedProducts = normalizePhase65Products();
  const specialSlugs = [
    `produit-sans-variante-${getPhase65CleanupScope().productSlugSuffix}`,
    `produit-variantes-inactives-${getPhase65CleanupScope().productSlugSuffix}`,
  ];
  const productSlugs = [...normalizedProducts.map((product) => product.slug), ...specialSlugs];
  const existingStatuses = await selectExistingProductStatuses(supabase, productSlugs);
  const existing = new Set(existingStatuses.keys());
  const unisexCategory = categories.find((category) => category.name === "Unisex");
  const firstBrandId = brandIds.get("dior");
  const specialCategoryId = unisexCategory ? categoryIds.get(unisexCategory.slug) : null;
  if (!firstBrandId || !specialCategoryId) throw new Error("Missing fixture relation for special products.");

  const rows = [
    ...buildPhase65ProductRows(brandIds, categoryIds, existingStatuses),
    ...buildPhase65SpecialProductRows(firstBrandId, specialCategoryId, existingStatuses),
  ];
  const { data, error } = await supabase.from("products").upsert(rows, { onConflict: "slug" }).select("id, slug, status");
  if (error) throw error;

  return {
    rows: new Map((data ?? []).map((row) => [row.slug, row])),
    inserted: rows.filter((row) => !existing.has(row.slug)).length,
    updated: rows.filter((row) => existing.has(row.slug)).length,
  };
}

async function seedVariants(supabase: SupabaseAdmin, productRows: Map<string, { id: string; slug: string }>) {
  const productIds = new Map([...productRows.values()].map((row) => [row.slug, row.id]));
  const rows = [...buildPhase65VariantRows(productIds), ...buildPhase65SpecialVariantRows(productIds)];
  const existingSkus = await selectExistingVariantSkus(supabase, rows.map((row) => row.sku));
  const { error } = await supabase.from("product_variants").upsert(rows, { onConflict: "sku" });
  if (error) throw error;
  return {
    inserted: rows.filter((row) => !existingSkus.has(row.sku)).length,
    updated: rows.filter((row) => existingSkus.has(row.sku)).length,
    total: rows.length,
  };
}

async function selectExistingVariantSkus(supabase: SupabaseAdmin, skus: string[]) {
  if (skus.length === 0) return new Set<string>();
  const { data, error } = await supabase.from("product_variants").select("sku").in("sku", skus);
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.sku));
}

async function seedContent(supabase: SupabaseAdmin) {
  const rows = buildPhase65ContentRows();
  const client = supabase as unknown as {
    from(table: "store_content"): {
      select(columns: string): { in(column: string, values: string[]): Promise<{ data: Array<{ page_key: string }> | null; error: Error | null }> };
      upsert(rows: unknown[], options: { onConflict: string }): Promise<{ error: Error | null }>;
    };
  };
  const pageKeys = rows.map((row) => row.page_key);
  const existing = await client.from("store_content").select("page_key").in("page_key", pageKeys);
  if (existing.error) throw existing.error;
  const existingKeys = new Set((existing.data ?? []).map((row) => row.page_key));
  const result = await client.from("store_content").upsert(rows, { onConflict: "page_key" });
  if (result.error) throw result.error;
  return {
    inserted: rows.filter((row) => !existingKeys.has(row.page_key)).length,
    updated: rows.filter((row) => existingKeys.has(row.page_key)).length,
  };
}

async function getValidImageProductIds(supabase: SupabaseAdmin, productIds: string[]) {
  if (productIds.length === 0) return new Set<string>();
  const { data, error } = await supabase
    .from("product_images")
    .select("product_id")
    .in("product_id", productIds)
    .eq("active", true)
    .eq("approved", true)
    .not("object_path", "is", null)
    .in("mime_type", ["image/jpeg", "image/png", "image/webp"])
    .gt("byte_size", 0)
    .lte("byte_size", 5_242_880);
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.product_id));
}

async function getSummary(supabase: SupabaseAdmin, productRows: Map<string, { id: string; slug: string; status: string }>) {
  const normalizedProducts = normalizePhase65Products();
  const productIds = [...productRows.values()].map((row) => row.id);
  const validImageProductIds = await getValidImageProductIds(supabase, productIds);
  const bySlug = new Map(normalizedProducts.map((product) => [product.slug, product]));
  const productNameById = new Map(normalizedProducts.flatMap((product) => {
    const row = productRows.get(product.slug);
    return row ? [[row.id, product.source.name] as const] : [];
  }));
  const withImages = [...validImageProductIds].flatMap((id) => productNameById.get(id) ?? []);
  const activeIntended = normalizedProducts.filter((product) => product.activeIntended);
  const readyForActivation = activeIntended
    .filter((product) => {
      const row = productRows.get(product.slug);
      return row && validImageProductIds.has(row.id) && product.variants.some((variant) => variant.active && variant.priceXof > 0);
    })
    .map((product) => product.source.name);
  const missingImages = activeIntended
    .filter((product) => {
      const row = productRows.get(product.slug);
      return !row || !validImageProductIds.has(row.id);
    })
    .map((product) => product.source.name);
  const currentlyActive = [...productRows.values()]
    .filter((row) => row.status === "ACTIVE")
    .flatMap((row) => bySlug.get(row.slug)?.source.name ?? []);
  const visibleActive = [...productRows.values()].filter((row) => row.status === "ACTIVE" && validImageProductIds.has(row.id)).length;

  return {
    finalizedImages: withImages,
    readyForActivation,
    missingImages,
    currentlyActive,
    publicCataloguePages: Math.max(Math.ceil(visibleActive / 12), 1),
  };
}

export async function seedPhase65Manual() {
  loadEnvLocal();
  assertCanRunPhase65ManualSeed(process.env);
  normalizePhase65Products(products);

  const supabase = createAdminClient();
  const brandsResult = await seedBrands(supabase);
  const categoriesResult = await seedCategories(supabase);
  const productsResult = await seedProducts(supabase, brandsResult.ids, categoriesResult.ids);
  const variantsResult = await seedVariants(supabase, productsResult.rows);
  const contentResult = await seedContent(supabase);
  const summary = await getSummary(supabase, productsResult.rows);

  console.info(
    [
      `Seeded ${getPhase65CleanupScope().prefix} manual dataset.`,
      `categories inserted=${categoriesResult.inserted} updated=${categoriesResult.updated}`,
      `brands inserted=${brandsResult.inserted} updated=${brandsResult.updated}`,
      `products inserted=${productsResult.inserted} updated=${productsResult.updated}`,
      `variants inserted=${variantsResult.inserted} updated=${variantsResult.updated}`,
      `content_sections inserted=${contentResult.inserted} updated=${contentResult.updated}`,
      `products_with_finalized_images=${summary.finalizedImages.length} [${summary.finalizedImages.join(", ") || "none"}]`,
      `ready_for_activation=${summary.readyForActivation.length} [${summary.readyForActivation.join(", ") || "none"}]`,
      `missing_images=${summary.missingImages.length} [${summary.missingImages.join(", ") || "none"}]`,
      `currently_active=${summary.currentlyActive.length} [${summary.currentlyActive.join(", ") || "none"}]`,
      `public_catalogue_pages_at_12=${summary.publicCataloguePages}`,
      `activation_intended=[${activeIntendedProductNames.join(", ")}]`,
      PHASE65_MANUAL_DESCRIPTION,
    ].join("\n"),
  );
}

seedPhase65Manual().catch((error: unknown) => {
  console.error(sanitizeError(error));
  process.exitCode = 1;
});
