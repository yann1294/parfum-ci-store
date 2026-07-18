import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "../src/types/database.types";
import {
  PHASE65_MANUAL_DESCRIPTION,
  assertCanRunPhase65ManualCleanup,
  buildPhase65Brands,
  buildPhase65Categories,
  getPhase65CleanupScope,
} from "./fixtures/phase65-catalogue-data";

type SupabaseAdmin = ReturnType<typeof createClient<Database>>;

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
  return "Phase 6.5 manual cleanup failed.";
}

function isDryRun() {
  return process.argv.includes("--dry-run");
}

async function selectFixtureProducts(supabase: SupabaseAdmin) {
  const scope = getPhase65CleanupScope();
  const { data, error } = await supabase
    .from("products")
    .select("id, slug, name")
    .like("slug", scope.productSlugPattern);
  if (error) throw error;
  return data ?? [];
}

async function selectFixtureVariants(supabase: SupabaseAdmin, productIds: string[]) {
  if (productIds.length === 0) return [];
  const { data, error } = await supabase.from("product_variants").select("id, sku").in("product_id", productIds);
  if (error) throw error;
  return data ?? [];
}

async function selectFixtureImages(supabase: SupabaseAdmin, productIds: string[]) {
  if (productIds.length === 0) return [];
  const { data, error } = await supabase
    .from("product_images")
    .select("id, object_path")
    .in("product_id", productIds);
  if (error) throw error;
  return data ?? [];
}

async function removeStorageObjects(supabase: SupabaseAdmin, objectPaths: string[], dryRun: boolean) {
  const paths = objectPaths.filter((path): path is string => Boolean(path));
  if (paths.length === 0 || dryRun) return 0;
  const { error } = await supabase.storage.from("product-images").remove(paths);
  if (error) throw error;
  return paths.length;
}

async function deleteFromTable(
  supabase: SupabaseAdmin,
  table: "product_image_uploads" | "product_images" | "product_variants" | "products",
  column: "product_id" | "id",
  ids: string[],
  dryRun: boolean,
) {
  if (ids.length === 0 || dryRun) return;
  const { error } = await supabase.from(table).delete().in(column, ids);
  if (error) throw error;
}

async function cleanupContent(supabase: SupabaseAdmin, dryRun: boolean) {
  const client = supabase as unknown as {
    from(table: "store_content"): {
      select(columns: string): { in(column: string, values: string[]): Promise<{ data: Array<{ page_key: string; content: unknown }> | null; error: Error | null }> };
      delete(): { in(column: string, values: string[]): Promise<{ error: Error | null }> };
    };
  };
  const pageKeys = ["about", "contact", "delivery", "social"];
  const selected = await client.from("store_content").select("page_key, content").in("page_key", pageKeys);
  if (selected.error) throw selected.error;
  const fixturePageKeys = (selected.data ?? [])
    .filter((row) => JSON.stringify(row.content).includes(getPhase65CleanupScope().prefix))
    .map((row) => row.page_key);

  if (fixturePageKeys.length > 0 && !dryRun) {
    const deleted = await client.from("store_content").delete().in("page_key", fixturePageKeys);
    if (deleted.error) throw deleted.error;
  }

  return fixturePageKeys.length;
}

async function getUnreferencedFixtureEntityIds(supabase: SupabaseAdmin, table: "brands" | "categories") {
  const rows = table === "brands" ? buildPhase65Brands() : buildPhase65Categories();
  const { data, error } = await supabase
    .from(table)
    .select("id, slug, description")
    .in("slug", rows.map((row) => row.slug))
    .eq("description", PHASE65_MANUAL_DESCRIPTION);
  if (error) throw error;

  const removable: string[] = [];
  for (const row of data ?? []) {
    const column = table === "brands" ? "brand_id" : "category_id";
    const countResult = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq(column, row.id);
    if (countResult.error) throw countResult.error;
    if ((countResult.count ?? 0) === 0) removable.push(row.id);
  }
  return removable;
}

async function deleteFixtureEntities(
  supabase: SupabaseAdmin,
  table: "brands" | "categories",
  ids: string[],
  dryRun: boolean,
) {
  if (ids.length === 0 || dryRun) return;
  const { error } = await supabase.from(table).delete().in("id", ids);
  if (error) throw error;
}

export async function cleanupPhase65Manual() {
  loadEnvLocal();
  assertCanRunPhase65ManualCleanup(process.env);
  const dryRun = isDryRun();
  const supabase = createAdminClient();
  const products = await selectFixtureProducts(supabase);
  const productIds = products.map((product) => product.id);
  const variants = await selectFixtureVariants(supabase, productIds);
  const images = await selectFixtureImages(supabase, productIds);
  const removedObjects = await removeStorageObjects(
    supabase,
    images.flatMap((image) => image.object_path ?? []),
    dryRun,
  );

  await deleteFromTable(supabase, "product_image_uploads", "product_id", productIds, dryRun);
  await deleteFromTable(supabase, "product_images", "product_id", productIds, dryRun);
  await deleteFromTable(supabase, "product_variants", "product_id", productIds, dryRun);
  await deleteFromTable(supabase, "products", "id", productIds, dryRun);

  const contentSections = await cleanupContent(supabase, dryRun);
  const brandIds = await getUnreferencedFixtureEntityIds(supabase, "brands");
  const categoryIds = await getUnreferencedFixtureEntityIds(supabase, "categories");
  await deleteFixtureEntities(supabase, "brands", brandIds, dryRun);
  await deleteFixtureEntities(supabase, "categories", categoryIds, dryRun);

  console.info(
    [
      `${dryRun ? "Dry run for" : "Cleaned"} ${getPhase65CleanupScope().prefix} manual dataset.`,
      `products=${products.length}`,
      `variants=${variants.length}`,
      `image_rows=${images.length}`,
      `storage_objects=${dryRun ? images.filter((image) => image.object_path).length : removedObjects}`,
      `content_sections=${contentSections}`,
      `unreferenced_fixture_brands=${brandIds.length}`,
      `unreferenced_fixture_categories=${categoryIds.length}`,
    ].join("\n"),
  );
}

cleanupPhase65Manual().catch((error: unknown) => {
  console.error(sanitizeError(error));
  process.exitCode = 1;
});
