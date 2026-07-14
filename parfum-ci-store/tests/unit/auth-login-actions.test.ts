import { beforeEach, describe, expect, it, vi } from "vitest";

const redirect = vi.fn((path: string) => {
  throw new Error(`NEXT_REDIRECT:${path}`);
});
const headers = vi.fn(async () => new Headers({ host: "localhost:3000" }));
const signInWithPassword = vi.fn();
const signOut = vi.fn();
const requireActiveStaff = vi.fn();
const requireAuthenticatedUser = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/headers", () => ({ headers }));
vi.mock("@/lib/audit/admin-auth", () => ({
  auditAdminAuthEvent: vi.fn(async () => undefined),
}));
vi.mock("@/lib/auth/server", () => ({
  requireActiveStaff,
  requireAuthenticatedUser,
  requireRole: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      signInWithPassword,
      signOut,
    },
  })),
}));

describe("admin login actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireActiveStaff.mockResolvedValue({
      id: "staff-1",
      fullName: "Staff",
      role: "OWNER",
      active: true,
    });
    requireAuthenticatedUser.mockResolvedValue({ id: "staff-1", claims: { sub: "staff-1" } });
  });

  it("redirects after valid password login", async () => {
    signInWithPassword.mockResolvedValue({ error: null });
    const { loginAction } = await import("@/app/(auth)/connexion/actions");
    const formData = new FormData();
    formData.set("email", "owner@example.com");
    formData.set("password", "correct-password");
    formData.set("returnPath", "/admin/design-system");

    await expect(loginAction({}, formData)).rejects.toThrow("NEXT_REDIRECT:/admin/design-system");
  });

  it("returns a generic invalid-password response", async () => {
    signInWithPassword.mockResolvedValue({ error: new Error("invalid") });
    const { loginAction } = await import("@/app/(auth)/connexion/actions");
    const formData = new FormData();
    formData.set("email", "owner@example.com");
    formData.set("password", "wrong-password");

    await expect(loginAction({}, formData)).resolves.toEqual({
      error: "Identifiants invalides.",
    });
  });

  it("signs out on logout", async () => {
    const { logoutAction } = await import("@/app/admin/actions");

    await expect(logoutAction()).rejects.toThrow("NEXT_REDIRECT:/connexion");
    expect(signOut).toHaveBeenCalled();
  });
});
