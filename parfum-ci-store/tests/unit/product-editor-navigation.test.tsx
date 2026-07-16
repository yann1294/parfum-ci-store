import { fireEvent, render, screen } from "@testing-library/react";
import { act } from "react";
import { describe, expect, it, vi } from "vitest";

import { ProductEditorHeader } from "@/components/admin/catalogue/product-editor-header";
import { ProductList } from "@/components/admin/catalogue/product-list";
import { DEFAULT_PRODUCT_RETURN_PATH, getSafeProductReturnPath } from "@/lib/catalogue/product-return";
import type { AdminProduct } from "@/lib/catalogue/admin";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const product: AdminProduct = {
  id: "product-id",
  name: "Musc Royal",
  slug: "musc-royal",
  shortDescription: null,
  description: "Description",
  fragranceFamily: null,
  topNotes: [],
  heartNotes: [],
  baseNotes: [],
  genderCategory: null,
  status: "DRAFT",
  featured: false,
  seoTitle: null,
  seoDescription: null,
  brandId: null,
  brandName: "Maison CI",
  categoryId: null,
  categoryName: "Boisé",
  variants: [],
  images: [],
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("product editor navigation", () => {
  it("validates product-list return paths", () => {
    expect(getSafeProductReturnPath(null)).toBe(DEFAULT_PRODUCT_RETURN_PATH);
    expect(getSafeProductReturnPath("/admin/produits?page=2&status=DRAFT")).toBe(
      "/admin/produits?page=2&status=DRAFT",
    );
    expect(getSafeProductReturnPath("https://evil.example/admin/produits")).toBe(DEFAULT_PRODUCT_RETURN_PATH);
    expect(getSafeProductReturnPath("//evil.example/admin/produits")).toBe(DEFAULT_PRODUCT_RETURN_PATH);
    expect(getSafeProductReturnPath("%E0%A4%A")).toBe(DEFAULT_PRODUCT_RETURN_PATH);
    expect(getSafeProductReturnPath("/admin/produits/product-id")).toBe(DEFAULT_PRODUCT_RETURN_PATH);
  });

  it("renders breadcrumb and deterministic return action", () => {
    push.mockClear();
    render(<ProductEditorHeader product={product} returnPath="/admin/produits?page=2" />);

    expect(screen.getByRole("navigation", { name: "Fil d'Ariane" })).toBeDefined();
    expect(screen.getAllByText("Produits").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Musc Royal").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Retour aux produits" }));
    expect(push).toHaveBeenCalledWith("/admin/produits?page=2");
  });

  it("intercepts return navigation when the product form is dirty", () => {
    push.mockClear();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<ProductEditorHeader product={product} returnPath="/admin/produits" />);

    act(() => {
      window.dispatchEvent(new CustomEvent("product-editor-dirty-change", { detail: { dirty: true } }));
    });
    fireEvent.click(screen.getByRole("button", { name: "Retour aux produits" }));

    expect(confirm).toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    confirm.mockRestore();
  });

  it("navigates without a false warning after saved state is published", () => {
    push.mockClear();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<ProductEditorHeader product={product} returnPath="/admin/produits" />);

    act(() => {
      window.dispatchEvent(new CustomEvent("product-editor-dirty-change", { detail: { dirty: true } }));
      window.dispatchEvent(new CustomEvent("product-editor-dirty-change", { detail: { dirty: false } }));
    });
    fireEvent.click(screen.getByRole("button", { name: "Retour aux produits" }));

    expect(confirm).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/admin/produits");
    confirm.mockRestore();
  });

  it("preserves valid list context in product list links", () => {
    render(
      <ProductList
        products={[product]}
        page={2}
        totalPages={3}
        returnPath="/admin/produits?page=2&status=DRAFT&q=musc"
      />,
    );

    const href = screen.getAllByRole("link", { name: "Ouvrir" })[0].getAttribute("href");
    expect(href).toBe(
      "/admin/produits/product-id?retour=%2Fadmin%2Fproduits%3Fpage%3D2%26status%3DDRAFT%26q%3Dmusc",
    );
  });
});
