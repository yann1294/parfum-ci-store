import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { auditCatalogueEvent } from "@/lib/audit/catalogue";
import { requireCatalogueManager } from "@/lib/catalogue/authorization";
import { toPublicCategoryDto } from "@/lib/catalogue/mappers";
import type { PublicCategoryDto } from "@/lib/catalogue/types";
import {
  createCategorySchema,
  updateCategorySchema,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from "@/lib/catalogue/validation";
import { generateProductSlug } from "@/lib/catalogue/slug";
import type { Database } from "@/types/database.types";

const CATEGORY_PUBLIC_COLUMNS = "id, parent_id, name, slug, description, active, sort_order" as const;

export async function listActiveCategories(): Promise<PublicCategoryDto[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .select(CATEGORY_PUBLIC_COLUMNS)
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map(toPublicCategoryDto);
}

export async function createCategory(input: CreateCategoryInput) {
  const staff = await requireCatalogueManager();
  const parsed = createCategorySchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .insert({
      parent_id: parsed.parentId ?? null,
      name: parsed.name,
      slug: parsed.slug ?? generateProductSlug(parsed.name),
      description: parsed.description ?? null,
      active: parsed.active,
      sort_order: parsed.sortOrder,
    })
    .select("id, parent_id, name, slug, description")
    .single();

  if (error || !data) {
    throw error;
  }

  await auditCatalogueEvent({
    actorId: staff.id,
    action: "CATALOGUE_CATEGORY_CREATED",
    resourceType: "category",
    resourceId: data.id,
    metadata: { changed_fields: ["parent_id", "name", "slug", "description", "active", "sort_order"] },
  });

  return toPublicCategoryDto(data);
}

export async function updateCategory(id: string, input: UpdateCategoryInput) {
  const staff = await requireCatalogueManager();
  const parsed = updateCategorySchema.parse(input);
  const update: Database["public"]["Tables"]["categories"]["Update"] = {};

  if (parsed.parentId !== undefined) update.parent_id = parsed.parentId;
  if (parsed.name !== undefined) update.name = parsed.name;
  if (parsed.slug !== undefined) update.slug = parsed.slug;
  if (parsed.description !== undefined) update.description = parsed.description;
  if (parsed.active !== undefined) update.active = parsed.active;
  if (parsed.sortOrder !== undefined) update.sort_order = parsed.sortOrder;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .update(update)
    .eq("id", id)
    .select("id, parent_id, name, slug, description")
    .single();

  if (error || !data) {
    throw error;
  }

  await auditCatalogueEvent({
    actorId: staff.id,
    action: "CATALOGUE_CATEGORY_UPDATED",
    resourceType: "category",
    resourceId: id,
    metadata: { changed_fields: Object.keys(update) },
  });

  return toPublicCategoryDto(data);
}
