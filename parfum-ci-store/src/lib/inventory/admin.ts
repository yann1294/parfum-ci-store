import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";

import { canManageInventory, type StaffProfile } from "@/lib/auth/permissions";
import { requireActiveStaff } from "@/lib/auth/server";
import { getAvailabilityStatus, getAvailableQuantity } from "@/lib/catalogue/availability";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database.types";

export const INVENTORY_DEFAULT_PAGE_SIZE = 20;
export const INVENTORY_LEDGER_DEFAULT_PAGE_SIZE = 20;
export const INVENTORY_MAX_PAGE_SIZE = 100;

export const manualInventoryOperationTypes = ["INITIALIZE", "RECEIVED", "DAMAGED", "ADJUSTMENT", "RETURNED"] as const;
export const inventoryAdjustmentDirections = ["INCREASE", "DECREASE"] as const;

export type ManualInventoryOperationType = (typeof manualInventoryOperationTypes)[number];
export type InventoryAdjustmentDirection = (typeof inventoryAdjustmentDirections)[number];
export type InventoryStatus = "UNCONFIGURED" | "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
export type ProductStatus = Database["public"]["Enums"]["product_status"];
export type InventoryTransactionType = Database["public"]["Enums"]["inventory_transaction_type"];

export type InventoryActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; code: InventoryErrorCode; message: string };

export type InventoryErrorCode =
  | "INVENTORY_INVALID_REQUEST"
  | "INVENTORY_INVALID_OPERATION"
  | "INVENTORY_INVALID_QUANTITY"
  | "INVENTORY_REASON_REQUIRED"
  | "INVENTORY_ALREADY_INITIALIZED"
  | "INVENTORY_NOT_INITIALIZED"
  | "INVENTORY_NEGATIVE_STOCK"
  | "INVENTORY_RESERVED_INVARIANT"
  | "INVENTORY_IDEMPOTENCY_CONFLICT"
  | "INVENTORY_UNAUTHORIZED"
  | "INVENTORY_UPDATE_FAILED";

export const inventoryAdjustmentSchema = z
  .object({
    variantId: z.uuid(),
    operationType: z.enum(manualInventoryOperationTypes),
    quantity: z.number().int().min(0).max(100_000),
    adjustmentDirection: z.enum(inventoryAdjustmentDirections).optional(),
    reason: z.string().trim().max(300).optional(),
    reference: z.string().trim().max(120).optional(),
    idempotencyKey: z.string().trim().min(32).max(180).regex(/^[A-Za-z0-9._:-]+$/),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.operationType !== "INITIALIZE" && value.quantity <= 0) {
      context.addIssue({ code: "custom", path: ["quantity"], message: "La quantité doit être positive." });
    }

    if (["INITIALIZE", "DAMAGED", "ADJUSTMENT", "RETURNED"].includes(value.operationType) && !value.reason?.trim()) {
      context.addIssue({ code: "custom", path: ["reason"], message: "Le motif est requis." });
    }

    if (value.operationType === "ADJUSTMENT" && !value.adjustmentDirection) {
      context.addIssue({ code: "custom", path: ["adjustmentDirection"], message: "Le sens de correction est requis." });
    }
  });

export type InventoryAdjustmentInput = z.infer<typeof inventoryAdjustmentSchema>;

export type InventoryAdjustmentResult = {
  variantId: string;
  operationType: ManualInventoryOperationType;
  transactionType: InventoryTransactionType;
  quantityDelta: number;
  stockBefore: number;
  stockAfter: number;
  reservedBefore: number;
  reservedAfter: number;
  availableAfter: number;
  inventoryInitializedAt: string | null;
  transactionId: string;
};

export type InventoryVariantRow = {
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  productStatus: ProductStatus;
  brandId: string | null;
  brandName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  sku: string;
  sizeMl: number;
  concentration: string | null;
  variantActive: boolean;
  stockInitialized: boolean;
  inventoryInitializedAt: string | null;
  stockOnHand: number;
  reservedQuantity: number;
  availableQuantity: number;
  lowStockThreshold: number;
  inventoryStatus: InventoryStatus;
  updatedAt: string;
  lastMovementAt: string | null;
  lastMovementType: InventoryTransactionType | null;
};

