"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  buildCatalogueUrl,
  clearCatalogueFilters,
  getDefaultCatalogueFilters,
  removeCatalogueFilter,
} from "@/lib/catalogue/catalogue-url";
import { targetAudienceOptions, type CatalogueQueryInput } from "@/lib/catalogue/validation";
import { cn } from "@/lib/utils";

type CatalogueFacets = {
  brands: { name: string; slug: string }[];
  categories: { name: string; slug: string }[];
  fragranceFamilies: string[];
  genderCategories: string[];
  concentrations: string[];
  sizes: number[];
};

type CatalogueFilterControlsProps = {
  filters: CatalogueQueryInput;
  facets: CatalogueFacets;
};

type DraftFilters = {
  search: string;
  brandSlug: string;
  categorySlug: string;
  genderCategory: string;
  fragranceFamily: string;
  concentration: string;
  sizeMl: string;
  availability: string;
  sort: CatalogueQueryInput["sort"];
};

const availabilityOptions = [
  { value: "UNCONFIGURED", label: "Stock non configuré" },
  { value: "IN_STOCK", label: "En stock" },
  { value: "LOW_STOCK", label: "Stock faible" },
  { value: "OUT_OF_STOCK", label: "Rupture de stock" },
] as const;

const sortOptions = [
  { value: "newest", label: "Nouveautés" },
  { value: "price_asc", label: "Prix croissant" },
  { value: "price_desc", label: "Prix décroissant" },
] as const;

function filtersToDraft(filters: CatalogueQueryInput): DraftFilters {
  return {
    search: filters.search ?? "",
    brandSlug: filters.brandSlug ?? "",
    categorySlug: filters.categorySlug ?? "",
    genderCategory: filters.genderCategory ?? "",
    fragranceFamily: filters.fragranceFamily ?? "",
    concentration: filters.concentration ?? "",
    sizeMl: filters.sizeMl ? String(filters.sizeMl) : "",
    availability: filters.availability ?? "",
    sort: filters.sort,
  };
}

function draftToUrl(draft: DraftFilters) {
  return buildCatalogueUrl({
    search: draft.search || undefined,
    brandSlug: draft.brandSlug || undefined,
    categorySlug: draft.categorySlug || undefined,
    genderCategory: (draft.genderCategory || undefined) as CatalogueQueryInput["genderCategory"],
    fragranceFamily: draft.fragranceFamily || undefined,
    concentration: draft.concentration || undefined,
    sizeMl: draft.sizeMl ? Number.parseInt(draft.sizeMl, 10) : undefined,
    availability: (draft.availability || undefined) as CatalogueQueryInput["availability"],
    sort: draft.sort,
    page: 1,
  });
}

function hasActiveFilters(filters: CatalogueQueryInput) {
  return Boolean(
    filters.search ||
      filters.brandSlug ||
      filters.categorySlug ||
      filters.genderCategory ||
      filters.fragranceFamily ||
      filters.concentration ||
      filters.sizeMl ||
      filters.availability ||
      filters.sort !== "newest" ||
      filters.page > 1,
  );
}

function activeChips(filters: CatalogueQueryInput, facets: CatalogueFacets) {
  const chips: Array<{ key: keyof DraftFilters; label: string; href: string }> = [];
  const brand = facets.brands.find((item) => item.slug === filters.brandSlug);
  const category = facets.categories.find((item) => item.slug === filters.categorySlug);
  const availability = availabilityOptions.find((item) => item.value === filters.availability);
  const sort = sortOptions.find((item) => item.value === filters.sort);

  if (filters.search) chips.push({ key: "search", label: `Recherche: ${filters.search}`, href: removeCatalogueFilter(filters, "search") });
  if (filters.brandSlug) chips.push({ key: "brandSlug", label: `Marque: ${brand?.name ?? filters.brandSlug}`, href: removeCatalogueFilter(filters, "brandSlug") });
  if (filters.categorySlug) chips.push({ key: "categorySlug", label: `Catégorie: ${category?.name ?? filters.categorySlug}`, href: removeCatalogueFilter(filters, "categorySlug") });
  if (filters.genderCategory) chips.push({ key: "genderCategory", label: `Public cible: ${filters.genderCategory}`, href: removeCatalogueFilter(filters, "genderCategory") });
  if (filters.fragranceFamily) chips.push({ key: "fragranceFamily", label: `Famille: ${filters.fragranceFamily}`, href: removeCatalogueFilter(filters, "fragranceFamily") });
  if (filters.concentration) chips.push({ key: "concentration", label: `Concentration: ${filters.concentration}`, href: removeCatalogueFilter(filters, "concentration") });
  if (filters.sizeMl) chips.push({ key: "sizeMl", label: `Taille: ${filters.sizeMl} ml`, href: removeCatalogueFilter(filters, "sizeMl") });
  if (filters.availability) chips.push({ key: "availability", label: `Disponibilité: ${availability?.label ?? filters.availability}`, href: removeCatalogueFilter(filters, "availability") });
  if (filters.sort !== "newest") chips.push({ key: "sort", label: `Tri: ${sort?.label ?? filters.sort}`, href: removeCatalogueFilter(filters, "sort") });

  return chips;
}

export function CatalogueFilterControls(props: CatalogueFilterControlsProps) {
  return <CatalogueFilterControlsState key={buildCatalogueUrl(props.filters)} {...props} />;
}

