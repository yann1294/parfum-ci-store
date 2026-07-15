import { PageContainer } from "@/components/shared/page-container";
import { SectionHeading } from "@/components/shared/section-heading";
import { EntityManager } from "@/components/admin/catalogue/entity-manager";
import { listAdminBrands, requireCatalogueReadAccess } from "@/lib/catalogue/admin";

export default async function BrandsPage() {
  const { permissions } = await requireCatalogueReadAccess();
  const brands = await listAdminBrands();

  return (
    <PageContainer>
      <SectionHeading
        eyebrow="Catalogue"
        title="Marques"
        description="Gérez les marques affichées dans les fiches produit."
      />
      <div className="mt-8">
        <EntityManager type="brand" items={brands} canMutate={permissions.canMutate} />
      </div>
    </PageContainer>
  );
}
