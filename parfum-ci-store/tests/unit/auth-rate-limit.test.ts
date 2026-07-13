import { describe, expect, it, vi } from "vitest";

import { InMemoryLoginRateLimiter, normalizeLoginRateLimitKey } from "@/lib/auth/rate-limit";

describe("login rate limiter", () => {
  it("blocks after repeated failures in the same window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-13T00:00:00.000Z"));

    const limiter = new InMemoryLoginRateLimiter({
      maxAttempts: 2,
      windowMs: 60_000,
      maxKeys: 10,
    });

    await limiter.recordFailure("ip:admin@example.com");
    expect(await limiter.check("ip:admin@example.com")).toEqual({ allowed: true });

    await limiter.recordFailure("ip:admin@example.com");
    expect(await limiter.check("ip:admin@example.com")).toEqual({
      allowed: false,
      retryAfterSeconds: 60,
    });

    vi.useRealTimers();
  });

  it("allows the key again after the block expires", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-13T00:00:00.000Z"));

    const limiter = new InMemoryLoginRateLimiter({
      maxAttempts: 1,
      windowMs: 60_000,
      maxKeys: 10,
    });

    await limiter.recordFailure("ip:admin@example.com");
    vi.advanceTimersByTime(60_001);

    expect(await limiter.check("ip:admin@example.com")).toEqual({ allowed: true });

    vi.useRealTimers();
  });

  it("normalizes login identifiers", () => {
    expect(normalizeLoginRateLimitKey(" 127.0.0.1:Admin@Example.COM ")).toBe(
      "127.0.0.1:admin@example.com",
    );
  });
});
