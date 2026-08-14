import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AdminTopBar } from "@/components/layout/admin-top-bar";

const { logoutAction } = vi.hoisted(() => ({
  logoutAction: vi.fn(async () => undefined as never),
}));

vi.mock("@/app/admin/actions", () => ({ logoutAction }));

describe("AdminTopBar", () => {
  it("opens the account menu with grouped label content and keyboard access", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(
      <AdminTopBar
        staff={{
          id: "staff-1",
          fullName: "Yann Owner",
          role: "OWNER",
          active: true,
        }}
      />,
    );

    const trigger = screen.getByRole("button", { name: /compte admin/i });
    trigger.focus();
    fireEvent.click(trigger);

    expect(await screen.findByRole("menu")).toBeDefined();
    expect(screen.getAllByText("Yann Owner").length).toBeGreaterThan(0);
    expect(screen.getByText("Propriétaire")).toBeDefined();
    const logout = screen.getByRole("menuitem", { name: "Déconnexion" });
    expect(logout).toBeDefined();
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
    expect(document.activeElement).toBe(trigger);
    expect(
      consoleError.mock.calls.some((call) => call.join(" ").includes("MenuGroupContext")),
    ).toBe(false);
    expect(consoleError.mock.calls.some((call) => call.join(" ").includes("nativeButton"))).toBe(
      false,
    );

    fireEvent.click(logout);
    await waitFor(() => expect(logoutAction).toHaveBeenCalledTimes(1));
    consoleError.mockRestore();
  });
});
