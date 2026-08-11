import "server-only";

import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { canManageMessages, type StaffProfile } from "@/lib/auth/permissions";
import { requireActiveStaff } from "@/lib/auth/server";
import { processNotifications } from "@/lib/notifications/processor";
import { contactMessageRequestSchema, contactErrorMessage } from "@/lib/messages/contract";
import { createContactMessage } from "@/lib/messages/service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database.types";

type MessageStatus = Database["public"]["Enums"]["message_status"];
type MessageSource = Database["public"]["Enums"]["message_source"];

const PAGE_SIZE = 20;

export type MessageFilters = {
  q: string;
  status: MessageStatus | "ALL";
  source: MessageSource | "ALL";
  assigned: "ALL" | "UNASSIGNED" | "MINE";
  dateFrom?: string;
  dateTo?: string;
  sort: "created_desc" | "created_asc" | "updated_desc";
  page: number;
};

export type AdminMessageListItem = {
  id: string;
  customerName: string;
  maskedContact: string;
  subject: string;
  excerpt: string;
  source: MessageSource;
  status: MessageStatus;
  assignedTo: string | null;
  assignedName: string | null;
  orderNumber: string | null;
  productName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PaginatedMessages = {
  items: AdminMessageListItem[];
  page: number;
  totalPages: number;
  total: number;
};

const filterSchema = z.object({
  q: z.string().trim().max(120).catch(""),
  status: z.enum(["ALL", "NEW", "OPEN", "RESOLVED", "SPAM"]).catch("ALL"),
  source: z.enum(["ALL", "WEBSITE", "INSTAGRAM", "FACEBOOK", "TIKTOK", "WHATSAPP", "PHONE", "EMAIL", "OTHER"]).catch("ALL"),
  assigned: z.enum(["ALL", "UNASSIGNED", "MINE"]).catch("ALL"),
  dateFrom: z.iso.date().optional().catch(undefined),
  dateTo: z.iso.date().optional().catch(undefined),
  sort: z.enum(["created_desc", "created_asc", "updated_desc"]).catch("created_desc"),
  page: z.coerce.number().int().min(1).catch(1),
});

export function normalizeMessageFilters(params: Record<string, string | undefined>): MessageFilters {
  return filterSchema.parse(params);
}

export async function requireMessageAccess() {
  const staff = await requireActiveStaff();
  if (!canManageMessages(staff)) redirect("/acces-refuse");
  return staff;
}

function maskEmail(email: string | null | undefined) {
  if (!email) return null;
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  return `${local.slice(0, 1)}***@${domain}`;
}

function maskPhone(phone: string | null | undefined) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "***";
  return `+225 ** ** ** ${digits.slice(-2)}`;
}

function contactDisplay(row: Record<string, unknown>) {
  return maskPhone(row.customer_phone as string | null) ?? maskEmail(row.customer_email as string | null) ?? (row.external_handle as string | null) ?? "Contact masqué";
}

export function messageSourceLabel(source: string) {
  const labels: Record<string, string> = {
    WEBSITE: "Site web",
    INSTAGRAM: "Instagram",
    FACEBOOK: "Facebook",
    TIKTOK: "TikTok",
    WHATSAPP: "WhatsApp",
    PHONE: "Téléphone",
    EMAIL: "E-mail",
    OTHER: "Autre",
  };
  return labels[source] ?? "Message";
}

export function messageStatusLabel(status: string) {
  const labels: Record<string, string> = {
    NEW: "Nouveau",
    OPEN: "Ouvert",
    RESOLVED: "Résolu",
    SPAM: "Spam",
  };
  return labels[status] ?? "Message";
}

function productName(row: Record<string, unknown>) {
  const snapshot = row.product_snapshot as Record<string, unknown> | null;
  return typeof snapshot?.productName === "string" ? snapshot.productName : null;
}

