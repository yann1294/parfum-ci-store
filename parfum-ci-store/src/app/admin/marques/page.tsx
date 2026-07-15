import { PageContainer } from "@/components/shared/page-container";
import { SectionHeading } from "@/components/shared/section-heading";
import { EntityManager } from "@/components/admin/catalogue/entity-manager";
import {
  listAdminBrands,
  normalizeAdminEntityListFilters,
  requireCatalogueReadAccess,
} from "@/lib/catalogue/admin";

export default async function BrandsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { permissions } = await requireCatalogueReadAccess();
  const brands = await listAdminBrands(normalizeAdminEntityListFilters(params));

  return (
    <PageContainer>
      <SectionHeading
        eyebrow="Catalogue"
        title="Marques"
        description="Gérez les marques affichées dans les fiches produit."
      />
      <div className="mt-8">
        <EntityManager
          type="brand"
          result={brands}
          canMutate={permissions.canMutate}
          searchParams={params}
        />
      </div>
    </PageContainer>
  );
}
