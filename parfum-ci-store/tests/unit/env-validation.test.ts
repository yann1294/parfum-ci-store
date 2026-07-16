import { afterEach, describe, expect, it, vi } from "vitest";

import { formatEnvironmentDiagnostics, getEnvironmentDiagnostics } from "@/lib/env/diagnostics";

describe("environment validation", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("rejects a missing public Supabase URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable");
    const { getPublicEnv } = await import("@/lib/env/public");

    expect(() => getPublicEnv()).toThrow("NEXT_PUBLIC_SUPABASE_URL");
  });

  it("rejects a missing publishable key", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    const { getPublicEnv } = await import("@/lib/env/public");

    expect(() => getPublicEnv()).toThrow("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  });

  it("does not read server secrets during public validation", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable");
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    const { getPublicEnv } = await import("@/lib/env/public");

    expect(getPublicEnv()).toEqual({
      NEXT_PUBLIC_SITE_URL: "https://example.test",
      NEXT_PUBLIC_SITE_NAME: "Parfum CI",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable",
    });
  });

  it("formats diagnostics without printing values", () => {
    const diagnostics = getEnvironmentDiagnostics({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable",
      SUPABASE_SECRET_KEY: "secret-value",
    });
    const output = formatEnvironmentDiagnostics(diagnostics);

    expect(output).toContain("NEXT_PUBLIC_SUPABASE_URL\tpublic\tSET");
    expect(output).toContain("SUPABASE_STORAGE_BUCKET\tserver\tMISSING");
    expect(output).not.toContain("https://example.supabase.co");
    expect(output).not.toContain("publishable");
    expect(output).not.toContain("secret-value");
  });
});
