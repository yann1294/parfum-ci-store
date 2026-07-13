import { beforeEach, describe, expect, it, vi } from "vitest";

const maybeSingle = vi.fn();
const eq = vi.fn(() => ({ maybeSingle }));
const select = vi.fn(() => ({ eq }));
const from = vi.fn(() => ({ select }));
const getClaims = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { getClaims },
    from,
  })),
}));

vi.mock("@/lib/audit/admin-auth", () => ({
  auditAdminAuthEvent: vi.fn(async () => undefined),
}));

describe("server auth helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getClaims.mockResolvedValue({
      data: { claims: { sub: "user-1" } },
      error: null,
    });
  });

  it("rejects inactive staff", async () => {
    maybeSingle.mockResolvedValue({
      data: {
        id: "user-1",
        full_name: "Inactive User",
        role: "ADMIN",
        active: false,
      },
      error: null,
    });
    const { requireActiveStaff } = await import("@/lib/auth/server");

    await expect(requireActiveStaff()).rejects.toThrow("Staff profile is inactive");
  });

  it("rejects authenticated users without an active staff profile", async () => {
    maybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });
    const { requireActiveStaff } = await import("@/lib/auth/server");

    await expect(requireActiveStaff()).rejects.toThrow("Insufficient permissions");
  });

  it("rejects direct server action invocation for unauthorized roles", async () => {
    maybeSingle.mockResolvedValue({
      data: {
        id: "user-1",
        full_name: "Support User",
        role: "CUSTOMER_SUPPORT",
        active: true,
      },
      error: null,
    });
    const { assertCanManageProductsAction } = await import("@/app/admin/actions");

    await expect(assertCanManageProductsAction()).rejects.toThrow("Insufficient permissions");
  });
});
