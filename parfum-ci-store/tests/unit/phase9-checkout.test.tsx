import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CheckoutPageClient } from "@/components/storefront/checkout-page-client";
import { OrderConfirmationClient } from "@/components/storefront/order-confirmation-client";
import {
  cartMaterialSignature,
  createCheckoutIdempotencyKey,
  readSafeConfirmation,
  storeSafeConfirmation,
} from "@/lib/orders/checkout-client";
import {
  deliveryMethodLabel,
  maskPhone,
  orderStatusLabel,
  paymentMethodLabel,
  paymentStatusLabel,
  type PaymentInstructionSettings,
} from "@/lib/orders/display";
import { CART_SCHEMA_VERSION, clearCartForTests, readCart, writeCart } from "@/lib/storefront/cart";
import type { ReconciledCart } from "@/lib/storefront/cart-reconciliation-core";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const productId = "11111111-1111-4111-8111-111111111111";
const variantId = "22222222-2222-4222-8222-222222222222";

const settings: PaymentInstructionSettings & {
  enabledPaymentMethods: Array<"CASH_ON_DELIVERY" | "ORANGE_MONEY">;
  enabledDeliveryMethods: Array<"HOME_DELIVERY" | "PICKUP">;
} = {
  storeName: "Parfum CI",
  legalName: "Parfum CI SARL",
  contactEmail: "contact@example.com",
  contactPhone: "+2250700000000",
  whatsappNumber: "2250700000000",
  orangeMoneyNumber: "0700000000",
  mtnMomoNumber: null,
  waveNumber: null,
  moovMoneyNumber: null,
  deliveryInformation: "Livraison à confirmer.",
  deliveryContent: {
    mobileMoneyDescription: "Paiement vérifié manuellement.",
    cashOnDeliveryConditions: "Paiement à la livraison selon confirmation.",
    pickupInformation: "Retrait selon confirmation.",
    orderConfirmationProcess: "Confirmation manuelle.",
  },
  enabledPaymentMethods: ["CASH_ON_DELIVERY", "ORANGE_MONEY"],
  enabledDeliveryMethods: ["HOME_DELIVERY", "PICKUP"],
};

const readySnapshot: ReconciledCart = {
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
      requestedQuantity: 1,
      adjustedQuantity: 1,
      maxQuantity: 8,
      notices: [],
    },
  ],
  subtotalXof: 95000,
  readiness: "READY",
  validatedAt: "2026-07-27T00:00:00.000Z",
};

function seedCart() {
  writeCart({
    version: CART_SCHEMA_VERSION,
    items: [{ productId, variantId, quantity: 1 }],
    attribution: null,
    updatedAt: "2026-07-27T00:00:00.000Z",
  });
}

describe("Phase 9 checkout helpers", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("uses stable material cart signatures and high-entropy idempotency keys", () => {
    seedCart();
    const key = createCheckoutIdempotencyKey();
    expect(key).toMatch(/^checkout-/);
    expect(key.length).toBeGreaterThan(60);
    expect(cartMaterialSignature(readCart())).toContain(variantId);
  });

  it("stores safe confirmation without the internal order UUID", () => {
    storeSafeConfirmation({
      confirmation: {
        orderNumber: "CMD-2026-A1B2C3",
        orderStatus: "PENDING_CONFIRMATION",
        paymentStatus: "UNPAID",
        currency: "XOF",
        subtotalXof: 95000,
        deliveryFeeXof: 0,
        totalXof: 95000,
        createdAt: "2026-07-27T00:00:00.000Z",
        items: [{ productName: "Sauvage", variantLabel: "100 ml · EDP", quantity: 1, unitPriceXof: 95000, lineTotalXof: 95000 }],
        nextStepCode: "PENDING_CONFIRMATION",
      },
      deliveryMethod: "HOME_DELIVERY",
      paymentMethod: "CASH_ON_DELIVERY",
      customerPhone: "+2250700000000",
    });

    const stored = readSafeConfirmation("CMD-2026-A1B2C3");
    expect(stored?.orderNumber).toBe("CMD-2026-A1B2C3");
    expect(JSON.stringify(stored)).not.toContain("44444444");
  });

  it("maps customer-facing order labels in French", () => {
    expect(orderStatusLabel("PENDING_CONFIRMATION")).toBe("En attente de confirmation");
    expect(paymentStatusLabel("PENDING")).toBe("Paiement en attente de vérification");
    expect(paymentMethodLabel("ORANGE_MONEY")).toBe("Orange Money");
    expect(deliveryMethodLabel("HOME_DELIVERY")).toBe("Livraison à domicile");
    expect(maskPhone("+2250700000012")).toContain("12");
  });
});

