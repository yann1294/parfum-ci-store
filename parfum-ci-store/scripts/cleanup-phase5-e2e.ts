import { createClient } from "@supabase/supabase-js";

import type { Database } from "../src/types/database.types.ts";
import { assertCanRunPhase5E2eScript, getPhase5CleanupScope } from "./phase5-e2e-data.ts";

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

async function selectPrefixedProducts(supabase: SupabaseAdmin, namePattern: string) {
  const { data, error } = await supabase
    .from("products")
    .select("id")
    .like("name", namePattern);

  if (error) throw error;
  return (data ?? []).map((row) => row.id);
}

async function selectPrefixedVariants(supabase: SupabaseAdmin, skuPattern: string) {
  const { data, error } = await supabase
    .from("product_variants")
    .select("id")
    .like("sku", skuPattern);

  if (error) throw error;
  return (data ?? []).map((row) => row.id);
}

async function removeStorageObjectsForProducts(supabase: SupabaseAdmin, productIds: string[]) {
  if (productIds.length === 0) return 0;

  const { data, error } = await supabase
    .from("product_images")
    .select("object_path")
    .in("product_id", productIds)
    .not("object_path", "is", null);

  if (error) throw error;

  const objectPaths = (data ?? [])
    .map((row) => row.object_path)
    .filter((path): path is string => Boolean(path));

  if (objectPaths.length === 0) return 0;

  const { error: removeError } = await supabase.storage.from("product-images").remove(objectPaths);
  if (removeError) throw removeError;

  return objectPaths.length;
}

async function deleteByIds(
  supabase: SupabaseAdmin,
  table: "product_image_uploads" | "product_images" | "products" | "product_variants",
  column: "product_id" | "id",
  ids: string[],
) {
  if (ids.length === 0) return;
  const { error } = await supabase.from(table).delete().in(column, ids);
  if (error) throw error;
}

export async function cleanupPhase5E2e() {
  assertCanRunPhase5E2eScript(process.env);
  const scope = getPhase5CleanupScope();
  const supabase = createAdminClient();

  const productIds = await selectPrefixedProducts(supabase, scope.namePattern);
  const variantIds = await selectPrefixedVariants(supabase, scope.skuPattern);
  const removedObjects = await removeStorageObjectsForProducts(supabase, productIds);

  await deleteByIds(supabase, "product_image_uploads", "product_id", productIds);
  await deleteByIds(supabase, "product_images", "product_id", productIds);
  await deleteByIds(supabase, "product_variants", "id", variantIds);
  await deleteByIds(supabase, "products", "id", productIds);

  const { error: categoryError } = await supabase
    .from("categories")
    .delete()
    .like("name", scope.namePattern);
  if (categoryError) throw categoryError;

  const { error: brandError } = await supabase.from("brands").delete().like("name", scope.namePattern);
  if (brandError) throw brandError;

  console.info(
    [
      `Cleaned ${scope.prefix} data.`,
      `products=${productIds.length}`,
      `variants=${variantIds.length}`,
      `storage_objects=${removedObjects}`,
    ].join(" "),
  );
}

cleanupPhase5E2e().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Phase 5 E2E cleanup failed.");
  process.exitCode = 1;
});
