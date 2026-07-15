import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { VariantEditor } from "@/components/admin/catalogue/variant-editor";
import type { AdminProduct, AdminVariant, PaginatedResult } from "@/lib/catalogue/admin";

vi.mock("@/app/admin/catalogue-actions", () => ({
  createVariantFromForm: vi.fn(),
  updateVariantFromForm: vi.fn(),
}));

const product: AdminProduct = {
  id: "product-id",
  name: "Musc Royal",
  slug: "musc-royal",
  shortDescription: null,
  description: "Description",
  fragranceFamily: "Boisée",
  topNotes: [],
  heartNotes: [],
  baseNotes: [],
  genderCategory: "Unisexe",
  status: "DRAFT",
  featured: false,
  seoTitle: null,
  seoDescription: null,
  brandId: null,
  brandName: null,
  categoryId: null,
  categoryName: null,
  variants: [],
  images: [],
  createdAt: "2026-01-01T00:00:00.000Z",
};

const variants: AdminVariant[] = [
  {
    id: "variant-1",
    productId: "product-id",
    sku: "SKU-001",
    sizeMl: 50,
    concentration: "EDP",
    priceXof: 25000,
    compareAtPriceXof: null,
    costPriceXof: 12000,
    stockOnHand: 7,
    reservedQuantity: 2,
    availableQuantity: 5,
    lowStockThreshold: 3,
    availabilityStatus: "IN_STOCK",
    active: true,
  },
  {
    id: "variant-2",
    productId: "product-id",
    sku: "SKU-002",
    sizeMl: 100,
    concentration: "Extrait",
    priceXof: 45000,
    compareAtPriceXof: null,
    costPriceXof: 20000,
    stockOnHand: 1,
    reservedQuantity: 1,
    availableQuantity: 0,
    lowStockThreshold: 2,
    availabilityStatus: "OUT_OF_STOCK",
    active: true,
  },
];

function result(items = variants): PaginatedResult<AdminVariant> {
  return {
    items,
    page: 1,
    pageSize: 10,
    total: items.length,
    totalPages: 1,
  };
}

describe("VariantEditor", () => {
  it("shows inventory-manager stock summaries as read-only without a broken stock link", () => {
    render(
      <VariantEditor
        product={product}
        variants={result()}
        canMutate={false}
        canViewCostPrice={false}
        searchParams={{}}
      />,
    );

    expect(screen.getByText("Les quantités sont gérées depuis le module Inventaire.")).toBeDefined();
    expect(screen.getAllByText("SKU-001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Stock physique").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Réservé").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Disponible").length).toBeGreaterThan(0);
    expect(screen.queryByText("Coût")).toBeNull();
    expect(screen.queryByRole("link", { name: /gérer le stock/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /ajouter une variante/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /modifier/i })).toBeNull();
  });

  it("does not render edit forms for all variants until a dialog is opened", async () => {
    render(
      <VariantEditor
        product={product}
        variants={result()}
        canMutate
        canViewCostPrice
        searchParams={{}}
      />,
    );

    expect(screen.queryByLabelText("SKU")).toBeNull();
    expect(screen.getAllByRole("button", { name: "Modifier" }).length).toBeGreaterThanOrEqual(2);

    fireEvent.click(screen.getAllByRole("button", { name: "Modifier" })[0]);

    expect(await screen.findByRole("dialog")).toBeDefined();
    expect(screen.getByLabelText("SKU")).toBeDefined();
    expect(screen.getByDisplayValue("SKU-001")).toBeDefined();
    expect(screen.getByLabelText("Coût XOF")).toBeDefined();
  });
});
