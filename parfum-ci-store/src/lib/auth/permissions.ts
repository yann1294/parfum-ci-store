import type { Database } from "@/types/database.types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export type StaffProfile = {
  id: string;
  fullName: string;
  role: AppRole;
  active: boolean;
};

const roleRank: Record<AppRole, number> = {
  OWNER: 5,
  ADMIN: 4,
  INVENTORY_MANAGER: 3,
  ORDER_MANAGER: 3,
  CUSTOMER_SUPPORT: 2,
};

export function hasRole(staff: Pick<StaffProfile, "role" | "active">, roles: AppRole[]) {
  return staff.active && roles.includes(staff.role);
}

export function isOwner(staff: Pick<StaffProfile, "role" | "active">) {
  return hasRole(staff, ["OWNER"]);
}

export function isAdminLike(staff: Pick<StaffProfile, "role" | "active">) {
  return staff.active && roleRank[staff.role] >= roleRank.ADMIN;
}

export function canManageProducts(staff: Pick<StaffProfile, "role" | "active">) {
  return hasRole(staff, ["OWNER", "ADMIN"]);
}

export function canReadProducts(staff: Pick<StaffProfile, "role" | "active">) {
  return hasRole(staff, ["OWNER", "ADMIN", "INVENTORY_MANAGER"]);
}

export function canManageInventory(staff: Pick<StaffProfile, "role" | "active">) {
  return hasRole(staff, ["OWNER", "ADMIN", "INVENTORY_MANAGER"]);
}

export function canManageOrders(staff: Pick<StaffProfile, "role" | "active">) {
  return hasRole(staff, ["OWNER", "ADMIN", "ORDER_MANAGER"]);
}

export function canReadOrders(staff: Pick<StaffProfile, "role" | "active">) {
  return hasRole(staff, ["OWNER", "ADMIN", "ORDER_MANAGER", "CUSTOMER_SUPPORT"]);
}

export function canManageMessages(staff: Pick<StaffProfile, "role" | "active">) {
  return hasRole(staff, ["OWNER", "ADMIN", "CUSTOMER_SUPPORT"]);
}

export function canManageSettings(staff: Pick<StaffProfile, "role" | "active">) {
  return hasRole(staff, ["OWNER", "ADMIN"]);
}

export function canManageOwnerSecuritySettings(staff: Pick<StaffProfile, "role" | "active">) {
  return hasRole(staff, ["OWNER"]);
}

export function getRoleLabel(role: AppRole) {
  const labels: Record<AppRole, string> = {
    OWNER: "Propriétaire",
    ADMIN: "Administrateur",
    INVENTORY_MANAGER: "Gestionnaire inventaire",
    ORDER_MANAGER: "Gestionnaire commandes",
    CUSTOMER_SUPPORT: "Support client",
  };

  return labels[role];
}
