export const CURRENT_PRODUCTION_SUPABASE_PROJECT_REF = "wzwoebydytqxgrwlcjiy";

type E2eTargetKind = "local" | "staging";

function required(env: NodeJS.ProcessEnv, name: string) {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} is required for destructive E2E operations.`);
  return value;
}

export function extractSupabaseProjectRef(value: string) {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    const match = /^([a-z0-9]{20})\.supabase\.co$/.exec(hostname);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function isLocalSupabaseUrl(value: string) {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

export function assertDestructiveE2eAllowed(env: NodeJS.ProcessEnv) {
  if (env.NODE_ENV === "production" || env.VERCEL_ENV === "production") {
    throw new Error("Destructive E2E operations are forbidden in production.");
  }

  const targetUrl = required(env, "NEXT_PUBLIC_SUPABASE_URL");
  const targetRef = extractSupabaseProjectRef(targetUrl);
  if (targetRef === CURRENT_PRODUCTION_SUPABASE_PROJECT_REF) {
    throw new Error(
      "Destructive E2E operations are forbidden against the production Supabase project.",
    );
  }

  if (env.ALLOW_DESTRUCTIVE_E2E !== "true") {
    throw new Error("Set ALLOW_DESTRUCTIVE_E2E=true for an explicitly approved test target.");
  }

  const targetKind = required(env, "E2E_TARGET_KIND") as E2eTargetKind;
  if (targetKind === "local") {
    if (!isLocalSupabaseUrl(targetUrl)) {
      throw new Error("E2E_TARGET_KIND=local requires a localhost Supabase URL.");
    }
    return { targetKind, projectRef: null } as const;
  }

  if (targetKind === "staging") {
    const allowedRef = required(env, "E2E_ALLOWED_SUPABASE_PROJECT_REF");
    if (allowedRef === CURRENT_PRODUCTION_SUPABASE_PROJECT_REF) {
      throw new Error("The production Supabase project cannot be allowlisted for destructive E2E.");
    }
    if (!targetRef || targetRef !== allowedRef) {
      throw new Error("The Supabase target does not match E2E_ALLOWED_SUPABASE_PROJECT_REF.");
    }
    return { targetKind, projectRef: targetRef } as const;
  }

  throw new Error("E2E_TARGET_KIND must be local or staging.");
}
