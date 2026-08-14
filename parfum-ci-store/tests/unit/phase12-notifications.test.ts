import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("Phase 12 notification configuration and providers", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("selects the development provider outside production and redacts recipients", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    vi.stubEnv("NOTIFICATION_PROVIDER", "development");
    const { getNotificationConfig, resetNotificationConfigForTests } =
      await import("@/lib/notifications/config");
    const { getProvider } = await import("@/lib/notifications/providers");
    resetNotificationConfigForTests();

    const provider = getProvider(getNotificationConfig());
    const result = await provider.sendEmail({
      notificationId: "11111111-1111-4111-8111-111111111111",
      to: "client@example.com",
      from: "Parfum CI <notifications@example.test>",
      subject: "Commande recue",
      html: "<p>Bonjour</p>",
      text: "Bonjour",
    });

    expect(result).toMatchObject({ ok: true, provider: "development" });
    expect(info).toHaveBeenCalledWith(
      "NOTIFICATION_DEV_EMAIL",
      expect.objectContaining({
      recipient: "c***@example.com",
      }),
    );
    expect(JSON.stringify(info.mock.calls)).not.toContain("client@example.com");
    info.mockRestore();
  });

  it("fails production configuration without Resend settings", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NOTIFICATION_PROVIDER", "development");
    const { getNotificationConfig, resetNotificationConfigForTests } =
      await import("@/lib/notifications/config");
    resetNotificationConfigForTests();
    expect(() => getNotificationConfig()).toThrow(
      "Production notification delivery must use the Resend provider",
    );
  });

  it("maps Resend success and retryable failures without exposing secrets", async () => {
    vi.stubEnv("NOTIFICATION_PROVIDER", "resend");
    vi.stubEnv("RESEND_API_KEY", "re_secret");
    vi.stubEnv("EMAIL_FROM", "Parfum CI <notifications@example.com>");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "email_123" }) })
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
        json: async () => ({ name: "rate_limit", message: "try later" }),
      });
    vi.stubGlobal("fetch", fetchMock);
    const { getNotificationConfig, resetNotificationConfigForTests } =
      await import("@/lib/notifications/config");
    const { ResendEmailProvider } = await import("@/lib/notifications/providers");
    resetNotificationConfigForTests();
    const provider = new ResendEmailProvider(getNotificationConfig());
    const input = {
      notificationId: "11111111-1111-4111-8111-111111111111",
      to: "ops@example.com",
      from: "Parfum CI <notifications@example.com>",
      subject: "Nouvelle commande",
      html: "<p>OK</p>",
      text: "OK",
    };

    await expect(provider.sendEmail(input)).resolves.toMatchObject({
      ok: true,
      providerMessageId: "email_123",
    });
    await expect(provider.sendEmail(input)).resolves.toMatchObject({
      ok: false,
      retryable: true,
      errorCode: "rate_limit",
      errorMessage: "try later",
    });
  });
});

describe("Phase 12 notification admin contracts", () => {
  it("normalizes filters and masks recipients", async () => {
    const { maskRecipient, normalizeNotificationFilters } =
      await import("@/lib/notifications/admin");
    expect(maskRecipient("awa@example.com")).toBe("a***@example.com");
    expect(
      normalizeNotificationFilters({
        status: "DROP",
        channel: "EMAIL",
        sort: "next_attempt_asc",
        page: "-5",
      }),
    ).toMatchObject({
      status: "ALL",
      channel: "EMAIL",
      sort: "next_attempt_asc",
      page: 1,
    });
  });

  it("ships claim, result, cancel and low-stock state database migration", () => {
    const sql = readFileSync(
      "supabase/migrations/20260804120000_phase12_notification_processing.sql",
      "utf8",
    );
    const repairSql = readFileSync(
      "supabase/migrations/20260804124500_phase12_notification_ambiguous_parameter_fix.sql",
      "utf8",
    );
    expect(sql).toContain("for update skip locked");
    expect(sql).toContain("claim_token");
    expect(sql).toContain("public.notification_attempts");
    expect(sql).toContain("public.low_stock_alert_states");
    expect(sql).toContain("public.claim_notifications_server");
    expect(sql).toContain("public.complete_notification_server");
    expect(sql).toContain("public.fail_notification_server");
    expect(sql).toContain("public.cancel_notification_server");
    expect(sql).toContain(
      "revoke insert, update, delete on public.notifications from anon, authenticated",
    );
    expect(repairSql).toContain("p_notification_id uuid");
    expect(repairSql).toContain("where n.id = p_notification_id");
    expect(repairSql).toContain("p_claim_token uuid");
    expect(repairSql).toContain("p_actor_id uuid");
  });

  it("ships a row-locked service-only manual retry operation", () => {
    const sql = readFileSync(
      "supabase/migrations/20260814160000_phase16_security_hardening.sql",
      "utf8",
    );
    expect(sql).toContain("app_private.retry_notification");
    expect(sql).toContain("for update");
    expect(sql).toContain("notification_row.status <> 'FAILED'");
    expect(sql).toContain("NOTIFICATION_RETRY_REQUESTED");
    expect(sql).toContain("revoke all on function public.retry_notification_server");
    expect(sql).toContain(
      "grant execute on function public.retry_notification_server(uuid, uuid) to service_role",
    );
  });
});
