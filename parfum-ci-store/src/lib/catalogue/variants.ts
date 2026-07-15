import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { auditCatalogueEvent } from "@/lib/audit/catalogue";
import { requireCatalogueManager } from "@/lib/catalogue/authorization";
import { toPublicVariantDto } from "@/lib/catalogue/mappers";
import type { PublicVariantDto } from "@/lib/catalogue/types";
import {
  createVariantSchema,
  updateVariantSchema,
  type CreateVariantInput,
  type UpdateVariantInput,
} from "@/lib/catalogue/validation";
import type { Database } from "@/types/database.types";

const VARIANT_PUBLIC_COLUMNS =
  "id, product_id, sku, size_ml, concentration, price_xof, compare_at_price_xof, stock_on_hand, reserved_quantity, low_stock_threshold, active" as const;

export async function listActiveVariantsForProducts(productIds: string[]) {
  if (productIds.length === 0) {
    return new Map<string, PublicVariantDto[]>();
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("product_variants")
    .select(VARIANT_PUBLIC_COLUMNS)
    .in("product_id", productIds)
    .eq("active", true)
    .gt("price_xof", 0)
    .order("price_xof", { ascending: true });

  if (error) {
    throw error;
  }

  const byProduct = new Map<string, PublicVariantDto[]>();

  for (const row of data ?? []) {
    const variants = byProduct.get(row.product_id) ?? [];
    variants.push(toPublicVariantDto(row));
    byProduct.set(row.product_id, variants);
  }

  return byProduct;
}

export async function createVariant(input: CreateVariantInput) {
  const staff = await requireCatalogueManager();
  const parsed = createVariantSchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("product_variants")
    .insert({
      product_id: parsed.productId,
      sku: parsed.sku,
      size_ml: parsed.sizeMl,
      concentration: parsed.concentration ?? null,
      price_xof: parsed.priceXof,
      compare_at_price_xof: parsed.compareAtPriceXof ?? null,
      cost_price_xof: parsed.costPriceXof ?? null,
      stock_on_hand: 0,
      reserved_quantity: 0,
      low_stock_threshold: parsed.lowStockThreshold,
      active: parsed.active,
    })
    .select(VARIANT_PUBLIC_COLUMNS)
    .single();

  if (error || !data) {
    throw error;
  }

  await auditCatalogueEvent({
    actorId: staff.id,
    action: "CATALOGUE_VARIANT_CREATED",
    resourceType: "product_variant",
    resourceId: data.id,
    metadata: { product_id: parsed.productId, changed_fields: ["sku", "size_ml", "price_xof"] },
  });

  return toPublicVariantDto(data);
}

export async function updateVariant(id: string, input: UpdateVariantInput) {
  const staff = await requireCatalogueManager();
  const parsed = updateVariantSchema.parse(input);
  const update: Database["public"]["Tables"]["product_variants"]["Update"] = {};

  if (parsed.sku !== undefined) update.sku = parsed.sku;
  if (parsed.sizeMl !== undefined) update.size_ml = parsed.sizeMl;
  if (parsed.concentration !== undefined) update.concentration = parsed.concentration;
  if (parsed.priceXof !== undefined) update.price_xof = parsed.priceXof;
  if (parsed.compareAtPriceXof !== undefined) update.compare_at_price_xof = parsed.compareAtPriceXof;
  if (parsed.costPriceXof !== undefined) update.cost_price_xof = parsed.costPriceXof;
  if (parsed.lowStockThreshold !== undefined) update.low_stock_threshold = parsed.lowStockThreshold;
  if (parsed.active !== undefined) update.active = parsed.active;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("product_variants")
    .update(update)
    .eq("id", id)
    .select(VARIANT_PUBLIC_COLUMNS)
    .single();

  if (error || !data) {
    throw error;
  }

  await auditCatalogueEvent({
    actorId: staff.id,
    action: parsed.active === false ? "CATALOGUE_VARIANT_DEACTIVATED" : "CATALOGUE_VARIANT_UPDATED",
    resourceType: "product_variant",
    resourceId: id,
    metadata: { changed_fields: Object.keys(update) },
  });

  return toPublicVariantDto(data);
}
