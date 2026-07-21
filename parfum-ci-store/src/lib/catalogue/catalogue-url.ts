import {
  normalizePublicCatalogueQuery,
  type CatalogueQueryInput,
} from "@/lib/catalogue/validation";

export const CATALOGUE_PATH = "/catalogue";

export type CatalogueUrlPatch = Partial<
  Pick<
    CatalogueQueryInput,
    | "search"
    | "brandSlug"
    | "categorySlug"
    | "genderCategory"
    | "fragranceFamily"
    | "concentration"
    | "sizeMl"
    | "availability"
    | "sort"
    | "page"
  >
>;

export function getDefaultCatalogueFilters(): CatalogueQueryInput {
  return normalizePublicCatalogueQuery({});
}

export function catalogueFiltersToParams(filters: CatalogueQueryInput) {
  return {
    page: filters.page > 1 ? String(filters.page) : undefined,
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

export function buildCatalogueUrl(input: CatalogueUrlPatch = {}) {
  const filters = normalizePublicCatalogueQuery(input);
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(catalogueFiltersToParams(filters))) {
    if (value) params.set(key, value);
  }

  const query = params.toString();
  return query ? `${CATALOGUE_PATH}?${query}` : CATALOGUE_PATH;
}

export function clearCatalogueFilters() {
  return CATALOGUE_PATH;
}

export function removeCatalogueFilter(
  filters: CatalogueQueryInput,
  key: keyof Omit<CatalogueUrlPatch, "page">,
) {
  return buildCatalogueUrl({ ...filters, [key]: undefined, page: 1 });
}
