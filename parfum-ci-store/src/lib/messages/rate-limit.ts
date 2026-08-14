import "server-only";

import type { RateLimitResult } from "@/lib/auth/rate-limit";
import { InMemoryCheckoutRateLimiter } from "@/lib/orders/rate-limit";
import { getRequestIp, hashRateLimitKey } from "@/lib/security/rate-limit-key";

export const contactMessageRateLimiter = new InMemoryCheckoutRateLimiter({
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
  maxKeys: 2_000,
});

export function contactMessageRateLimitKey(request: Request, contactKey: string) {
  return hashRateLimitKey("contact", `${getRequestIp(request)}:${contactKey || "anonymous"}`);
}

export type ContactMessageRateLimitResult = RateLimitResult;
