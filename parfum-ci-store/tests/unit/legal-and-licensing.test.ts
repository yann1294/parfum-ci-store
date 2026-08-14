import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("project licensing", () => {
  it("keeps the commercial source private and explicitly unlicensed for package publication", () => {
    const packageJson = JSON.parse(source("package.json")) as {
      private?: boolean;
      license?: string;
    };
    const license = source("../LICENSE");

    expect(packageJson.private).toBe(true);
    expect(packageJson.license).toBe("UNLICENSED");
    expect(license).toContain("All rights reserved");
    expect(license).toContain("Third-party");
  });
});

describe("public legal routes", () => {
  it("publishes canonical, versioned legal pages without arbitrary HTML rendering", () => {
    const routes = [
      ["mentions-legales", "src/app/(legal)/mentions-legales/page.tsx"],
      ["politique-de-confidentialite", "src/app/(legal)/politique-de-confidentialite/page.tsx"],
      ["conditions-generales-de-vente", "src/app/(legal)/conditions-generales-de-vente/page.tsx"],
    ] as const;

    for (const [route, path] of routes) {
      const page = source(path);
      expect(page).toContain(`canonical: "/${route}"`);
      expect(page).toContain("legalPolicyVersions");
      expect(page).not.toContain("dangerouslySetInnerHTML");
    }
  });

  it("keeps legal documents reachable during storefront maintenance", () => {
    const legalLayout = source("src/app/(legal)/layout.tsx");
    expect(legalLayout).toContain("PublicHeader");
    expect(legalLayout).toContain("PublicFooter");
    expect(legalLayout).not.toContain("maintenanceMode");
  });

  it("links policies from the footer, checkout, contact consent and sitemap", () => {
    const footer = source("src/components/layout/public-footer.tsx");
    const checkout = source("src/components/storefront/checkout-page-client.tsx");
    const contact = source("src/components/storefront/contact-message-form.tsx");
    const sitemap = source("src/app/sitemap.ts");

    for (const route of [
      "/mentions-legales",
      "/conditions-generales-de-vente",
      "/politique-de-confidentialite",
    ]) {
      expect(footer).toContain(route);
      expect(sitemap).toContain(route);
    }
    expect(checkout).toContain("/conditions-generales-de-vente");
    expect(checkout).toContain("/politique-de-confidentialite");
    expect(contact).toContain("/politique-de-confidentialite");
  });

  it("does not pretend that missing owner decisions have been approved", () => {
    const terms = source("src/app/(legal)/conditions-generales-de-vente/page.tsx");
    const privacy = source("src/app/(legal)/politique-de-confidentialite/page.tsx");
    const notice = source("src/app/(legal)/mentions-legales/page.tsx");

    expect(terms).toContain("Validation commerciale requise");
    expect(terms).toContain("identifiant de version dans chaque commande");
    expect(privacy).toMatch(/aucune suppression\s+automatique générale/);
    expect(notice).toContain("Informations d’immatriculation à compléter");
  });
});