export type InventoryLedgerRow = {
  id: string;
  variantId: string;
  type: InventoryTransactionType;
  quantityDelta: number;
  stockBefore: number;
  stockAfter: number;
  reservedBefore: number;
  reservedAfter: number;
  reason: string;
  orderId: string | null;
  actorId: string | null;
  actorName: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type PaginatedInventory<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type InventoryFilters = {
  q?: string;
  brandId?: string;
  categoryId?: string;
  active?: "ALL" | "ACTIVE" | "INACTIVE";
  initialized?: "ALL" | "INITIALIZED" | "UNINITIALIZED";
  status?: "ALL" | InventoryStatus | "RESERVED" | "LOW_OR_OUT";
  productStatus?: "ALL" | ProductStatus;
  sort?: "product_asc" | "sku_asc" | "available_asc" | "available_desc" | "updated_desc";
  page?: number;
  pageSize?: number;
};

export type LedgerFilters = {
  operationType?: "ALL" | InventoryTransactionType;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
};

type AdminInventoryVariantViewRow = {
  variant_id: string;
  product_id: string;
  product_name: string;
  product_slug: string;
  product_status: ProductStatus;
  brand_id: string | null;
  brand_name: string | null;
  category_id: string | null;
  category_name: string | null;
  sku: string;
  size_ml: number;
  concentration: string | null;
  variant_active: boolean;
  inventory_initialized_at: string | null;
  stock_initialized: boolean;
  stock_on_hand: number;
  reserved_quantity: number;
  available_quantity: number;
  low_stock_threshold: number;
  inventory_status: InventoryStatus;
  updated_at: string;
  last_movement_at: string | null;
  last_movement_type: InventoryTransactionType | null;
};

type InventoryRpcClient = {
  rpc(
    fn: "adjust_inventory_server",
    args: { request: Record<string, unknown> },
  ): Promise<{ data: unknown; error: { code?: string; message?: string } | null }>;
};

type InventoryLedgerQuery = PromiseLike<{
  data:
    | Array<Database["public"]["Tables"]["inventory_transactions"]["Row"] & { profiles: { full_name: string } | null }>
    | null;
  error: { message?: string } | null;
  count: number | null;
}> & {
  eq(column: string, value: unknown): InventoryLedgerQuery;
  gte(column: string, value: unknown): InventoryLedgerQuery;
  lte(column: string, value: unknown): InventoryLedgerQuery;
  order(column: string, options?: { ascending?: boolean }): InventoryLedgerQuery;
};

const productStatuses = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;
const inventoryStatuses = ["UNCONFIGURED", "IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"] as const;

function optional(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function normalizePage(value: unknown, defaultPageSize: number) {
  const page = Math.max(Number.parseInt(optional(value) ?? "1", 10) || 1, 1);
  const pageSize = Math.min(Math.max(defaultPageSize, 1), INVENTORY_MAX_PAGE_SIZE);
  return { page, pageSize, from: (page - 1) * pageSize, to: page * pageSize - 1 };
}

export function normalizeInventoryFilters(input: Record<string, unknown> = {}): InventoryFilters {
  const q = optional(input.q)?.slice(0, 120);
  const active = optional(input.active);
  const initialized = optional(input.initialized);
  const status = optional(input.status);
  const productStatus = optional(input.productStatus);
  const sort = optional(input.sort);
  const page = Math.max(Number.parseInt(optional(input.page) ?? "1", 10) || 1, 1);

  return {
    q,
    brandId: z.uuid().safeParse(input.brandId).success ? String(input.brandId) : undefined,
    categoryId: z.uuid().safeParse(input.categoryId).success ? String(input.categoryId) : undefined,
    active: active === "ACTIVE" || active === "INACTIVE" ? active : "ALL",
    initialized: initialized === "INITIALIZED" || initialized === "UNINITIALIZED" ? initialized : "ALL",
    status:
      status === "RESERVED" || status === "LOW_OR_OUT" || (inventoryStatuses as readonly string[]).includes(status ?? "")
        ? (status as InventoryFilters["status"])
        : "ALL",
    productStatus: (productStatuses as readonly string[]).includes(productStatus ?? "")
      ? (productStatus as InventoryFilters["productStatus"])
      : "ALL",
    sort:
      sort === "sku_asc" || sort === "available_asc" || sort === "available_desc" || sort === "updated_desc"
        ? sort
        : "product_asc",
    page,
    pageSize: INVENTORY_DEFAULT_PAGE_SIZE,
  };
}

export function normalizeLedgerFilters(input: Record<string, unknown> = {}): LedgerFilters {
  const operationType = optional(input.operationType);
  const dateFrom = optional(input.dateFrom);
  const dateTo = optional(input.dateTo);
  const page = Math.max(Number.parseInt(optional(input.page) ?? "1", 10) || 1, 1);

  return {
    operationType: ([
      "RECEIVED",
      "RESERVED",
      "RELEASED",
      "SOLD",
      "RETURNED",
      "DAMAGED",
      "ADJUSTMENT",
    ] as readonly string[]).includes(operationType ?? "")
      ? (operationType as InventoryTransactionType)
      : "ALL",
    dateFrom: dateFrom && /^\d{4}-\d{2}-\d{2}$/.test(dateFrom) ? dateFrom : undefined,
    dateTo: dateTo && /^\d{4}-\d{2}-\d{2}$/.test(dateTo) ? dateTo : undefined,
    page,
    pageSize: INVENTORY_LEDGER_DEFAULT_PAGE_SIZE,
  };
}

export async function requireInventoryAccess() {
  const staff = await requireActiveStaff({ mode: "redirect" });
  if (!canManageInventory(staff)) {
    throw new Error("FORBIDDEN");
  }
  return staff;
}

function mapInventoryRow(row: AdminInventoryVariantViewRow): InventoryVariantRow {
  const stockInitialized = Boolean(row.stock_initialized);
  const availableQuantity = getAvailableQuantity(row.stock_on_hand, row.reserved_quantity);
  return {
    variantId: row.variant_id,
    productId: row.product_id,
    productName: row.product_name,
    productSlug: row.product_slug,
    productStatus: row.product_status,
    brandId: row.brand_id,
    brandName: row.brand_name,
    categoryId: row.category_id,
    categoryName: row.category_name,
    sku: row.sku,
    sizeMl: row.size_ml,
    concentration: row.concentration,
    variantActive: row.variant_active,
    stockInitialized,
    inventoryInitializedAt: row.inventory_initialized_at,
    stockOnHand: row.stock_on_hand,
    reservedQuantity: row.reserved_quantity,
    availableQuantity,
    lowStockThreshold: row.low_stock_threshold,
    inventoryStatus: getAvailabilityStatus(row.stock_on_hand, row.reserved_quantity, row.low_stock_threshold, stockInitialized),
    updatedAt: row.updated_at,
    lastMovementAt: row.last_movement_at,
    lastMovementType: row.last_movement_type,
  };
}

function applyInventoryFilters(query: unknown, filters: InventoryFilters) {
  let next = query as {
    ilike(column: string, pattern: string): typeof next;
    or(expression: string): typeof next;
    eq(column: string, value: unknown): typeof next;
    gt(column: string, value: unknown): typeof next;
    in(column: string, value: unknown[]): typeof next;
  };

  if (filters.q) {
    const escaped = filters.q.replace(/[%,()]/g, " ");
    next = next.or(`product_name.ilike.%${escaped}%,sku.ilike.%${escaped}%,brand_name.ilike.%${escaped}%`);
  }
  if (filters.brandId) next = next.eq("brand_id", filters.brandId);
  if (filters.categoryId) next = next.eq("category_id", filters.categoryId);
  if (filters.active === "ACTIVE") next = next.eq("variant_active", true);
  if (filters.active === "INACTIVE") next = next.eq("variant_active", false);
  if (filters.initialized === "INITIALIZED") next = next.eq("stock_initialized", true);
  if (filters.initialized === "UNINITIALIZED") next = next.eq("stock_initialized", false);
  if (filters.productStatus && filters.productStatus !== "ALL") next = next.eq("product_status", filters.productStatus);
  if (filters.status && filters.status !== "ALL") {
    if (filters.status === "RESERVED") next = next.gt("reserved_quantity", 0);
    else if (filters.status === "LOW_OR_OUT") next = next.in("inventory_status", ["LOW_STOCK", "OUT_OF_STOCK"]);
    else next = next.eq("inventory_status", filters.status);
  }

  return next;
}

function applyInventorySort(query: unknown, sort: InventoryFilters["sort"]) {
  let next = query as { order(column: string, options?: { ascending?: boolean }): typeof next };
  switch (sort) {
    case "sku_asc":
      next = next.order("sku", { ascending: true });
      break;
    case "available_asc":
      next = next.order("available_quantity", { ascending: true });
      break;
    case "available_desc":
      next = next.order("available_quantity", { ascending: false });
      break;
    case "updated_desc":
      next = next.order("updated_at", { ascending: false });
      break;
    case "product_asc":
    default:
      next = next.order("product_name", { ascending: true }).order("sku", { ascending: true });
      break;
  }
  return next.order("variant_id", { ascending: true });
}

export async function listInventoryVariants(input: Record<string, unknown> = {}): Promise<PaginatedInventory<InventoryVariantRow>> {
  const filters = normalizeInventoryFilters(input);
  const { page, pageSize, from, to } = normalizePage(filters.page, INVENTORY_DEFAULT_PAGE_SIZE);
  let query = createSupabaseAdminClient()
    .from("admin_inventory_variants" as never)
    .select("*", { count: "exact" })
    .range(from, to) as never;

  query = applyInventoryFilters(query, filters) as never;
  query = applyInventorySort(query, filters.sort) as never;

  const { data, error, count } = (await query) as {
    data: AdminInventoryVariantViewRow[] | null;
    error: { message?: string } | null;
    count: number | null;
  };

  if (error) throw new Error("INVENTORY_LIST_FAILED");

  const items = (data ?? []).map(mapInventoryRow);
  return { items, page, pageSize, total: count ?? items.length, totalPages: Math.max(Math.ceil((count ?? items.length) / pageSize), 1) };
}

export async function listLowStockVariants(input: Record<string, unknown> = {}) {
  return listInventoryVariants({ ...input, initialized: "INITIALIZED", status: optional(input.status) ?? "LOW_OR_OUT" });
}

export async function getInventoryVariant(variantId: string): Promise<InventoryVariantRow | null> {
  const parsed = z.uuid().safeParse(variantId);
  if (!parsed.success) return null;
  const { data, error } = (await createSupabaseAdminClient()
    .from("admin_inventory_variants" as never)
    .select("*")
    .eq("variant_id", parsed.data)
    .maybeSingle()) as { data: AdminInventoryVariantViewRow | null; error: { message?: string } | null };

  if (error) throw new Error("INVENTORY_DETAIL_FAILED");
  return data ? mapInventoryRow(data) : null;
}

export async function listInventoryLedger(
  variantId: string,
  input: Record<string, unknown> = {},
): Promise<PaginatedInventory<InventoryLedgerRow>> {
  const parsedVariantId = z.uuid().parse(variantId);
  const filters = normalizeLedgerFilters(input);
  const { page, pageSize, from, to } = normalizePage(filters.page, INVENTORY_LEDGER_DEFAULT_PAGE_SIZE);
  let query = createSupabaseAdminClient()
    .from("inventory_transactions")
    .select("id, variant_id, type, quantity_delta, stock_before, stock_after, reserved_before, reserved_after, order_id, actor_id, reason, metadata, created_at, profiles(full_name)", { count: "exact" })
    .eq("variant_id", parsedVariantId)
    .range(from, to) as unknown as InventoryLedgerQuery;

  if (filters.operationType && filters.operationType !== "ALL") query = query.eq("type", filters.operationType);
  if (filters.dateFrom) query = query.gte("created_at", `${filters.dateFrom}T00:00:00.000Z`);
  if (filters.dateTo) query = query.lte("created_at", `${filters.dateTo}T23:59:59.999Z`);
  query = query.order("created_at", { ascending: false }).order("id", { ascending: false });

  const { data, error, count } = await query;

  if (error) throw new Error("INVENTORY_LEDGER_FAILED");
  const items = (data ?? []).map((row) => ({
    id: row.id,
    variantId: row.variant_id,
    type: row.type,
    quantityDelta: row.quantity_delta,
    stockBefore: row.stock_before,
    stockAfter: row.stock_after,
    reservedBefore: row.reserved_before,
    reservedAfter: row.reserved_after,
    reason: row.reason,
    orderId: row.order_id,
    actorId: row.actor_id,
    actorName: row.profiles?.full_name ?? null,
    metadata: typeof row.metadata === "object" && row.metadata && !Array.isArray(row.metadata) ? row.metadata as Record<string, unknown> : {},
    createdAt: row.created_at,
  }));

  return { items, page, pageSize, total: count ?? items.length, totalPages: Math.max(Math.ceil((count ?? items.length) / pageSize), 1) };
}

function inventoryErrorMessage(code: InventoryErrorCode) {
  const messages: Record<InventoryErrorCode, string> = {
    INVENTORY_INVALID_REQUEST: "La demande d'inventaire est invalide.",
    INVENTORY_INVALID_OPERATION: "Cette opération d'inventaire n'est pas autorisée.",
    INVENTORY_INVALID_QUANTITY: "La quantité d'inventaire est invalide.",
    INVENTORY_REASON_REQUIRED: "Un motif est requis pour cette opération.",
    INVENTORY_ALREADY_INITIALIZED: "Le stock de cette variante est déjà initialisé.",
    INVENTORY_NOT_INITIALIZED: "Initialisez le stock avant d'effectuer cette opération.",
    INVENTORY_NEGATIVE_STOCK: "L'opération rendrait le stock négatif.",
    INVENTORY_RESERVED_INVARIANT: "L'opération ferait passer le stock sous la quantité réservée.",
    INVENTORY_IDEMPOTENCY_CONFLICT: "Cette opération a déjà été utilisée avec un contenu différent.",
    INVENTORY_UNAUTHORIZED: "Vous n'êtes pas autorisé à modifier l'inventaire.",
    INVENTORY_UPDATE_FAILED: "L'opération d'inventaire n'a pas pu être enregistrée.",
  };
  return messages[code];
}

function mapInventoryDbError(error?: { code?: string; message?: string }): InventoryErrorCode {
  const raised = error?.message?.match(/\bINVENTORY_[A-Z_]+\b/)?.[0] as InventoryErrorCode | undefined;
  if (raised) return raised;
  if (error?.code === "42501") return "INVENTORY_UNAUTHORIZED";
  if (error?.code === "23514") return "INVENTORY_RESERVED_INVARIANT";
  if (error?.code === "23505") return "INVENTORY_IDEMPOTENCY_CONFLICT";
  return "INVENTORY_UPDATE_FAILED";
}

export function createInventoryAdjustmentFingerprint(input: Omit<InventoryAdjustmentInput, "idempotencyKey"> & { actorId: string }) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        actorId: input.actorId,
        variantId: input.variantId,
        operationType: input.operationType,
        quantity: input.quantity,
        adjustmentDirection: input.adjustmentDirection ?? null,
        reason: input.reason?.trim() ?? null,
        reference: input.reference?.trim() ?? null,
      }),
    )
    .digest("hex");
}

