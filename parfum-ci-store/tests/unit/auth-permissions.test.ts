import { describe, expect, it } from "vitest";

import { canAccessAdminPath, getAdminNavigation } from "@/lib/auth/navigation";
import {
  canManageOwnerSecuritySettings,
  canManageInventory,
  canManageMessages,
  canManageOrders,
  canManageProducts,
  canManageSettings,
  canReadOrders,
  type StaffProfile,
} from "@/lib/auth/permissions";
import { getSafeReturnPath } from "@/lib/auth/redirects";

function staff(role: StaffProfile["role"], active = true): StaffProfile {
  return {
    id: `${role.toLowerCase()}-id`,
    fullName: role,
    role,
    active,
  };
}

describe("admin role permissions", () => {
  it("grants owner all administrative capabilities", () => {
    const owner = staff("OWNER");

    expect(canManageProducts(owner)).toBe(true);
    expect(canManageInventory(owner)).toBe(true);
    expect(canManageOrders(owner)).toBe(true);
    expect(canManageMessages(owner)).toBe(true);
    expect(canManageSettings(owner)).toBe(true);
    expect(canManageOwnerSecuritySettings(owner)).toBe(true);
  });

  it("grants admins operational access but not owner security settings", () => {
    const admin = staff("ADMIN");

    expect(canManageProducts(admin)).toBe(true);
    expect(canManageInventory(admin)).toBe(true);
    expect(canManageOrders(admin)).toBe(true);
    expect(canManageMessages(admin)).toBe(true);
    expect(canManageSettings(admin)).toBe(true);
    expect(canManageOwnerSecuritySettings(admin)).toBe(false);
  });

  it("limits inventory managers to catalogue read and inventory modules", () => {
    const inventory = staff("INVENTORY_MANAGER");
    const labels = getAdminNavigation(inventory).map((item) => item.label);

    expect(canManageProducts(inventory)).toBe(false);
    expect(canManageInventory(inventory)).toBe(true);
    expect(labels).toContain("Produits");
    expect(labels).toContain("Marques");
    expect(labels).toContain("Catégories");
    expect(labels).toContain("Inventaire");
    expect(labels).not.toContain("Commandes");
    expect(labels).not.toContain("Clients");
    expect(labels).not.toContain("Paiements");
    expect(labels).not.toContain("Messages");
    expect(labels).not.toContain("Paramètres");
    expect(canAccessAdminPath(inventory, "/admin/inventaire")).toBe(true);
    expect(canAccessAdminPath(inventory, "/admin/commandes")).toBe(false);
  });

  it("limits support users to order read and messages", () => {
    const support = staff("CUSTOMER_SUPPORT");
    const labels = getAdminNavigation(support).map((item) => item.label);

    expect(canManageOrders(support)).toBe(false);
    expect(canReadOrders(support)).toBe(true);
    expect(canManageMessages(support)).toBe(true);
    expect(labels).toContain("Commandes");
    expect(labels).toContain("Messages");
    expect(labels).not.toContain("Clients");
    expect(labels).not.toContain("Paiements");
    expect(labels).not.toContain("Catalogue");
    expect(labels).not.toContain("Inventaire");
    expect(labels).not.toContain("Paramètres");
    expect(canAccessAdminPath(support, "/admin/commandes")).toBe(true);
    expect(canAccessAdminPath(support, "/admin/paiements")).toBe(false);
    expect(canAccessAdminPath(support, "/admin/inventaire")).toBe(false);
  });

  it("limits order managers to order, customer, and payment operations", () => {
    const orderManager = staff("ORDER_MANAGER");
    const labels = getAdminNavigation(orderManager).map((item) => item.label);

    expect(canManageOrders(orderManager)).toBe(true);
    expect(canManageInventory(orderManager)).toBe(false);
    expect(canManageMessages(orderManager)).toBe(false);
    expect(canManageSettings(orderManager)).toBe(false);
    expect(labels).toContain("Commandes");
    expect(labels).toContain("Clients");
    expect(labels).toContain("Paiements");
    expect(labels).not.toContain("Inventaire");
    expect(labels).not.toContain("Messages");
    expect(labels).not.toContain("Paramètres");
    expect(canAccessAdminPath(orderManager, "/admin/paiements")).toBe(true);
    expect(canAccessAdminPath(orderManager, "/admin/inventaire")).toBe(false);
  });

  it("denies inactive staff for all capabilities and navigation modules", () => {
    const inactive = staff("ADMIN", false);

    expect(canManageProducts(inactive)).toBe(false);
    expect(canManageSettings(inactive)).toBe(false);
    expect(getAdminNavigation(inactive)).toEqual([]);
  });
});

describe("safe return paths", () => {
  it("preserves internal admin return paths", () => {
    expect(getSafeReturnPath("/admin/design-system?onglet=boutons")).toBe(
      "/admin/design-system?onglet=boutons",
    );
  });

  it("rejects external and protocol-relative return paths", () => {
    expect(getSafeReturnPath("https://example.com/admin")).toBe("/admin");
    expect(getSafeReturnPath("//example.com/admin")).toBe("/admin");
  });

  it("rejects malformed or auth-loop return paths", () => {
    expect(getSafeReturnPath("admin")).toBe("/admin");
    expect(getSafeReturnPath("javascript:alert(1)")).toBe("/admin");
    expect(getSafeReturnPath("/connexion?retour=%2Fadmin")).toBe("/admin");
    expect(getSafeReturnPath("/acces-refuse")).toBe("/admin");
  });
});
