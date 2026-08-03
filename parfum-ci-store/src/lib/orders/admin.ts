import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";

import { canManageOrders, canReadOrders, type StaffProfile } from "@/lib/auth/permissions";
import { requireActiveStaff } from "@/lib/auth/server";
import {
  deliveryMethodLabel,
  maskEmail,
  maskPhone,
  orderStatusLabel,
  paymentMethodLabel,
  paymentStatusLabel,
  type DeliveryMethod,
  type PaymentMethod,
} from "@/lib/orders/display";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database.types";

export const ORDER_DEFAULT_PAGE_SIZE = 20;
export const ORDER_MAX_PAGE_SIZE = 100;

export const orderStatuses = [
  "PENDING_CONFIRMATION",
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
] as const;

export const paymentStatuses = ["UNPAID", "PENDING", "PAID", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"] as const;
export const paymentMethods = ["CASH_ON_DELIVERY", "ORANGE_MONEY", "MTN_MOMO", "WAVE", "MOOV_MONEY", "BANK_TRANSFER", "PAY_IN_STORE"] as const;
export const deliveryMethods = ["HOME_DELIVERY", "PICKUP"] as const;
export const orderSources = ["WEBSITE", "INSTAGRAM", "FACEBOOK", "TIKTOK", "WHATSAPP", "PHONE", "PHYSICAL_STORE", "OTHER"] as const;

export type OrderStatus = Database["public"]["Enums"]["order_status"];
export type PaymentStatus = Database["public"]["Enums"]["payment_status"];
export type OrderSource = Database["public"]["Enums"]["order_source"];

export type OrderActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; code: OrderAdminErrorCode; message: string };

export type OrderAdminErrorCode =
  | "ORDER_ADMIN_INVALID_REQUEST"
  | "ORDER_ADMIN_UNAUTHORIZED"
  | "ORDER_TRANSITION_INVALID_STATUS"
  | "ORDER_TRANSITION_REASON_REQUIRED"
  | "ORDER_TRANSITION_RESERVATION_MISSING"
  | "ORDER_TRANSITION_STOCK_INVALID"
  | "ORDER_TRANSITION_IDEMPOTENCY_CONFLICT"
  | "ORDER_TRANSITION_FAILED"
  | "PAYMENT_INVALID_STATUS"
  | "PAYMENT_REFERENCE_REQUIRED"
  | "PAYMENT_REASON_REQUIRED"
  | "PAYMENT_IDEMPOTENCY_CONFLICT"
  | "PAYMENT_UPDATE_FAILED"
  | "ORDER_NOTE_FAILED";

export type AdminOrderListItem = {
  id: string;
  orderNumber: string;
  createdAt: string;
  updatedAt: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  maskedPhone: string;
  maskedEmail: string;
  city: string;
  commune: string | null;
  deliveryMethod: DeliveryMethod | string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  source: OrderSource;
  totalXof: number;
  itemCount: number;
};

export type AdminOrderItem = {
  id: string;
  productName: string;
  brandName: string | null;
  sku: string | null;
  sizeMl: number | null;
  concentration: string | null;
  variantName: string | null;
  quantity: number;
  unitPriceXof: number;
  totalPriceXof: number;
  currency: string;
  variantId: string | null;
};

export type AdminOrderHistoryEntry = {
  id: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  actorName: string | null;
  note: string | null;
  createdAt: string;
};

export type AdminPaymentEntry = {
  id: string;
  method: PaymentMethod;
  status: PaymentStatus;
  provider: string | null;
  providerReference: string | null;
  amountXof: number;
  verifiedByName: string | null;
  verifiedAt: string | null;
  createdAt: string;
};

export type AdminNotificationEntry = {
  id: string;
  channel: string;
  status: string;
  recipient: string;
  subject: string | null;
  templateKey: string | null;
  createdAt: string;
  processedAt: string | null;
};

export type AdminAuditEntry = {
  id: string;
  action: string;
  actorId: string | null;
  createdAt: string;
};

export type AdminOrderNote = {
  id: string;
  actorName: string | null;
  note: string;
  createdAt: string;
};

