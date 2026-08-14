import "server-only";

import { z } from "zod";

import { canManageOrders, isAdminLike, type StaffProfile } from "@/lib/auth/permissions";
import { requireActiveStaff } from "@/lib/auth/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { processNotifications } from "@/lib/notifications/processor";

export const NOTIFICATION_DEFAULT_PAGE_SIZE = 20;
export const NOTIFICATION_MAX_PAGE_SIZE = 100;

export const notificationStatuses = [
  "PENDING",
  "PROCESSING",
  "SENT",
  "FAILED",
  "CANCELLED",
] as const;
export const notificationChannels = ["EMAIL", "IN_APP"] as const;

export type NotificationStatus = (typeof notificationStatuses)[number];
export type NotificationChannel = (typeof notificationChannels)[number];

export type NotificationFilters = {
  q?: string;
  status: "ALL" | NotificationStatus;
  channel: "ALL" | NotificationChannel;
  template?: string;
  provider?: string;
  dateFrom?: string;
  dateTo?: string;
  sort: "created_desc" | "created_asc" | "next_attempt_asc";
  page: number;
  pageSize: number;
};

export type NotificationListItem = {
  id: string;
  createdAt: string;
  updatedAt: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  recipient: string;
  maskedRecipient: string;
  subject: string | null;
  templateKey: string | null;
  provider: string | null;
  providerMessageId: string | null;
  attemptCount: number;
  maxAttempts: number;
  nextAttemptAt: string | null;
  processedAt: string | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  retryable: boolean | null;
  relatedOrderNumber: string | null;
};

export type NotificationDetail = NotificationListItem & {
  payloadSummary: Record<string, unknown>;
  attempts: Array<{
    id: string;
    attemptNumber: number;
    provider: string;
    status: NotificationStatus;
    providerMessageId: string | null;
    errorCode: string | null;
    errorMessage: string | null;
    retryable: boolean | null;
    createdAt: string;
  }>;
};