export async function adjustInventory(input: InventoryAdjustmentInput, staff: StaffProfile): Promise<InventoryActionResult<InventoryAdjustmentResult>> {
  if (!canManageInventory(staff)) {
    return { ok: false, code: "INVENTORY_UNAUTHORIZED", message: inventoryErrorMessage("INVENTORY_UNAUTHORIZED") };
  }

  const parsed = inventoryAdjustmentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "INVENTORY_INVALID_REQUEST", message: inventoryErrorMessage("INVENTORY_INVALID_REQUEST") };
  }

  const requestFingerprint = createInventoryAdjustmentFingerprint({ ...parsed.data, actorId: staff.id });
  const rpcPayload = {
    ...parsed.data,
    reason: parsed.data.reason?.trim() || undefined,
    reference: parsed.data.reference?.trim() || undefined,
    actorId: staff.id,
    requestFingerprint,
  };

  const supabase = createSupabaseAdminClient() as unknown as InventoryRpcClient;
  const { data, error } = await supabase.rpc("adjust_inventory_server", { request: rpcPayload });
  if (error || !data) {
    const code = mapInventoryDbError(error ?? undefined);
    console.error("INVENTORY_DATABASE_FAILURE", { dbCode: error?.code ?? "unknown", mappedCode: code });
    return { ok: false, code, message: inventoryErrorMessage(code) };
  }

  const result = z
    .object({
      variantId: z.uuid(),
      operationType: z.enum(manualInventoryOperationTypes),
      transactionType: z.enum(["RECEIVED", "RESERVED", "RELEASED", "SOLD", "RETURNED", "DAMAGED", "ADJUSTMENT"]),
      quantityDelta: z.number().int(),
      stockBefore: z.number().int().min(0),
      stockAfter: z.number().int().min(0),
      reservedBefore: z.number().int().min(0),
      reservedAfter: z.number().int().min(0),
      availableAfter: z.number().int().min(0),
      inventoryInitializedAt: z.string().nullable(),
      transactionId: z.uuid(),
    })
    .safeParse(data);

  if (!result.success) {
    return { ok: false, code: "INVENTORY_UPDATE_FAILED", message: inventoryErrorMessage("INVENTORY_UPDATE_FAILED") };
  }

  return { ok: true, data: result.data };
}

