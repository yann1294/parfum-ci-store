import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("Phase 13 message contracts", () => {
  it("requires one valid contact method and normalizes Côte d’Ivoire phone forms", async () => {
    const { contactMessageRequestSchema, normalizeContactMessageRequest } = await import("@/lib/messages/contract");
    const base = {
      idempotencyKey: "contact-11111111-1111-4111-8111-111111111111",
      source: "WEBSITE" as const,
      name: "Awa",
      subject: "Question produit",
      message: "Bonjour, je souhaite une information.",
      consent: true,
      honeypot: "",
    };

    expect(contactMessageRequestSchema.safeParse(base).success).toBe(false);
    expect(normalizeContactMessageRequest({ ...base, phone: "00225 07 00 00 00 12" }).phone).toBe("+2250700000012");
    expect(normalizeContactMessageRequest({ ...base, email: "AWA@EXAMPLE.COM" }).email).toBe("awa@example.com");
  });

  it("uses stable material fingerprints and detects idempotency conflicts", async () => {
    const { createContactMessageFingerprint } = await import("@/lib/messages/contract");
    const request = {
      idempotencyKey: "contact-11111111-1111-4111-8111-111111111111",
      source: "WEBSITE" as const,
      name: "Awa",
      email: "awa@example.com",
      subject: "Question produit",
      message: "Bonjour, je souhaite une information.",
      consent: true,
    };
    const first = createContactMessageFingerprint(request);
    const second = createContactMessageFingerprint({ ...request, message: "Bonjour, autre question." });
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(first).not.toBe(second);
  });

  it("ships forward-only message history, idempotency and service-role RPC migration", () => {
    const sql = readFileSync("supabase/migrations/20260804133000_phase13_customer_messages.sql", "utf8");
    expect(sql).toContain("public.contact_message_status_history");
    expect(sql).toContain("public.contact_message_assignment_history");
    expect(sql).toContain("public.contact_message_internal_notes");
    expect(sql).toContain("app_private.contact_message_idempotency");
    expect(sql).toContain("public.create_contact_message_server");
    expect(sql).toContain("on conflict (idempotency_key) do nothing");
    expect(sql).toContain("revoke all on function public.create_contact_message_server");
  });

  it("does not use dangerous HTML rendering for customer message surfaces", () => {
    const form = readFileSync("src/components/storefront/contact-message-form.tsx", "utf8");
    const detail = readFileSync("src/components/admin/messages/message-detail.tsx", "utf8");
    expect(form).not.toContain("dangerouslySetInnerHTML");
    expect(detail).not.toContain("dangerouslySetInnerHTML");
    expect(detail).toContain("whitespace-pre-wrap");
  });

  it("registers the contact-message notification template in the Phase 12 renderer", () => {
    const template = readFileSync("src/lib/notifications/templates.ts", "utf8");
    expect(template).toContain("contact_message_received");
    expect(template).toContain("renderContactMessage");
    expect(template).toContain("escapeHtml(excerpt)");
  });
});
