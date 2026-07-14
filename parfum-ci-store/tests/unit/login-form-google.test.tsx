import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LoginForm } from "@/components/auth/login-form";

const signInWithOAuth = vi.fn();

vi.mock("@/app/(auth)/connexion/actions", () => ({
  loginAction: vi.fn(async () => ({})),
}));

vi.mock("@/lib/supabase/browser", () => ({
  createSupabaseBrowserClient: () => ({
    auth: { signInWithOAuth },
  }),
}));

describe("LoginForm Google OAuth", () => {
  it("starts Google OAuth with a safe application callback", async () => {
    signInWithOAuth.mockResolvedValue({ error: null });
    render(<LoginForm returnPath="/admin/design-system" />);

    fireEvent.click(screen.getByRole("button", { name: "Continuer avec Google" }));

    await waitFor(() => {
      expect(signInWithOAuth).toHaveBeenCalledWith({
        provider: "google",
        options: {
          redirectTo: "http://localhost:3000/auth/callback?retour=%2Fadmin%2Fdesign-system",
        },
      });
    });
  });

  it("rejects external return paths before starting Google OAuth", async () => {
    signInWithOAuth.mockResolvedValue({ error: null });
    render(<LoginForm returnPath="https://evil.example" />);

    fireEvent.click(screen.getByRole("button", { name: "Continuer avec Google" }));

    await waitFor(() => {
      expect(signInWithOAuth).toHaveBeenCalledWith({
        provider: "google",
        options: {
          redirectTo: "http://localhost:3000/auth/callback?retour=%2Fadmin",
        },
      });
    });
  });

  it("shows a safe message when Google initiation fails", async () => {
    signInWithOAuth.mockResolvedValue({ error: new Error("provider failed") });
    render(<LoginForm returnPath="/admin" />);

    fireEvent.click(screen.getByRole("button", { name: "Continuer avec Google" }));

    expect(await screen.findByText(/La connexion Google a échoué/)).toBeDefined();
  });
});