export function inventoryStatusLabel(status: InventoryStatus) {
  return {
    UNCONFIGURED: "Stock non configuré",
    IN_STOCK: "En stock",
    LOW_STOCK: "Stock faible",
    OUT_OF_STOCK: "Rupture de stock",
  }[status];
}

export function inventoryOperationLabel(type: ManualInventoryOperationType | InventoryTransactionType) {
  return {
    INITIALIZE: "Initialisation",
    RECEIVED: "Réception",
    RESERVED: "Réservation",
    RELEASED: "Libération",
    SOLD: "Vente",
    RETURNED: "Retour",
    DAMAGED: "Endommagé",
    ADJUSTMENT: "Correction",
  }[type];
}

export function productStatusLabel(status: ProductStatus) {
  return { DRAFT: "Brouillon", ACTIVE: "Actif", ARCHIVED: "Archivé" }[status];
}

export function variantStateLabel(active: boolean) {
  return active ? "Active" : "Inactive";
}

export function escapeCsvCell(value: unknown) {
  const raw = value === null || value === undefined ? "" : String(value);
  const protectedValue = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  if (/[",\n\r]/.test(protectedValue)) return `"${protectedValue.replace(/"/g, '""')}"`;
  return protectedValue;
}

export function rowsToCsv(headers: string[], rows: unknown[][]) {
  return [headers, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

export function inventoryRowsToCsv(rows: InventoryVariantRow[]) {
  return rowsToCsv(
    ["Produit", "Marque", "SKU", "Taille", "Concentration", "Variante active", "Stock initialisé", "Stock physique", "Réservé", "Disponible", "Seuil", "Statut", "Mis à jour"],
    rows.map((row) => [
      row.productName,
      row.brandName ?? "",
      row.sku,
      row.sizeMl,
      row.concentration ?? "",
      variantStateLabel(row.variantActive),
      row.stockInitialized ? "Oui" : "Non",
      row.stockOnHand,
      row.reservedQuantity,
      row.availableQuantity,
      row.lowStockThreshold,
      inventoryStatusLabel(row.inventoryStatus),
      row.updatedAt,
    ]),
  );
}

export function ledgerRowsToCsv(variant: InventoryVariantRow, rows: InventoryLedgerRow[]) {
  return rowsToCsv(
    ["Date", "Produit", "SKU", "Opération", "Delta", "Stock avant", "Stock après", "Réservé avant", "Réservé après", "Motif", "Référence", "Acteur"],
    rows.map((row) => [
      row.createdAt,
      variant.productName,
      variant.sku,
      inventoryOperationLabel(row.type),
      row.quantityDelta,
      row.stockBefore,
      row.stockAfter,
      row.reservedBefore,
      row.reservedAfter,
      row.reason,
      typeof row.metadata.reference === "string" ? row.metadata.reference : row.orderId ?? "",
      row.actorName ?? "Système",
    ]),
  );
}
