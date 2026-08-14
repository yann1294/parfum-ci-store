import { NextResponse } from "next/server";

import { BoundedJsonError, readBoundedJson } from "@/lib/http/read-bounded-json";
import {
  contactErrorMessage,
  normalizeContactMessageRequest,
  contactMessageRequestSchema,
} from "@/lib/messages/contract";
import { contactMessageRateLimiter, contactMessageRateLimitKey } from "@/lib/messages/rate-limit";
import { createContactMessage } from "@/lib/messages/service";

export const dynamic = "force-dynamic";
const CONTACT_MESSAGE_MAX_BODY_BYTES = 12_000;

function noStore(init?: ResponseInit) {
  return {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      ...(init?.headers ?? {}),
    },
  };
}

function jsonError(code: string, status: number, retryAfterSeconds?: number) {
  return NextResponse.json(
    { error: { code, message: contactErrorMessage(code), retryAfterSeconds } },
    noStore({ status }),
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await readBoundedJson(request, CONTACT_MESSAGE_MAX_BODY_BYTES);
  } catch (error) {
    if (error instanceof BoundedJsonError && error.code === "UNSUPPORTED_MEDIA_TYPE") {
      return jsonError("MESSAGE_INVALID_REQUEST", 415);
    }
    if (error instanceof BoundedJsonError && error.code === "PAYLOAD_TOO_LARGE") {
      return jsonError("MESSAGE_INVALID_REQUEST", 413);
    }
    return jsonError("MESSAGE_INVALID_REQUEST", 400);
  }

  const parsed = contactMessageRequestSchema.safeParse(body);
  if (!parsed.success || parsed.data.honeypot) return jsonError("MESSAGE_INVALID_REQUEST", 400);

  let contactKey = parsed.data.email ?? "anonymous";
  try {
    const normalized = normalizeContactMessageRequest(parsed.data);
    contactKey =
      normalized.phone ??
      normalized.email ??
      normalized.whatsapp ??
      normalized.externalHandle ??
      "anonymous";
  } catch {
    if (parsed.data.phone || parsed.data.whatsapp) return jsonError("MESSAGE_INVALID_PHONE", 400);
  }

  const rateLimitKey = contactMessageRateLimitKey(request, contactKey);
  const rateLimit = await contactMessageRateLimiter.check(rateLimitKey);
  if (!rateLimit.allowed)
    return jsonError("MESSAGE_RATE_LIMITED", 429, rateLimit.retryAfterSeconds);
  await contactMessageRateLimiter.recordAttempt(rateLimitKey);

  const result = await createContactMessage(parsed.data);
  if (!result.ok) return jsonError(result.code, result.status);

  return NextResponse.json(result.data, noStore({ status: 201 }));
}
