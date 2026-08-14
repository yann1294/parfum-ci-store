function safeOrigin(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.origin : null;
  } catch {
    return null;
  }
}

export function buildSecurityHeaders({
  production,
  supabaseUrl,
}: {
  production: boolean;
  supabaseUrl?: string;
}) {
  const supabaseOrigin = safeOrigin(supabaseUrl);
  const supabaseWebSocketOrigin = supabaseOrigin?.replace(/^http/, "ws");
  const scriptSources = [
    "'self'",
    "'unsafe-inline'",
    ...(production ? [] : ["'unsafe-eval'"]),
  ].join(" ");
  const connectSources = [
    "'self'",
    ...(supabaseOrigin ? [supabaseOrigin] : []),
    ...(supabaseWebSocketOrigin ? [supabaseWebSocketOrigin] : []),
    ...(production ? [] : ["ws:", "http:"]),
  ].join(" ");
  const directives = [
    "default-src 'self'",
    `script-src ${scriptSources}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connectSources}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "manifest-src 'self'",
    "worker-src 'self' blob:",
    ...(production ? ["upgrade-insecure-requests"] : []),
  ];

  const headers = [
    { key: "Content-Security-Policy", value: directives.join("; ") },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
    },
    { key: "X-Frame-Options", value: "DENY" },
  ];

  if (production) {
    headers.push({ key: "Strict-Transport-Security", value: "max-age=31536000" });
  }

  return headers;
}
