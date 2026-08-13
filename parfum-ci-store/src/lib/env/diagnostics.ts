export type EnvironmentDiagnostic = {
  name: string;
  scope: "public" | "server" | "test";
  status: "SET" | "MISSING";
};

const expectedEnvironmentVariables: Array<Omit<EnvironmentDiagnostic, "status">> = [
  { name: "NEXT_PUBLIC_SUPABASE_URL", scope: "public" },
  { name: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", scope: "public" },
  { name: "SUPABASE_SECRET_KEY", scope: "server" },
  { name: "SUPABASE_STORAGE_BUCKET", scope: "server" },
  { name: "EMAIL_FROM", scope: "server" },
  { name: "CRON_SECRET", scope: "server" },
  { name: "NOTIFICATION_PROVIDER", scope: "server" },
  { name: "NOTIFICATION_BATCH_SIZE", scope: "server" },
  { name: "NOTIFICATION_MAX_ATTEMPTS", scope: "server" },
  { name: "PLAYWRIGHT_OWNER_EMAIL", scope: "test" },
  { name: "PLAYWRIGHT_OWNER_PASSWORD", scope: "test" },
  { name: "PLAYWRIGHT_INVENTORY_MANAGER_EMAIL", scope: "test" },
  { name: "PLAYWRIGHT_INVENTORY_MANAGER_PASSWORD", scope: "test" },
  { name: "PLAYWRIGHT_ORDER_MANAGER_EMAIL", scope: "test" },
  { name: "PLAYWRIGHT_ORDER_MANAGER_PASSWORD", scope: "test" },
  { name: "PLAYWRIGHT_SUPPORT_EMAIL", scope: "test" },
  { name: "PLAYWRIGHT_SUPPORT_PASSWORD", scope: "test" },
  { name: "PLAYWRIGHT_INACTIVE_EMAIL", scope: "test" },
  { name: "PLAYWRIGHT_INACTIVE_PASSWORD", scope: "test" },
];

export function getEnvironmentDiagnostics(
  env: Record<string, string | undefined> = process.env,
): EnvironmentDiagnostic[] {
  return expectedEnvironmentVariables.map((variable) => ({
    ...variable,
    status: env[variable.name] ? "SET" : "MISSING",
  }));
}

export function formatEnvironmentDiagnostics(diagnostics: EnvironmentDiagnostic[]) {
  return diagnostics
    .map((diagnostic) => `${diagnostic.name}\t${diagnostic.scope}\t${diagnostic.status}`)
    .join("\n");
}
