import { readFileSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";

import { readBoundedJson } from "@/lib/http/read-bounded-json";
import { buildSecurityHeaders } from "@/lib/security/headers";
import { catalogueEntityIdSchema } from "@/lib/catalogue/validation";

vi.mock("server-only", () => ({}));

function streamingRequest(chunks: string[], contentType = "application/json") {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Request("https://example.test/api/test", {
    method: "POST",
    headers: { "Content-Type": contentType },
    body,
    duplex: "half",
  } as RequestInit & { duplex: "half" });
}

describe("Phase 16 request hardening", () => {
  it("parses a bounded chunked JSON body", async () => {
    await expect(readBoundedJson(streamingRequest(['{"ok":', "true}"]), 32)).resolves.toEqual({
      ok: true,
    });
  });

  it("rejects a chunked body as soon as the byte limit is exceeded", async () => {
    await expect(
      readBoundedJson(streamingRequest(['{"value":"', '0123456789"}']), 12),
    ).rejects.toMatchObject({
      code: "PAYLOAD_TOO_LARGE",
    });
  });

  it("rejects non-JSON media types", async () => {
    await expect(readBoundedJson(streamingRequest(["{}"], "text/plain"), 32)).rejects.toMatchObject(
      {
        code: "UNSUPPORTED_MEDIA_TYPE",
      },
    );
  });
});

describe("Phase 16 mutation boundary validation", () => {
  it("rejects malformed catalogue entity identifiers before database use", () => {
    expect(catalogueEntityIdSchema.safeParse("not-a-uuid").success).toBe(false);
    expect(catalogueEntityIdSchema.safeParse("11111111-1111-4111-8111-111111111111").success).toBe(
      true,
    );
  });
});

describe("Phase 16 browser security policy", () => {
  it("sets production headers without unsafe-eval", () => {
    const headers = Object.fromEntries(
      buildSecurityHeaders({ production: true, supabaseUrl: "https://project.supabase.co" }).map(
        (entry) => [entry.key, entry.value],
      ),
    );
    expect(headers["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(headers["Content-Security-Policy"]).toContain("https://project.supabase.co");
    expect(headers["Content-Security-Policy"]).not.toContain("'unsafe-eval'");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Strict-Transport-Security"]).toBe("max-age=31536000");
  });

  it("keeps HSTS production-only and documents the static-CSP compromise", () => {
    const headers = Object.fromEntries(
      buildSecurityHeaders({ production: false }).map((entry) => [entry.key, entry.value]),
    );
    expect(headers["Strict-Transport-Security"]).toBeUndefined();
    expect(headers["Content-Security-Policy"]).toContain("'unsafe-eval'");
  });
});

describe("Phase 16 database least privilege", () => {
  it("revokes browser destructive grants without editing prior migrations", () => {
    const sql = readFileSync(
      "supabase/migrations/20260814160000_phase16_security_hardening.sql",
      "utf8",
    );
    expect(sql).toContain("revoke truncate on table");
    expect(sql).toContain("from anon, authenticated");
    expect(sql).toContain("public.audit_logs");
    expect(sql).toContain("from authenticated");
    expect(sql).toContain("app_private.contact_message_public_result(uuid)");
  });
});
