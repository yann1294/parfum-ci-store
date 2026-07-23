import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ContentEditor } from "@/components/admin/content/content-editor";
import type { ContentActionState } from "@/app/admin/contenu/actions";
import type { StorefrontContent } from "@/lib/storefront/content-schemas";

const mocks = vi.hoisted(() => ({
  updateContentSection: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/app/admin/contenu/actions", () => ({
  updateContentSection: mocks.updateContentSection,
}));

vi.mock("sonner", () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

const content: StorefrontContent = {
  home: {
    heroTitle: "Titre initial",
    heroSubtitle: "Sous-titre initial",
    primaryCtaLabel: "Catalogue",
    secondaryCtaLabel: "Contact",
    trustPoints: [{ title: "Conseil", description: "Aide personnalisée" }],
    orderingSteps: [{ title: "Choisir", description: "Sélectionner une variante" }],
    deliveryTeaser: "Livraison à Abidjan",
    socialCtaCopy: "Suivez-nous",
    seoTitle: "Accueil SEO",
    seoDescription: "Description SEO accueil",
  },
  about: {
    pageTitle: "À propos initial",
    introText: "Introduction",
    brandStory: "Histoire",
    mission: "Mission",
    values: ["Conseil", "Service"],
    imageUrl: "",
    seoTitle: "À propos SEO",
    seoDescription: "Description SEO about",
  },
  contact: {
    pageTitle: "Contact initial",
    introText: "Contactez-nous",
    telephone: "+225 07 00 00 00 00",
    whatsappNumber: "2250700000000",
    email: "contact@example.com",
    address: "Abidjan",
    openingHours: [{ label: "Lundi", value: "9 h - 18 h" }],
    mapUrl: "",
    whatsappCtaLabel: "WhatsApp",
    emailCtaLabel: "E-mail",
    phoneCtaLabel: "Appeler",
    seoTitle: "Contact SEO",
    seoDescription: "Description SEO contact",
  },
  delivery: {
    pageTitle: "Livraison initiale",
    introText: "Délais confirmés",
    zones: [{ name: "Cocody", fee: "Selon zone", timeframe: "24 h", description: "Test" }],
    freeDeliveryConditions: "",
    pickupInformation: "",
    mobileMoneyDescription: "Mobile Money",
    cashOnDeliveryConditions: "Selon zone",
    orderConfirmationProcess: "Confirmation avant validation",
    faq: [{ question: "Frais ?", answer: "Confirmés avant commande." }],
    seoTitle: "Livraison SEO",
    seoDescription: "Description SEO livraison",
  },
  social: {
    instagramUrl: "",
    facebookUrl: "",
    tiktokUrl: "",
    whatsappNumber: "2250700000000",
    socialCtaCopy: "Réseaux",
  },
  updatedAt: {
    home: "2026-07-23T00:00:00.000Z",
  },
};

function actionResult(overrides: Partial<ContentActionState> = {}): ContentActionState {
  return {
    ok: true,
    message: "Contenu enregistré.",
    pageKey: "home",
    value: {
      ...content.home,
      heroTitle: "Titre sauvegardé",
    },
    updatedAt: "2026-07-23T01:00:00.000Z",
    ...overrides,
  };
}

function consoleErrorSpy() {
  return vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    const message = args.map(String).join(" ");
    if (
      message.includes("Base UI") ||
      message.includes("uncontrolled FieldControl") ||
      message.includes("changing the default value")
    ) {
      throw new Error(message);
    }
  });
}

function inputValue(label: string) {
  return (screen.getByLabelText(label) as HTMLInputElement | HTMLTextAreaElement).value;
}

describe("ContentEditor controlled fields", () => {
  beforeEach(() => {
    mocks.updateContentSection.mockReset();
    mocks.updateContentSection.mockResolvedValue(actionResult());
    mocks.toastSuccess.mockClear();
    mocks.toastError.mockClear();
  });

  it("renders initial values and edits Titre principal without Base UI default-value warnings", () => {
    const spy = consoleErrorSpy();

    render(<ContentEditor content={content} />);
    const title = screen.getByLabelText("Titre principal");
    expect(inputValue("Titre principal")).toBe("Titre initial");

    fireEvent.change(title, { target: { value: "Titre modifié" } });
    expect(inputValue("Titre principal")).toBe("Titre modifié");
    expect(screen.getByText("Modifications non enregistrées")).toBeDefined();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("keeps the saved value visible and clears dirty state after successful save", async () => {
    render(<ContentEditor content={content} />);

    fireEvent.change(screen.getByLabelText("Titre principal"), { target: { value: "Titre sauvegardé" } });
    fireEvent.submit(screen.getByLabelText("Titre principal").closest("form")!);

    await waitFor(() => expect(mocks.updateContentSection).toHaveBeenCalled());
    await waitFor(() => expect(inputValue("Titre principal")).toBe("Titre sauvegardé"));
    await waitFor(() => expect(screen.queryByText("Modifications non enregistrées")).toBeNull());
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Contenu enregistré.");
  });

  it("preserves user input after a failed save", async () => {
    mocks.updateContentSection.mockResolvedValue(actionResult({ ok: false, message: "Erreur de validation.", value: undefined }));
    render(<ContentEditor content={content} />);

    fireEvent.change(screen.getByLabelText("Titre principal"), { target: { value: "Titre à préserver" } });
    fireEvent.submit(screen.getByLabelText("Titre principal").closest("form")!);

    await waitFor(() => expect(mocks.updateContentSection).toHaveBeenCalled());
    expect(inputValue("Titre principal")).toBe("Titre à préserver");
    expect(screen.getByText("Modifications non enregistrées")).toBeDefined();
    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith("Erreur de validation."));
  });

  it("resets values on explicit section switch and does not overwrite dirty input on prop refresh", () => {
    const { rerender } = render(<ContentEditor content={content} />);

    fireEvent.change(screen.getByLabelText("Titre principal"), { target: { value: "Brouillon local" } });
    rerender(
      <ContentEditor
        content={{
          ...content,
          home: { ...content.home, heroTitle: "Titre serveur récent" },
        }}
      />,
    );
    expect(inputValue("Titre principal")).toBe("Brouillon local");

    fireEvent.click(screen.getByRole("button", { name: "À propos" }));
    expect(inputValue("Titre de page")).toBe("À propos initial");
    expect(screen.queryByText("Modifications non enregistrées")).toBeNull();
  });
});
