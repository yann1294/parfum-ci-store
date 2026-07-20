import Link from "next/link";
import type { Metadata } from "next";

import { EmptyState } from "@/components/shared/empty-state";
import { PageContainer } from "@/components/shared/page-container";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button, buttonVariants } from "@/components/ui/button";
import { ProductCard } from "@/components/storefront/product-card";
import { listActiveProductsPage, listPublicFacets } from "@/lib/catalogue/products";
import { pageWindow } from "@/lib/catalogue/pagination";
import { normalizePublicCatalogueQuery, targetAudienceOptions } from "@/lib/catalogue/validation";

export const metadata: Metadata = {
  title: "Catalogue",
  description: "Découvrez les parfums disponibles en Côte d'Ivoire.",
  alternates: { canonical: "/catalogue" },
};

function buildHref(params: Record<string, string | undefined>, patch: Record<string, string | undefined>) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...params, ...patch })) {
    if (value && !(key === "page" && value === "1")) next.set(key, value);
  }
  const query = next.toString();
  return query ? `/catalogue?${query}` : "/catalogue";
}

function normalizedHrefParams(filters: ReturnType<typeof normalizePublicCatalogueQuery>) {
  return {
    page: String(filters.page),
    q: filters.search,
    brand: filters.brandSlug,
    category: filters.categorySlug,
    fragranceFamily: filters.fragranceFamily,
    genderCategory: filters.genderCategory,
    concentration: filters.concentration,
    sizeMl: filters.sizeMl ? String(filters.sizeMl) : undefined,
    availability: filters.availability,
    sort: filters.sort === "newest" ? undefined : filters.sort,
  };
}

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
  const hrefParams = normalizedHrefParams(filters);

  return (
    <PageContainer className="py-12">
      <SectionHeading
        eyebrow="Catalogue"
        title="Tous les parfums"
        description="Filtrez la sélection active par marque, famille olfactive, public cible et disponibilité."
      />
      <div className="mt-8 grid gap-8 lg:grid-cols-[18rem_1fr]">
        <aside className="rounded-lg border bg-surface p-4">
          <form className="grid gap-4" action="/catalogue">
            <label className="grid gap-1 text-sm">
              Recherche
              <input name="q" defaultValue={filters.search ?? ""} className="h-10 rounded-lg border border-input bg-background px-3" />
            </label>
            <label className="grid gap-1 text-sm">
              Marque
              <select name="brand" defaultValue={filters.brandSlug ?? ""} className="h-10 rounded-lg border border-input bg-background px-3">
                <option value="">Toutes</option>
                {facets.brands.map((brand) => (
                  <option key={brand.slug} value={brand.slug}>{brand.name}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              Catégorie
              <select name="category" defaultValue={filters.categorySlug ?? ""} className="h-10 rounded-lg border border-input bg-background px-3">
                <option value="">Toutes</option>
                {facets.categories.map((category) => (
                  <option key={category.slug} value={category.slug}>{category.name}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              Public cible
              <select name="genderCategory" defaultValue={filters.genderCategory ?? ""} className="h-10 rounded-lg border border-input bg-background px-3">
                <option value="">Tous</option>
                {targetAudienceOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              Famille olfactive
              <select name="fragranceFamily" defaultValue={filters.fragranceFamily ?? ""} className="h-10 rounded-lg border border-input bg-background px-3">
                <option value="">Toutes</option>
                {facets.fragranceFamilies.map((family) => (
                  <option key={family} value={family}>{family}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              Tri
              <select name="sort" defaultValue={filters.sort} className="h-10 rounded-lg border border-input bg-background px-3">
                <option value="newest">Nouveautés</option>
                <option value="price_asc">Prix croissant</option>
                <option value="price_desc">Prix décroissant</option>
              </select>
            </label>
            <input type="hidden" name="page" value="1" />
            <Button type="submit">Appliquer</Button>
            <Link href="/catalogue" className={buttonVariants({ variant: "outline" })}>Effacer les filtres</Link>
          </form>
        </aside>
        <section className="grid gap-5">
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
              href={buildHref(hrefParams, { page: String(Math.max(result.page - 1, 1)) })}
              className={buttonVariants({ variant: "outline" })}
              aria-disabled={result.page <= 1}
            >
              Précédent
            </Link>
            <div className="flex flex-wrap justify-center gap-2">
              {pages.map((pageNumber) => (
                <Link
                  key={pageNumber}
                  href={buildHref(hrefParams, { page: String(pageNumber) })}
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
              href={buildHref(hrefParams, { page: String(Math.min(result.page + 1, result.totalPages)) })}
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
