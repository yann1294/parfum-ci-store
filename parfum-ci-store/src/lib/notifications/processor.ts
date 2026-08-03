import "server-only";

import { z } from "zod";

import { getNotificationConfig } from "@/lib/notifications/config";
import { getProvider, type ProviderResult } from "@/lib/notifications/providers";
import { renderNotificationTemplate } from "@/lib/notifications/templates";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type ClaimedNotification = {
  id: string;
  recipient: string;
  subject: string | null;
  body: string | null;
  template_key: string | null;
  payload: unknown;
  attempt_count: number;
  max_attempts: number;
};

export type NotificationProcessSummary = {
  claimed: number;
  sent: number;
  failed: number;
  skipped: number;
};

const claimResultSchema = z.object({
  claimToken: z.uuid(),
  notifications: z.array(z.object({
    id: z.uuid(),
    recipient: z.string(),
    subject: z.string().nullable(),
    body: z.string().nullable(),
    template_key: z.string().nullable(),
    payload: z.unknown(),
    attempt_count: z.number().int(),
    max_attempts: z.number().int(),
  })),
});

function retryDelaySeconds(attempt: number) {
  if (attempt <= 1) return 60;
  if (attempt === 2) return 5 * 60;
  return Math.min(60 * 60, 15 * 60 * 2 ** (attempt - 3));
}

function providerFailure(error: unknown): ProviderResult {
  const message = error instanceof Error ? error.message : "Erreur notification";
  const retryable = !message.includes("INVALID_PAYLOAD") && !message.includes("NOT_FOUND");
  return {
    ok: false,
    provider: "template",
    retryable,
    errorCode: message.replace(/[^A-Z0-9_]/gi, "_").slice(0, 80) || "NOTIFICATION_RENDER_FAILED",
    errorMessage: "La notification n'a pas pu etre preparee.",
  };
}

async function markSent(notificationId: string, claimToken: string, provider: string, providerMessageId: string | null) {
  await (createSupabaseAdminClient() as never as {
    rpc(fn: string, args: Record<string, unknown>): Promise<{ error: { message?: string } | null }>;
  }).rpc("complete_notification_server", {
    notification_id: notificationId,
    claim_token: claimToken,
    provider_name: provider,
    provider_message_id: providerMessageId,
  });
}

async function markFailed(notification: ClaimedNotification, claimToken: string, result: Extract<ProviderResult, { ok: false }>) {
  await (createSupabaseAdminClient() as never as {
    rpc(fn: string, args: Record<string, unknown>): Promise<{ error: { message?: string } | null }>;
  }).rpc("fail_notification_server", {
    notification_id: notification.id,
    claim_token: claimToken,
    provider_name: result.provider,
    error_code: result.errorCode,
    error_message: result.errorMessage,
    retryable: result.retryable,
    retry_delay_seconds: retryDelaySeconds(notification.attempt_count),
  });
}

export async function claimNotifications(batchSize?: number) {
  const config = getNotificationConfig();
  const { data, error } = await (createSupabaseAdminClient() as never as {
    rpc(fn: string, args: Record<string, unknown>): Promise<{ data: unknown; error: { message?: string; code?: string } | null }>;
  }).rpc("claim_notifications_server", {
    batch_limit: batchSize ?? config.batchSize,
    worker_id: `processor:${config.provider}`,
    stale_after_seconds: 900,
  });

  if (error) throw new Error("NOTIFICATION_CLAIM_FAILED");
  return claimResultSchema.parse(data);
}

export async function processClaimedNotifications(claimToken: string, notifications: ClaimedNotification[]): Promise<NotificationProcessSummary> {
  const config = getNotificationConfig();
  const provider = getProvider(config);
  const summary: NotificationProcessSummary = { claimed: notifications.length, sent: 0, failed: 0, skipped: 0 };

  for (const notification of notifications) {
    let result: ProviderResult;
    try {
      const rendered = await renderNotificationTemplate({
        templateKey: notification.template_key,
        payload: notification.payload,
        fallbackSubject: notification.subject,
        fallbackBody: notification.body,
        siteUrl: config.siteUrl,
      });
      result = await provider.sendEmail({
        notificationId: notification.id,
        to: notification.recipient,
        from: config.emailFrom ?? "Parfum CI <notifications@example.test>",
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });
    } catch (error) {
      result = providerFailure(error);
    }

    if (result.ok) {
      await markSent(notification.id, claimToken, result.provider, result.providerMessageId);
      summary.sent += 1;
    } else {
      await markFailed(notification, claimToken, result);
      summary.failed += 1;
    }
  }

  return summary;
}

export async function processNotifications(batchSize?: number): Promise<NotificationProcessSummary> {
  const claimed = await claimNotifications(batchSize);
  if (claimed.notifications.length === 0) return { claimed: 0, sent: 0, failed: 0, skipped: 0 };
  return processClaimedNotifications(claimed.claimToken, claimed.notifications);
}
