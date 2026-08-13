import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  createGuestOrderFingerprint,
  normalizeGuestOrderRequest,
  type GuestOrderConfirmation,
  type GuestOrderRequest,
  type GuestOrderErrorCode,
} from "@/lib/orders/guest-order-contract";

type GuestOrderRpcClient = {
  rpc(
    fn: "create_guest_order_server",
    args: { request: Record<string, unknown> },
  ): Promise<{ data: GuestOrderConfirmation | null; error: { code?: string; message?: string } | null }>;
};

export class GuestOrderError extends Error {
  constructor(
    readonly code: GuestOrderErrorCode,
    readonly status = 400,
  ) {
    super(code);
  }
}

const dbErrorMap: Record<string, { code: GuestOrderErrorCode; status: number }> = {
  ORDER_INVALID_REQUEST: { code: "ORDER_INVALID_REQUEST", status: 400 },
  ORDER_INVALID_IDEMPOTENCY_KEY: { code: "ORDER_INVALID_REQUEST", status: 400 },
  ORDER_INVALID_FINGERPRINT: { code: "ORDER_INVALID_REQUEST", status: 400 },
  ORDER_INVALID_QUANTITY: { code: "ORDER_INVALID_REQUEST", status: 400 },
  ORDER_INVALID_PHONE: { code: "ORDER_INVALID_PHONE", status: 400 },
  ORDER_EMPTY_CART: { code: "ORDER_EMPTY_CART", status: 400 },
  ORDER_TOO_MANY_LINES: { code: "ORDER_TOO_MANY_LINES", status: 400 },
  ORDER_ITEM_UNAVAILABLE: { code: "ORDER_ITEM_UNAVAILABLE", status: 409 },
  ORDER_INSUFFICIENT_STOCK: { code: "ORDER_INSUFFICIENT_STOCK", status: 409 },
  ORDER_INVENTORY_NOT_CONFIGURED: { code: "ORDER_INVENTORY_NOT_CONFIGURED", status: 409 },
  ORDER_IDEMPOTENCY_CONFLICT: { code: "ORDER_IDEMPOTENCY_CONFLICT", status: 409 },
  ORDER_CUSTOMER_CONFLICT: { code: "ORDER_CUSTOMER_CONFLICT", status: 409 },
  ORDER_PAYMENT_METHOD_DISABLED: { code: "ORDER_PAYMENT_METHOD_DISABLED", status: 400 },
  ORDER_DELIVERY_METHOD_DISABLED: { code: "ORDER_DELIVERY_METHOD_DISABLED", status: 400 },
  ORDER_PAYMENT_METHOD_UNAVAILABLE: { code: "ORDER_PAYMENT_METHOD_DISABLED", status: 400 },
  ORDER_DELIVERY_METHOD_UNAVAILABLE: { code: "ORDER_DELIVERY_METHOD_DISABLED", status: 400 },
  ORDER_DELIVERY_AREA_UNAVAILABLE: { code: "ORDER_DELIVERY_AREA_UNAVAILABLE", status: 400 },
  ORDER_ACCEPTANCE_DISABLED: { code: "ORDER_ACCEPTANCE_DISABLED", status: 503 },
  ORDER_STORE_SETTINGS_UNAVAILABLE: { code: "ORDER_STORE_SETTINGS_UNAVAILABLE", status: 503 },
  ORDER_SERVER_MISCONFIGURED: { code: "ORDER_SERVER_MISCONFIGURED", status: 503 },
  ORDER_TOTAL_INVALID: { code: "ORDER_INVALID_REQUEST", status: 400 },
  ORDER_NUMBER_GENERATION_FAILED: { code: "ORDER_CREATION_FAILED", status: 500 },
  ORDER_FORCED_ROLLBACK: { code: "ORDER_CREATION_FAILED", status: 500 },
};

const serverMisconfigurationCodes = new Set([
  "42501",
  "42703",
  "42883",
  "42P01",
  "42P10",
  "PGRST202",
  "PGRST204",
  "PGRST205",
]);

function mapDatabaseError(error?: { code?: string; message?: string }) {
  if (error?.code === "23505") return { code: "ORDER_CUSTOMER_CONFLICT" as const, status: 409 };
  if (error?.code === "23514") return { code: "ORDER_INVALID_REQUEST" as const, status: 400 };
  const normalized =
    error?.message?.match(/\bORDER_[A-Z_]+\b/)?.[0] ??
    error?.code?.match(/\bORDER_[A-Z_]+\b/)?.[0] ??
    "";
  if (normalized in dbErrorMap) return dbErrorMap[normalized];
  if (error?.code && serverMisconfigurationCodes.has(error.code)) {
    return { code: "ORDER_SERVER_MISCONFIGURED" as const, status: 503 };
  }
  return { code: "ORDER_CREATION_FAILED" as const, status: 500 };
}

function logDatabaseOrderFailure(
  error: { code?: string; message?: string } | undefined,
  mapped: { code: GuestOrderErrorCode; status: number },
) {
  console.error("ORDER_DATABASE_FAILURE", {
    dbCode: error?.code ?? "unknown",
    mappedCode: mapped.code,
    status: mapped.status,
    raisedCode: error?.message?.match(/\bORDER_[A-Z_]+\b/)?.[0] ?? null,
  });
}

export async function createGuestOrder(input: GuestOrderRequest): Promise<GuestOrderConfirmation> {
  let normalized: ReturnType<typeof normalizeGuestOrderRequest>;

  try {
    normalized = normalizeGuestOrderRequest(input);
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_INVALID_PHONE") {
      throw new GuestOrderError("ORDER_INVALID_PHONE", 400);
    }
    if (error instanceof Error && error.message === "ORDER_EMPTY_CART") {
      throw new GuestOrderError("ORDER_EMPTY_CART", 400);
    }
    if (error instanceof Error && error.message === "ORDER_TOO_MANY_LINES") {
      throw new GuestOrderError("ORDER_TOO_MANY_LINES", 400);
    }
    throw new GuestOrderError("ORDER_INVALID_REQUEST", 400);
  }

  const requestFingerprint = createGuestOrderFingerprint(normalized);
  const rpcPayload = {
    ...normalized,
    requestFingerprint,
    attribution: normalized.attribution
      ? {
          utmSource: normalized.attribution.utmSource,
          utmMedium: normalized.attribution.utmMedium,
          utmCampaign: normalized.attribution.utmCampaign,
          utmTerm: normalized.attribution.utmTerm,
          utmContent: normalized.attribution.utmContent,
        }
      : undefined,
  };

  const supabase = createSupabaseAdminClient() as unknown as GuestOrderRpcClient;
  const { data, error } = await supabase.rpc("create_guest_order_server", { request: rpcPayload });

  if (error || !data) {
    const mapped = mapDatabaseError(error ?? undefined);
    logDatabaseOrderFailure(error ?? undefined, mapped);
    throw new GuestOrderError(mapped.code, mapped.status);
  }

  return data;
}