function CatalogueFilterControlsState({ filters, facets }: CatalogueFilterControlsProps) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState(() => filtersToDraft(filters));
  const chips = useMemo(() => activeChips(filters, facets), [facets, filters]);
  const clearHref = clearCatalogueFilters();

  function setField<Key extends keyof DraftFilters>(key: Key, value: DraftFilters[Key]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function submitFilters() {
    router.push(draftToUrl(draft));
    setSheetOpen(false);
  }

  function resetFilters() {
    setDraft(filtersToDraft(getDefaultCatalogueFilters()));
    router.replace(clearHref);
    setSheetOpen(false);
  }

  return (
    <div className="grid gap-4" data-testid="catalogue-filter-controls">
      <div className="flex items-center justify-between gap-3 lg:hidden">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger render={<Button type="button" variant="outline" />}>
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            Filtres
          </SheetTrigger>
          <SheetContent side="right" className="w-[min(26rem,calc(100vw-1rem))] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filtres catalogue</SheetTitle>
            </SheetHeader>
            <FilterFields draft={draft} facets={facets} onChange={setField} className="px-4" />
            <SheetFooter className="border-t">
              <Button type="button" onClick={submitFilters}>Appliquer</Button>
              <Button type="button" variant="outline" onClick={resetFilters}>Effacer les filtres</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
        <Button type="button" variant="ghost" onClick={resetFilters} disabled={!hasActiveFilters(filters)}>
          Effacer les filtres
        </Button>
      </div>

      <aside className="hidden rounded-lg border bg-surface p-4 lg:block">
        <div className="grid gap-4">
          <FilterFields draft={draft} facets={facets} onChange={setField} />
          <Button type="button" onClick={submitFilters}>Appliquer</Button>
          <Button type="button" variant="outline" onClick={resetFilters}>
            Effacer les filtres
          </Button>
        </div>
      </aside>

      {chips.length > 0 ? (
        <div className="flex flex-wrap gap-2" aria-label="Filtres actifs">
          {chips.map((chip) => (
            <Link
              key={chip.key}
              href={chip.href}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1")}
            >
              {chip.label}
              <X className="size-3" aria-hidden="true" />
              <span className="sr-only">Retirer</span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function FilterFields({
  draft,
  facets,
  onChange,
  className,
}: {
  draft: DraftFilters;
  facets: CatalogueFacets;
  onChange: <Key extends keyof DraftFilters>(key: Key, value: DraftFilters[Key]) => void;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-4", className)}>
      <label className="grid gap-1 text-sm">
        Recherche
        <input
          name="q"
          value={draft.search}
          onChange={(event) => onChange("search", event.target.value)}
          className="h-10 rounded-lg border border-input bg-background px-3"
        />
      </label>
      <label className="grid gap-1 text-sm">
        Marque
        <select
          name="brand"
          value={draft.brandSlug}
          onChange={(event) => onChange("brandSlug", event.target.value)}
          className="h-10 rounded-lg border border-input bg-background px-3"
        >
          <option value="">Toutes</option>
          {facets.brands.map((brand) => (
            <option key={brand.slug} value={brand.slug}>{brand.name}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        Catégorie
        <select
          name="category"
          value={draft.categorySlug}
          onChange={(event) => onChange("categorySlug", event.target.value)}
          className="h-10 rounded-lg border border-input bg-background px-3"
        >
          <option value="">Toutes</option>
          {facets.categories.map((category) => (
            <option key={category.slug} value={category.slug}>{category.name}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        Public cible
        <select
          name="genderCategory"
          value={draft.genderCategory}
          onChange={(event) => onChange("genderCategory", event.target.value)}
          className="h-10 rounded-lg border border-input bg-background px-3"
        >
          <option value="">Tous</option>
          {[...new Set([...facets.genderCategories, ...targetAudienceOptions])].map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        Famille olfactive
        <select
          name="fragranceFamily"
          value={draft.fragranceFamily}
          onChange={(event) => onChange("fragranceFamily", event.target.value)}
          className="h-10 rounded-lg border border-input bg-background px-3"
        >
          <option value="">Toutes</option>
          {facets.fragranceFamilies.map((family) => (
            <option key={family} value={family}>{family}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        Concentration
        <select
          name="concentration"
          value={draft.concentration}
          onChange={(event) => onChange("concentration", event.target.value)}
          className="h-10 rounded-lg border border-input bg-background px-3"
        >
          <option value="">Toutes</option>
          {facets.concentrations.map((concentration) => (
            <option key={concentration} value={concentration}>{concentration}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        Taille
        <select
          name="sizeMl"
          value={draft.sizeMl}
          onChange={(event) => onChange("sizeMl", event.target.value)}
          className="h-10 rounded-lg border border-input bg-background px-3"
        >
          <option value="">Toutes</option>
          {facets.sizes.map((size) => (
            <option key={size} value={size}>{size} ml</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        Disponibilité
        <select
          name="availability"
          value={draft.availability}
          onChange={(event) => onChange("availability", event.target.value)}
          className="h-10 rounded-lg border border-input bg-background px-3"
        >
          <option value="">Toutes</option>
          {availabilityOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        Tri
        <select
          name="sort"
          value={draft.sort}
          onChange={(event) => onChange("sort", event.target.value as DraftFilters["sort"])}
          className="h-10 rounded-lg border border-input bg-background px-3"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
