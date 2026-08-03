"use server";

import { revalidatePath } from "next/cache";

import {
  adjustInventory,
  inventoryAdjustmentSchema,
  type InventoryActionResult,
  type InventoryAdjustmentResult,
} from "@/lib/inventory/admin";
import { requireInventoryAccess } from "@/lib/inventory/admin";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function integer(formData: FormData, key: string) {
  const value = text(formData, key);
  return value ? Number.parseInt(value, 10) : undefined;
}

function revalidateInventory(variantId: string) {
  revalidatePath("/admin/inventaire");
  revalidatePath("/admin/inventaire/stock-faible");
  revalidatePath(`/admin/inventaire/${variantId}`);
  revalidatePath("/admin/produits");
  revalidatePath("/catalogue");
  revalidatePath("/");
}

export async function adjustInventoryFromForm(
  variantId: string,
  formData: FormData,
): Promise<InventoryActionResult<InventoryAdjustmentResult>> {
  const staff = await requireInventoryAccess();
  const parsed = inventoryAdjustmentSchema.safeParse({
    variantId,
    operationType: text(formData, "operationType"),
    quantity: integer(formData, "quantity") ?? -1,
    adjustmentDirection: text(formData, "adjustmentDirection"),
    reason: text(formData, "reason"),
    reference: text(formData, "reference"),
    idempotencyKey: text(formData, "idempotencyKey") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      code: "INVENTORY_INVALID_REQUEST",
      message: parsed.error.issues[0]?.message ?? "La demande d'inventaire est invalide.",
    };
  }

  const result = await adjustInventory(parsed.data, staff);
  if (result.ok) {
    revalidateInventory(variantId);
  }

  return result;
}
