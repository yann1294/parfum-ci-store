import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getClaims = vi.fn();

vi.mock("@/lib/env/public", () => ({
  getPublicEnv: () => ({
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable",
  }),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn((_url, _key, options) => ({
    auth: {
      getClaims: async () => {
        options.cookies.setAll([
          { name: "sb-test-auth-token", value: "refreshed", options: { path: "/" } },
        ]);
        return getClaims();
      },
    },
  })),
}));

describe("Supabase proxy session refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("copies refreshed Supabase cookies to the outgoing response", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "user-1" } }, error: null });
    const { updateSession } = await import("@/lib/supabase/proxy");

    const response = await updateSession(
      new NextRequest("http://localhost:3000/admin", {
        headers: { cookie: "sb-test-auth-token=old" },
      }),
    );

    expect(response.headers.getSetCookie().join("\n")).toContain("sb-test-auth-token=refreshed");
  });

  it("still returns refreshed cookies when no verified claims are present", async () => {
    getClaims.mockResolvedValue({ data: { claims: null }, error: null });
    const { updateSession } = await import("@/lib/supabase/proxy");

    const response = await updateSession(
      new NextRequest("http://localhost:3000/admin", {
        headers: { cookie: "sb-test-auth-token=old" },
      }),
    );

    expect(response.headers.getSetCookie().join("\n")).toContain("sb-test-auth-token=refreshed");
  });
});
