import { PageContainer } from "@/components/shared/page-container";
import { SectionHeading } from "@/components/shared/section-heading";
import { EntityManager } from "@/components/admin/catalogue/entity-manager";
import { listAdminCategories, requireCatalogueReadAccess } from "@/lib/catalogue/admin";

export default async function CategoriesPage() {
  const { permissions } = await requireCatalogueReadAccess();
  const categories = await listAdminCategories();

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
          items={categories}
          categories={categories}
          canMutate={permissions.canMutate}
        />
      </div>
    </PageContainer>
  );
}
