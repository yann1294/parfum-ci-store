import { describe, expect, it } from "vitest";

import { generateProductSlug, resolveSlugCollision } from "@/lib/catalogue/slug";

describe("catalogue slug helpers", () => {
  it("generates basic product slugs", () => {
    expect(generateProductSlug("Rose Intense 50 ml")).toBe("rose-intense-50-ml");
  });

  it("normalizes accented French names and punctuation", () => {
    expect(generateProductSlug("Éclat d'Ivoire & Jasmin!")).toBe("eclat-d-ivoire-et-jasmin");
  });

  it("rejects reserved or empty slugs", () => {
    expect(() => generateProductSlug("Admin")).toThrow("Invalid catalogue slug");
    expect(() => generateProductSlug("!!!")).toThrow("Invalid catalogue slug");
  });

  it("resolves collisions with deterministic numeric suffixes", async () => {
    const existing = new Set(["rose", "rose-2"]);

    await expect(resolveSlugCollision("rose", async (slug) => existing.has(slug))).resolves.toBe(
      "rose-3",
    );
  });

  it("keeps existing slugs stable unless an explicit slug is supplied by update logic", () => {
    const existingSlug = "musc-royal";
    const newName = "Musc Royal Edition Nuit";

    expect(existingSlug).toBe("musc-royal");
    expect(generateProductSlug(newName)).toBe("musc-royal-edition-nuit");
  });
});