export type PaginatedNotifications = {
  items: NotificationListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type NotificationActionResult =
  { ok: true; message: string } | { ok: false; code: string; message: string };

function optional(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function normalizeNotificationFilters(
  input: Record<string, unknown> = {},
): NotificationFilters {
  const status = optional(input.status);
  const channel = optional(input.channel);
  const sort = optional(input.sort);
  return {
    q: optional(input.q)?.slice(0, 120),
    status: (notificationStatuses as readonly string[]).includes(status ?? "")
      ? (status as NotificationStatus)
      : "ALL",
    channel: (notificationChannels as readonly string[]).includes(channel ?? "")
      ? (channel as NotificationChannel)
      : "ALL",
    template: optional(input.template)
      ?.replace(/[^\w:-]/g, "")
      .slice(0, 80),
    provider: optional(input.provider)
      ?.replace(/[^\w:-]/g, "")
      .slice(0, 80),
    dateFrom: optional(input.dateFrom)?.match(/^\d{4}-\d{2}-\d{2}$/)
      ? optional(input.dateFrom)
      : undefined,
    dateTo: optional(input.dateTo)?.match(/^\d{4}-\d{2}-\d{2}$/)
      ? optional(input.dateTo)
      : undefined,
    sort: sort === "created_asc" || sort === "next_attempt_asc" ? sort : "created_desc",
    page: Math.max(Number.parseInt(optional(input.page) ?? "1", 10) || 1, 1),
    pageSize: NOTIFICATION_DEFAULT_PAGE_SIZE,
  };
}

export function canReadNotifications(staff: StaffProfile) {
  return isAdminLike(staff) || canManageOrders(staff);
}

export function canManageNotifications(staff: StaffProfile) {
  return isAdminLike(staff);
}

export async function requireNotificationReadAccess() {
  const staff = await requireActiveStaff({ mode: "redirect" });
  if (!canReadNotifications(staff)) throw new Error("FORBIDDEN");
  return staff;
}

export async function requireNotificationManageAccess() {
  const staff = await requireActiveStaff({ mode: "redirect" });
  if (!canManageNotifications(staff)) throw new Error("FORBIDDEN");
  return staff;
}

export function maskRecipient(value: string) {
  if (value.includes("@")) {
    const [local, domain] = value.split("@");
    return `${local?.[0] ?? "*"}***@${domain ?? "example.com"}`;
  }
  return value.replace(/(\+225\s?\d{2})\d+(\d{2})$/, "$1 ** ** ** $2");
}

function payloadSummary(payload: unknown): Record<string, unknown> {
  const parsed = z
    .object({
    order_id: z.string().optional(),
    order_number: z.string().optional(),
    status: z.string().optional(),
    payment_status: z.string().optional(),
    variant_id: z.string().optional(),
    })
    .passthrough()
    .safeParse(payload);
  if (!parsed.success) return {};
  return {
    orderNumber: parsed.data.order_number,
    status: parsed.data.status,
    paymentStatus: parsed.data.payment_status,
    variantId: parsed.data.variant_id,
  };
}

function mapNotification(row: Record<string, unknown>): NotificationListItem {
  const payload = row.payload as Record<string, unknown> | null;
  return {
    id: String(row.id),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    channel: row.channel as NotificationChannel,
    status: row.status as NotificationStatus,
    recipient: String(row.recipient),
    maskedRecipient: maskRecipient(String(row.recipient)),
    subject: row.subject as string | null,
    templateKey: row.template_key as string | null,
    provider: row.provider as string | null,
    providerMessageId: row.provider_message_id as string | null,
    attemptCount: Number(row.attempt_count ?? 0),
    maxAttempts: Number(row.max_attempts ?? 5),
    nextAttemptAt: row.next_attempt_at as string | null,
    processedAt: row.processed_at as string | null,
    lastErrorCode: row.last_error_code as string | null,
    lastErrorMessage: row.last_error_message as string | null,
    retryable: row.retryable as boolean | null,
    relatedOrderNumber: typeof payload?.order_number === "string" ? payload.order_number : null,
  };
}

function applyFilters(query: unknown, filters: NotificationFilters) {
  let next = query as {
    or(expression: string): typeof next;
    eq(column: string, value: unknown): typeof next;
    gte(column: string, value: unknown): typeof next;
    lte(column: string, value: unknown): typeof next;
  };
  if (filters.q) {
    const escaped = filters.q.replace(/[%,()]/g, " ");
    next = next.or(
      `recipient.ilike.%${escaped}%,subject.ilike.%${escaped}%,template_key.ilike.%${escaped}%`,
    );
  }
  if (filters.status !== "ALL") next = next.eq("status", filters.status);
  if (filters.channel !== "ALL") next = next.eq("channel", filters.channel);
  if (filters.template) next = next.eq("template_key", filters.template);
  if (filters.provider) next = next.eq("provider", filters.provider);
  if (filters.dateFrom) next = next.gte("created_at", `${filters.dateFrom}T00:00:00.000Z`);
  if (filters.dateTo) next = next.lte("created_at", `${filters.dateTo}T23:59:59.999Z`);
  return next;
}

export async function listNotifications(
  params: Record<string, unknown> = {},
): Promise<PaginatedNotifications> {
  const filters = normalizeNotificationFilters(params);
  const from = (filters.page - 1) * filters.pageSize;
  const to = filters.page * filters.pageSize - 1;
  let query = (
    createSupabaseAdminClient() as never as {
    from(table: string): {
      select(columns: string, options?: { count?: "exact" }): unknown;
    };
    }
  )
    .from("notifications")
    .select(
      "id, channel, status, recipient, subject, template_key, payload, provider, provider_message_id, attempt_count, max_attempts, next_attempt_at, processed_at, last_error_code, last_error_message, retryable, created_at, updated_at",
      { count: "exact" },
    );

  query = applyFilters(query, filters);
  const orderedQuery = query as {
    order(column: string, options?: { ascending?: boolean }): typeof orderedQuery;
    range(
      from: number,
      to: number,
    ): Promise<{
      data: Array<Record<string, unknown>> | null;
      error: { message?: string } | null;
      count: number | null;
    }>;
  };
  if (filters.sort === "created_asc") query = orderedQuery.order("created_at", { ascending: true });
  else if (filters.sort === "next_attempt_asc")
    query = orderedQuery.order("next_attempt_at", { ascending: true });
  else query = orderedQuery.order("created_at", { ascending: false });
  const { data, error, count } = await (query as typeof orderedQuery).range(from, to);
  if (error) throw new Error("NOTIFICATIONS_QUERY_FAILED");
  return {
    items: (data ?? []).map((row) => mapNotification(row)),
    page: filters.page,
    pageSize: filters.pageSize,
    total: count ?? 0,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / filters.pageSize)),
  };
}

