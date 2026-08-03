"use server";

import { revalidatePath } from "next/cache";

import {
  addInternalOrderNote,
  internalNoteSchema,
  orderTransitionSchema,
  paymentStatusUpdateSchema,
  transitionOrder,
  updatePaymentStatus,
  type AdminOrderNote,
  type OrderActionResult,
  type OrderTransitionResult,
  type PaymentStatusUpdateResult,
} from "@/lib/orders/admin";
import { requireOrderManageAccess, requireOrderReadAccess } from "@/lib/orders/admin";
import { evaluateLowStockForOrder } from "@/lib/notifications/low-stock";
import { processNotifications } from "@/lib/notifications/processor";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function revalidateOrderSurfaces(orderId: string) {
  revalidatePath("/admin/commandes");
  revalidatePath(`/admin/commandes/${orderId}`);
  revalidatePath("/admin/inventaire");
  revalidatePath("/admin/inventaire/stock-faible");
  revalidatePath("/admin/produits");
  revalidatePath("/catalogue");
  revalidatePath("/");
  revalidatePath("/suivi-commande");
}

export async function transitionOrderFromForm(
  orderId: string,
  formData: FormData,
): Promise<OrderActionResult<OrderTransitionResult>> {
  const staff = await requireOrderManageAccess();
  const parsed = orderTransitionSchema.safeParse({
    orderId,
    expectedStatus: text(formData, "expectedStatus"),
    targetStatus: text(formData, "targetStatus"),
    reason: text(formData, "reason"),
    note: text(formData, "note"),
    idempotencyKey: text(formData, "idempotencyKey") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      code: "ORDER_ADMIN_INVALID_REQUEST",
      message: parsed.error.issues[0]?.message ?? "La demande est invalide.",
    };
  }

  const result = await transitionOrder(parsed.data, staff);
  if (result.ok) {
    if (result.data.stockEffect !== "NONE") {
      evaluateLowStockForOrder(orderId).catch(() => console.error("LOW_STOCK_POST_TRANSITION_FAILED"));
    }
    processNotifications(2).catch(() => console.error("NOTIFICATION_POST_TRANSITION_PROCESS_FAILED"));
    revalidateOrderSurfaces(orderId);
  }
  return result;
}

export async function updatePaymentStatusFromForm(
  orderId: string,
  formData: FormData,
): Promise<OrderActionResult<PaymentStatusUpdateResult>> {
  const staff = await requireOrderManageAccess();
  const parsed = paymentStatusUpdateSchema.safeParse({
    orderId,
    targetPaymentStatus: text(formData, "targetPaymentStatus"),
    reference: text(formData, "reference"),
    reason: text(formData, "reason"),
    idempotencyKey: text(formData, "idempotencyKey") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      code: "ORDER_ADMIN_INVALID_REQUEST",
      message: parsed.error.issues[0]?.message ?? "La demande est invalide.",
    };
  }

  const result = await updatePaymentStatus(parsed.data, staff);
  if (result.ok) {
    processNotifications(2).catch(() => console.error("NOTIFICATION_POST_PAYMENT_PROCESS_FAILED"));
    revalidateOrderSurfaces(orderId);
  }
  return result;
}

export async function addInternalOrderNoteFromForm(
  orderId: string,
  formData: FormData,
): Promise<OrderActionResult<AdminOrderNote>> {
  const staff = await requireOrderReadAccess();
  const parsed = internalNoteSchema.safeParse({
    orderId,
    note: text(formData, "note") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      code: "ORDER_ADMIN_INVALID_REQUEST",
      message: parsed.error.issues[0]?.message ?? "La note est invalide.",
    };
  }

  const result = await addInternalOrderNote(parsed.data, staff);
  if (result.ok) revalidateOrderSurfaces(orderId);
  return result;
}
