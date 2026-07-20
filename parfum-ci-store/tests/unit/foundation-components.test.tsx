import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { SectionHeading } from "@/components/shared/section-heading";
import { siteConfig } from "@/config/site";

describe("foundation components", () => {
  it("renders section headings with French content", () => {
    render(
      <SectionHeading
        eyebrow="Catalogue"
        title="Sélection temporaire"
        description="Description de test"
      />,
    );

    expect(screen.getByRole("heading", { name: "Sélection temporaire" })).toBeDefined();
    expect(screen.getByText("Catalogue")).toBeDefined();
  });

  it("renders an accessible empty state", () => {
    render(
      <EmptyState title="Aucun produit" description="Le catalogue sera connecté plus tard." />,
    );

    expect(screen.getByRole("heading", { name: "Aucun produit" })).toBeDefined();
    expect(screen.getByText("Le catalogue sera connecté plus tard.")).toBeDefined();
  });

  it("exposes loading skeleton as a status region", () => {
    render(<LoadingSkeleton label="Chargement du catalogue" />);

    expect(screen.getByRole("status", { name: "Chargement du catalogue" })).toBeDefined();
  });

  it("keeps optional social links typed and centralized", () => {
    expect(siteConfig.socialLinks.every((link) => link.label && link.href)).toBe(true);
    expect(siteConfig.socialLinks.every((link) => link.href.startsWith("https://"))).toBe(true);
  });

  it("does not duplicate the cart entry in the textual storefront navigation", () => {
    expect(siteConfig.navigation.filter((item) => item.href === "/panier")).toHaveLength(0);
    expect(siteConfig.navigation.filter((item) => item.label === "Panier")).toHaveLength(0);
  });
});