export type AdminInventoryLifecycleEntry = {
  id: string;
  type: Database["public"]["Enums"]["inventory_transaction_type"];
  quantityDelta: number;
  stockBefore: number;
  stockAfter: number;
  reservedBefore: number;
  reservedAfter: number;
  reason: string;
  actorName: string | null;
  createdAt: string;
};

export type AdminOrderDetail = AdminOrderListItem & {
  customerWhatsapp: string | null;
  deliveryCountry: string;
  deliveryAddress: string;
  deliveryArea: string | null;
  deliveryLandmark: string | null;
  deliveryInstructions: string | null;
  customerNote: string | null;
  subtotalXof: number;
  deliveryFeeXof: number;
  discountXof: number;
  currency: string;
  paymentReference: string | null;
  items: AdminOrderItem[];
  history: AdminOrderHistoryEntry[];
  payments: AdminPaymentEntry[];
  notifications: AdminNotificationEntry[];
  audits: AdminAuditEntry[];
  notes: AdminOrderNote[];
  inventoryLifecycle: AdminInventoryLifecycleEntry[];
};

export type PaginatedOrders<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type OrderFilters = {
  q?: string;
  status?: "ALL" | OrderStatus;
  paymentStatus?: "ALL" | PaymentStatus;
  paymentMethod?: "ALL" | PaymentMethod;
  deliveryMethod?: "ALL" | DeliveryMethod;
  source?: "ALL" | OrderSource;
  dateFrom?: string;
  dateTo?: string;
  sort?: "created_desc" | "created_asc" | "updated_desc" | "total_desc";
  page?: number;
  pageSize?: number;
};

export const orderTransitionSchema = z
  .object({
    orderId: z.uuid(),
    targetStatus: z.enum(orderStatuses),
    reason: z.string().trim().max(300).optional(),
    note: z.string().trim().max(500).optional(),
    idempotencyKey: z.string().trim().min(32).max(180).regex(/^[A-Za-z0-9._:-]+$/),
  })
  .strict()
  .superRefine((value, context) => {
    if ((value.targetStatus === "CANCELLED" || value.targetStatus === "RETURNED") && !value.reason?.trim()) {
      context.addIssue({ code: "custom", path: ["reason"], message: "Un motif est requis pour cette action." });
    }
  });

