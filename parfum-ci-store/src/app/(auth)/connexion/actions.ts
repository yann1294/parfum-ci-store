"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { auditAdminAuthEvent } from "@/lib/audit/admin-auth";
import { AuthenticationError, InactiveStaffError } from "@/lib/auth/errors";
import { loginRateLimiter, normalizeLoginRateLimitKey } from "@/lib/auth/rate-limit";
import { getSafeReturnPath } from "@/lib/auth/redirects";
import { requireActiveStaff } from "@/lib/auth/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  returnPath: z.string().optional(),
});

export type LoginActionState = {
  error?: string;
};

function getClientIp(headersList: Headers) {
  return (
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headersList.get("x-real-ip") ||
    "unknown"
  );
}

function getRequestOrigin(headersList: Headers) {
  const forwardedProto = headersList.get("x-forwarded-proto");
  const forwardedHost = headersList.get("x-forwarded-host");

  if (forwardedHost) {
    return `${forwardedProto ?? "https"}://${forwardedHost}`;
  }

  const host = headersList.get("host");
  return host ? `http://${host}` : "http://localhost:3000";
}

export async function loginAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    returnPath: formData.get("returnPath") || undefined,
  });

  if (!parsed.success) {
    return { error: "Vérifiez votre email et votre mot de passe." };
  }

  const { email, password } = parsed.data;
  const returnPath = getSafeReturnPath(parsed.data.returnPath);
  const headersList = await headers();
  const rateLimitKey = normalizeLoginRateLimitKey(`${getClientIp(headersList)}:${email}`);
  const rateLimit = await loginRateLimiter.check(rateLimitKey);

  if (!rateLimit.allowed) {
    await auditAdminAuthEvent({ action: "ADMIN_LOGIN_DENIED", email, reason: "rate_limited" });
    return {
      error: `Trop de tentatives. Réessayez dans ${rateLimit.retryAfterSeconds ?? 60} secondes.`,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    await loginRateLimiter.recordFailure(rateLimitKey);
    await auditAdminAuthEvent({
      action: "ADMIN_LOGIN_FAILED",
      email,
      reason: "invalid_credentials",
    });
    return { error: "Identifiants invalides." };
  }

  try {
    const staff = await requireActiveStaff();
    await loginRateLimiter.recordSuccess(rateLimitKey);
    await auditAdminAuthEvent({ actorId: staff.id, action: "ADMIN_LOGIN_SUCCEEDED", email });
  } catch (authError) {
    await supabase.auth.signOut();
    await loginRateLimiter.recordFailure(rateLimitKey);

    if (authError instanceof InactiveStaffError || authError instanceof AuthenticationError) {
      await auditAdminAuthEvent({
        action: "ADMIN_LOGIN_DENIED",
        email,
        reason: authError.name,
      });
      redirect("/acces-refuse");
    }

    throw authError;
  }

  redirect(returnPath);
}

export async function googleLoginAction(formData: FormData) {
  const returnPath = getSafeReturnPath(String(formData.get("returnPath") ?? "/admin"));
  const headersList = await headers();
  const origin = getRequestOrigin(headersList);
  const callbackUrl = new URL("/auth/callback", origin);

  callbackUrl.searchParams.set("retour", returnPath);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl.toString(),
    },
  });

  if (error || !data.url) {
    redirect("/connexion?erreur=oauth");
  }

  redirect(data.url);
}
