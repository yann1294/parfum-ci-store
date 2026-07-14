import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AdminTopBar } from "@/components/layout/admin-top-bar";

vi.mock("@/app/admin/actions", () => ({
  logoutAction: vi.fn(),
}));

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
    expect(screen.getByRole("menuitem", { name: "Déconnexion" })).toBeDefined();
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
    expect(document.activeElement).toBe(trigger);
    expect(
      consoleError.mock.calls.some((call) => call.join(" ").includes("MenuGroupContext")),
    ).toBe(false);

    fireEvent.keyDown(document, { key: "Escape" });
    consoleError.mockRestore();
  });
});
