import { describe, expect, it } from "vitest";

import { getAdminNavigation } from "@/lib/auth/navigation";
import { getAdminCataloguePermission } from "@/lib/catalogue/permissions";
import type { StaffProfile } from "@/lib/auth/permissions";

function staff(role: StaffProfile["role"], active = true): StaffProfile {
  return { id: role, fullName: role, role, active };
}

describe("admin catalogue permissions", () => {
  it("allows owner and admin catalogue mutations and cost-price visibility", () => {
    for (const role of ["OWNER", "ADMIN"] as const) {
      const permissions = getAdminCataloguePermission(staff(role));
      expect(permissions.canRead).toBe(true);
      expect(permissions.canMutate).toBe(true);
      expect(permissions.canViewCostPrice).toBe(true);
    }
  });

  it("keeps inventory manager catalogue access read-only", () => {
    const permissions = getAdminCataloguePermission(staff("INVENTORY_MANAGER"));
    const labels = getAdminNavigation(staff("INVENTORY_MANAGER")).map((item) => item.label);

    expect(permissions.canRead).toBe(true);
    expect(permissions.canMutate).toBe(false);
    expect(permissions.canViewCostPrice).toBe(false);
    expect(labels).toContain("Produits");
    expect(labels).toContain("Marques");
    expect(labels).toContain("Catégories");
  });

  it("does not grant catalogue access to support or inactive staff", () => {
    expect(getAdminCataloguePermission(staff("CUSTOMER_SUPPORT")).canRead).toBe(false);
    expect(getAdminCataloguePermission(staff("ADMIN", false)).canRead).toBe(false);
  });
});
