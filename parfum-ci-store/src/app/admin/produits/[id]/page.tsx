import { notFound } from "next/navigation";

import { PageContainer } from "@/components/shared/page-container";
import { SectionHeading } from "@/components/shared/section-heading";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  return (
    <PageContainer>
      <SectionHeading
        eyebrow="Catalogue"
        title={product.name}
        description={`Slug: /${product.slug}`}
      />
      <div className="mt-4">
        <Badge variant={product.status === "ACTIVE" ? "default" : "secondary"}>{product.status}</Badge>
      </div>
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
