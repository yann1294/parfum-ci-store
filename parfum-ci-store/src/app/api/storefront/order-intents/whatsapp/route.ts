import { NextResponse } from "next/server";

import { InMemoryCheckoutRateLimiter } from "@/lib/orders/rate-limit";
import {
  createWhatsAppOrderIntent,
  WHATSAPP_INTENT_MAX_BODY_BYTES,
  whatsappOrderIntentRequestSchema,
} from "@/lib/storefront/whatsapp-order-intent";

export const dynamic = "force-dynamic";

const whatsappIntentRateLimiter = new InMemoryCheckoutRateLimiter({
  maxAttempts: 20,
  windowMs: 5 * 60 * 1000,
  maxKeys: 2_000,
});

function noStore(status = 200) {
  return { status, headers: { "Cache-Control": "no-store" } };
}

function safeError(
  code: "WHATSAPP_INTENT_INVALID_REQUEST" | "WHATSAPP_INTENT_CART_NOT_READY" | "WHATSAPP_INTENT_VALIDATION_FAILED" | "WHATSAPP_INTENT_RATE_LIMITED",
  status = 400,
  retryAfterSeconds?: number,
) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message:
          code === "WHATSAPP_INTENT_CART_NOT_READY"
            ? "Votre panier doit être vérifié avant l'envoi via WhatsApp."
            : code === "WHATSAPP_INTENT_RATE_LIMITED"
              ? "Trop de tentatives. Réessayez dans un instant."
              : "La demande WhatsApp n'a pas pu être préparée.",
      },
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
  if (Number.isFinite(contentLength) && contentLength > WHATSAPP_INTENT_MAX_BODY_BYTES) throw new Error("INVALID");

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > WHATSAPP_INTENT_MAX_BODY_BYTES) throw new Error("INVALID");
  return JSON.parse(raw) as unknown;
}

function rateLimitKey(request: Request, intentKey: string) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const ip = forwardedFor || realIp || "unknown";
  return `whatsapp-intent:${ip}:${intentKey.slice(0, 48)}`.slice(0, 240);
}

export async function POST(request: Request) {
  let rawBody: unknown;

  try {
    rawBody = await readBoundedJson(request);
  } catch {
    return safeError("WHATSAPP_INTENT_INVALID_REQUEST", 400);
  }

  const parsed = whatsappOrderIntentRequestSchema.safeParse(rawBody);
  if (!parsed.success) return safeError("WHATSAPP_INTENT_INVALID_REQUEST", 400);

  const limit = await whatsappIntentRateLimiter.check(rateLimitKey(request, parsed.data.intentKey));
  if (!limit.allowed) {
    return safeError("WHATSAPP_INTENT_RATE_LIMITED", 429, limit.retryAfterSeconds);
  }
  await whatsappIntentRateLimiter.recordAttempt(rateLimitKey(request, parsed.data.intentKey));

  const result = await createWhatsAppOrderIntent(parsed.data);
  if (!result.ok) return safeError(result.code, result.code === "WHATSAPP_INTENT_CART_NOT_READY" ? 409 : 400);

  return NextResponse.json(
    {
      ok: true,
      tracked: result.tracked,
      intentReference: result.intentReference,
      snapshot: result.snapshot,
    },
    noStore(200),
  );
}
