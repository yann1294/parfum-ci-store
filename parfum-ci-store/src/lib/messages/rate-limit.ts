import "server-only";

import type { RateLimitResult } from "@/lib/auth/rate-limit";
import { InMemoryCheckoutRateLimiter } from "@/lib/orders/rate-limit";

export const contactMessageRateLimiter = new InMemoryCheckoutRateLimiter({
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
  maxKeys: 2_000,
});

export function contactMessageRateLimitKey(request: Request, contactKey: string) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const ip = forwardedFor || realIp || "unknown";
  return `contact:${ip}:${contactKey || "anonymous"}`.slice(0, 240);
}

export type ContactMessageRateLimitResult = RateLimitResult;
