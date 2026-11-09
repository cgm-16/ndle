import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../i18n/I18nContext";
import { Tile, type TileProps, type TileSize, type TileState } from "./Tile";
import styles from "./Tile.module.css";

function renderTile(overrides: Partial<TileProps> = {}) {
  render(
    <I18nProvider initialLanguage="en">
      <Tile value={{ digit: 7 }} {...overrides} />
    </I18nProvider>,
  );
}

describe("Tile", () => {
  describe("face tiles (§1.4a)", () => {
    function renderFace(value: TileProps["value"], language: "en" | "ko" = "en") {
      render(
        <I18nProvider initialLanguage={language}>
          <Tile value={value} onClick={vi.fn()} />
        </I18nProvider>,
      );
      return screen.getByRole("button");
    }

    it("engraves Neighbours as its range and names it by its digits", () => {
      const button = renderFace({ face: "nbr", centre: 4 });
      expect(button).toHaveTextContent("3–5");
      expect(button).toHaveAccessibleName("Digits 3 to 5");
      expect(button).toHaveClass(styles.face!);
    });

    it("names Neighbours in Korean", () => {
      expect(renderFace({ face: "nbr", centre: 4 }, "ko")).toHaveAccessibleName("숫자 3–5");
    });

    it.each([
      ["wild", "✳", "Wildcard: any digit"],
      ["odd", "O", "Odd tile: 1, 3, 5, 7, or 9"],
      ["even", "E", "Even tile: 0, 2, 4, 6, or 8"],
      ["low", "0–4", "Digits 0 to 4"],
      ["high", "5–9", "Digits 5 to 9"],
    ] as const)("engraves %s as %s and names its set", (face, glyph, name) => {
      const button = renderFace({ face });
      expect(button).toHaveTextContent(glyph);
      expect(button).toHaveAccessibleName(name);
    });

    it("gives a digit tile no face class", () => {
      expect(renderFace({ digit: 7 })).not.toHaveClass(styles.face!);
    });
  });

  describe("element rule", () => {
    it("renders a button when onClick is given", () => {
      renderTile({ onClick: vi.fn() });
      expect(screen.getByRole("button", { name: "Digit 7" })).toBeInTheDocument();
    });

    it("still renders a button when a clickable tile is disabled", async () => {
      const onClick = vi.fn();
      renderTile({ onClick, state: "disabled" });
      const button = screen.getByRole("button", { name: "Digit 7" });
      expect(button).toBeDisabled();
      await userEvent.click(button);
      expect(onClick).not.toHaveBeenCalled();
    });

    it("renders no button role when onClick is omitted", () => {
      renderTile();
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(screen.getByText("7")).toBeInTheDocument();
    });

    it("gives a roleless tile no accessible name of its own", () => {
      renderTile({ label: "New tile" });
      expect(screen.queryByLabelText("New tile")).not.toBeInTheDocument();
    });

    it("invokes the callback on click", async () => {
      const onClick = vi.fn();
      renderTile({ onClick });
      await userEvent.click(screen.getByRole("button", { name: "Digit 7" }));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("uses the caller's label over the default digit name", () => {
      renderTile({ onClick: vi.fn(), label: "Answer slot 1: 7" });
      expect(screen.getByRole("button", { name: "Answer slot 1: 7" })).toBeInTheDocument();
    });

    it("reports a pressed toggle", () => {
      renderTile({ onClick: vi.fn(), state: "marked", pressed: true });
      expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
    });

    // The off-state is the half that matters: a toggle reporting only "true"
    // leaves every unpressed tile announcing as a plain button, so nothing
    // says it can be pressed at all.
    it("reports an unpressed toggle rather than omitting the state", () => {
      renderTile({ onClick: vi.fn(), pressed: false });
      expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
    });

    it("is a plain button when no toggle state is given", () => {
      renderTile({ onClick: vi.fn() });
      expect(screen.getByRole("button")).not.toHaveAttribute("aria-pressed");
    });
  });

  // A missing CSS Module key renders class="undefined" with no error and no
  // test failure (https://github.com/cgm-16/ozterisk/blob/main/docs/journal/journal-2026-08-09.md), so every state and size
  // is asserted to resolve to a real class.
  describe("state and size classes", () => {
    const states: TileState[] = ["resting", "lifted", "reward", "marked", "disabled"];

    it.each(states)("resolves a class for the %s state", (state) => {
      expect(styles[state]).toBeTruthy();
      renderTile({ onClick: vi.fn(), state });
      expect(screen.getByRole("button")).toHaveClass(styles.tile, styles[state]);
    });

    const sizes: TileSize[] = ["lg", "sm"];

    it.each(sizes)("resolves a class for the %s size", (size) => {
      expect(styles[size]).toBeTruthy();
      renderTile({ onClick: vi.fn(), size });
      expect(screen.getByRole("button")).toHaveClass(styles.tile, styles[size]);
    });

    it("defaults to a resting lg tile", () => {
      renderTile({ onClick: vi.fn() });
      expect(screen.getByRole("button")).toHaveClass(styles.tile, styles.lg, styles.resting);
    });

    it("carries the same classes on the roleless form", () => {
      renderTile({ size: "sm", state: "reward" });
      expect(screen.getByText("7")).toHaveClass(styles.tile, styles.sm, styles.reward);
    });
  });

  // A press has to add its offset to whatever the state already does. If any
  // state class declares `transform` itself, the press rule replaces it rather
  // than composing with it, and a marked tile snaps flat and un-rotates the
  // moment it is touched. Measured in the browser: marked sits at
  // translateY(-5px) rotate(6deg), and marked-while-pressed at -3px / 6deg.
  describe("press composition", () => {
    // Every class this module owns, so a state rule cannot escape the check by
    // having a selector that never mentions .tile — which is exactly how the
    // first version of this test passed while the invariant was broken.
    const ownClasses = Object.values(styles);

    function ownRules() {
      return Array.from(document.styleSheets)
        .flatMap((sheet) => Array.from(sheet.cssRules))
        .filter((rule): rule is CSSStyleRule => rule instanceof CSSStyleRule)
        .filter((rule) => ownClasses.some((name) => rule.selectorText.includes(name)));
    }

    it("declares transform in exactly one rule, the base one", () => {
      renderTile({ onClick: vi.fn(), state: "marked" });
      const declaring = ownRules().filter((rule) => rule.style.transform !== "");
      expect(declaring.map((rule) => rule.selectorText)).toEqual([`.${styles.tile}`]);
    });

    it("drives the state offsets through custom properties", () => {
      renderTile({ onClick: vi.fn(), state: "marked" });
      const base = ownRules().find((rule) => rule.selectorText === `.${styles.tile}`);
      expect(base?.style.transform).toContain("var(--tile-press)");
      expect(base?.style.transform).toContain("var(--tile-lift)");
      expect(base?.style.transform).toContain("var(--tile-tilt)");
    });

    it("presses only the button form, and only when enabled", () => {
      renderTile({ onClick: vi.fn() });
      const press = ownRules().find((rule) => rule.selectorText.includes(":active"));
      expect(press?.selectorText).toBe(`button.${styles.tile}:not(:disabled):active`);
      expect(press?.style.getPropertyValue("--tile-press")).toBe("var(--press-offset)");
    });
  });

});
