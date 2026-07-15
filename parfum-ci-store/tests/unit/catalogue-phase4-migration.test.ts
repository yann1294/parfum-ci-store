import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260714000100_catalogue_storage_domain.sql",
  "utf8",
);
const verification = readFileSync("supabase/tests/phase4_catalogue_storage.sql", "utf8");

describe("phase 4 catalogue storage migration", () => {
  it("creates the public product-images bucket safely", () => {
    expect(migration).toContain("insert into storage.buckets");
    expect(migration).toContain("'product-images'");
    expect(migration).toContain("5242880");
    expect(migration).toContain("'image/jpeg'");
    expect(migration).toContain("'image/png'");
    expect(migration).toContain("'image/webp'");
    expect(migration).toContain("on conflict (id) do update");
  });

  it("adds narrow storage policies for active product managers", () => {
    expect(migration).toContain("product_images_storage_staff_insert");
    expect(migration).toContain("product_images_storage_staff_delete");
    expect(migration).toContain("bucket_id = 'product-images'");
    expect(migration).toContain("array['OWNER', 'ADMIN']::public.app_role[]");
    expect(migration).not.toContain("CUSTOMER_SUPPORT']::public.app_role[]");
    expect(migration).not.toContain("ORDER_MANAGER']::public.app_role[]");
  });

  it("adds active product invariant triggers and safe private functions", () => {
    expect(migration).toContain("app_private.product_meets_active_requirements");
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain("products_validate_active_requirements");
    expect(migration).toContain("product_images_preserve_active_product_requirements");
  });

  it("protects cost price at the database boundary", () => {
    expect(migration).toContain("public.public_catalogue_variants");
    expect(migration).toContain("revoke select on public.product_variants from anon, authenticated");
    expect(migration).not.toMatch(
      /grant select \([\s\S]*cost_price_xof[\s\S]*\)\s+on public\.product_variants/,
    );
    expect(verification).toContain(
      "has_column_privilege('anon', 'public.product_variants', 'cost_price_xof', 'select')",
    );
  });
});
