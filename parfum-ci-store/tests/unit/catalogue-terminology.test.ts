import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readSourceFiles(directory: string): string {
  return readdirSync(directory)
    .flatMap((entry) => {
      const path = join(directory, entry);
      const stat = statSync(path);

      if (stat.isDirectory()) {
        return readSourceFiles(path);
      }

      if (!/\.(ts|tsx|md)$/.test(path)) {
        return "";
      }

      return readFileSync(path, "utf8");
    })
    .join("\n");
}

describe("catalogue terminology", () => {
  it("does not expose the incorrect Postponement label", () => {
    const source = readSourceFiles("src");

    expect(source).not.toContain("Postponement");
    expect(source).not.toContain("Positionnement");
    expect(source).toContain("Public cible");
  });

  it("explains Famille olfactive in French", () => {
    const productForm = readFileSync("src/components/admin/catalogue/product-form.tsx", "utf8");

    expect(productForm).toContain("Famille olfactive");
    expect(productForm).toContain("Décrit la famille de senteurs dominante du parfum.");
  });
});
