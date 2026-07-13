import { expect, test } from "@playwright/test";

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
