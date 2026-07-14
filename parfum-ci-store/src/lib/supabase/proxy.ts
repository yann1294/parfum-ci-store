import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { authDiagnostic, getAuthDiagnosticRequestId } from "@/lib/auth/diagnostics";
import { getPublicEnv } from "@/lib/env/public";
import type { Database } from "@/types/database.types";

export async function updateSession(request: NextRequest) {
  const requestId = getAuthDiagnosticRequestId();
  const currentPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  function createRequestHeaders() {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-current-path", currentPath);
    return requestHeaders;
  }

  let response = NextResponse.next({
    request: {
      headers: createRequestHeaders(),
    },
  });
  const env = getPublicEnv();

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request: {
              headers: createRequestHeaders(),
            },
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
          authDiagnostic("PROXY_SESSION_REFRESHED", { requestId, route: request.nextUrl.pathname });
        },
      },
    },
  );

  const { data, error } = await supabase.auth.getClaims();

  authDiagnostic(error || !data?.claims?.sub ? "PROXY_SESSION_MISSING" : "PROXY_SESSION_PRESENT", {
    requestId,
    route: request.nextUrl.pathname,
  });

  return response;
}
