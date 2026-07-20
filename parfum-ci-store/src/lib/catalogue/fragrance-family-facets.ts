import type { PublicProductDto } from "@/lib/catalogue/types";

export type FragranceFamilyFacet = {
  family: string;
  count: number;
  href: string;
};

export function aggregateFragranceFamilyFacets(products: PublicProductDto[], limit = 6): FragranceFamilyFacet[] {
  const counts = new Map<string, number>();
  for (const product of products) {
    if (!product.fragranceFamily) continue;
    counts.set(product.fragranceFamily, (counts.get(product.fragranceFamily) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([family, count]) => ({
      family,
      count,
      href: `/catalogue?fragranceFamily=${encodeURIComponent(family)}`,
    }))
    .sort((a, b) => b.count - a.count || a.family.localeCompare(b.family, "fr"))
    .slice(0, limit);
}
