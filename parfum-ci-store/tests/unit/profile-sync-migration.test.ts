import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = "supabase/migrations/20260713000200_auth_profile_sync.sql";
const migration = readFileSync(migrationPath, "utf8");

describe("auth user profile synchronization migration", () => {
  it("creates an after-insert auth.users trigger with a security definer function", () => {
    expect(migration).toContain("create or replace function app_private.handle_new_auth_user()");
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain("after insert on auth.users");
  });

  it("creates at most one inactive profile and never trusts metadata for role", () => {
    expect(migration).toContain("on conflict (id) do nothing");
    expect(migration).toContain("false");
    expect(migration).toContain("'CUSTOMER_SUPPORT'::public.app_role");
    expect(migration).not.toMatch(/raw_user_meta_data\s*->>\s*'role'/i);
    expect(migration).not.toMatch(/raw_app_meta_data\s*->>\s*'role'/i);
  });

  it("backfills only missing profiles without overwriting existing staff state", () => {
    expect(migration).toContain("from auth.users");
    expect(migration).toContain("where not exists");
    expect(migration).not.toMatch(/on conflict\s*\(id\)\s*do update/i);
  });

  it("revokes direct execution permissions", () => {
    expect(migration).toContain(
      "revoke all on function app_private.handle_new_auth_user() from public",
    );
    expect(migration).toContain(
      "revoke all on function app_private.handle_new_auth_user() from authenticated",
    );
  });
});
