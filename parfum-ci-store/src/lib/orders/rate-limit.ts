import "server-only";

import type { RateLimitResult } from "@/lib/auth/rate-limit";

type AttemptState = {
  count: number;
  windowExpiresAt: number;
  blockedUntil: number;
};

export interface CheckoutRateLimiter {
  check(key: string): Promise<RateLimitResult>;
  recordAttempt(key: string): Promise<void>;
}

export class InMemoryCheckoutRateLimiter implements CheckoutRateLimiter {
  private attempts = new Map<string, AttemptState>();

  constructor(
    private readonly options = {
      maxAttempts: 8,
      windowMs: 15 * 60 * 1000,
      maxKeys: 2_000,
    },
  ) {}

  private cleanup(now: number) {
    for (const [key, state] of this.attempts) {
      if (state.blockedUntil <= now && state.windowExpiresAt <= now) {
        this.attempts.delete(key);
      }
    }

    while (this.attempts.size > this.options.maxKeys) {
      const oldestKey = this.attempts.keys().next().value;
      if (!oldestKey) break;
      this.attempts.delete(oldestKey);
    }
  }

  async check(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    this.cleanup(now);
    const state = this.attempts.get(key);

    if (!state || state.blockedUntil <= now) return { allowed: true };
    return { allowed: false, retryAfterSeconds: Math.ceil((state.blockedUntil - now) / 1000) };
  }

  async recordAttempt(key: string) {
    const now = Date.now();
    this.cleanup(now);
    const current = this.attempts.get(key);
    const count = current && current.windowExpiresAt > now ? current.count + 1 : 1;
    const windowExpiresAt =
      current && current.windowExpiresAt > now ? current.windowExpiresAt : now + this.options.windowMs;
    const blockedUntil = count >= this.options.maxAttempts ? now + this.options.windowMs : (current?.blockedUntil ?? 0);
    this.attempts.set(key, { count, windowExpiresAt, blockedUntil });
  }

  reset() {
    this.attempts.clear();
  }
}

export function checkoutRateLimitKey(request: Request, normalizedPhone?: string) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const ip = forwardedFor || realIp || "unknown";
  return `checkout:${ip}:${normalizedPhone ?? "anonymous"}`.slice(0, 240);
}

export const checkoutRateLimiter = new InMemoryCheckoutRateLimiter();
