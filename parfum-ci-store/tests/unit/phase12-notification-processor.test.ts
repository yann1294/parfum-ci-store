import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const rpc = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({ rpc }),
}));

vi.mock("@/lib/notifications/config", () => ({
  getNotificationConfig: () => ({
    provider: "development",
    siteUrl: "https://example.com",
    batchSize: 10,
    maxAttempts: 5,
    emailFrom: "Parfum CI <notifications@example.test>",
  }),
}));

vi.mock("@/lib/notifications/providers", () => ({
  getProvider: () => ({
    providerName: "development",
    sendEmail: vi.fn(async () => ({ ok: true, provider: "development", providerMessageId: "dev-message" })),
  }),
}));

vi.mock("@/lib/notifications/templates", () => ({
  renderNotificationTemplate: vi.fn(async () => ({
    subject: "Commande recue",
    html: "<p>Commande recue</p>",
    text: "Commande recue",
    summary: "test",
  })),
}));

describe("Phase 12 notification processor", () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it("claims notifications and marks successful sends as SENT", async () => {
    rpc.mockResolvedValueOnce({
      data: {
        claimToken: "11111111-1111-4111-8111-111111111111",
        notifications: [{
          id: "22222222-2222-4222-8222-222222222222",
          recipient: "client@example.com",
          subject: "Commande",
          body: null,
          template_key: "customer_order_received",
          payload: { order_number: "CMD-2026-ABC123" },
          attempt_count: 1,
          max_attempts: 5,
        }],
      },
      error: null,
    }).mockResolvedValueOnce({ data: { status: "SENT" }, error: null });

    const { processNotifications } = await import("@/lib/notifications/processor");
    await expect(processNotifications()).resolves.toEqual({ claimed: 1, sent: 1, failed: 0, skipped: 0 });
    expect(rpc).toHaveBeenNthCalledWith(1, "claim_notifications_server", expect.objectContaining({ batch_limit: 10 }));
    expect(rpc).toHaveBeenNthCalledWith(2, "complete_notification_server", expect.objectContaining({
      notification_id: "22222222-2222-4222-8222-222222222222",
      provider_message_id: "dev-message",
    }));
  });

  it("returns an empty summary when no rows are claimable", async () => {
    rpc.mockResolvedValueOnce({
      data: { claimToken: "11111111-1111-4111-8111-111111111111", notifications: [] },
      error: null,
    });
    const { processNotifications } = await import("@/lib/notifications/processor");
    await expect(processNotifications()).resolves.toEqual({ claimed: 0, sent: 0, failed: 0, skipped: 0 });
  });
});
