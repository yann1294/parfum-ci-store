import "server-only";

import { z } from "zod";

const notificationProviderSchema = z.enum(["development", "resend"]).default(
  process.env.NODE_ENV === "production" ? "resend" : "development",
);

const emailAddressSchema = z.string().trim().email();

const configSchema = z.object({
  provider: notificationProviderSchema,
  resendApiKey: z.string().trim().optional(),
  emailFrom: z.string().trim().min(3).optional(),
  adminNotificationEmail: emailAddressSchema.optional(),
  cronSecret: z.string().trim().min(24).optional(),
  siteUrl: z.url().default("http://localhost:3000"),
  batchSize: z.coerce.number().int().min(1).max(50).default(10),
  maxAttempts: z.coerce.number().int().min(1).max(10).default(5),
});

export type NotificationConfig = z.infer<typeof configSchema>;

let cachedConfig: NotificationConfig | null = null;

function formatError(error: z.ZodError) {
  return error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
}

export function getNotificationConfig() {
  if (cachedConfig) return cachedConfig;

  const parsed = configSchema.safeParse({
    provider: process.env.NOTIFICATION_PROVIDER,
    resendApiKey: process.env.RESEND_API_KEY,
    emailFrom: process.env.EMAIL_FROM ?? process.env.RESEND_FROM_EMAIL,
    adminNotificationEmail: process.env.ADMIN_NOTIFICATION_EMAIL,
    cronSecret: process.env.CRON_SECRET,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    batchSize: process.env.NOTIFICATION_BATCH_SIZE,
    maxAttempts: process.env.NOTIFICATION_MAX_ATTEMPTS,
  });

  if (!parsed.success) {
    throw new Error(`Invalid notification environment configuration: ${formatError(parsed.error)}`);
  }

  if (parsed.data.provider === "resend") {
    if (!parsed.data.resendApiKey) throw new Error("RESEND_API_KEY is required for the Resend notification provider.");
    if (!parsed.data.emailFrom) throw new Error("EMAIL_FROM is required for the Resend notification provider.");
  }

  if (process.env.NODE_ENV === "production" && parsed.data.provider !== "resend") {
    throw new Error("Production notification delivery must use the Resend provider.");
  }

  cachedConfig = parsed.data;
  return cachedConfig;
}

export function resetNotificationConfigForTests() {
  cachedConfig = null;
}
