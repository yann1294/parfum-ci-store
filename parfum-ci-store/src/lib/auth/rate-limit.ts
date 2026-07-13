export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds?: number;
};

export interface LoginRateLimiter {
  check(key: string): Promise<RateLimitResult>;
  recordFailure(key: string): Promise<void>;
  recordSuccess(key: string): Promise<void>;
}

type AttemptState = {
  count: number;
  windowExpiresAt: number;
  blockedUntil: number;
  updatedAt: number;
};

export class InMemoryLoginRateLimiter implements LoginRateLimiter {
  private attempts = new Map<string, AttemptState>();

  constructor(
    private readonly options = {
      maxAttempts: 5,
      windowMs: 15 * 60 * 1000,
      maxKeys: 1_000,
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
      if (!oldestKey) {
        break;
      }
      this.attempts.delete(oldestKey);
    }
  }

  async check(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    this.cleanup(now);

    const state = this.attempts.get(key);

    if (!state || state.blockedUntil <= now) {
      return { allowed: true };
    }

    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((state.blockedUntil - now) / 1000),
    };
  }

  async recordFailure(key: string) {
    const now = Date.now();
    this.cleanup(now);

    const current = this.attempts.get(key);
    const count = current && current.windowExpiresAt > now ? current.count + 1 : 1;
    const windowExpiresAt =
      current && current.windowExpiresAt > now
        ? current.windowExpiresAt
        : now + this.options.windowMs;
    const blockedUntil =
      count >= this.options.maxAttempts
        ? now + this.options.windowMs
        : (current?.blockedUntil ?? 0);

    this.attempts.set(key, { count, windowExpiresAt, blockedUntil, updatedAt: now });
  }

  async recordSuccess(key: string) {
    this.attempts.delete(key);
  }

  reset() {
    this.attempts.clear();
  }
}

export function normalizeLoginRateLimitKey(identifier: string) {
  return identifier.trim().toLowerCase().replace(/\s+/g, "");
}

export const loginRateLimiter = new InMemoryLoginRateLimiter();
