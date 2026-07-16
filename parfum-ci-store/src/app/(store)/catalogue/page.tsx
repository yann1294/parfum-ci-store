import Link from "next/link";
import type { Metadata } from "next";

import { EmptyState } from "@/components/shared/empty-state";
import { PageContainer } from "@/components/shared/page-container";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button, buttonVariants } from "@/components/ui/button";
import { ProductCard } from "@/components/storefront/product-card";
import { listActiveProducts, listPublicFacets } from "@/lib/catalogue/products";
import { targetAudienceOptions } from "@/lib/catalogue/validation";

export const metadata: Metadata = {
  title: "Catalogue",
  description: "Découvrez les parfums disponibles en Côte d'Ivoire.",
  alternates: { canonical: "/catalogue" },
};

function parsePage(value: string | undefined) {
  const page = value ? Number.parseInt(value, 10) : 1;
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function buildHref(params: Record<string, string | undefined>, patch: Record<string, string | undefined>) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...params, ...patch })) {
    if (value) next.set(key, value);
  }
  return `/catalogue?${next.toString()}`;
}

export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const page = parsePage(params.page);
  const filters = {
    page,
    pageSize: 12,
    search: params.q,
    brandSlug: params.brand,
    categorySlug: params.category,
    fragranceFamily: params.fragranceFamily,
    genderCategory: targetAudienceOptions.includes(params.genderCategory as never)
      ? (params.genderCategory as (typeof targetAudienceOptions)[number])
      : undefined,
    concentration: params.concentration,
    sizeMl: params.sizeMl ? Number.parseInt(params.sizeMl, 10) : undefined,
    availability: params.availability as "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | undefined,
    sort: (params.sort as "newest" | "price_asc" | "price_desc" | undefined) ?? "newest",
  };
  const [products, facets] = await Promise.all([listActiveProducts(filters), listPublicFacets()]);

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
              <input name="q" defaultValue={params.q} className="h-10 rounded-lg border border-input bg-background px-3" />
            </label>
            <label className="grid gap-1 text-sm">
              Marque
              <select name="brand" defaultValue={params.brand ?? ""} className="h-10 rounded-lg border border-input bg-background px-3">
                <option value="">Toutes</option>
                {facets.brands.map((brand) => (
                  <option key={brand.slug} value={brand.slug}>{brand.name}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              Catégorie
              <select name="category" defaultValue={params.category ?? ""} className="h-10 rounded-lg border border-input bg-background px-3">
                <option value="">Toutes</option>
                {facets.categories.map((category) => (
                  <option key={category.slug} value={category.slug}>{category.name}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              Public cible
              <select name="genderCategory" defaultValue={params.genderCategory ?? ""} className="h-10 rounded-lg border border-input bg-background px-3">
                <option value="">Tous</option>
                {targetAudienceOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              Famille olfactive
              <select name="fragranceFamily" defaultValue={params.fragranceFamily ?? ""} className="h-10 rounded-lg border border-input bg-background px-3">
                <option value="">Toutes</option>
                {facets.fragranceFamilies.map((family) => (
                  <option key={family} value={family}>{family}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              Tri
              <select name="sort" defaultValue={params.sort ?? "newest"} className="h-10 rounded-lg border border-input bg-background px-3">
                <option value="newest">Nouveautés</option>
                <option value="price_asc">Prix croissant</option>
                <option value="price_desc">Prix décroissant</option>
              </select>
            </label>
            <Button type="submit">Appliquer</Button>
            <Link href="/catalogue" className={buttonVariants({ variant: "outline" })}>Effacer les filtres</Link>
          </form>
        </aside>
        <section className="grid gap-5">
          <p className="text-sm text-muted-foreground">{products.length} résultat(s) sur cette page.</p>
          {products.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
          ) : (
            <EmptyState title="Aucun parfum trouvé" description="Essayez de retirer un filtre ou de modifier votre recherche." />
          )}
          <nav className="flex justify-between" aria-label="Pagination catalogue">
            <Link href={buildHref(params, { page: String(Math.max(page - 1, 1)) })} className={buttonVariants({ variant: "outline" })} aria-disabled={page <= 1}>
              Précédent
            </Link>
            <Link href={buildHref(params, { page: String(page + 1) })} className={buttonVariants({ variant: "outline" })}>
              Suivant
            </Link>
          </nav>
        </section>
      </div>
    </PageContainer>
  );
}
