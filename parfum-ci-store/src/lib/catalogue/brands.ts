import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { auditCatalogueEvent } from "@/lib/audit/catalogue";
import { requireCatalogueManager } from "@/lib/catalogue/authorization";
import { toPublicBrandDto } from "@/lib/catalogue/mappers";
import type { PublicBrandDto } from "@/lib/catalogue/types";
import {
  createBrandSchema,
  updateBrandSchema,
  type CreateBrandInput,
  type UpdateBrandInput,
} from "@/lib/catalogue/validation";
import { generateProductSlug } from "@/lib/catalogue/slug";
import type { Database } from "@/types/database.types";

const BRAND_PUBLIC_COLUMNS = "id, name, slug, description, active, sort_order" as const;

export async function listActiveBrands(): Promise<PublicBrandDto[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("brands")
    .select(BRAND_PUBLIC_COLUMNS)
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map(toPublicBrandDto);
}

export async function createBrand(input: CreateBrandInput) {
  const staff = await requireCatalogueManager();
  const parsed = createBrandSchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("brands")
    .insert({
      name: parsed.name,
      slug: parsed.slug ?? generateProductSlug(parsed.name),
      description: parsed.description ?? null,
      image_url: parsed.imageUrl ?? null,
      active: parsed.active,
      sort_order: parsed.sortOrder,
    })
    .select("id, name, slug, description")
    .single();

  if (error || !data) {
    throw error;
  }

  await auditCatalogueEvent({
    actorId: staff.id,
    action: "CATALOGUE_BRAND_CREATED",
    resourceType: "brand",
    resourceId: data.id,
    metadata: { changed_fields: ["name", "slug", "description", "active", "sort_order"] },
  });

  return toPublicBrandDto(data);
}

export async function updateBrand(id: string, input: UpdateBrandInput) {
  const staff = await requireCatalogueManager();
  const parsed = updateBrandSchema.parse(input);
  const update: Database["public"]["Tables"]["brands"]["Update"] = {};

  if (parsed.name !== undefined) update.name = parsed.name;
  if (parsed.slug !== undefined) update.slug = parsed.slug;
  if (parsed.description !== undefined) update.description = parsed.description;
  if (parsed.imageUrl !== undefined) update.image_url = parsed.imageUrl;
  if (parsed.active !== undefined) update.active = parsed.active;
  if (parsed.sortOrder !== undefined) update.sort_order = parsed.sortOrder;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("brands")
    .update(update)
    .eq("id", id)
    .select("id, name, slug, description")
    .single();

  if (error || !data) {
    throw error;
  }

  await auditCatalogueEvent({
    actorId: staff.id,
    action: "CATALOGUE_BRAND_UPDATED",
    resourceType: "brand",
    resourceId: id,
    metadata: { changed_fields: Object.keys(update) },
  });

  return toPublicBrandDto(data);
}
