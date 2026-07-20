import { notFound } from "next/navigation";

import { PageContainer } from "@/components/shared/page-container";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductEditorHeader } from "@/components/admin/catalogue/product-editor-header";
import { ProductForm } from "@/components/admin/catalogue/product-form";
import { VariantEditor } from "@/components/admin/catalogue/variant-editor";
import { ImageManager } from "@/components/admin/catalogue/image-manager";
import { PublicationControls } from "@/components/admin/catalogue/publication-controls";
import {
  getAdminProductById,
  listAdminBrandOptions,
  listAdminCategoryOptions,
  listAdminProductVariants,
  normalizeAdminVariantListFilters,
  requireCatalogueReadAccess,
} from "@/lib/catalogue/admin";
import { getSafeProductReturnPath } from "@/lib/catalogue/product-return";

export default async function ProductEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const search = await searchParams;
  const { permissions } = await requireCatalogueReadAccess();
  const variantFilters = normalizeAdminVariantListFilters({
    q: search.variantQ,
    active: search.variantActive,
    concentration: search.variantConcentration,
    sizeMl: search.variantSizeMl,
    sort: search.variantSort,
    page: search.variantPage,
  });
  const [brands, categories, product, variants] = await Promise.all([
    listAdminBrandOptions(),
    listAdminCategoryOptions(),
    getAdminProductById(id, permissions),
    listAdminProductVariants(id, variantFilters, permissions),
  ]);

  if (!product) {
    notFound();
  }

  const returnPath = getSafeProductReturnPath(search.retour);

  return (
    <PageContainer>
      <ProductEditorHeader product={product} returnPath={returnPath} />
      <Tabs defaultValue="informations" className="mt-8">
        <TabsList>
          <TabsTrigger value="informations">Informations</TabsTrigger>
          <TabsTrigger value="variantes">Variantes</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
          <TabsTrigger value="publication">Publication</TabsTrigger>
        </TabsList>
        <TabsContent value="informations" className="mt-6">
          <ProductForm
            product={product}
            brands={brands}
            categories={categories}
            canMutate={permissions.canMutate}
          />
        </TabsContent>
        <TabsContent value="variantes" className="mt-6">
          <VariantEditor
            product={product}
            variants={variants}
            canMutate={permissions.canMutate}
            canViewCostPrice={permissions.canViewCostPrice}
            canInitializeInventory={permissions.canInitializeInventory}
            searchParams={search}
          />
        </TabsContent>
        <TabsContent value="images" className="mt-6">
          <ImageManager product={product} canMutate={permissions.canMutate} />
        </TabsContent>
        <TabsContent value="publication" className="mt-6">
          <PublicationControls product={product} canMutate={permissions.canMutate} />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
