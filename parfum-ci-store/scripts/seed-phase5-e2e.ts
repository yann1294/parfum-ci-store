import { createClient } from "@supabase/supabase-js";

import type { Database } from "../src/types/database.types.ts";
import {
  assertCanRunPhase5E2eScript,
  buildPhase5Brands,
  buildPhase5Categories,
  buildPhase5Products,
  buildPhase5Variants,
  getPhase5CleanupScope,
} from "./phase5-e2e-data.ts";

type SupabaseAdmin = ReturnType<typeof createClient<Database>>;

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }
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

async function upsertBrands(supabase: SupabaseAdmin) {
  const rows = buildPhase5Brands();
  const { data, error } = await supabase
    .from("brands")
    .upsert(rows, { onConflict: "slug" })
    .select("id, slug");

  if (error) throw error;
  return new Map((data ?? []).map((row) => [row.slug, row.id]));
}

async function upsertCategories(supabase: SupabaseAdmin) {
  const rows = buildPhase5Categories();
  const { data, error } = await supabase
    .from("categories")
    .upsert(rows, { onConflict: "slug" })
    .select("id, slug");

  if (error) throw error;
  return new Map((data ?? []).map((row) => [row.slug, row.id]));
}

async function upsertProducts(
  supabase: SupabaseAdmin,
  brandIds: Map<string, string>,
  categoryIds: Map<string, string>,
) {
  const products = buildPhase5Products();
  const productRows: Array<Database["public"]["Tables"]["products"]["Insert"]> = products.map(
    (product) => ({
      brand_id: brandIds.get(`e2e-20260716-a-brand-${String(product.brandIndex).padStart(2, "0")}`),
      category_id: categoryIds.get(
        `e2e-20260716-a-category-${String(product.categoryIndex).padStart(2, "0")}`,
      ),
      name: product.name,
      slug: product.slug,
      short_description: `Donnée de test ${product.key}`,
      description: product.description,
      fragrance_family: product.key.includes("active") ? "Boisée" : "Florale",
      top_notes: ["bergamote", "poivre rose"],
      heart_notes: ["jasmin", "cèdre"],
      base_notes: ["musc", "ambre"],
      gender_category: product.key.includes("draft") ? "Unisexe" : "Femme",
      status: product.status === "ARCHIVED" ? "ARCHIVED" : "DRAFT",
      featured: product.key === "primary-draft",
      seo_title: product.name,
      seo_description: product.description,
    }),
  );

  const { data, error } = await supabase
    .from("products")
    .upsert(productRows, { onConflict: "slug" })
    .select("id, slug, status");

  if (error) throw error;
  return new Map((data ?? []).map((row) => [row.slug, row]));
}

async function upsertVariants(supabase: SupabaseAdmin, productRows: Map<string, { id: string; slug: string }>) {
  const productSeeds = buildPhase5Products();
  const productIdByKey = new Map(
    productSeeds.flatMap((product) => {
      const row = productRows.get(product.slug);
      return row ? [[product.key, row.id] as const] : [];
    }),
  );

  const rows: Array<Database["public"]["Tables"]["product_variants"]["Insert"]> =
    buildPhase5Variants().map((variant) => {
      const productId = productIdByKey.get(variant.productKey);
      if (!productId) {
        throw new Error(`Missing seeded product for variant ${variant.sku}.`);
      }

      return {
        product_id: productId,
        sku: variant.sku,
        size_ml: variant.sizeMl,
        concentration: variant.concentration,
        price_xof: variant.priceXof,
        compare_at_price_xof: variant.compareAtPriceXof,
        cost_price_xof: variant.costPriceXof,
        stock_on_hand: variant.stockOnHand,
        reserved_quantity: variant.reservedQuantity,
        low_stock_threshold: variant.lowStockThreshold,
        active: variant.active,
      };
    });

  const { error } = await supabase.from("product_variants").upsert(rows, { onConflict: "sku" });
  if (error) throw error;
}

async function activateProductsWithRealImages(
  supabase: SupabaseAdmin,
  productRows: Map<string, { id: string; slug: string; status: string }>,
) {
  const activeSeeds = buildPhase5Products().filter((product) => product.desiredActive);
  let activated = 0;
  let waitingForImages = 0;

  for (const seed of activeSeeds) {
    const row = productRows.get(seed.slug);
    if (!row) continue;

    const { data: images, error: imageError } = await supabase
      .from("product_images")
      .select("id")
      .eq("product_id", row.id)
      .eq("active", true)
      .eq("approved", true)
      .not("object_path", "is", null)
      .in("mime_type", ["image/jpeg", "image/png", "image/webp"])
      .gt("byte_size", 0)
      .lte("byte_size", 5_242_880)
      .limit(1);

    if (imageError) throw imageError;

    if (!images?.length) {
      waitingForImages += 1;
      continue;
    }

    const { error } = await supabase.from("products").update({ status: "ACTIVE" }).eq("id", row.id);
    if (error) throw error;
    activated += 1;
  }

  return { activated, waitingForImages };
}

export async function seedPhase5E2e() {
  assertCanRunPhase5E2eScript(process.env);
  const scope = getPhase5CleanupScope();
  const supabase = createAdminClient();

  const brandIds = await upsertBrands(supabase);
  const categoryIds = await upsertCategories(supabase);
  const productRows = await upsertProducts(supabase, brandIds, categoryIds);
  await upsertVariants(supabase, productRows);
  const activation = await activateProductsWithRealImages(supabase, productRows);

  console.info(
    [
      `Seeded ${scope.prefix} data.`,
      `brands=${brandIds.size}`,
      `categories=${categoryIds.size}`,
      `products=${productRows.size}`,
      `variants=25`,
      `activated=${activation.activated}`,
      `waiting_for_manual_images=${activation.waitingForImages}`,
    ].join(" "),
  );
}

seedPhase5E2e().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Phase 5 E2E seed failed.");
  process.exitCode = 1;
});
