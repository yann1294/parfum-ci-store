import { describe, expect, it } from "vitest";

import {
  CURRENT_PRODUCTION_SUPABASE_PROJECT_REF,
  assertDestructiveE2eAllowed,
  extractSupabaseProjectRef,
} from "../../scripts/e2e-safety";
import { GET, HEAD } from "@/app/api/health/route";

const stagingRef = "abcdefghijklmnopqrst";

describe("Phase 17 deployment safety", () => {
  it("returns a bounded liveness response without dependency details", async () => {
    const response = GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.json()).toEqual({ status: "ok" });

    const head = HEAD();
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
  });

  it("extracts only canonical hosted Supabase project references", () => {
    expect(extractSupabaseProjectRef(`https://${stagingRef}.supabase.co`)).toBe(stagingRef);
    expect(extractSupabaseProjectRef("http://127.0.0.1:54321")).toBeNull();
    expect(extractSupabaseProjectRef("https://supabase.example.com")).toBeNull();
  });

  it("always denies the current production project", () => {
    expect(() =>
      assertDestructiveE2eAllowed({
        ALLOW_DESTRUCTIVE_E2E: "true",
        E2E_TARGET_KIND: "staging",
        E2E_ALLOWED_SUPABASE_PROJECT_REF: CURRENT_PRODUCTION_SUPABASE_PROJECT_REF,
        NEXT_PUBLIC_SUPABASE_URL: `https://${CURRENT_PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`,
        NODE_ENV: "test",
      } as NodeJS.ProcessEnv),
    ).toThrow("forbidden against the production Supabase project");
  });

  it("requires all local and staging safety gates", () => {
    expect(() =>
      assertDestructiveE2eAllowed({
        E2E_TARGET_KIND: "local",
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        NODE_ENV: "test",
      } as NodeJS.ProcessEnv),
    ).toThrow("ALLOW_DESTRUCTIVE_E2E=true");

    expect(() =>
      assertDestructiveE2eAllowed({
        ALLOW_DESTRUCTIVE_E2E: "true",
        E2E_TARGET_KIND: "local",
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        NODE_ENV: "test",
      } as NodeJS.ProcessEnv),
    ).not.toThrow();

    expect(() =>
      assertDestructiveE2eAllowed({
        ALLOW_DESTRUCTIVE_E2E: "true",
        E2E_TARGET_KIND: "staging",
        E2E_ALLOWED_SUPABASE_PROJECT_REF: stagingRef,
        NEXT_PUBLIC_SUPABASE_URL: `https://${stagingRef}.supabase.co`,
        NODE_ENV: "test",
      } as NodeJS.ProcessEnv),
    ).not.toThrow();
  });
});
