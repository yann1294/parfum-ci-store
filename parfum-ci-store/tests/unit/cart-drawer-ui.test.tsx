import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CartSummaryLink } from "@/components/storefront/cart-summary-link";
import {
  CART_SCHEMA_VERSION,
  clearCartForTests,
  readCart,
  writeCart,
} from "@/lib/storefront/cart";
import type { ReconciledCart } from "@/lib/storefront/cart-reconciliation-core";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const productId = "11111111-1111-4111-8111-111111111111";
const variantId = "22222222-2222-4222-8222-222222222222";

const snapshot: ReconciledCart = {
  lines: [
    {
      productId,
      productSlug: "sauvage",
      productName: "Sauvage",
      brandName: "Dior",
      variantId,
      variantLabel: "100 ml · EDP",
      sizeMl: 100,
      concentration: "EDP",
      imageUrl: null,
      imageAlt: "Sauvage",
      unitPriceXof: 95000,
      compareAtPriceXof: null,
      availability: "AVAILABLE",
      orderable: true,
      unavailableReason: null,
      requestedQuantity: 2,
      adjustedQuantity: 2,
      maxQuantity: 8,
      notices: [],
    },
  ],
  subtotalXof: 190000,
  readiness: "READY",
  validatedAt: "2026-07-23T00:00:00.000Z",
};

function seedCart() {
  writeCart({
    version: CART_SCHEMA_VERSION,
    items: [{ productId, variantId, quantity: 2 }],
    attribution: null,
    updatedAt: "2026-07-23T00:00:00.000Z",
  });
}

describe("CartSummaryLink drawer navigation", () => {
  beforeEach(() => {
    clearCartForTests();
    push.mockClear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json(snapshot)),
    );
  });

  it("opens the drawer and keeps cart items present", async () => {
    seedCart();
    render(<CartSummaryLink />);

    fireEvent.click(screen.getByRole("button", { name: /ouvrir le panier/i }));

    expect(await screen.findByRole("dialog")).toBeDefined();
    expect(await screen.findByText("Sauvage")).toBeDefined();
    expect(readCart().items).toHaveLength(1);
  });

  it("closes the drawer, releases overlay state, and navigates to /panier", async () => {
    seedCart();
    render(<CartSummaryLink />);

    fireEvent.click(screen.getByRole("button", { name: /ouvrir le panier/i }));
    expect(await screen.findByRole("dialog")).toBeDefined();
    fireEvent.click(await screen.findByRole("button", { name: "Voir le panier" }));

    expect(push).toHaveBeenCalledWith("/panier");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.querySelector("[data-slot='sheet-overlay']")).toBeNull());
    expect(document.body.style.overflow).not.toBe("hidden");
    expect(readCart().items).toEqual([{ productId, variantId, quantity: 2 }]);
  });

  it("does not reopen after browser navigation and can be opened again", async () => {
    seedCart();
    render(<CartSummaryLink />);

    fireEvent.click(screen.getByRole("button", { name: /ouvrir le panier/i }));
    expect(await screen.findByRole("dialog")).toBeDefined();
    fireEvent.click(await screen.findByRole("button", { name: "Voir le panier" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /ouvrir le panier/i }));
    expect(await screen.findByRole("dialog")).toBeDefined();
    expect(await screen.findByText("Sauvage")).toBeDefined();
  });
});
