import { PageContainer } from "@/components/shared/page-container";
import { SectionHeading } from "@/components/shared/section-heading";
import { EntityManager } from "@/components/admin/catalogue/entity-manager";
import {
  listAdminCategories,
  normalizeAdminEntityListFilters,
  requireCatalogueReadAccess,
} from "@/lib/catalogue/admin";

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { permissions } = await requireCatalogueReadAccess();
  const categories = await listAdminCategories(normalizeAdminEntityListFilters(params));

  return (
    <PageContainer>
      <SectionHeading
        eyebrow="Catalogue"
        title="Catégories"
        description="Gérez la structure de classification des produits."
      />
      <div className="mt-8">
        <EntityManager
          type="category"
          result={categories}
          categories={categories.items}
          canMutate={permissions.canMutate}
          searchParams={params}
        />
      </div>
    </PageContainer>
  );
}
