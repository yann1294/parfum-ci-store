import "server-only";

import { createHash } from "node:crypto";

import type { NotificationConfig } from "@/lib/notifications/config";

export type EmailInput = {
  notificationId: string;
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
};

export type ProviderResult =
  | { ok: true; provider: string; providerMessageId: string | null }
  | { ok: false; provider: string; retryable: boolean; errorCode: string; errorMessage: string };

export interface NotificationProvider {
  providerName: string;
  sendEmail(input: EmailInput): Promise<ProviderResult>;
}

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "destinataire masque";
  return `${local[0] ?? "*"}***@${domain}`;
}

function sanitizeProviderMessage(value: unknown) {
  return String(value ?? "Erreur fournisseur").replace(/[\r\n\t]/g, " ").slice(0, 240);
}

export class DevelopmentLogProvider implements NotificationProvider {
  providerName = "development";

  async sendEmail(input: EmailInput): Promise<ProviderResult> {
    const digest = createHash("sha256").update(`${input.notificationId}:${input.to}:${input.subject}`).digest("hex").slice(0, 16);
    console.info("NOTIFICATION_DEV_EMAIL", {
      notificationId: input.notificationId,
      recipient: maskEmail(input.to),
      subject: input.subject.slice(0, 120),
    });
    return { ok: true, provider: this.providerName, providerMessageId: `dev-${digest}` };
  }
}

export class ResendEmailProvider implements NotificationProvider {
  providerName = "resend";

  constructor(private readonly config: NotificationConfig) {}

  async sendEmail(input: EmailInput): Promise<ProviderResult> {
    if (!this.config.resendApiKey) {
      return { ok: false, provider: this.providerName, retryable: false, errorCode: "RESEND_CONFIG_MISSING", errorMessage: "Configuration email absente." };
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: input.from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });

    const payload = await response.json().catch(() => null) as { id?: string; name?: string; message?: string } | null;

    if (response.ok) {
      return { ok: true, provider: this.providerName, providerMessageId: payload?.id ?? null };
    }

    const retryable = response.status === 429 || response.status >= 500;
    return {
      ok: false,
      provider: this.providerName,
      retryable,
      errorCode: payload?.name?.slice(0, 80) || `RESEND_${response.status}`,
      errorMessage: sanitizeProviderMessage(payload?.message ?? response.statusText),
    };
  }
}

export function getProvider(config: NotificationConfig): NotificationProvider {
  if (config.provider === "resend") return new ResendEmailProvider(config);
  return new DevelopmentLogProvider();
}
