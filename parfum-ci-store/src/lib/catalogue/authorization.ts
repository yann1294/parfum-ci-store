import "server-only";

import { canManageProducts as canManageProductsForStaff } from "@/lib/auth/permissions";
import { requireActiveStaff } from "@/lib/auth/server";
import { CatalogueError } from "@/lib/catalogue/errors";

export async function requireCatalogueManager() {
  const staff = await requireActiveStaff();

  if (!canManageProductsForStaff(staff)) {
    throw new CatalogueError("FORBIDDEN", "Vous n'êtes pas autorisé à gérer le catalogue.");
  }

  return staff;
}
