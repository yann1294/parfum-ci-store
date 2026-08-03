import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CheckoutPageClient } from "@/components/storefront/checkout-page-client";
import { buildCartWhatsAppMessage, CartPageClient } from "@/components/storefront/cart-page-client";
import { OrderConfirmationClient } from "@/components/storefront/order-confirmation-client";
import {
  cartMaterialSignature,
  createCheckoutIdempotencyKey,
  readSafeConfirmation,
  storeSafeConfirmation,
} from "@/lib/orders/checkout-client";
import {
  configuredPaymentMethodLabel,
  deliveryMethodLabel,
  maskPhone,
  orderStatusLabel,
  paymentMethodLabel,
  paymentStatusLabel,
  type PaymentInstructionSettings,
} from "@/lib/orders/display";
import {
  configuredPaymentMethods,
  defaultPaymentConfigs,
  normalizePaymentConfigs,
  validatePaymentSettingsForSave,
} from "@/lib/orders/payment-settings-core";
import { CART_SCHEMA_VERSION, clearCartForTests, readCart, writeCart } from "@/lib/storefront/cart";
import type { ReconciledCart } from "@/lib/storefront/cart-reconciliation-core";

const push = vi.fn();
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
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
  paymentMethodConfigs: {
    CASH_ON_DELIVERY: {
      label: "Paiement à la livraison",
      merchantNumber: "",
      beneficiaryName: "",
      instructions: "Paiement à la livraison selon confirmation.",
      displayOrder: 1,
    },
    ORANGE_MONEY: {
      label: "Orange Money CI",
      merchantNumber: "0700000000",
      beneficiaryName: "Parfum CI SARL",
      instructions: "Envoyez le paiement Orange Money après confirmation.",
      displayOrder: 2,
    },
  },
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

const successfulOrderPayload = {
  orderId: "44444444-4444-4444-8444-444444444444",
  orderNumber: "CMD-2026-A1B2C3",
  orderStatus: "PENDING_CONFIRMATION",
  paymentStatus: "UNPAID",
  currency: "XOF",
  subtotalXof: 95000,
  deliveryFeeXof: 0,
  totalXof: 95000,
  createdAt: "2026-07-27T00:00:00.000Z",
  items: [
    {
      productName: "Sauvage",
      variantLabel: "100 ml · EDP",
      quantity: 1,
      unitPriceXof: 95000,
      lineTotalXof: 95000,
    },
  ],
  nextStepCode: "PENDING_CONFIRMATION",
} as const;

function seedCart() {
  writeCart({
    version: CART_SCHEMA_VERSION,
    items: [{ productId, variantId, quantity: 1 }],
    attribution: null,
    updatedAt: "2026-07-27T00:00:00.000Z",
  });
}

