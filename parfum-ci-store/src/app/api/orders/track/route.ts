import { NextResponse } from "next/server";

import { InMemoryCheckoutRateLimiter } from "@/lib/orders/rate-limit";
import {
  lookupOrderForTracking,
  normalizeTrackingRequest,
  trackOrderRequestSchema,
  trackingRateLimitKey,
} from "@/lib/orders/tracking";

export const dynamic = "force-dynamic";

const TRACKING_MAX_BODY_BYTES = 4_000;
export const trackingRateLimiter = new InMemoryCheckoutRateLimiter({
  maxAttempts: 10,
  windowMs: 15 * 60 * 1000,
  maxKeys: 2_000,
});

function noStore(status = 200) {
  return { status, headers: { "Cache-Control": "no-store" } };
}

function genericNoResult(status = 200, retryAfterSeconds?: number) {
  return NextResponse.json(
    {
      found: false,
      message: "Aucune commande ne correspond aux informations fournies.",
    },
    {
      ...noStore(status),
      headers: {
        "Cache-Control": "no-store",
        ...(retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : {}),
      },
    },
  );
}

async function readBoundedJson(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) throw new Error("INVALID");
  const contentLength = Number.parseInt(request.headers.get("content-length") ?? "0", 10);
  if (Number.isFinite(contentLength) && contentLength > TRACKING_MAX_BODY_BYTES) throw new Error("INVALID");
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > TRACKING_MAX_BODY_BYTES) throw new Error("INVALID");
  return JSON.parse(raw) as unknown;
}

export async function POST(request: Request) {
  let rawBody: unknown;
  try {
    rawBody = await readBoundedJson(request);
  } catch {
    return genericNoResult(400);
  }

  const parsed = trackOrderRequestSchema.safeParse(rawBody);
  if (!parsed.success || parsed.data.honeypot) return genericNoResult(400);

  let normalizedPhone: string | undefined;
  try {
    normalizedPhone = normalizeTrackingRequest(parsed.data).phone;
  } catch {
    return genericNoResult(400);
  }

  const rateLimitKey = trackingRateLimitKey(request, parsed.data.orderNumber, normalizedPhone);
  const rateLimit = await trackingRateLimiter.check(rateLimitKey);
  if (!rateLimit.allowed) return genericNoResult(429, rateLimit.retryAfterSeconds);
  await trackingRateLimiter.recordAttempt(rateLimitKey);

  const result = await lookupOrderForTracking(parsed.data);
  return NextResponse.json(result.found ? result : { found: false, message: "Aucune commande ne correspond aux informations fournies." }, noStore());
}

