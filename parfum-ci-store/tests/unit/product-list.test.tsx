import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProductList } from "@/components/admin/catalogue/product-list";
import type { AdminProduct } from "@/lib/catalogue/admin";

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
  variants: [
    {
      id: "variant-id",
      productId: "product-id",
      sku: "SKU-1",
      sizeMl: 50,
      concentration: "EDP",
      priceXof: 25000,
      compareAtPriceXof: null,
      costPriceXof: null,
      stockOnHand: 4,
      reservedQuantity: 1,
      availableQuantity: 3,
      lowStockThreshold: 1,
      availabilityStatus: "IN_STOCK",
      active: true,
    },
  ],
  images: [],
  createdAt: new Date().toISOString(),
};

describe("admin product list", () => {
  it("renders status, XOF price, and no cost price", () => {
    render(<ProductList products={[product]} page={1} totalPages={1} />);

    expect(screen.getAllByText("Musc Royal").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Brouillon").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/25\s000 F CFA/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/cost/i)).toBeNull();
  });
});
