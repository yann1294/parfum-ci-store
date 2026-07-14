import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const exchangeCodeForSession = vi.fn();
const getClaims = vi.fn();
const signOut = vi.fn();
const maybeSingle = vi.fn();
const eq = vi.fn(() => ({ maybeSingle }));
const select = vi.fn(() => ({ eq }));
const from = vi.fn(() => ({ select }));
const auditAdminAuthEvent = vi.fn(async () => undefined);

vi.mock("server-only", () => ({}));
vi.mock("@/lib/audit/admin-auth", () => ({ auditAdminAuthEvent }));
vi.mock("@/lib/env/public", () => ({
  getPublicEnv: () => ({
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable",
  }),
}));
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn((_url, _key, options) => ({
    auth: {
      exchangeCodeForSession: async (code: string) => {
        options.cookies.setAll([
          { name: "sb-test-auth-token", value: `session-${code}`, options: { path: "/" } },
        ]);
        return exchangeCodeForSession(code);
      },
      getClaims,
      signOut: async () => {
        options.cookies.setAll([
          { name: "sb-test-auth-token", value: "", options: { path: "/", maxAge: 0 } },
        ]);
        return signOut();
      },
    },
    from,
  })),
}));

describe("Google OAuth callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    exchangeCodeForSession.mockResolvedValue({ error: null });
    signOut.mockResolvedValue({ error: null });
    getClaims.mockResolvedValue({ data: { claims: { sub: "user-1" } }, error: null });
  });

  it("fails safely when the code is missing", async () => {
    const { GET } = await import("@/app/auth/callback/route");
    const response = await GET(new NextRequest("http://localhost:3000/auth/callback"));

    expect(response.headers.get("location")).toBe("http://localhost:3000/connexion?erreur=oauth");
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("fails safely when code exchange fails", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: new Error("exchange failed") });
    const { GET } = await import("@/app/auth/callback/route");
    const response = await GET(
      new NextRequest("http://localhost:3000/auth/callback?code=oauth-code"),
    );

    expect(response.headers.get("location")).toBe("http://localhost:3000/connexion?erreur=oauth");
    expect(auditAdminAuthEvent).toHaveBeenCalledWith({
      action: "ADMIN_GOOGLE_LOGIN_DENIED",
      reason: "exchange_failed",
    });
  });

  it("redirects active approved staff to a safe return path", async () => {
    maybeSingle.mockResolvedValue({
      data: { id: "user-1", full_name: "Owner", role: "OWNER", active: true },
      error: null,
    });
    const { GET } = await import("@/app/auth/callback/route");
    const response = await GET(
      new NextRequest(
        "http://localhost:3000/auth/callback?code=oauth-code&retour=%2Fadmin%2Fdesign-system",
      ),
    );

    expect(response.headers.get("location")).toBe("http://localhost:3000/admin/design-system");
    expect(response.headers.getSetCookie().join("\n")).toContain("sb-test-auth-token=");
    expect(signOut).not.toHaveBeenCalled();
  });

  it("denies inactive profiles and signs out", async () => {
    maybeSingle.mockResolvedValue({
      data: { id: "user-1", full_name: "Inactive", role: "ADMIN", active: false },
      error: null,
    });
    const { GET } = await import("@/app/auth/callback/route");
    const response = await GET(
      new NextRequest("http://localhost:3000/auth/callback?code=oauth-code"),
    );

    expect(response.headers.get("location")).toBe("http://localhost:3000/acces-refuse");
    expect(response.headers.getSetCookie().join("\n")).toContain("Max-Age=0");
    expect(signOut).toHaveBeenCalled();
  });

  it("treats profile lookup failure as temporary failure without signing out", async () => {
    maybeSingle.mockResolvedValue({
      data: null,
      error: new Error("database unavailable"),
    });
    const { GET } = await import("@/app/auth/callback/route");
    const response = await GET(
      new NextRequest("http://localhost:3000/auth/callback?code=oauth-code"),
    );

    expect(response.headers.get("location")).toBe("http://localhost:3000/connexion?erreur=oauth");
    expect(signOut).not.toHaveBeenCalled();
  });

  it("denies missing profiles and ignores metadata-like claims", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "user-1", user_metadata: { role: "OWNER", active: true } } },
      error: null,
    });
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const { GET } = await import("@/app/auth/callback/route");
    const response = await GET(
      new NextRequest("http://localhost:3000/auth/callback?code=oauth-code"),
    );

    expect(response.headers.get("location")).toBe("http://localhost:3000/acces-refuse");
    expect(signOut).toHaveBeenCalled();
  });

  it("rejects malicious return paths", async () => {
    maybeSingle.mockResolvedValue({
      data: { id: "user-1", full_name: "Owner", role: "OWNER", active: true },
      error: null,
    });
    const { GET } = await import("@/app/auth/callback/route");
    const response = await GET(
      new NextRequest(
        "http://localhost:3000/auth/callback?code=oauth-code&retour=https%3A%2F%2Fevil.example",
      ),
    );

    expect(response.headers.get("location")).toBe("http://localhost:3000/admin");
  });
});
