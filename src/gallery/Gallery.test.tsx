import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "../i18n/I18nContext";
import { Gallery } from "./Gallery";

describe("gallery shell", () => {
  // All three gameOver entries mount GameOverScreen at the same position in
  // the tree, so without an identity key React reconciles them into one
  // instance and its local share status survives the switch. The gallery
  // exists so a developer can trust what an entry renders on its own; a
  // status that depends on which entry was visited first defeats that.
  it("does not carry a share status from one game-over entry to the next", async () => {
    const user = userEvent.setup();
    render(
      <I18nProvider initialLanguage="en">
        <Gallery />
      </I18nProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Game over — copy failed" }));
    await user.click(screen.getByRole("button", { name: "Copy Result" }));
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Could not share or copy the result.");
    });

    await user.click(screen.getByRole("button", { name: "Game over — Practice, par made" }));
    expect(screen.getByRole("status").textContent).toBe("");
  });
});
