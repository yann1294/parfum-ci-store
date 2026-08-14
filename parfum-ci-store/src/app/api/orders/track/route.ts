import { NextResponse } from "next/server";

import { readBoundedJson } from "@/lib/http/read-bounded-json";
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

export async function POST(request: Request) {
  let rawBody: unknown;
  try {
    rawBody = await readBoundedJson(request, TRACKING_MAX_BODY_BYTES);
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
  return NextResponse.json(
    result.found
      ? result
      : { found: false, message: "Aucune commande ne correspond aux informations fournies." },
    noStore(),
  );
}