async function fillRequiredCheckoutFields(phone = "+225 07 00 00 00 00") {
  fireEvent.change(screen.getByLabelText("Nom complet"), { target: { value: "Awa Kone" } });
  fireEvent.change(screen.getByLabelText("Téléphone"), { target: { value: phone } });
  fireEvent.change(screen.getByLabelText("Commune ou quartier"), { target: { value: "Cocody" } });
  fireEvent.click(screen.getByLabelText(/J'accepte les conditions/i));
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
    expect(configuredPaymentMethodLabel("ORANGE_MONEY", settings)).toBe("Orange Money CI");
    expect(deliveryMethodLabel("HOME_DELIVERY")).toBe("Livraison à domicile");
    expect(maskPhone("+2250700000012")).toContain("12");
  });

  it("filters enabled payment methods through structured public configuration", () => {
    const configs = defaultPaymentConfigs(["CASH_ON_DELIVERY", "ORANGE_MONEY", "BANK_TRANSFER", "PAY_IN_STORE"]);
    configs.ORANGE_MONEY = {
      ...configs.ORANGE_MONEY,
      merchantNumber: "0700000000",
      instructions: "Paiement Orange Money après confirmation.",
    };
    configs.BANK_TRANSFER = { ...configs.BANK_TRANSFER, instructions: "RIB public." };
    configs.PAY_IN_STORE = { ...configs.PAY_IN_STORE, enabled: false, instructions: "Retrait boutique." };

    expect(configuredPaymentMethods(configs)).toEqual(["CASH_ON_DELIVERY", "ORANGE_MONEY"]);
  });

  it("ignores unsupported payment configuration payloads safely", () => {
    const configs = normalizePaymentConfigs({
      CASH_ON_DELIVERY: { enabled: true, label: "Livraison", displayOrder: 1 },
      CRYPTO: { enabled: true, label: "Crypto", instructions: "Unsupported", displayOrder: 2 },
    });

    expect(configuredPaymentMethods(configs)).toEqual(["CASH_ON_DELIVERY"]);
    expect(JSON.stringify(configs)).not.toContain("CRYPTO");
  });

  it("rejects incomplete enabled manual methods but allows cash on delivery without merchant number", () => {
    const configs = defaultPaymentConfigs(["CASH_ON_DELIVERY", "ORANGE_MONEY"]);
    configs.CASH_ON_DELIVERY = { ...configs.CASH_ON_DELIVERY, merchantNumber: "", instructions: "" };
    configs.ORANGE_MONEY = { ...configs.ORANGE_MONEY, merchantNumber: "", instructions: "Instructions publiques." };

    const issues = validatePaymentSettingsForSave(configs);
    expect(issues.some((issue) => issue.method === "CASH_ON_DELIVERY" && issue.field === "merchantNumber")).toBe(false);
    expect(issues).toContainEqual({
      method: "ORANGE_MONEY",
      field: "merchantNumber",
      message: "Le numéro marchand est requis.",
    });
  });
});

