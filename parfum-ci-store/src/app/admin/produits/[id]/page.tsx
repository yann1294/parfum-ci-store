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
  listAdminBrands,
  listAdminCategories,
  requireCatalogueReadAccess,
} from "@/lib/catalogue/admin";

export default async function ProductEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { permissions } = await requireCatalogueReadAccess();
  const [brands, categories, product] = await Promise.all([
    listAdminBrands(),
    listAdminCategories(),
    getAdminProductById(id, permissions),
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
            canMutate={permissions.canMutate}
            canViewCostPrice={permissions.canViewCostPrice}
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
