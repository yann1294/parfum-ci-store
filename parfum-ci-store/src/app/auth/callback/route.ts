import { NextResponse, type NextRequest } from "next/server";

import { auditAdminAuthEvent } from "@/lib/audit/admin-auth";
import { getSafeReturnPath } from "@/lib/auth/redirects";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

type ProfileRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "full_name" | "role" | "active"
>;

function getRedirectOrigin(request: NextRequest) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");

  if (forwardedHost) {
    return `${forwardedProto ?? "https"}://${forwardedHost}`;
  }

  return new URL(request.url).origin;
}

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, getRedirectOrigin(request)));
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const returnPath = getSafeReturnPath(requestUrl.searchParams.get("retour"));

  if (!code) {
    return redirectTo(request, "/connexion?erreur=oauth");
  }

  const supabase = await createSupabaseServerClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    await auditAdminAuthEvent({
      action: "ADMIN_GOOGLE_LOGIN_DENIED",
      reason: "exchange_failed",
    });
    return redirectTo(request, "/connexion?erreur=oauth");
  }

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    await supabase.auth.signOut();
    await auditAdminAuthEvent({
      action: "ADMIN_GOOGLE_LOGIN_DENIED",
      reason: "identity_verification_failed",
    });
    return redirectTo(request, "/acces-refuse");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, role, active")
    .eq("id", userId)
    .maybeSingle<ProfileRow>();

  if (profileError || !profile || !profile.active) {
    await supabase.auth.signOut();
    await auditAdminAuthEvent({
      actorId: userId,
      action: "ADMIN_GOOGLE_LOGIN_DENIED",
      reason: profile?.active === false ? "inactive_profile" : "missing_profile",
    });
    return redirectTo(request, "/acces-refuse");
  }

  await auditAdminAuthEvent({
    actorId: profile.id,
    action: "ADMIN_GOOGLE_LOGIN_SUCCEEDED",
  });

  return redirectTo(request, returnPath);
}
