import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const processNotifications = vi.fn();
vi.mock("@/lib/notifications/config", () => ({
  getNotificationConfig: () => ({ cronSecret: "phase16-cron-secret", batchSize: 7 }),
}));
vi.mock("@/lib/notifications/processor", () => ({ processNotifications }));

const { GET, POST } = await import("@/app/api/cron/notifications/route");

function request(token?: string) {
  return new Request("https://example.test/api/cron/notifications", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}

describe("Phase 16 notification cron boundary", () => {
  beforeEach(() => {
    processNotifications.mockReset();
    processNotifications.mockResolvedValue({ claimed: 1, sent: 1, failed: 0, skipped: 0 });
  });

  it("rejects missing and invalid bearer credentials without processing", async () => {
    for (const value of [undefined, "wrong-secret"]) {
      const response = await POST(request(value));
      expect(response.status).toBe(401);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(await response.json()).toEqual({ ok: false, code: "CRON_UNAUTHORIZED" });
    }
    expect(processNotifications).not.toHaveBeenCalled();
  });

  it("uses the configured bounded batch and returns a safe summary", async () => {
    const response = await POST(request("phase16-cron-secret"));
    expect(response.status).toBe(200);
    expect(processNotifications).toHaveBeenCalledWith(7);
    expect(await response.json()).toEqual({ ok: true, claimed: 1, sent: 1, failed: 0, skipped: 0 });
  });

  it("maps processing failures without leaking provider details", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    processNotifications.mockRejectedValue(new Error("provider payload and SQL details"));
    const response = await POST(request("phase16-cron-secret"));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ ok: false, code: "CRON_PROCESSING_FAILED" });
    expect(JSON.stringify(error.mock.calls)).not.toContain("provider payload");
    error.mockRestore();
  });

  it("rejects GET and never accepts a query-string secret", async () => {
    const response = GET();
    expect(response.status).toBe(405);
    const querySecret = await POST(
      new Request("https://example.test/api/cron/notifications?secret=phase16-cron-secret", {
        method: "POST",
      }),
    );
    expect(querySecret.status).toBe(401);
  });
});
