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
  ORDER_INVALID_PHONE: { code: "ORDER_INVALID_PHONE", status: 400 },
  ORDER_EMPTY_CART: { code: "ORDER_EMPTY_CART", status: 400 },
  ORDER_TOO_MANY_LINES: { code: "ORDER_TOO_MANY_LINES", status: 400 },
  ORDER_ITEM_UNAVAILABLE: { code: "ORDER_ITEM_UNAVAILABLE", status: 409 },
  ORDER_INSUFFICIENT_STOCK: { code: "ORDER_INSUFFICIENT_STOCK", status: 409 },
  ORDER_INVENTORY_NOT_CONFIGURED: { code: "ORDER_INVENTORY_NOT_CONFIGURED", status: 409 },
  ORDER_IDEMPOTENCY_CONFLICT: { code: "ORDER_IDEMPOTENCY_CONFLICT", status: 409 },
  ORDER_PAYMENT_METHOD_DISABLED: { code: "ORDER_PAYMENT_METHOD_DISABLED", status: 400 },
  ORDER_DELIVERY_METHOD_DISABLED: { code: "ORDER_DELIVERY_METHOD_DISABLED", status: 400 },
};

function mapDatabaseError(message?: string) {
  const normalized = message?.trim().split(/\s+/)[0] ?? "";
  return dbErrorMap[normalized] ?? { code: "ORDER_CREATION_FAILED" as const, status: 500 };
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
    const mapped = mapDatabaseError(error?.message);
    throw new GuestOrderError(mapped.code, mapped.status);
  }

  return data;
}