function toListItem(row: Record<string, unknown>): AdminMessageListItem {
  const assignee = row.profiles as { full_name?: string | null } | null;
  const body = String(row.body ?? "");
  return {
    id: row.id as string,
    customerName: row.customer_name as string,
    maskedContact: contactDisplay(row),
    subject: (row.subject as string | null) ?? "Message client",
    excerpt: body.length > 180 ? `${body.slice(0, 180)}...` : body,
    source: row.source as MessageSource,
    status: row.status as MessageStatus,
    assignedTo: row.assigned_to as string | null,
    assignedName: assignee?.full_name ?? null,
    orderNumber: (row.order_number as string | null) ?? null,
    productName: productName(row),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function listMessages(params: Record<string, string | undefined>, staff?: StaffProfile): Promise<PaginatedMessages> {
  const actor = staff ?? await requireMessageAccess();
  const filters = normalizeMessageFilters(params);
  const from = (filters.page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  type MessageQuery = {
    eq(column: string, value: unknown): MessageQuery;
    is(column: string, value: null): MessageQuery;
    gte(column: string, value: string): MessageQuery;
    lte(column: string, value: string): MessageQuery;
    or(value: string): MessageQuery;
    order(column: string, options?: { ascending?: boolean }): MessageQuery;
    range(from: number, to: number): Promise<{ data: Array<Record<string, unknown>> | null; error: { message?: string } | null; count: number | null }>;
  };
  let query = (createSupabaseAdminClient() as never as {
    from(table: "contact_messages"): {
      select(columns: string, options: { count: "exact" }): MessageQuery;
    };
  })
    .from("contact_messages")
    .select("id, customer_name, customer_email, customer_phone, external_handle, source, subject, body, status, assigned_to, order_number, product_snapshot, created_at, updated_at, profiles!contact_messages_assigned_to_fkey(full_name)", { count: "exact" });

  if (filters.status !== "ALL") query = query.eq("status", filters.status);
  if (filters.source !== "ALL") query = query.eq("source", filters.source);
  if (filters.assigned === "UNASSIGNED") query = query.is("assigned_to", null);
  if (filters.assigned === "MINE") query = query.eq("assigned_to", actor.id);
  if (filters.dateFrom) query = query.gte("created_at", `${filters.dateFrom}T00:00:00.000Z`);
  if (filters.dateTo) query = query.lte("created_at", `${filters.dateTo}T23:59:59.999Z`);
  if (filters.q) {
    const escaped = filters.q.replace(/[%_]/g, "\\$&");
    query = query.or(`customer_name.ilike.%${escaped}%,subject.ilike.%${escaped}%,customer_phone.ilike.%${escaped}%,customer_email.ilike.%${escaped}%,order_number.ilike.%${escaped}%`);
  }

  if (filters.sort === "created_asc") query = query.order("created_at", { ascending: true });
  else if (filters.sort === "updated_desc") query = query.order("updated_at", { ascending: false });
  else query = query.order("created_at", { ascending: false });

  const { data, error, count } = await query.range(from, to);
  if (error) return { items: [], page: filters.page, totalPages: 1, total: 0 };
  const total = count ?? 0;
  return {
    items: (data ?? []).map(toListItem),
    page: filters.page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    total,
  };
}

export type MessageDetail = AdminMessageListItem & {
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  body: string;
  preferredContactMethod: string | null;
  sourceReference: string | null;
  externalHandle: string | null;
  sourcePage: string | null;
  customerId: string | null;
  orderId: string | null;
  productId: string | null;
  variantId: string | null;
  attribution: Record<string, string | null>;
  notes: Array<{ id: string; note: string; actorName: string | null; createdAt: string }>;
  statusHistory: Array<{ id: string; fromStatus: string | null; toStatus: string; reason: string | null; actorName: string | null; createdAt: string }>;
  assignmentHistory: Array<{ id: string; fromAssignee: string | null; toAssignee: string | null; actorName: string | null; createdAt: string }>;
};

export async function getMessageDetail(id: string): Promise<MessageDetail | null> {
  await requireMessageAccess();
  if (!z.uuid().safeParse(id).success) return null;
  const supabase = createSupabaseAdminClient() as never as {
    from(table: string): {
      select(columns: string): {
        eq(column: string, value: unknown): {
          single(): Promise<{ data: Record<string, unknown> | null; error: { message?: string } | null }>;
          order(column: string, options?: { ascending?: boolean }): Promise<{ data: Array<Record<string, unknown>> | null; error: { message?: string } | null }>;
        };
      };
    };
  };
  const { data, error } = await supabase
    .from("contact_messages")
    .select("id, customer_name, customer_email, customer_phone, customer_whatsapp, normalized_phone, normalized_whatsapp, preferred_contact_method, source, subject, body, status, assigned_to, order_id, order_number, customer_id, product_id, variant_id, product_snapshot, source_reference, external_handle, source_page, utm_source, utm_medium, utm_campaign, utm_term, utm_content, created_at, updated_at, profiles!contact_messages_assigned_to_fkey(full_name)")
    .eq("id", id)
    .single();
  if (error || !data) return null;

  const [notes, statusHistory, assignmentHistory] = await Promise.all([
    supabase.from("contact_message_internal_notes").select("id, note, created_at, profiles!contact_message_internal_notes_actor_id_fkey(full_name)").eq("message_id", id).order("created_at", { ascending: false }),
    supabase.from("contact_message_status_history").select("id, from_status, to_status, reason, created_at, profiles!contact_message_status_history_actor_id_fkey(full_name)").eq("message_id", id).order("created_at", { ascending: false }),
    supabase.from("contact_message_assignment_history").select("id, from_assignee, to_assignee, created_at, profiles!contact_message_assignment_history_actor_id_fkey(full_name)").eq("message_id", id).order("created_at", { ascending: false }),
  ]);

  return {
    ...toListItem(data),
    email: data.customer_email as string | null,
    phone: data.customer_phone as string | null,
    whatsapp: data.customer_whatsapp as string | null,
    body: data.body as string,
    preferredContactMethod: data.preferred_contact_method as string | null,
    sourceReference: data.source_reference as string | null,
    externalHandle: data.external_handle as string | null,
    sourcePage: data.source_page as string | null,
    customerId: data.customer_id as string | null,
    orderId: data.order_id as string | null,
    productId: data.product_id as string | null,
    variantId: data.variant_id as string | null,
    attribution: {
      utmSource: data.utm_source as string | null,
      utmMedium: data.utm_medium as string | null,
      utmCampaign: data.utm_campaign as string | null,
      utmTerm: data.utm_term as string | null,
      utmContent: data.utm_content as string | null,
    },
    notes: (notes.data ?? []).map((row) => ({
      id: row.id as string,
      note: row.note as string,
      actorName: (row.profiles as { full_name?: string | null } | null)?.full_name ?? null,
      createdAt: row.created_at as string,
    })),
    statusHistory: (statusHistory.data ?? []).map((row) => ({
      id: row.id as string,
      fromStatus: row.from_status as string | null,
      toStatus: row.to_status as string,
      reason: row.reason as string | null,
      actorName: (row.profiles as { full_name?: string | null } | null)?.full_name ?? null,
      createdAt: row.created_at as string,
    })),
    assignmentHistory: (assignmentHistory.data ?? []).map((row) => ({
      id: row.id as string,
      fromAssignee: row.from_assignee as string | null,
      toAssignee: row.to_assignee as string | null,
      actorName: (row.profiles as { full_name?: string | null } | null)?.full_name ?? null,
      createdAt: row.created_at as string,
    })),
  };
}

export async function getMessageDetailOrNotFound(id: string) {
  const detail = await getMessageDetail(id);
  if (!detail) notFound();
  return detail;
}

export async function countNewMessages(staff: StaffProfile) {
  if (!canManageMessages(staff)) return 0;
  const { count } = await createSupabaseAdminClient()
    .from("contact_messages")
    .select("id", { count: "exact", head: true })
    .eq("status", "NEW");
  return Math.min(count ?? 0, 99);
}

type ActionResult = { ok: true; message: string } | { ok: false; code: string; message: string };

export async function transitionMessageStatus(input: { messageId: string; targetStatus: MessageStatus; reason?: string }): Promise<ActionResult> {
  const staff = await requireMessageAccess();
  const { error } = await (createSupabaseAdminClient() as never as {
    rpc(fn: string, args: Record<string, unknown>): Promise<{ error: { code?: string; message?: string } | null }>;
  }).rpc("transition_contact_message_server", {
    message_id: input.messageId,
    target_status: input.targetStatus,
    actor_id: staff.id,
    reason: input.reason ?? "",
  });
  if (error) return { ok: false, code: "MESSAGE_STATUS_FAILED", message: contactErrorMessage(error.message?.match(/\bMESSAGE_[A-Z_]+\b/)?.[0] ?? "MESSAGE_FAILED") };
  revalidatePath("/admin/messages");
  revalidatePath(`/admin/messages/${input.messageId}`);
  return { ok: true, message: "Statut mis à jour." };
}

export async function assignMessage(input: { messageId: string; assignedTo: string | null }): Promise<ActionResult> {
  const staff = await requireMessageAccess();
  const { error } = await (createSupabaseAdminClient() as never as {
    rpc(fn: string, args: Record<string, unknown>): Promise<{ error: { code?: string; message?: string } | null }>;
  }).rpc("assign_contact_message_server", {
    message_id: input.messageId,
    assigned_to: input.assignedTo,
    actor_id: staff.id,
  });
  if (error) return { ok: false, code: "MESSAGE_ASSIGN_FAILED", message: "L’assignation n’a pas pu être enregistrée." };
  revalidatePath("/admin/messages");
  revalidatePath(`/admin/messages/${input.messageId}`);
  return { ok: true, message: "Assignation mise à jour." };
}

export async function addMessageNote(input: { messageId: string; note: string }): Promise<ActionResult> {
  const staff = await requireMessageAccess();
  const { error } = await (createSupabaseAdminClient() as never as {
    rpc(fn: string, args: Record<string, unknown>): Promise<{ error: { code?: string; message?: string } | null }>;
  }).rpc("add_contact_message_note_server", {
    message_id: input.messageId,
    actor_id: staff.id,
    note: input.note,
  });
  if (error) return { ok: false, code: "MESSAGE_NOTE_FAILED", message: "La note n’a pas pu être ajoutée." };
  revalidatePath(`/admin/messages/${input.messageId}`);
  return { ok: true, message: "Note ajoutée." };
}

export async function createManualMessage(input: unknown): Promise<ActionResult> {
  const staff = await requireMessageAccess();
  const request = contactMessageRequestSchema.safeParse(input);
  if (!request.success) return { ok: false, code: "MESSAGE_INVALID_REQUEST", message: "Vérifiez les champs du message." };
  const result = await createContactMessage({ ...request.data, actorId: staff.id, consent: false });
  if (!result.ok) return { ok: false, code: result.code, message: result.message };
  revalidatePath("/admin/messages");
  void processNotifications(1).catch(() => undefined);
  return { ok: true, message: "Message manuel enregistré." };
}
