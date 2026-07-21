import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  inventoryStateLabel,
  variantStateLabel,
  VariantEditor,
} from "@/components/admin/catalogue/variant-editor";
import type { AdminProduct, AdminVariant, PaginatedResult } from "@/lib/catalogue/admin";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock("@/app/admin/catalogue-actions", () => ({
  createVariantFromForm: vi.fn(),
  initializeVariantInventoryFromForm: vi.fn(),
  updateVariantFromForm: vi.fn(),
}));

const { updateVariantFromForm } = await import("@/app/admin/catalogue-actions");

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
    inventoryInitialized: true,
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
    inventoryInitialized: true,
  },
  {
    id: "variant-3",
    productId: "product-id",
    sku: "SKU-003-WITH-A-VERY-LONG-MANUAL-TEST-IDENTIFIER-THAT-MUST-REMAIN-READABLE",
    sizeMl: 30,
    concentration: "EDP",
    priceXof: 15000,
    compareAtPriceXof: null,
    costPriceXof: null,
    stockOnHand: 0,
    reservedQuantity: 0,
    availableQuantity: 0,
    lowStockThreshold: 2,
    availabilityStatus: "UNCONFIGURED",
    active: false,
    inventoryInitialized: false,
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
  beforeEach(() => {
    refresh.mockClear();
    vi.mocked(updateVariantFromForm).mockReset();
  });

  it("keeps variant state separate from inventory state", () => {
    expect(variantStateLabel({ active: false })).toBe("Inactive");
    expect(inventoryStateLabel({ availabilityStatus: "UNCONFIGURED", inventoryInitialized: false })).toBe(
      "Stock non configuré",
    );
    expect(inventoryStateLabel({ availabilityStatus: "OUT_OF_STOCK", inventoryInitialized: true })).toBe(
      "Rupture de stock",
    );
  });

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
    expect(screen.getAllByText("Statut variante").length).toBeGreaterThan(0);
    expect(screen.getAllByText("État du stock").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Inactive").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Stock non configuré").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("variant-responsive-cards").length).toBeGreaterThan(0);
    expect(screen.queryByText("Coût")).toBeNull();
    expect(screen.queryByRole("link", { name: /gérer le stock/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /ajouter une variante/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /modifier/i })).toBeNull();
  });

  it("renders a wide-table surface and a narrow-container card fallback with critical values", () => {
    render(
      <VariantEditor
        product={product}
        variants={result()}
        canMutate
        canViewCostPrice
        searchParams={{}}
      />,
    );

    expect(screen.getByTestId("variant-wide-table")).toBeDefined();
    expect(screen.getByTestId("variant-responsive-cards")).toBeDefined();
    expect(screen.getByText(/Faites défiler horizontalement/)).toBeDefined();
    expect(screen.getAllByTitle("SKU-003-WITH-A-VERY-LONG-MANUAL-TEST-IDENTIFIER-THAT-MUST-REMAIN-READABLE").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/25.000 F CFA/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Disponible").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Modifier" }).length).toBeGreaterThanOrEqual(3);
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

  it("refreshes server-rendered variant data after a successful update without losing pagination params", async () => {
    vi.mocked(updateVariantFromForm).mockResolvedValue({
      ok: true,
      data: {
        id: "variant-1",
        sku: "SKU-001",
        sizeMl: 50,
        concentration: "EDP",
        priceXof: 25000,
        compareAtPriceXof: null,
        availableQuantity: 5,
        availabilityStatus: "IN_STOCK",
        inventoryInitialized: true,
      },
    });

    render(
      <VariantEditor
        product={product}
        variants={{ ...result(), page: 2, totalPages: 3 }}
        canMutate
        canViewCostPrice
        searchParams={{ variantQ: "SKU", variantPage: "2", unrelated: "ignored" }}
      />,
    );

    expect(screen.getByRole("link", { name: "Précédent" }).getAttribute("href")).toContain(
      "variantQ=SKU",
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Modifier" })[0]);
    const form = screen.getByLabelText("SKU").closest("form");
    expect(form).toBeTruthy();
    fireEvent.submit(form!);

    await waitFor(() =>
      expect(updateVariantFromForm).toHaveBeenCalledWith("variant-1", "product-id", expect.any(FormData)),
    );
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
