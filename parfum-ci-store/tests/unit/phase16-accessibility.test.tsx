import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ContactMessageForm } from "@/components/storefront/contact-message-form";

describe("Phase 16 accessible public forms", () => {
  it("announces contact validation and focuses the first invalid field", async () => {
    render(<ContactMessageForm />);

    fireEvent.click(screen.getByRole("button", { name: "Envoyer le message" }));

    expect(await screen.findByText("Formulaire à corriger")).toBeDefined();
    const name = screen.getByLabelText(/Nom complet/);
    expect(name.getAttribute("aria-invalid")).toBe("true");
    expect(name.getAttribute("aria-describedby")).toBe("contact-name-error");
    await waitFor(() => expect(document.activeElement).toBe(name));
  });

  it("keeps customer-supplied markup as ordinary textarea text", () => {
    render(<ContactMessageForm />);
    const message = screen.getByLabelText(/Message/);
    fireEvent.change(message, { target: { value: "<img src=x onerror=alert(1)>" } });
    expect((message as HTMLTextAreaElement).value).toBe("<img src=x onerror=alert(1)>");
    expect(document.querySelector("img[src='x']")).toBeNull();
  });
});