export const paymentStatusUpdateSchema = z
  .object({
    orderId: z.uuid(),
    targetPaymentStatus: z.enum(["PAID", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"]),
    reference: z.string().trim().max(120).optional(),
    reason: z.string().trim().max(300).optional(),
    idempotencyKey: z.string().trim().min(32).max(180).regex(/^[A-Za-z0-9._:-]+$/),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.targetPaymentStatus !== "PAID" && !value.reason?.trim()) {
      context.addIssue({ code: "custom", path: ["reason"], message: "Un motif est requis pour ce statut de paiement." });
    }
  });

export const internalNoteSchema = z.object({
  orderId: z.uuid(),
  note: z.string().trim().min(1).max(1000),
}).strict();

export type OrderTransitionInput = z.infer<typeof orderTransitionSchema>;
export type PaymentStatusUpdateInput = z.infer<typeof paymentStatusUpdateSchema>;

export type OrderTransitionResult = {
  orderId: string;
  orderNumber: string;
  fromStatus: OrderStatus;
  toStatus: OrderStatus;
  stockEffect: "NONE" | "RELEASED" | "SOLD";
  idempotent: boolean;
};

export type PaymentStatusUpdateResult = {
  orderId: string;
  orderNumber: string;
  fromPaymentStatus: PaymentStatus;
  toPaymentStatus: PaymentStatus;
  paymentTransactionId: string | null;
  idempotent: boolean;
};

type OrderRpcClient = {
  rpc(fn: "transition_order_server", args: { request: Record<string, unknown> }): Promise<{ data: unknown; error: { code?: string; message?: string } | null }>;
  rpc(fn: "record_order_payment_server", args: { request: Record<string, unknown> }): Promise<{ data: unknown; error: { code?: string; message?: string } | null }>;
};

function optional(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function normalizePage(value: unknown, defaultPageSize: number) {
  const page = Math.max(Number.parseInt(optional(value) ?? "1", 10) || 1, 1);
  const pageSize = Math.min(Math.max(defaultPageSize, 1), ORDER_MAX_PAGE_SIZE);
  return { page, pageSize, from: (page - 1) * pageSize, to: page * pageSize - 1 };
}

export function normalizeOrderFilters(input: Record<string, unknown> = {}): OrderFilters {
  const q = optional(input.q)?.slice(0, 120);
  const status = optional(input.status);
  const paymentStatus = optional(input.paymentStatus);
  const paymentMethod = optional(input.paymentMethod);
  const deliveryMethod = optional(input.deliveryMethod);
  const source = optional(input.source);
  const sort = optional(input.sort);
  const page = Math.max(Number.parseInt(optional(input.page) ?? "1", 10) || 1, 1);

  return {
    q,
    status: (orderStatuses as readonly string[]).includes(status ?? "") ? (status as OrderStatus) : "ALL",
    paymentStatus: (paymentStatuses as readonly string[]).includes(paymentStatus ?? "") ? (paymentStatus as PaymentStatus) : "ALL",
    paymentMethod: (paymentMethods as readonly string[]).includes(paymentMethod ?? "") ? (paymentMethod as PaymentMethod) : "ALL",
    deliveryMethod: (deliveryMethods as readonly string[]).includes(deliveryMethod ?? "") ? (deliveryMethod as DeliveryMethod) : "ALL",
    source: (orderSources as readonly string[]).includes(source ?? "") ? (source as OrderSource) : "ALL",
    dateFrom: optional(input.dateFrom)?.match(/^\d{4}-\d{2}-\d{2}$/) ? optional(input.dateFrom) : undefined,
    dateTo: optional(input.dateTo)?.match(/^\d{4}-\d{2}-\d{2}$/) ? optional(input.dateTo) : undefined,
    sort: sort === "created_asc" || sort === "updated_desc" || sort === "total_desc" ? sort : "created_desc",
    page,
    pageSize: ORDER_DEFAULT_PAGE_SIZE,
  };
}

export function getAllowedOrderTransitions(status: OrderStatus, deliveryMethod: string): OrderStatus[] {
  if (status === "PENDING_CONFIRMATION") return ["CONFIRMED", "CANCELLED"];
  if (status === "CONFIRMED") return ["PREPARING", "CANCELLED"];
  if (status === "PREPARING") {
    return deliveryMethod === "PICKUP" ? ["READY_FOR_PICKUP", "CANCELLED"] : ["OUT_FOR_DELIVERY", "CANCELLED"];
  }
  if (status === "READY_FOR_PICKUP") return ["DELIVERED", "CANCELLED"];
  if (status === "OUT_FOR_DELIVERY") return ["DELIVERED", "RETURNED"];
  if (status === "DELIVERED") return ["RETURNED"];
  return [];
}

export function transitionActionLabel(status: OrderStatus) {
  return {
    CONFIRMED: "Confirmer la commande",
    PREPARING: "Commencer la préparation",
    READY_FOR_PICKUP: "Marquer prête à récupérer",
    OUT_FOR_DELIVERY: "Marquer en livraison",
    DELIVERED: "Marquer livrée",
    CANCELLED: "Annuler la commande",
    RETURNED: "Marquer retournée",
    PENDING_CONFIRMATION: "En attente",
  }[status];
}

export function transitionStockEffectLabel(effect: "NONE" | "RELEASED" | "SOLD") {
  return {
    NONE: "Aucun effet stock",
    RELEASED: "Libération du stock réservé",
    SOLD: "Conversion de la réservation en vente",
  }[effect];
}

export async function requireOrderReadAccess() {
  const staff = await requireActiveStaff({ mode: "redirect" });
  if (!canReadOrders(staff) && !canManageOrders(staff)) throw new Error("FORBIDDEN");
  return staff;
}

export async function requireOrderManageAccess() {
  const staff = await requireActiveStaff({ mode: "redirect" });
  if (!canManageOrders(staff)) throw new Error("FORBIDDEN");
  return staff;
}

function buildOrderSearchExpression(q: string) {
  const escaped = q.replace(/[%,()]/g, " ");
  return `order_number.ilike.%${escaped}%,customer_name.ilike.%${escaped}%,customer_phone.ilike.%${escaped}%,customer_email.ilike.%${escaped}%`;
}

function applyOrderFilters(query: unknown, filters: OrderFilters) {
  let next = query as {
    or(expression: string): typeof next;
    eq(column: string, value: unknown): typeof next;
    gte(column: string, value: unknown): typeof next;
    lte(column: string, value: unknown): typeof next;
  };
  if (filters.q) next = next.or(buildOrderSearchExpression(filters.q));
  if (filters.status !== "ALL") next = next.eq("status", filters.status);
  if (filters.paymentStatus !== "ALL") next = next.eq("payment_status", filters.paymentStatus);
  if (filters.paymentMethod !== "ALL") next = next.eq("payment_method", filters.paymentMethod);
  if (filters.deliveryMethod !== "ALL") next = next.eq("delivery_method", filters.deliveryMethod);
  if (filters.source !== "ALL") next = next.eq("source", filters.source);
  if (filters.dateFrom) next = next.gte("created_at", `${filters.dateFrom}T00:00:00.000Z`);
  if (filters.dateTo) next = next.lte("created_at", `${filters.dateTo}T23:59:59.999Z`);
  return next;
}

function applyOrderSort(query: unknown, sort: OrderFilters["sort"]) {
  let next = query as { order(column: string, options?: { ascending?: boolean }): typeof next };
  if (sort === "created_asc") next = next.order("created_at", { ascending: true });
  else if (sort === "updated_desc") next = next.order("updated_at", { ascending: false });
  else if (sort === "total_desc") next = next.order("total_xof", { ascending: false });
  else next = next.order("created_at", { ascending: false });
  return next.order("id", { ascending: false });
}

type OrderListDbRow = Database["public"]["Tables"]["orders"]["Row"] & { order_items: Array<{ id: string }> | null };

function mapOrderListRow(row: OrderListDbRow): AdminOrderListItem {
  return {
    id: row.id,
    orderNumber: row.order_number,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email,
    maskedPhone: maskPhone(row.customer_phone),
    maskedEmail: maskEmail(row.customer_email),
    city: row.delivery_city,
    commune: row.delivery_commune,
    deliveryMethod: row.delivery_method,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    status: row.status,
    source: row.source,
    totalXof: row.total_xof,
    itemCount: row.order_items?.length ?? 0,
  };
}

export async function listAdminOrders(input: Record<string, unknown> = {}): Promise<PaginatedOrders<AdminOrderListItem>> {
  const filters = normalizeOrderFilters(input);
  const { page, pageSize, from, to } = normalizePage(filters.page, ORDER_DEFAULT_PAGE_SIZE);
  let query = createSupabaseAdminClient()
    .from("orders")
    .select(
      "id, order_number, customer_name, customer_email, customer_phone, delivery_city, delivery_commune, delivery_method, total_xof, payment_method, payment_status, status, source, created_at, updated_at, order_items(id)",
      { count: "exact" },
    )
    .range(from, to) as never;

  query = applyOrderFilters(query, filters) as never;
  query = applyOrderSort(query, filters.sort) as never;

  const { data, error, count } = (await query) as { data: OrderListDbRow[] | null; error: { message?: string } | null; count: number | null };
  if (error) throw new Error("ORDER_LIST_FAILED");
  const items = (data ?? []).map(mapOrderListRow);
  return { items, page, pageSize, total: count ?? items.length, totalPages: Math.max(Math.ceil((count ?? items.length) / pageSize), 1) };
}

function mapOrderDetail(order: OrderListDbRow): Omit<AdminOrderDetail, "items" | "history" | "payments" | "notifications" | "audits" | "notes" | "inventoryLifecycle"> {
  return {
    ...mapOrderListRow(order),
    customerWhatsapp: order.customer_whatsapp,
    deliveryCountry: order.delivery_country,
    deliveryAddress: order.delivery_address,
    deliveryArea: order.delivery_area,
    deliveryLandmark: order.delivery_landmark,
    deliveryInstructions: order.delivery_instructions,
    customerNote: order.customer_note,
    subtotalXof: order.subtotal_xof,
    deliveryFeeXof: order.delivery_fee_xof,
    discountXof: order.discount_xof,
    currency: order.currency,
    paymentReference: order.payment_reference,
  };
}

export async function getAdminOrderDetail(orderId: string): Promise<AdminOrderDetail | null> {
  const parsed = z.uuid().safeParse(orderId);
  if (!parsed.success) return null;
  const supabase = createSupabaseAdminClient();
  const { data: order, error: orderError } = (await supabase
    .from("orders")
    .select(
      "id, order_number, customer_name, customer_email, customer_phone, customer_whatsapp, delivery_country, delivery_city, delivery_commune, delivery_area, delivery_address, delivery_landmark, delivery_instructions, delivery_method, source, currency, subtotal_xof, delivery_fee_xof, discount_xof, total_xof, payment_method, payment_status, payment_reference, status, customer_note, created_at, updated_at, order_items(id)",
    )
    .eq("id", parsed.data)
    .maybeSingle()) as { data: OrderListDbRow | null; error: { message?: string } | null };

  if (orderError) throw new Error("ORDER_DETAIL_FAILED");
  if (!order) return null;

  const [items, history, payments, notifications, audits, notes, inventory] = await Promise.all([
    supabase
      .from("order_items")
      .select("id, product_name, brand_name, sku, size_ml, concentration, variant_name, quantity, unit_price_xof, total_price_xof, currency, variant_id, created_at")
      .eq("order_id", parsed.data)
      .order("created_at", { ascending: true }),
    supabase
      .from("order_status_history")
      .select("id, from_status, to_status, actor_id, note, created_at, profiles(full_name)")
      .eq("order_id", parsed.data)
      .order("created_at", { ascending: true }),
    supabase
      .from("payment_transactions")
      .select("id, method, status, provider, provider_reference, amount_xof, verified_by, verified_at, created_at, profiles(full_name)")
      .eq("order_id", parsed.data)
      .order("created_at", { ascending: false }),
    supabase
      .from("notifications")
      .select("id, channel, status, recipient, subject, template_key, created_at, processed_at")
      .or(`payload->>order_id.eq.${parsed.data}`)
      .order("created_at", { ascending: false }),
    supabase
      .from("audit_logs")
      .select("id, action, actor_id, created_at")
      .eq("resource_type", "order")
      .eq("resource_id", parsed.data)
      .order("created_at", { ascending: false }),
    (supabase
      .from("order_internal_notes" as never)
      .select("id, actor_id, note, created_at, profiles(full_name)")
      .eq("order_id", parsed.data)
      .order("created_at", { ascending: false }) as never),
    supabase
      .from("inventory_transactions")
      .select("id, type, quantity_delta, stock_before, stock_after, reserved_before, reserved_after, reason, actor_id, created_at, profiles(full_name)")
      .eq("order_id", parsed.data)
      .order("created_at", { ascending: false }),
  ]);

  if (items.error || history.error || payments.error || notifications.error || audits.error || inventory.error) {
    throw new Error("ORDER_DETAIL_FAILED");
  }

  const noteResult = notes as { data: Array<{ id: string; actor_id: string | null; note: string; created_at: string; profiles: { full_name: string } | null }> | null; error: { message?: string } | null };
  if (noteResult.error) throw new Error("ORDER_DETAIL_FAILED");

  return {
    ...mapOrderDetail(order),
    items: (items.data ?? []).map((item) => ({
      id: item.id,
      productName: item.product_name,
      brandName: item.brand_name,
      sku: item.sku,
      sizeMl: item.size_ml,
      concentration: item.concentration,
      variantName: item.variant_name,
      quantity: item.quantity,
      unitPriceXof: item.unit_price_xof,
      totalPriceXof: item.total_price_xof,
      currency: item.currency,
      variantId: item.variant_id,
    })),
    history: (history.data ?? []).map((entry) => ({
      id: entry.id,
      fromStatus: entry.from_status,
      toStatus: entry.to_status,
      actorName: entry.profiles?.full_name ?? null,
      note: entry.note,
      createdAt: entry.created_at,
    })),
    payments: (payments.data ?? []).map((entry) => ({
      id: entry.id,
      method: entry.method,
      status: entry.status,
      provider: entry.provider,
      providerReference: entry.provider_reference,
      amountXof: entry.amount_xof,
      verifiedByName: entry.profiles?.full_name ?? null,
      verifiedAt: entry.verified_at,
      createdAt: entry.created_at,
    })),
    notifications: (notifications.data ?? []).map((entry) => ({
      id: entry.id,
      channel: entry.channel,
      status: entry.status,
      recipient: entry.recipient,
      subject: entry.subject,
      templateKey: entry.template_key,
      createdAt: entry.created_at,
      processedAt: entry.processed_at,
    })),
    audits: (audits.data ?? []).map((entry) => ({
      id: entry.id,
      action: entry.action,
      actorId: entry.actor_id,
      createdAt: entry.created_at,
    })),
    notes: (noteResult.data ?? []).map((entry) => ({
      id: entry.id,
      actorName: entry.profiles?.full_name ?? null,
      note: entry.note,
      createdAt: entry.created_at,
    })),
    inventoryLifecycle: (inventory.data ?? []).map((entry) => ({
      id: entry.id,
      type: entry.type,
      quantityDelta: entry.quantity_delta,
      stockBefore: entry.stock_before,
      stockAfter: entry.stock_after,
      reservedBefore: entry.reserved_before,
      reservedAfter: entry.reserved_after,
      reason: entry.reason,
      actorName: entry.profiles?.full_name ?? null,
      createdAt: entry.created_at,
    })),
  };
}

export function orderAdminErrorMessage(code: OrderAdminErrorCode) {
  const messages: Record<OrderAdminErrorCode, string> = {
    ORDER_ADMIN_INVALID_REQUEST: "La demande est invalide.",
    ORDER_ADMIN_UNAUTHORIZED: "Vous n'êtes pas autorisé à modifier cette commande.",
    ORDER_TRANSITION_INVALID_STATUS: "Cette transition de commande n'est pas autorisée.",
    ORDER_TRANSITION_REASON_REQUIRED: "Un motif est requis pour cette action.",
    ORDER_TRANSITION_RESERVATION_MISSING: "La réservation stock nécessaire est introuvable ou insuffisante.",
    ORDER_TRANSITION_STOCK_INVALID: "L'effet stock de cette transition violerait les invariants d'inventaire.",
    ORDER_TRANSITION_IDEMPOTENCY_CONFLICT: "Cette action a déjà été utilisée avec un contenu différent.",
    ORDER_TRANSITION_FAILED: "La transition de commande n'a pas pu être enregistrée.",
    PAYMENT_INVALID_STATUS: "Ce changement de paiement n'est pas autorisé.",
    PAYMENT_REFERENCE_REQUIRED: "Une référence ou un motif est requis pour ce paiement manuel.",
    PAYMENT_REASON_REQUIRED: "Un motif est requis pour ce changement de paiement.",
    PAYMENT_IDEMPOTENCY_CONFLICT: "Cette action de paiement a déjà été utilisée avec un contenu différent.",
    PAYMENT_UPDATE_FAILED: "Le statut de paiement n'a pas pu être enregistré.",
    ORDER_NOTE_FAILED: "La note interne n'a pas pu être ajoutée.",
  };
  return messages[code];
}

function mapOrderDbError(error?: { code?: string; message?: string }): OrderAdminErrorCode {
  const raised = error?.message?.match(/\b(?:ORDER_TRANSITION|PAYMENT)_[A-Z_]+\b/)?.[0];
  if (raised === "ORDER_TRANSITION_UNAUTHORIZED" || raised === "PAYMENT_UNAUTHORIZED") return "ORDER_ADMIN_UNAUTHORIZED";
  if (raised === "ORDER_TRANSITION_INVALID_REQUEST" || raised === "PAYMENT_INVALID_REQUEST") return "ORDER_ADMIN_INVALID_REQUEST";
  if (raised === "ORDER_TRANSITION_INVALID_STATUS") return "ORDER_TRANSITION_INVALID_STATUS";
  if (raised === "ORDER_TRANSITION_REASON_REQUIRED") return "ORDER_TRANSITION_REASON_REQUIRED";
  if (raised === "ORDER_TRANSITION_RESERVATION_MISSING") return "ORDER_TRANSITION_RESERVATION_MISSING";
  if (raised === "ORDER_TRANSITION_STOCK_INVALID") return "ORDER_TRANSITION_STOCK_INVALID";
  if (raised === "ORDER_TRANSITION_IDEMPOTENCY_CONFLICT") return "ORDER_TRANSITION_IDEMPOTENCY_CONFLICT";
  if (raised === "PAYMENT_INVALID_STATUS") return "PAYMENT_INVALID_STATUS";
  if (raised === "PAYMENT_REFERENCE_REQUIRED") return "PAYMENT_REFERENCE_REQUIRED";
  if (raised === "PAYMENT_REASON_REQUIRED") return "PAYMENT_REASON_REQUIRED";
  if (raised === "PAYMENT_IDEMPOTENCY_CONFLICT") return "PAYMENT_IDEMPOTENCY_CONFLICT";
  if (error?.code === "42501") return "ORDER_ADMIN_UNAUTHORIZED";
  if (error?.code === "23505") return "ORDER_TRANSITION_IDEMPOTENCY_CONFLICT";
  return raised?.startsWith("PAYMENT_") ? "PAYMENT_UPDATE_FAILED" : "ORDER_TRANSITION_FAILED";
}

export function createOrderTransitionFingerprint(input: Omit<OrderTransitionInput, "idempotencyKey"> & { actorId: string }) {
  return createHash("sha256")
    .update(JSON.stringify({
      actorId: input.actorId,
      orderId: input.orderId,
      targetStatus: input.targetStatus,
      reason: input.reason?.trim() ?? null,
      note: input.note?.trim() ?? null,
    }))
    .digest("hex");
}

export function createPaymentStatusFingerprint(input: Omit<PaymentStatusUpdateInput, "idempotencyKey"> & { actorId: string }) {
  return createHash("sha256")
    .update(JSON.stringify({
      actorId: input.actorId,
      orderId: input.orderId,
      targetPaymentStatus: input.targetPaymentStatus,
      reference: input.reference?.trim() ?? null,
      reason: input.reason?.trim() ?? null,
    }))
    .digest("hex");
}

export async function transitionOrder(input: OrderTransitionInput, staff: StaffProfile): Promise<OrderActionResult<OrderTransitionResult>> {
  if (!canManageOrders(staff)) return { ok: false, code: "ORDER_ADMIN_UNAUTHORIZED", message: orderAdminErrorMessage("ORDER_ADMIN_UNAUTHORIZED") };
  const parsed = orderTransitionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "ORDER_ADMIN_INVALID_REQUEST", message: parsed.error.issues[0]?.message ?? orderAdminErrorMessage("ORDER_ADMIN_INVALID_REQUEST") };

  const requestFingerprint = createOrderTransitionFingerprint({ ...parsed.data, actorId: staff.id });
  const supabase = createSupabaseAdminClient() as unknown as OrderRpcClient;
  const { data, error } = await supabase.rpc("transition_order_server", {
    request: { ...parsed.data, actorId: staff.id, requestFingerprint },
  });

  if (error || !data) {
    const code = mapOrderDbError(error ?? undefined);
    console.error("ORDER_TRANSITION_DATABASE_FAILURE", { dbCode: error?.code ?? "unknown", mappedCode: code });
    return { ok: false, code, message: orderAdminErrorMessage(code) };
  }

  const result = z.object({
    orderId: z.uuid(),
    orderNumber: z.string(),
    fromStatus: z.enum(orderStatuses),
    toStatus: z.enum(orderStatuses),
    stockEffect: z.enum(["NONE", "RELEASED", "SOLD"]),
    idempotent: z.boolean(),
  }).safeParse(data);

  if (!result.success) return { ok: false, code: "ORDER_TRANSITION_FAILED", message: orderAdminErrorMessage("ORDER_TRANSITION_FAILED") };
  return { ok: true, data: result.data };
}

export async function updatePaymentStatus(input: PaymentStatusUpdateInput, staff: StaffProfile): Promise<OrderActionResult<PaymentStatusUpdateResult>> {
  if (!canManageOrders(staff)) return { ok: false, code: "ORDER_ADMIN_UNAUTHORIZED", message: orderAdminErrorMessage("ORDER_ADMIN_UNAUTHORIZED") };
  const parsed = paymentStatusUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "ORDER_ADMIN_INVALID_REQUEST", message: parsed.error.issues[0]?.message ?? orderAdminErrorMessage("ORDER_ADMIN_INVALID_REQUEST") };

  const requestFingerprint = createPaymentStatusFingerprint({ ...parsed.data, actorId: staff.id });
  const supabase = createSupabaseAdminClient() as unknown as OrderRpcClient;
  const { data, error } = await supabase.rpc("record_order_payment_server", {
    request: { ...parsed.data, actorId: staff.id, requestFingerprint },
  });

  if (error || !data) {
    const code = mapOrderDbError(error ?? undefined);
    console.error("ORDER_PAYMENT_DATABASE_FAILURE", { dbCode: error?.code ?? "unknown", mappedCode: code });
    return { ok: false, code, message: orderAdminErrorMessage(code) };
  }

  const result = z.object({
    orderId: z.uuid(),
    orderNumber: z.string(),
    fromPaymentStatus: z.enum(paymentStatuses),
    toPaymentStatus: z.enum(paymentStatuses),
    paymentTransactionId: z.uuid().nullable(),
    idempotent: z.boolean(),
  }).safeParse(data);

  if (!result.success) return { ok: false, code: "PAYMENT_UPDATE_FAILED", message: orderAdminErrorMessage("PAYMENT_UPDATE_FAILED") };
  return { ok: true, data: result.data };
}

