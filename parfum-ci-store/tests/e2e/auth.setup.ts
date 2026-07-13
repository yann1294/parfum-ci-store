import { test as setup } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const adminEmail = process.env.PLAYWRIGHT_ADMIN_EMAIL;
const adminPassword = process.env.PLAYWRIGHT_ADMIN_PASSWORD;

setup("authenticate admin", async ({ page }) => {
  setup.skip(!adminEmail || !adminPassword, "Admin test credentials are not configured.");
  if (!adminEmail || !adminPassword) {
    return;
  }

  await page.goto("/connexion?retour=%2Fadmin");
  await page.getByLabel("Adresse email").fill(adminEmail);
  await page.getByLabel("Mot de passe").fill(adminPassword);
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.waitForURL("**/admin");
  await mkdir("playwright/.auth", { recursive: true });
  await page.context().storageState({ path: "playwright/.auth/admin.json" });
});
