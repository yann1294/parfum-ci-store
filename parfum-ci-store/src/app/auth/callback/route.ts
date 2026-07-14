import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr/dist/main/types";
import { NextResponse, type NextRequest } from "next/server";

import { auditAdminAuthEvent } from "@/lib/audit/admin-auth";
import { authDiagnostic, getAuthDiagnosticRequestId } from "@/lib/auth/diagnostics";
import { getSafeReturnPath } from "@/lib/auth/redirects";
import { getPublicEnv } from "@/lib/env/public";
import type { Database } from "@/types/database.types";

type ProfileRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "full_name" | "role" | "active"
>;

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

function getRedirectOrigin(request: NextRequest) {
  return new URL(request.url).origin;
}

function redirectTo(request: NextRequest, path: string, cookiesToSet: CookieToSet[] = []) {
  const response = NextResponse.redirect(new URL(path, getRedirectOrigin(request)));

  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });

  return response;
}

export async function GET(request: NextRequest) {
  const requestId = getAuthDiagnosticRequestId();
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const returnPath = getSafeReturnPath(requestUrl.searchParams.get("retour"));
  const cookiesToSet: CookieToSet[] = [];

  if (!code) {
    authDiagnostic("GOOGLE_CALLBACK_CODE_MISSING", { requestId, route: "/auth/callback" });
    return redirectTo(request, "/connexion?erreur=oauth");
  }

  const env = getPublicEnv();
  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(updatedCookies) {
          updatedCookies.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            cookiesToSet.push({ name, value, options });
          });
        },
      },
    },
  );

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    authDiagnostic("GOOGLE_CODE_EXCHANGE_FAILED", { requestId, route: "/auth/callback" });
    await auditAdminAuthEvent({
      action: "ADMIN_GOOGLE_LOGIN_DENIED",
      reason: "exchange_failed",
    });
    return redirectTo(request, "/connexion?erreur=oauth", cookiesToSet);
  }

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    await supabase.auth.signOut();
    authDiagnostic("GOOGLE_PROFILE_DENIED", {
      requestId,
      reason: "identity_verification_failed",
    });
    await auditAdminAuthEvent({
      action: "ADMIN_GOOGLE_LOGIN_DENIED",
      reason: "identity_verification_failed",
    });
    return redirectTo(request, "/acces-refuse", cookiesToSet);
  }

  authDiagnostic("GOOGLE_SESSION_ESTABLISHED", { requestId, route: "/auth/callback" });

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, role, active")
    .eq("id", userId)
    .maybeSingle<ProfileRow>();

  if (profileError) {
    authDiagnostic("STAFF_PROFILE_LOOKUP_FAILED", { requestId, route: "/auth/callback" });
    await auditAdminAuthEvent({
      actorId: userId,
      action: "ADMIN_GOOGLE_LOGIN_DENIED",
      reason: "profile_lookup_failed",
    });
    return redirectTo(request, "/connexion?erreur=oauth", cookiesToSet);
  }

  if (!profile || !profile.active) {
    await supabase.auth.signOut();
    authDiagnostic("GOOGLE_PROFILE_DENIED", {
      requestId,
      reason: profile?.active === false ? "inactive_profile" : "missing_profile",
    });
    await auditAdminAuthEvent({
      actorId: userId,
      action: "ADMIN_GOOGLE_LOGIN_DENIED",
      reason: profile?.active === false ? "inactive_profile" : "missing_profile",
    });
    return redirectTo(request, "/acces-refuse", cookiesToSet);
  }

  authDiagnostic("GOOGLE_PROFILE_AUTHORIZED", { requestId, route: "/auth/callback" });
  await auditAdminAuthEvent({
    actorId: profile.id,
    action: "ADMIN_GOOGLE_LOGIN_SUCCEEDED",
  });

  return redirectTo(request, returnPath, cookiesToSet);
}
