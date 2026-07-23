import { NextResponse } from "next/server";

import {
  GUEST_ORDER_MAX_BODY_BYTES,
  guestOrderRequestSchema,
  normalizeGuestOrderRequest,
  publicOrderError,
} from "@/lib/orders/guest-order-contract";
import { createGuestOrder, GuestOrderError } from "@/lib/orders/guest-order-service";
import { checkoutRateLimiter, checkoutRateLimitKey } from "@/lib/orders/rate-limit";

export const dynamic = "force-dynamic";

function noStore(status = 200) {
  return { status, headers: { "Cache-Control": "no-store" } };
}

function jsonError(code: Parameters<typeof publicOrderError>[0], status = 400, retryAfterSeconds?: number) {
  const error = publicOrderError(code, status);
  return NextResponse.json(error.body, {
    ...noStore(error.status),
    headers: {
      "Cache-Control": "no-store",
      ...(retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : {}),
    },
  });
}

async function readBoundedJson(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error("ORDER_INVALID_REQUEST");
  }

  const contentLength = Number.parseInt(request.headers.get("content-length") ?? "0", 10);
  if (Number.isFinite(contentLength) && contentLength > GUEST_ORDER_MAX_BODY_BYTES) {
    throw new Error("ORDER_INVALID_REQUEST");
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > GUEST_ORDER_MAX_BODY_BYTES) {
    throw new Error("ORDER_INVALID_REQUEST");
  }

  return JSON.parse(raw) as unknown;
}

export async function POST(request: Request) {
  let rawBody: unknown;

  try {
    rawBody = await readBoundedJson(request);
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
    return NextResponse.json(confirmation, noStore(201));
  } catch (error) {
    if (error instanceof GuestOrderError) {
      return jsonError(error.code, error.status);
    }

    console.error("ORDER_CREATION_FAILED");
    return jsonError("ORDER_CREATION_FAILED", 500);
  }
}
