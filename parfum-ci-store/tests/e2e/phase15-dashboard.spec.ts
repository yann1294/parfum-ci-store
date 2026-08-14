import { expect, test, type Page } from "@playwright/test";

type Role = "OWNER" | "ADMIN" | "ORDER_MANAGER" | "CUSTOMER_SUPPORT" | "INVENTORY_MANAGER";

function credentials(role: Role) {
  const legacySupportEmail =
    role === "CUSTOMER_SUPPORT" ? process.env.PLAYWRIGHT_SUPPORT_EMAIL : undefined;
  const legacySupportPassword =
    role === "CUSTOMER_SUPPORT" ? process.env.PLAYWRIGHT_SUPPORT_PASSWORD : undefined;
  return {
    email:
      process.env[`PLAYWRIGHT_${role}_EMAIL`] ??
      legacySupportEmail ??
      (role === "OWNER" ? process.env.PLAYWRIGHT_ADMIN_EMAIL : undefined),
    password:
      process.env[`PLAYWRIGHT_${role}_PASSWORD`] ??
      legacySupportPassword ??
      (role === "OWNER" ? process.env.PLAYWRIGHT_ADMIN_PASSWORD : undefined),
  };
}

async function signIn(page: Page, role: Role) {
  const actor = credentials(role);
  test.skip(!actor.email || !actor.password, `${role} Playwright credentials are not configured.`);
  await page.goto("/connexion?retour=%2Fadmin");
  await page.getByLabel("Adresse email").fill(actor.email!);
  await page.getByLabel("Mot de passe").fill(actor.password!);
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await page.waitForURL("**/admin");
  await expect(page.getByRole("heading", { name: "Tableau de bord" })).toBeVisible();
}

test("OWNER dashboard supports shareable ranges and operational deep links", async ({ page }) => {
  await signIn(page, "OWNER");

  for (const [label, range] of [
    ["7 jours", "7d"],
    ["30 jours", "30d"],
    ["90 jours", "90d"],
  ] as const) {
    await page.getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/admin\\?range=${range}$`));
    await expect(page.getByRole("link", { name: label, exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
  }

  await page.getByRole("link", { name: /À confirmer/ }).click();
  await expect(page).toHaveURL(/\/admin\/commandes\?status=PENDING_CONFIRMATION$/);
  await expect(page.getByRole("heading", { name: "Commandes" })).toBeVisible();
});

test("CUSTOMER_SUPPORT receives no aggregate financial dashboard", async ({ page }) => {
  await signIn(page, "CUSTOMER_SUPPORT");
  await expect(page.getByText("Chiffre d’affaires brut payé")).toHaveCount(0);
  await expect(page.getByText("Modes de paiement choisis")).toHaveCount(0);
  await expect(page.getByText("Messages récents")).toBeVisible();
});

test("INVENTORY_MANAGER receives inventory without orders or payments", async ({ page }) => {
  await signIn(page, "INVENTORY_MANAGER");
  await expect(page.getByText("Variantes en stock faible")).toBeVisible();
  await expect(page.getByText("Produits les plus vendus")).toBeVisible();
  await expect(page.getByText("Commandes récentes")).toHaveCount(0);
  await expect(page.getByText("Chiffre d’affaires brut payé")).toHaveCount(0);
});

test("dashboard has no page-level overflow at required widths", async ({ page }) => {
  await signIn(page, "OWNER");
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
    { width: 820, height: 900 },
    { width: 640, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.reload();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  }
});
