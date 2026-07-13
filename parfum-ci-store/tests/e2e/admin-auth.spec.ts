import { expect, test } from "@playwright/test";

const ownerEmail = process.env.PLAYWRIGHT_OWNER_EMAIL ?? process.env.PLAYWRIGHT_ADMIN_EMAIL;
const ownerPassword =
  process.env.PLAYWRIGHT_OWNER_PASSWORD ?? process.env.PLAYWRIGHT_ADMIN_PASSWORD;
const supportEmail = process.env.PLAYWRIGHT_SUPPORT_EMAIL;
const supportPassword = process.env.PLAYWRIGHT_SUPPORT_PASSWORD;
const inactiveEmail = process.env.PLAYWRIGHT_INACTIVE_EMAIL;
const inactivePassword = process.env.PLAYWRIGHT_INACTIVE_PASSWORD;

test("unauthenticated admin visitors are redirected to login with safe return path", async ({
  page,
}) => {
  await page.goto("/admin");

  await expect(page).toHaveURL(/\/connexion\?retour=%2Fadmin$/);
  await expect(page.getByRole("heading", { name: "Connexion admin" })).toBeVisible();
});

test("unauthenticated nested admin visitors keep the safe internal return path", async ({
  page,
}) => {
  await page.goto("/admin/design-system");

  await expect(page).toHaveURL(/\/connexion\?retour=%2Fadmin%2Fdesign-system$/);
  await expect(page.getByRole("heading", { name: "Connexion admin" })).toBeVisible();
});

test("login page exposes Google OAuth without requiring public visitors to authenticate", async ({
  page,
}) => {
  await page.goto("/connexion");

  await expect(page.getByRole("button", { name: "Continuer avec Google" })).toBeVisible();
  await expect(page.getByLabel("Adresse email")).toBeVisible();
  await expect(page.getByLabel("Mot de passe")).toBeVisible();
});

test("simulated OAuth callback without code fails safely", async ({ page }) => {
  await page.goto("/auth/callback?retour=https%3A%2F%2Fevil.example");

  await expect(page).toHaveURL(/\/connexion\?erreur=oauth$/);
  await expect(page.getByText("La connexion Google a échoué")).toBeVisible();
});

test("owner password login, logout, back and refresh keep admin protected", async ({ page }) => {
  test.skip(!ownerEmail || !ownerPassword, "Owner Playwright credentials are not configured.");

  await page.goto("/connexion?retour=%2Fadmin");
  await page.getByLabel("Adresse email").fill(ownerEmail!);
  await page.getByLabel("Mot de passe").fill(ownerPassword!);
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.waitForURL("**/admin");
  await expect(page.getByText("Propriétaire")).toBeVisible();

  await page.getByRole("button", { name: /Compte admin/i }).click();
  await page.getByRole("menuitem", { name: "Déconnexion" }).click();
  await page.waitForURL("**/connexion");

  await page.goBack();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Connexion admin" })).toBeVisible();
});

test("support navigation hides unauthorized payment and inventory modules", async ({ page }) => {
  test.skip(
    !supportEmail || !supportPassword,
    "Support Playwright credentials are not configured.",
  );

  await page.goto("/connexion?retour=%2Fadmin");
  await page.getByLabel("Adresse email").fill(supportEmail!);
  await page.getByLabel("Mot de passe").fill(supportPassword!);
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.waitForURL("**/admin");

  await expect(page.getByRole("link", { name: "Commandes" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Messages" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Paiements" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Inventaire" })).toHaveCount(0);

  await page.goto("/admin/paiements");
  await expect(page.getByRole("heading", { name: "Accès refusé" })).toBeVisible();
});

test("inactive staff is denied after password authentication", async ({ page }) => {
  test.skip(
    !inactiveEmail || !inactivePassword,
    "Inactive Playwright credentials are not configured.",
  );

  await page.goto("/connexion?retour=%2Fadmin");
  await page.getByLabel("Adresse email").fill(inactiveEmail!);
  await page.getByLabel("Mot de passe").fill(inactivePassword!);
  await page.getByRole("button", { name: "Continuer" }).click();

  await page.waitForURL("**/acces-refuse");
  await expect(page.getByRole("heading", { name: "Accès refusé" })).toBeVisible();
});
