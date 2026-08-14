import "server-only";

import { processNotifications } from "@/lib/notifications/processor";
import {
  contactErrorMessage,
  contactMessageRequestSchema,
  contactMessageSuccessSchema,
  normalizeContactMessageRequest,
  type ContactMessageRequest,
  type ContactMessageSuccess,
} from "@/lib/messages/contract";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type MessageRpcClient = {
  rpc(
    fn: "create_contact_message_server",
    args: { request: Record<string, unknown> },
  ): Promise<{
    data: unknown;
    error: { code?: string; message?: string } | null;
  }>;
};

export type ContactMessageResult =
  | { ok: true; data: ContactMessageSuccess }
  | { ok: false; code: string; message: string; status: number };

function mapDbError(error?: { code?: string; message?: string }) {
  const raised = error?.message?.match(/\bMESSAGE_[A-Z_]+\b/)?.[0];
  if (raised) return raised;
  return "MESSAGE_FAILED";
}

export async function createContactMessage(input: unknown): Promise<ContactMessageResult> {
  const parsed = contactMessageRequestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "MESSAGE_INVALID_REQUEST",
      message: contactErrorMessage("MESSAGE_INVALID_REQUEST"),
      status: 400,
    };
  }
  if (parsed.data.honeypot) {
    return {
      ok: false,
      code: "MESSAGE_INVALID_REQUEST",
      message: contactErrorMessage("MESSAGE_INVALID_REQUEST"),
      status: 400,
    };
  }

  let normalized: ReturnType<typeof normalizeContactMessageRequest>;
  try {
    normalized = normalizeContactMessageRequest(parsed.data);
  } catch (error) {
    const code =
      error instanceof Error && error.message === "ORDER_INVALID_PHONE"
        ? "MESSAGE_INVALID_PHONE"
        : "MESSAGE_CONTACT_REQUIRED";
    return { ok: false, code, message: contactErrorMessage(code), status: 400 };
  }

  const payload: Record<string, unknown> = {
    ...normalized,
    requestFingerprint: normalized.requestFingerprint,
  };

  const { data, error } = await (createSupabaseAdminClient() as unknown as MessageRpcClient).rpc(
    "create_contact_message_server",
    { request: payload },
  );

  if (error) {
    const code = mapDbError(error);
    const status =
      code === "MESSAGE_IDEMPOTENCY_CONFLICT" ? 409 : code === "MESSAGE_UNAUTHORIZED" ? 403 : 500;
    return { ok: false, code, message: contactErrorMessage(code), status };
  }

  const success = contactMessageSuccessSchema.safeParse(data);
  if (!success.success) {
    return {
      ok: false,
      code: "MESSAGE_FAILED",
      message: contactErrorMessage("MESSAGE_FAILED"),
      status: 500,
    };
  }

  void processNotifications(2).catch(() => {
    console.error("CONTACT_MESSAGE_NOTIFICATION_PROCESS_FAILED");
  });

  return { ok: true, data: success.data };
}

export function buildContactMessageRequest(input: ContactMessageRequest) {
  return normalizeContactMessageRequest(input);
}
