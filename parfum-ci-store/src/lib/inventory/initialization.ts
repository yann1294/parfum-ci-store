import "server-only";

import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CatalogueError } from "@/lib/catalogue/errors";

export const initializeVariantInventorySchema = z
  .object({
    variantId: z.uuid(),
    initialStock: z.number().int().min(0),
    reason: z.string().trim().min(1).max(300).default("Stock initial à la création de la variante"),
  })
  .strict();

export type InitializeVariantInventoryInput = z.infer<typeof initializeVariantInventorySchema>;

type InventoryRpcClient = {
  rpc(
    fn: "initialize_variant_inventory",
    args: {
      target_variant_id: string;
      initial_stock: number;
      movement_reason: string;
    },
  ): Promise<{ error: { code?: string; message?: string } | null }>;
};

export async function initializeVariantInventory(input: InitializeVariantInventoryInput) {
  const parsed = initializeVariantInventorySchema.parse(input);
  const supabase = (await createSupabaseServerClient()) as unknown as InventoryRpcClient;
  const { error } = await supabase.rpc("initialize_variant_inventory", {
    target_variant_id: parsed.variantId,
    initial_stock: parsed.initialStock,
    movement_reason: parsed.reason,
  });

  if (error) {
    if (error.code === "42501") {
      throw new CatalogueError("FORBIDDEN", "Vous n'êtes pas autorisé à initialiser le stock.");
    }

    if (error.code === "23505") {
      throw new CatalogueError("INVENTORY_ALREADY_INITIALIZED", "Le stock de cette variante est déjà initialisé.");
    }

    throw new CatalogueError("INVENTORY_INITIALIZATION_FAILED", "Le stock initial n'a pas pu être enregistré.");
  }
}
