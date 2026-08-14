import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const ownerEmail = process.env.PLAYWRIGHT_OWNER_EMAIL ?? process.env.PLAYWRIGHT_ADMIN_EMAIL;
const ownerPassword =
  process.env.PLAYWRIGHT_OWNER_PASSWORD ?? process.env.PLAYWRIGHT_ADMIN_PASSWORD;

async function expectNoSeriousAxeViolations(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const serious = result.violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical",
  );
  expect(
    serious,
    serious.map((violation) => `${violation.id}: ${violation.help}`).join("\n"),
  ).toEqual([]);
}

async function signInOwner(page: Page) {
  await page.goto("/connexion?retour=%2Fadmin");
  await page.getByLabel("Adresse email").fill(ownerEmail!);
  await page.getByLabel("Mot de passe").fill(ownerPassword!);
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await page.waitForURL("**/admin");
}

test("public primary routes have secure headers, one h1 and no serious axe violations", async ({
  page,
}) => {
  const routes = ["/", "/catalogue", "/panier", "/commande", "/contact", "/suivi-commande"];

  for (const route of routes) {
    const response = await page.goto(route);
    expect(response?.headers()["x-content-type-options"]).toBe("nosniff");
    expect(response?.headers()["x-frame-options"]).toBe("DENY");
    expect(response?.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
    await expect(page.locator("h1")).toHaveCount(1);
    await expectNoSeriousAxeViolations(page);
  }

  await page.goto("/catalogue");
  const productLink = page.locator("a[href^='/parfums/']").first();
  if (await productLink.count()) {
    await productLink.click();
    await expect(page.locator("h1")).toHaveCount(1);
    await expectNoSeriousAxeViolations(page);
  }
});

test("contact validation is keyboard reachable and focuses its first error", async ({ page }) => {
  await page.goto("/contact");
  await page.getByRole("button", { name: "Envoyer le message" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Formulaire à corriger")).toBeVisible();
  await expect(page.getByLabel(/Nom complet/)).toBeFocused();
});

test("cart drawer releases focus and scroll lock on Escape", async ({ page }) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: /panier/i }).first();
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
});

test("representative admin routes have no serious axe violations", async ({ page }) => {
  test.skip(!ownerEmail || !ownerPassword, "Owner Playwright credentials are not configured.");
  await signInOwner(page);

  for (const route of [
    "/admin",
    "/admin/commandes",
    "/admin/inventaire",
    "/admin/messages",
    "/admin/notifications",
    "/admin/parametres",
  ]) {
    await page.goto(route);
    await expect(page.locator("h1")).toHaveCount(1);
    await expectNoSeriousAxeViolations(page);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  }
});
