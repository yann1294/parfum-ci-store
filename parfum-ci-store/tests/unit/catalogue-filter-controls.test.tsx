import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CatalogueFilterControls } from "@/components/storefront/catalogue-filter-controls";
import {
  buildCatalogueUrl,
  clearCatalogueFilters,
  getDefaultCatalogueFilters,
  removeCatalogueFilter,
} from "@/lib/catalogue/catalogue-url";
import { normalizePublicCatalogueQuery } from "@/lib/catalogue/validation";

const push = vi.fn();
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
}));

const facets = {
  brands: [{ name: "Dior", slug: "dior" }],
  categories: [{ name: "Homme", slug: "men" }],
  fragranceFamilies: ["Boisée", "Aromatique"],
  genderCategories: ["Homme", "Unisexe"],
  concentrations: ["EDP", "EDT"],
  sizes: [50, 100],
};

const allFilters = normalizePublicCatalogueQuery({
  q: "Sauvage",
  brand: "dior",
  category: "men",
  genderCategory: "Homme",
  fragranceFamily: "Boisée",
  concentration: "EDP",
  sizeMl: "100",
  availability: "LOW_STOCK",
  sort: "price_desc",
  page: "2",
});

function controlValue(element: HTMLElement) {
  return (element as HTMLInputElement | HTMLSelectElement).value;
}

describe("catalogue URL filter helpers", () => {
  it("builds a clean canonical reset URL", () => {
    expect(clearCatalogueFilters()).toBe("/catalogue");
    expect(buildCatalogueUrl(getDefaultCatalogueFilters())).toBe("/catalogue");
  });

  it("sets every filter and clears all values back to the clean URL", () => {
    expect(buildCatalogueUrl(allFilters)).toBe(
      "/catalogue?page=2&q=Sauvage&brand=dior&category=men&fragranceFamily=Bois%C3%A9e&genderCategory=Homme&concentration=EDP&sizeMl=100&availability=LOW_STOCK&sort=price_desc",
    );
    expect(clearCatalogueFilters()).toBe("/catalogue");
  });

  it("removing one chip resets page to 1 and preserves other filters", () => {
    const href = removeCatalogueFilter(allFilters, "fragranceFamily");

    expect(href).not.toContain("fragranceFamily");
    expect(href).not.toContain("page=2");
    expect(href).toContain("q=Sauvage");
    expect(href).toContain("brand=dior");
    expect(href).toContain("category=men");
    expect(href).toContain("availability=LOW_STOCK");
  });
});

describe("CatalogueFilterControls", () => {
  beforeEach(() => {
    push.mockClear();
    replace.mockClear();
  });

  it("clears desktop controls, active chips, page, sort, and URL state", () => {
    render(<CatalogueFilterControls filters={allFilters} facets={facets} />);

    expect(controlValue(screen.getAllByLabelText("Recherche")[0])).toBe("Sauvage");
    expect(screen.getByText("Famille: Boisée")).toBeDefined();
    expect(screen.getByText("Disponibilité: Stock faible")).toBeDefined();

    fireEvent.click(screen.getAllByRole("button", { name: "Effacer les filtres" }).at(-1)!);

    expect(replace).toHaveBeenCalledWith("/catalogue");
    expect(controlValue(screen.getAllByLabelText("Recherche")[0])).toBe("");
    expect(controlValue(screen.getAllByLabelText("Marque")[0])).toBe("");
    expect(controlValue(screen.getAllByLabelText("Catégorie")[0])).toBe("");
    expect(controlValue(screen.getAllByLabelText("Public cible")[0])).toBe("");
    expect(controlValue(screen.getAllByLabelText("Famille olfactive")[0])).toBe("");
    expect(controlValue(screen.getAllByLabelText("Concentration")[0])).toBe("");
    expect(controlValue(screen.getAllByLabelText("Taille")[0])).toBe("");
    expect(controlValue(screen.getAllByLabelText("Disponibilité")[0])).toBe("");
    expect(controlValue(screen.getAllByLabelText("Tri")[0])).toBe("newest");
  });

  it("submits controlled field state to a normalized URL and resets page to 1", () => {
    render(<CatalogueFilterControls filters={getDefaultCatalogueFilters()} facets={facets} />);

    fireEvent.change(screen.getAllByLabelText("Recherche")[0], { target: { value: "Libre" } });
    fireEvent.change(screen.getAllByLabelText("Catégorie")[0], { target: { value: "men" } });
    fireEvent.change(screen.getAllByLabelText("Marque")[0], { target: { value: "dior" } });
    fireEvent.change(screen.getAllByLabelText("Famille olfactive")[0], { target: { value: "Boisée" } });
    fireEvent.change(screen.getAllByLabelText("Taille")[0], { target: { value: "100" } });
    fireEvent.change(screen.getAllByLabelText("Disponibilité")[0], { target: { value: "LOW_STOCK" } });
    fireEvent.change(screen.getAllByLabelText("Tri")[0], { target: { value: "price_asc" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Appliquer" }).at(-1)!);

    expect(push).toHaveBeenCalledWith(
      "/catalogue?q=Libre&brand=dior&category=men&fragranceFamily=Bois%C3%A9e&sizeMl=100&availability=LOW_STOCK&sort=price_asc",
    );
  });

  it("chip href removes only one filter and clears chips when filters are empty after navigation", () => {
    const { rerender } = render(<CatalogueFilterControls filters={allFilters} facets={facets} />);

    expect(screen.getByText("Famille: Boisée").closest("a")?.getAttribute("href")).toContain(
      "brand=dior",
    );
    expect(screen.getByText("Famille: Boisée").closest("a")?.getAttribute("href")).not.toContain(
      "fragranceFamily",
    );

    rerender(<CatalogueFilterControls filters={getDefaultCatalogueFilters()} facets={facets} />);
    expect(screen.queryByLabelText("Filtres actifs")).toBeNull();
  });
});