export async function getNotificationDetail(id: string): Promise<NotificationDetail | null> {
  if (!z.uuid().safeParse(id).success) return null;
  const supabase = createSupabaseAdminClient() as never as {
    from(table: string): {
      select(columns: string): {
        eq(
          column: string,
          value: unknown,
        ): {
          single(): Promise<{
            data: Record<string, unknown> | null;
            error: { message?: string } | null;
          }>;
          order(
            column: string,
            options?: { ascending?: boolean },
          ): Promise<{ data: Array<Record<string, unknown>> | null }>;
        };
      };
    };
  };
  const { data, error } = await supabase
    .from("notifications")
    .select(
      "id, channel, status, recipient, subject, template_key, payload, provider, provider_message_id, attempt_count, max_attempts, next_attempt_at, processed_at, last_error_code, last_error_message, retryable, created_at, updated_at",
    )
    .eq("id", id)
    .single();
  if (error || !data) return null;

  const { data: attempts } = await supabase
    .from("notification_attempts")
    .select(
      "id, attempt_number, provider, status, provider_message_id, error_code, error_message, retryable, created_at",
    )
    .eq("notification_id", id)
    .order("created_at", { ascending: false });

  return {
    ...mapNotification(data),
    payloadSummary: payloadSummary(data.payload),
    attempts: (attempts ?? []).map((attempt) => ({
      id: String(attempt.id),
      attemptNumber: Number(attempt.attempt_number),
      provider: String(attempt.provider),
      status: attempt.status as NotificationStatus,
      providerMessageId: attempt.provider_message_id as string | null,
      errorCode: attempt.error_code as string | null,
      errorMessage: attempt.error_message as string | null,
      retryable: attempt.retryable as boolean | null,
      createdAt: String(attempt.created_at),
    })),
  };
}

export async function cancelNotification(
  id: string,
  actor: StaffProfile,
  reason: string,
): Promise<NotificationActionResult> {
  if (!canManageNotifications(actor))
    return { ok: false, code: "NOTIFICATION_UNAUTHORIZED", message: "Action non autorisée." };
  if (!z.uuid().safeParse(id).success || !reason.trim())
    return { ok: false, code: "NOTIFICATION_INVALID_REQUEST", message: "Motif requis." };
  const { error } = await (
    createSupabaseAdminClient() as never as {
      rpc(
        fn: string,
        args: Record<string, unknown>,
      ): Promise<{ error: { message?: string } | null }>;
    }
  ).rpc("cancel_notification_server", {
    notification_id: id,
    actor_id: actor.id,
    reason: reason.trim(),
  });
  if (error)
    return {
      ok: false,
      code: "NOTIFICATION_CANCEL_FAILED",
      message: "La notification n'a pas pu être annulée.",
    };
  return { ok: true, message: "Notification annulée." };
}

export async function retryNotification(
  id: string,
  actor: StaffProfile,
): Promise<NotificationActionResult> {
  if (!canManageNotifications(actor))
    return { ok: false, code: "NOTIFICATION_UNAUTHORIZED", message: "Action non autorisée." };
  if (!z.uuid().safeParse(id).success)
    return { ok: false, code: "NOTIFICATION_INVALID_REQUEST", message: "Notification invalide." };

  const { error } = await (
    createSupabaseAdminClient() as never as {
      rpc(
        fn: string,
        args: Record<string, unknown>,
      ): Promise<{ error: { message?: string } | null }>;
  }
  ).rpc("retry_notification_server", { notification_id: id, actor_id: actor.id });

  if (error) {
    const code = error.message?.match(/NOTIFICATION_[A-Z_]+/)?.[0];
    if (code === "NOTIFICATION_NOT_FOUND") {
      return { ok: false, code, message: "Notification introuvable." };
    }
    if (code === "NOTIFICATION_NOT_RETRYABLE") {
      return { ok: false, code, message: "Seule une notification en échec peut être relancée." };
    }
    return {
      ok: false,
      code: "NOTIFICATION_RETRY_FAILED",
      message: "La notification n'a pas pu être relancée.",
    };
  }

  await processNotifications(1).catch(() => {
    console.error("NOTIFICATION_MANUAL_RETRY_PROCESS_FAILED");
  });
  return { ok: true, message: "Relance demandée." };
}
