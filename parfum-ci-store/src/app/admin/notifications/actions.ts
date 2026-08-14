"use server";

import { revalidatePath } from "next/cache";

import { cancelNotification, requireNotificationManageAccess, retryNotification, type NotificationActionResult } from "@/lib/notifications/admin";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
function revalidateNotifications(id?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/notifications");
  if (id) revalidatePath(`/admin/notifications/${id}`);
}

export async function retryNotificationFromForm(id: string): Promise<NotificationActionResult> {
  const staff = await requireNotificationManageAccess();
  const result = await retryNotification(id, staff);
  revalidateNotifications(id);
  return result;
}

export async function cancelNotificationFromForm(id: string, formData: FormData): Promise<NotificationActionResult> {
  const staff = await requireNotificationManageAccess();
  const result = await cancelNotification(id, staff, text(formData, "reason") ?? "");
  revalidateNotifications(id);
  return result;
}
