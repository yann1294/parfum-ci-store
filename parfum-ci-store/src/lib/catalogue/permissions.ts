import { canManageInventory, canManageProducts, canReadProducts, type StaffProfile } from "@/lib/auth/permissions";

export type AdminCataloguePermission = {
  canRead: boolean;
  canMutate: boolean;
  canViewCostPrice: boolean;
  canInitializeInventory: boolean;
};

export function getAdminCataloguePermission(staff: StaffProfile): AdminCataloguePermission {
  return {
    canRead: canReadProducts(staff),
    canMutate: canManageProducts(staff),
    canViewCostPrice: canManageProducts(staff),
    canInitializeInventory: canManageInventory(staff),
  };
}
