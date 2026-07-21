import Link from "next/link";
import type { Metadata } from "next";

import { EmptyState } from "@/components/shared/empty-state";
import { PageContainer } from "@/components/shared/page-container";
import { SectionHeading } from "@/components/shared/section-heading";
import { buttonVariants } from "@/components/ui/button";
import { CatalogueFilterControls } from "@/components/storefront/catalogue-filter-controls";
import { ProductCard } from "@/components/storefront/product-card";
import { listActiveProductsPage, listPublicFacets } from "@/lib/catalogue/products";
import { pageWindow } from "@/lib/catalogue/pagination";
import { buildCatalogueUrl } from "@/lib/catalogue/catalogue-url";
import { normalizePublicCatalogueQuery } from "@/lib/catalogue/validation";

export const metadata: Metadata = {
  title: "Catalogue",
  description: "Découvrez les parfums disponibles en Côte d'Ivoire.",
  alternates: { canonical: "/catalogue" },
};

export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const filters = normalizePublicCatalogueQuery(params);
  const [result, facets] = await Promise.all([listActiveProductsPage(filters), listPublicFacets()]);
  const products = result.products;
  const pages = pageWindow(result.page, result.totalPages);

  return (
    <PageContainer className="py-12">
      <SectionHeading
        eyebrow="Catalogue"
        title="Tous les parfums"
        description="Filtrez la sélection active par marque, famille olfactive, public cible et disponibilité."
      />
      <div className="mt-8 grid min-w-0 gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <CatalogueFilterControls filters={filters} facets={facets} />
        <section className="grid min-w-0 gap-5">
          <p className="text-sm text-muted-foreground">
            {result.total > 0
              ? `Produits ${result.rangeStart}-${result.rangeEnd} sur ${result.total}`
              : "Aucun produit ne correspond aux filtres actuels."}
          </p>
          {products.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
          ) : (
            <EmptyState title="Aucun parfum trouvé" description="Essayez de retirer un filtre ou de modifier votre recherche." />
          )}
          <nav className="flex flex-wrap items-center justify-between gap-3" aria-label="Pagination catalogue">
            <Link
              href={buildCatalogueUrl({ ...filters, page: Math.max(result.page - 1, 1) })}
              className={buttonVariants({ variant: "outline" })}
              aria-disabled={result.page <= 1}
            >
              Précédent
            </Link>
            <div className="flex flex-wrap justify-center gap-2">
              {pages.map((pageNumber) => (
                <Link
                  key={pageNumber}
                  href={buildCatalogueUrl({ ...filters, page: pageNumber })}
                  className={buttonVariants({
                    variant: pageNumber === result.page ? "default" : "outline",
                    size: "sm",
                  })}
                  aria-current={pageNumber === result.page ? "page" : undefined}
                >
                  {pageNumber}
                </Link>
              ))}
            </div>
            <Link
              href={buildCatalogueUrl({ ...filters, page: Math.min(result.page + 1, result.totalPages) })}
              className={buttonVariants({ variant: "outline" })}
              aria-disabled={result.page >= result.totalPages}
            >
              Suivant
            </Link>
          </nav>
        </section>
      </div>
    </PageContainer>
  );
}
