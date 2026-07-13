import "server-only";

import { createHash } from "node:crypto";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database.types";

type AdminAuthAuditEvent = {
  actorId?: string | null;
  action:
    | "ADMIN_LOGIN_SUCCEEDED"
    | "ADMIN_LOGIN_FAILED"
    | "ADMIN_LOGIN_DENIED"
    | "ADMIN_GOOGLE_LOGIN_SUCCEEDED"
    | "ADMIN_GOOGLE_LOGIN_DENIED"
    | "ADMIN_LOGOUT";
  email?: string;
  reason?: string;
};

function hashEmail(email: string) {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

export async function auditAdminAuthEvent(event: AdminAuthAuditEvent) {
  try {
    const metadata: Record<string, Json> = {};

    if (event.email) {
      metadata.email_hash = hashEmail(event.email);
    }

    if (event.reason) {
      metadata.reason = event.reason;
    }

    await createSupabaseAdminClient()
      .from("audit_logs")
      .insert({
        actor_id: event.actorId ?? null,
        action: event.action,
        resource_type: "admin_auth",
        metadata,
      });
  } catch {
    // Audit logging must never leak credentials or block auth flows during outages.
  }
}
