import { redirect } from "next/navigation";

import { PageContainer } from "@/components/shared/page-container";
import { SectionHeading } from "@/components/shared/section-heading";
import { ProductForm } from "@/components/admin/catalogue/product-form";
import {
  listAdminBrands,
  listAdminCategories,
} from "@/lib/catalogue/admin";
import { requireActiveStaff } from "@/lib/auth/server";
import { getAdminCataloguePermission } from "@/lib/catalogue/permissions";

export default async function NewProductPage() {
  const staff = await requireActiveStaff({ mode: "redirect", returnPath: "/admin/produits/nouveau" });
  const permissions = getAdminCataloguePermission(staff);

  if (!permissions.canMutate) {
    redirect("/acces-refuse");
  }

  const [brands, categories] = await Promise.all([listAdminBrands(), listAdminCategories()]);

  return (
    <PageContainer>
      <SectionHeading
        eyebrow="Catalogue"
        title="Nouveau produit"
        description="Créez un brouillon avant d'ajouter les variantes et les images."
      />
      <div className="mt-8">
        <ProductForm brands={brands} categories={categories} canMutate={permissions.canMutate} />
      </div>
    </PageContainer>
  );
}
