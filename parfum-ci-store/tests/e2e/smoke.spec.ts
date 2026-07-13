import { expect, test } from "@playwright/test";

const routes = [
  { path: "/", heading: /Parfums raffinés/i },
  { path: "/catalogue", heading: "Sélection temporaire" },
  { path: "/contact", heading: "Parlez-nous de votre besoin" },
  { path: "/admin", heading: "Tableau de bord" },
];

for (const viewport of [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 1000 },
]) {
  test.describe(`smoke ${viewport.name}`, () => {
    test.use({ viewport });

    for (const route of routes) {
      test(`loads ${route.path}`, async ({ page }) => {
        await page.goto(route.path);
        await expect(page.getByRole("link", { name: "Aller au contenu principal" })).toBeAttached();
        await expect(page.getByRole("heading", { name: route.heading })).toBeVisible();
      });
    }
  });
}