export async function addInternalOrderNote(input: z.infer<typeof internalNoteSchema>, staff: StaffProfile): Promise<OrderActionResult<AdminOrderNote>> {
  if (!canReadOrders(staff)) return { ok: false, code: "ORDER_ADMIN_UNAUTHORIZED", message: orderAdminErrorMessage("ORDER_ADMIN_UNAUTHORIZED") };
  const parsed = internalNoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "ORDER_ADMIN_INVALID_REQUEST", message: parsed.error.issues[0]?.message ?? orderAdminErrorMessage("ORDER_ADMIN_INVALID_REQUEST") };

  const { data, error } = (await createSupabaseAdminClient()
    .from("order_internal_notes" as never)
    .insert({ order_id: parsed.data.orderId, note: parsed.data.note, actor_id: staff.id } as never)
    .select("id, actor_id, note, created_at")
    .single()) as { data: { id: string; actor_id: string | null; note: string; created_at: string } | null; error: { code?: string; message?: string } | null };

  if (error || !data) {
    console.error("ORDER_NOTE_DATABASE_FAILURE", { dbCode: error?.code ?? "unknown" });
    return { ok: false, code: "ORDER_NOTE_FAILED", message: orderAdminErrorMessage("ORDER_NOTE_FAILED") };
  }

  return { ok: true, data: { id: data.id, actorName: staff.fullName, note: data.note, createdAt: data.created_at } };
}

export function orderSourceLabel(source: string) {
  return {
    WEBSITE: "Site web",
    INSTAGRAM: "Instagram",
    FACEBOOK: "Facebook",
    TIKTOK: "TikTok",
    WHATSAPP: "WhatsApp",
    PHONE: "Téléphone",
    PHYSICAL_STORE: "Boutique",
    OTHER: "Autre",
  }[source] ?? "Source";
}

export { deliveryMethodLabel, maskEmail, maskPhone, orderStatusLabel, paymentMethodLabel, paymentStatusLabel };