describe("Phase 9 checkout form", () => {
  beforeEach(() => {
    clearCartForTests();
    window.sessionStorage.clear();
    push.mockClear();
    replace.mockClear();
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
        return Response.json(successfulOrderPayload, { status: 201 });
      }
      throw new Error(`Unexpected ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<CheckoutPageClient settings={settings} />);
    expect(await screen.findByText("Sauvage")).toBeDefined();

    await fillRequiredCheckoutFields();
    fireEvent.click(screen.getByRole("button", { name: "Envoyer la commande" }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/commande/succes/CMD-2026-A1B2C3"));
    expect(push).not.toHaveBeenCalled();
    expect(readCart().items).toHaveLength(0);
    expect(readSafeConfirmation("CMD-2026-A1B2C3")?.orderNumber).toBe("CMD-2026-A1B2C3");
  });

  it("accepts 00225 phone input in the checkout form and lets the server canonicalize it", async () => {
    seedCart();
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/cart/reconcile") return Response.json(readySnapshot);
      if (url === "/api/orders") {
        const body = JSON.parse(String(init?.body));
        expect(body.customer.phone).toBe("002250700000000");
        return Response.json(successfulOrderPayload, { status: 201 });
      }
      throw new Error(`Unexpected ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<CheckoutPageClient settings={settings} />);
    expect(await screen.findByText("Sauvage")).toBeDefined();
    await fillRequiredCheckoutFields("002250700000000");
    fireEvent.click(screen.getByRole("button", { name: "Envoyer la commande" }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/commande/succes/CMD-2026-A1B2C3"));
  });

  it("accepts a successful order response with SQL numeric values serialized as strings", async () => {
    seedCart();
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "/api/cart/reconcile") return Response.json(readySnapshot);
      if (url === "/api/orders") {
        return Response.json(
          {
            ...successfulOrderPayload,
            subtotalXof: "95000",
            deliveryFeeXof: "0",
            totalXof: "95000",
            createdAt: "2026-08-03T13:06:49.557453+00:00",
            items: successfulOrderPayload.items.map((item) => ({
              ...item,
              quantity: "1",
              unitPriceXof: "95000",
              lineTotalXof: "95000",
            })),
          },
          { status: 201 },
        );
      }
      throw new Error(`Unexpected ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<CheckoutPageClient settings={settings} />);
    expect(await screen.findByText("Sauvage")).toBeDefined();
    await fillRequiredCheckoutFields();
    fireEvent.click(screen.getByRole("button", { name: "Envoyer la commande" }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/commande/succes/CMD-2026-A1B2C3"));
    expect(readSafeConfirmation("CMD-2026-A1B2C3")?.subtotalXof).toBe(95000);
    expect(readCart().items).toHaveLength(0);
  });

  it("accepts a successful order response with SQL snake_case fields", async () => {
    seedCart();
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "/api/cart/reconcile") return Response.json(readySnapshot);
      if (url === "/api/orders") {
        return Response.json(
          {
            order_id: successfulOrderPayload.orderId,
            order_number: successfulOrderPayload.orderNumber,
            order_status: successfulOrderPayload.orderStatus,
            payment_status: successfulOrderPayload.paymentStatus,
            currency: "XOF",
            subtotal_xof: "95000",
            delivery_fee_xof: null,
            total_xof: null,
            created_at: successfulOrderPayload.createdAt,
            order_items: [
              {
                product_name: "Sauvage",
                variant_name: "100 ml · EDP",
                quantity: "1",
                unit_price_xof: "95000",
                total_price_xof: "95000",
              },
            ],
            next_step_code: "PENDING_CONFIRMATION",
          },
          { status: 201 },
        );
      }
      throw new Error(`Unexpected ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<CheckoutPageClient settings={settings} />);
    expect(await screen.findByText("Sauvage")).toBeDefined();
    await fillRequiredCheckoutFields();
    fireEvent.click(screen.getByRole("button", { name: "Envoyer la commande" }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/commande/succes/CMD-2026-A1B2C3"));
    expect(readSafeConfirmation("CMD-2026-A1B2C3")?.items[0]?.lineTotalXof).toBe(95000);
    expect(readCart().items).toHaveLength(0);
  });

  it("shows an inline success fallback when confirmation navigation fails after order creation", async () => {
    seedCart();
    replace.mockImplementationOnce(() => {
      throw new Error("navigation failed");
    });
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "/api/cart/reconcile") return Response.json(readySnapshot);
      if (url === "/api/orders") return Response.json(successfulOrderPayload, { status: 201 });
      throw new Error(`Unexpected ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<CheckoutPageClient settings={settings} />);
    expect(await screen.findByText("Sauvage")).toBeDefined();
    await fillRequiredCheckoutFields();
    await waitFor(() =>
      expect((screen.getByRole("button", { name: "Envoyer la commande" }) as HTMLButtonElement).disabled).toBe(false),
    );
    fireEvent.click(screen.getByRole("button", { name: "Envoyer la commande" }));

    expect(await screen.findByText("Votre commande a bien été enregistrée.")).toBeDefined();
    expect(screen.getByText(/Commande CMD-2026-A1B2C3/i)).toBeDefined();
    expect(screen.getByRole("link", { name: "Voir la confirmation" }).getAttribute("href")).toBe(
      "/commande/succes/CMD-2026-A1B2C3",
    );
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/orders")).toHaveLength(1);
    expect(readCart().items).toHaveLength(0);
  });

  it("shows an inline success fallback when confirmation proof cannot be stored", async () => {
    seedCart();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
      throw new Error("session storage unavailable");
    });
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "/api/cart/reconcile") return Response.json(readySnapshot);
      if (url === "/api/orders") return Response.json(successfulOrderPayload, { status: 201 });
      throw new Error(`Unexpected ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<CheckoutPageClient settings={settings} />);
    expect(await screen.findByText("Sauvage")).toBeDefined();
    await fillRequiredCheckoutFields();
    await waitFor(() =>
      expect((screen.getByRole("button", { name: "Envoyer la commande" }) as HTMLButtonElement).disabled).toBe(false),
    );
    fireEvent.click(screen.getByRole("button", { name: "Envoyer la commande" }));

    expect(await screen.findByText("Votre commande a bien été enregistrée.")).toBeDefined();
    expect(replace).not.toHaveBeenCalled();
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/orders")).toHaveLength(1);
    expect(readCart().items).toHaveLength(0);
    warn.mockRestore();
  });

  it("does not clear the cart or navigate when /api/orders returns HTTP 400", async () => {
    seedCart();
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "/api/cart/reconcile") return Response.json(readySnapshot);
      if (url === "/api/orders") {
        return Response.json(
          { error: { code: "ORDER_PAYMENT_METHOD_DISABLED", message: "disabled" } },
          { status: 400 },
        );
      }
      throw new Error(`Unexpected ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<CheckoutPageClient settings={settings} />);
    expect(await screen.findByText("Sauvage")).toBeDefined();
    await fillRequiredCheckoutFields();
    await waitFor(() =>
      expect((screen.getByRole("button", { name: "Envoyer la commande" }) as HTMLButtonElement).disabled).toBe(false),
    );
    fireEvent.click(screen.getByRole("button", { name: "Envoyer la commande" }));

    expect(await screen.findByText("Ce mode de paiement n'est plus disponible.")).toBeDefined();
    expect(push).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(readCart().items).toHaveLength(1);
  });

  it("rejects malformed successful order payloads before confirmation handling", async () => {
    seedCart();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url === "/api/cart/reconcile") return Response.json(readySnapshot);
        if (url === "/api/orders") return Response.json({ ok: true }, { status: 201 });
        throw new Error(`Unexpected ${url}`);
      }),
    );

    render(<CheckoutPageClient settings={settings} />);
    expect(await screen.findByText("Sauvage")).toBeDefined();
    await fillRequiredCheckoutFields();
    await waitFor(() =>
      expect((screen.getByRole("button", { name: "Envoyer la commande" }) as HTMLButtonElement).disabled).toBe(false),
    );
    fireEvent.click(screen.getByRole("button", { name: "Envoyer la commande" }));

    expect(await screen.findByText("La commande n'a pas pu être enregistrée.")).toBeDefined();
    expect(push).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(readCart().items).toHaveLength(1);
  });

  it("validates the cart once after hydration and does not loop when readiness changes", async () => {
    seedCart();
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "/api/cart/reconcile") return Response.json(readySnapshot);
      throw new Error(`Unexpected ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<CheckoutPageClient settings={settings} />);

    expect(await screen.findByText("Sauvage")).toBeDefined();
    await new Promise((resolve) => window.setTimeout(resolve, 80));
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/cart/reconcile")).toHaveLength(1);
  });

  it("runs one new checkout reconciliation when the material cart intent changes", async () => {
    seedCart();
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "/api/cart/reconcile") return Response.json(readySnapshot);
      throw new Error(`Unexpected ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<CheckoutPageClient settings={settings} />);
    expect(await screen.findByText("Sauvage")).toBeDefined();

    writeCart({
      version: CART_SCHEMA_VERSION,
      items: [{ productId, variantId, quantity: 2 }],
      attribution: null,
      updatedAt: "2026-07-27T00:00:00.000Z",
    });

    await waitFor(() => expect(fetchMock.mock.calls.filter(([url]) => url === "/api/cart/reconcile")).toHaveLength(2));
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

describe("Phase 9 WhatsApp order intent", () => {
  beforeEach(() => {
    clearCartForTests();
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("does not create a WhatsApp intent on page render", async () => {
    seedCart();
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "/api/cart/reconcile") return Response.json(readySnapshot);
      throw new Error(`Unexpected ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<CartPageClient whatsappNumber="2250700000000" />);
    expect(await screen.findByText("Sauvage")).toBeDefined();

    expect(fetchMock.mock.calls.some(([url]) => url === "/api/storefront/order-intents/whatsapp")).toBe(false);
  });

  it("creates an intent only after an intentional WhatsApp click and uses authoritative message data", async () => {
    seedCart();
    const openMock = vi.spyOn(window, "open").mockImplementation(() => null);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/cart/reconcile") return Response.json(readySnapshot);
      if (url === "/api/storefront/order-intents/whatsapp") {
        const body = JSON.parse(String(init?.body));
        expect(body.items).toEqual([{ productId, variantId, quantity: 1 }]);
        expect(JSON.stringify(body)).not.toContain("Sauvage");
        expect(JSON.stringify(body)).not.toContain("95000");
        return Response.json({ ok: true, tracked: true, intentReference: "WA-ABC123", snapshot: readySnapshot });
      }
      if (url === "/api/orders") throw new Error("WhatsApp must not create an order");
      throw new Error(`Unexpected ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<CartPageClient whatsappNumber="2250700000000" />);
    expect(await screen.findByText("Sauvage")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Commander via WhatsApp" }));

    await waitFor(() => expect(openMock).toHaveBeenCalled());
    const openedUrl = String(openMock.mock.calls[0]?.[0]);
    expect(decodeURIComponent(openedUrl)).toContain("Sauvage");
    expect(decodeURIComponent(openedUrl)).toContain("95\u202f000");
    expect(decodeURIComponent(openedUrl)).toContain("WA-ABC123");
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/orders")).toHaveLength(0);
  });

  it("keeps WhatsApp usable when intent persistence returns the documented fallback", async () => {
    seedCart();
    const openMock = vi.spyOn(window, "open").mockImplementation(() => null);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url === "/api/cart/reconcile") return Response.json(readySnapshot);
        if (url === "/api/storefront/order-intents/whatsapp") {
          return Response.json({ ok: true, tracked: false, intentReference: null, snapshot: readySnapshot });
        }
        throw new Error(`Unexpected ${url}`);
      }),
    );

    render(<CartPageClient whatsappNumber="2250700000000" />);
    expect(await screen.findByText("Sauvage")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Commander via WhatsApp" }));

    await waitFor(() => expect(openMock).toHaveBeenCalled());
    expect(decodeURIComponent(String(openMock.mock.calls[0]?.[0]))).toContain("Sauvage");
  });

  it("keeps WhatsApp usable when optional intent tracking endpoint fails after ready reconciliation", async () => {
    seedCart();
    const openMock = vi.spyOn(window, "open").mockImplementation(() => null);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url === "/api/cart/reconcile") return Response.json(readySnapshot);
        if (url === "/api/storefront/order-intents/whatsapp") {
          return Response.json(
            { ok: false, error: { code: "WHATSAPP_INTENT_RATE_LIMITED", message: "rate" } },
            { status: 429 },
          );
        }
        throw new Error(`Unexpected ${url}`);
      }),
    );

    render(<CartPageClient whatsappNumber="2250700000000" />);
    expect(await screen.findByText("Sauvage")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Commander via WhatsApp" }));

    await waitFor(() => expect(openMock).toHaveBeenCalled());
    expect(await screen.findByText(/Le suivi WhatsApp n'a pas été enregistré/i)).toBeDefined();
    expect(decodeURIComponent(String(openMock.mock.calls[0]?.[0]))).toContain("Sauvage");
  });

  it("adds the safe intent reference to WhatsApp text without internal IDs", () => {
    const message = buildCartWhatsAppMessage(readySnapshot, "WA-ABC123");
    expect(message).toContain("Référence de demande: WA-ABC123");
    expect(message).not.toContain(productId);
    expect(message).not.toContain(variantId);
  });
});
