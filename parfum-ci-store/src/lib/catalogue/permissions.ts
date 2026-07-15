import { canManageProducts, canReadProducts, type StaffProfile } from "@/lib/auth/permissions";

export type AdminCataloguePermission = {
  canRead: boolean;
  canMutate: boolean;
  canViewCostPrice: boolean;
};

export function getAdminCataloguePermission(staff: StaffProfile): AdminCataloguePermission {
  return {
    canRead: canReadProducts(staff),
    canMutate: canManageProducts(staff),
    canViewCostPrice: canManageProducts(staff),
  };
}