describe("Phase 9 checkout form", () => {
  beforeEach(() => {
    clearCartForTests();
    window.sessionStorage.clear();
    push.mockClear();
  });

  it("submits only the Phase 8 intent contract and clears the cart after success", async () => {
    seedCart();
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/cart/reconcile") return Response.json(readySnapshot);
      if (url === "/api/orders") {
        const body = JSON.parse(String(init?.body));
        expect(body.lines).toEqual([{ productId, variantId, quantity: 1 }]);
        expect(body.customer.fullName).toBe("Awa Kone");
        expect(body.customer.phone).toBe("+225 07 00 00 00 00");
        expect(body.deliveryMethod).toBe("HOME_DELIVERY");
        expect(body.paymentMethod).toBe("CASH_ON_DELIVERY");
        expect(JSON.stringify(body)).not.toContain("Sauvage");
        expect(JSON.stringify(body)).not.toContain("95000");
        expect(JSON.stringify(body)).not.toContain("EDP");
        return Response.json(
          {
            orderId: "44444444-4444-4444-8444-444444444444",
            orderNumber: "CMD-2026-A1B2C3",
            orderStatus: "PENDING_CONFIRMATION",
            paymentStatus: "UNPAID",
            currency: "XOF",
            subtotalXof: 95000,
            deliveryFeeXof: 0,
            totalXof: 95000,
            createdAt: "2026-07-27T00:00:00.000Z",
            items: [{ productName: "Sauvage", variantLabel: "100 ml · EDP", quantity: 1, unitPriceXof: 95000, lineTotalXof: 95000 }],
            nextStepCode: "PENDING_CONFIRMATION",
          },
          { status: 201 },
        );
      }
      throw new Error(`Unexpected ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<CheckoutPageClient settings={settings} />);
    expect(await screen.findByText("Sauvage")).toBeDefined();

    fireEvent.change(screen.getByLabelText("Nom complet"), { target: { value: "Awa Kone" } });
    fireEvent.change(screen.getByLabelText("Téléphone"), { target: { value: "+225 07 00 00 00 00" } });
    fireEvent.change(screen.getByLabelText("Commune ou quartier"), { target: { value: "Cocody" } });
    fireEvent.click(screen.getByLabelText(/J'accepte les conditions/i));
    fireEvent.click(screen.getByRole("button", { name: "Envoyer la commande" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/commande/succes/CMD-2026-A1B2C3"));
    expect(readCart().items).toHaveLength(0);
    expect(readSafeConfirmation("CMD-2026-A1B2C3")?.orderNumber).toBe("CMD-2026-A1B2C3");
  });

  it("blocks checkout when the authoritative cart is not ready", async () => {
    seedCart();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          ...readySnapshot,
          readiness: "HAS_UNAVAILABLE_ITEMS",
          lines: [{ ...readySnapshot.lines[0], orderable: false, availability: "OUT_OF_STOCK" }],
        }),
      ),
    );

    render(<CheckoutPageClient settings={settings} />);

    expect(await screen.findByText(/Panier à vérifier/i)).toBeDefined();
    expect((screen.getByRole("button", { name: "Envoyer la commande" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("renders generic confirmation on direct visit without session proof", async () => {
    render(<OrderConfirmationClient orderNumber="CMD-2026-A1B2C3" settings={settings} />);

    expect(await screen.findByText(/conservez votre numéro de commande/i)).toBeDefined();
    expect(screen.getByRole("link", { name: "Suivre ma commande" }).getAttribute("href")).toBe("/suivi-commande");
  });
});
