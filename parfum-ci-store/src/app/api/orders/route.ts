import { NextResponse } from "next/server";

import { readBoundedJson } from "@/lib/http/read-bounded-json";
import {
  GUEST_ORDER_MAX_BODY_BYTES,
  guestOrderRequestSchema,
  normalizeGuestOrderRequest,
  publicOrderError,
} from "@/lib/orders/guest-order-contract";
import { createGuestOrder, GuestOrderError } from "@/lib/orders/guest-order-service";
import { checkoutRateLimiter, checkoutRateLimitKey } from "@/lib/orders/rate-limit";
import { evaluateLowStockForVariants } from "@/lib/notifications/low-stock";
import { processNotifications } from "@/lib/notifications/processor";

export const dynamic = "force-dynamic";

function noStore(status = 200) {
  return { status, headers: { "Cache-Control": "no-store" } };
}

function jsonError(
  code: Parameters<typeof publicOrderError>[0],
  status = 400,
  retryAfterSeconds?: number,
) {
  const error = publicOrderError(code, status);
  return NextResponse.json(error.body, {
    ...noStore(error.status),
    headers: {
      "Cache-Control": "no-store",
      ...(retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : {}),
    },
  });
}

export async function POST(request: Request) {
  let rawBody: unknown;

  try {
    rawBody = await readBoundedJson(request, GUEST_ORDER_MAX_BODY_BYTES);
  } catch {
    return jsonError("ORDER_INVALID_REQUEST", 400);
  }

  const parsed = guestOrderRequestSchema.safeParse(rawBody);
  if (!parsed.success) return jsonError("ORDER_INVALID_REQUEST", 400);
  if (parsed.data.honeypot) return jsonError("ORDER_INVALID_REQUEST", 400);

  let normalizedPhone: string | undefined;
  try {
    normalizedPhone = normalizeGuestOrderRequest(parsed.data).customer.phone;
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_INVALID_PHONE") {
      return jsonError("ORDER_INVALID_PHONE", 400);
    }
    return jsonError("ORDER_INVALID_REQUEST", 400);
  }

  const rateLimitKey = checkoutRateLimitKey(request, normalizedPhone);
  const rateLimit = await checkoutRateLimiter.check(rateLimitKey);
  if (!rateLimit.allowed) {
    return jsonError("ORDER_RATE_LIMITED", 429, rateLimit.retryAfterSeconds);
  }
  await checkoutRateLimiter.recordAttempt(rateLimitKey);

  try {
    const confirmation = await createGuestOrder(parsed.data);
    const variantIds = parsed.data.lines.map((line) => line.variantId);
    evaluateLowStockForVariants(variantIds).catch(() =>
      console.error("LOW_STOCK_POST_ORDER_FAILED"),
    );
    processNotifications(2).catch(() => console.error("NOTIFICATION_POST_ORDER_PROCESS_FAILED"));
    return NextResponse.json(confirmation, noStore(201));
  } catch (error) {
    if (error instanceof GuestOrderError) {
      return jsonError(error.code, error.status);
    }

    console.error("ORDER_CREATION_FAILED");
    return jsonError("ORDER_CREATION_FAILED", 500);
  }
}
