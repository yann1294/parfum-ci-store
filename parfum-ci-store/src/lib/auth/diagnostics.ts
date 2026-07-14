type AuthDiagnosticEvent =
  | "PASSWORD_LOGIN_SUCCEEDED"
  | "PASSWORD_LOGIN_COOKIE_PERSISTED"
  | "PROXY_SESSION_PRESENT"
  | "PROXY_SESSION_REFRESHED"
  | "PROXY_SESSION_MISSING"
  | "STAFF_PROFILE_FOUND"
  | "STAFF_PROFILE_INACTIVE"
  | "STAFF_PROFILE_LOOKUP_FAILED"
  | "GOOGLE_OAUTH_INIT_FAILED"
  | "GOOGLE_CALLBACK_CODE_MISSING"
  | "GOOGLE_CODE_EXCHANGE_FAILED"
  | "GOOGLE_SESSION_ESTABLISHED"
  | "GOOGLE_PROFILE_AUTHORIZED"
  | "GOOGLE_PROFILE_DENIED";

type AuthDiagnosticDetails = {
  requestId?: string;
  reason?: string;
  route?: string;
};

function createRequestId() {
  return Math.random().toString(36).slice(2, 10);
}

export function getAuthDiagnosticRequestId() {
  return createRequestId();
}

export function authDiagnostic(event: AuthDiagnosticEvent, details: AuthDiagnosticDetails = {}) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  const safeDetails = {
    requestId: details.requestId,
    reason: details.reason,
    route: details.route,
  };

  console.info("[auth]", event, safeDetails);
}
