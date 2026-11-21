import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "../i18n/I18nContext";
import { Gallery } from "./Gallery";

describe("gallery shell", () => {
  it("renders one state with the top bar and no picker for ?state=<id>", () => {
    window.history.replaceState(null, "", "/gallery.html?state=answering-empty");
    try {
      render(
        <I18nProvider initialLanguage="en">
          <Gallery />
        </I18nProvider>,
      );
      expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
      expect(screen.getByText("Practice")).toBeInTheDocument();
      expect(screen.getByRole("list", { name: "Table" })).toBeInTheDocument();
      expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    } finally {
      window.history.replaceState(null, "", "/");
    }
  });

  it("falls back to the default gallery for an unknown state id", () => {
    window.history.replaceState(null, "", "/gallery.html?state=nope");
    try {
      render(
        <I18nProvider initialLanguage="en">
          <Gallery />
        </I18nProvider>,
      );
      expect(screen.getByRole("navigation")).toBeInTheDocument();
    } finally {
      window.history.replaceState(null, "", "/");
    }
  });

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
