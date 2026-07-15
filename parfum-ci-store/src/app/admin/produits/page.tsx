import { PageContainer } from "@/components/shared/page-container";
import { SectionHeading } from "@/components/shared/section-heading";
import { ProductFilters, ProductList } from "@/components/admin/catalogue/product-list";
import {
  listAdminBrands,
  listAdminCategories,
  listAdminProducts,
  requireCatalogueReadAccess,
  type AdminProductListFilters,
} from "@/lib/catalogue/admin";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { permissions } = await requireCatalogueReadAccess();
  const [brands, categories] = await Promise.all([listAdminBrands(), listAdminCategories()]);
  const filters: AdminProductListFilters = {
    q: params.q,
    status: params.status as AdminProductListFilters["status"],
    brandId: params.brandId,
    categoryId: params.categoryId,
    availability: params.availability as AdminProductListFilters["availability"],
    page: params.page ? Number.parseInt(params.page, 10) : 1,
  };
  const result = await listAdminProducts(filters, permissions);
  const queryString = (page: number) => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) {
        next.set(key, value);
      }
    }
    next.set("page", String(page));
    return `/admin/produits?${next.toString()}`;
  };

  return (
    <PageContainer>
      <SectionHeading
        eyebrow="Catalogue"
        title="Produits"
        description="Gérez les brouillons, variantes, images et statuts de publication."
      />
      <div className="mt-8 grid gap-6">
        <ProductFilters
          brands={brands}
          categories={categories}
          canMutate={permissions.canMutate}
          searchParams={params}
        />
        <ProductList
          products={result.products}
          page={result.page}
          totalPages={result.totalPages}
          queryString={queryString}
        />
      </div>
    </PageContainer>
  );
}
