import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ActionButton, type ActionButtonProps, type ActionButtonVariant } from "./ActionButton";
import styles from "./ActionButton.module.css";
// Tokens live in :root and are otherwise imported only by main.tsx, which
// this render tree never reaches. Without them var(--accent) is invalid at
// computed-value time, so importing the real tokens keeps the look assertions
// below genuine.
import "../../styles/tokens/colors.css";

function renderButton(overrides: Partial<ActionButtonProps> = {}) {
  const onClick = vi.fn();
  const label = (overrides.children as string) ?? "Go";
  const { getByRole } = render(
    <ActionButton onClick={onClick} {...overrides}>
      {label}
    </ActionButton>,
  );
  return { onClick, button: getByRole("button", { name: label }) };
}

describe("ActionButton", () => {
  it("renders the label as its accessible name", () => {
    renderButton({ children: "Confirm Discard" });
    expect(screen.getByRole("button", { name: "Confirm Discard" })).toBeInTheDocument();
  });

  it("invokes onClick", async () => {
    const { onClick, button } = renderButton();
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is disabled and does not invoke onClick when disabled", async () => {
    const { onClick, button } = renderButton({ disabled: true });
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  describe("variant classes", () => {
    const variants: ActionButtonVariant[] = ["primary", "secondary", "ghost"];

    it.each(variants)("resolves a class for the %s variant", (variant) => {
      expect(styles[variant]).toBeTruthy();
      const { button } = renderButton({ variant });
      expect(button).toHaveClass(styles.button, styles[variant]);
    });

    it("defaults to primary", () => {
      const { button } = renderButton();
      expect(button).toHaveClass(styles.button, styles.primary);
    });
  });

  it("appends a caller's className after its own classes", () => {
    const { button } = renderButton({ className: "screenOwned" });
    expect(button.className).toBe(`${styles.button} ${styles.primary} screenOwned`);
  });

  // Disabled is 45% opacity and nothing else: no edge, no shadow to lose.
  it("fades when disabled, unlike an enabled button", () => {
    const { button: enabled } = renderButton({ children: "Enabled" });
    const { button: disabled } = renderButton({ children: "Disabled", disabled: true });

    expect(getComputedStyle(enabled).opacity).toBe("1");
    expect(getComputedStyle(disabled).opacity).toBe("0.45");
  });

  // Defect 1 guard: the reference implementation used onFocus/onBlur to swap
  // in the focus ring via inline style, which fires on click-focus as well as
  // keyboard focus. This component has no such handlers, so focusing and
  // blurring must never touch the inline style attribute at all.
  it("never mutates inline style on focus or blur", () => {
    const { button } = renderButton();
    fireEvent.focus(button);
    expect(button.getAttribute("style")).toBeNull();
    fireEvent.blur(button);
    expect(button.getAttribute("style")).toBeNull();
  });

  // Defect 2 guard: the reference implementation mutated inline style on
  // onPointerDown and reverted it on onPointerUp, which never fires if the
  // pointer is released off the element — leaving the button stuck looking
  // pressed. This component presses via CSS :active, so there is no inline
  // style for a dangling pointerup to fail to revert.
  it("never mutates inline style when a press is released off the element", () => {
    const { button } = renderButton();
    fireEvent.pointerDown(button);
    fireEvent.pointerUp(document.body);
    expect(button.getAttribute("style")).toBeNull();
  });

  // The assertion above passes just as well if the :active rule is deleted
  // outright — the button silently stops pressing. jsdom cannot enter :active,
  // so the rule is read from the CSSOM instead, the way Tile.test.tsx reads
  // its own composition guard.
  describe("look", () => {
    const ownClasses = Object.values(styles);

    function ownRule(selector: string) {
      return Array.from(document.styleSheets)
        .flatMap((sheet) => Array.from(sheet.cssRules))
        .filter((rule): rule is CSSStyleRule => rule instanceof CSSStyleRule)
        .find((rule) => rule.selectorText === selector && ownClasses.some((name) => rule.selectorText.includes(name)));
    }

    it("presses 1px down through :active, and only while enabled", () => {
      renderButton();
      const press = ownRule(`.${styles.button}:not(:disabled):active`);
      expect(press?.style.transform).toBe("translateY(var(--press-offset))");
      expect(press?.style.boxShadow).toBe("");
    });

    it("fills primary with the accent and slate text, and never a pink token", () => {
      renderButton();
      const primary = ownRule(`.${styles.primary}`);
      expect(primary?.style.background).toBe("var(--accent)");
      expect(primary?.style.color).toBe("var(--text-on-accent)");
      expect(primary?.cssText).not.toMatch(/incorrect|pink|discard/);
    });

    it("outlines secondary in dust and ghost in hairline, both at 1.5px", () => {
      renderButton();
      expect(ownRule(`.${styles.secondary}`)?.style.border).toBe("1.5px solid var(--text-meta)");
      expect(ownRule(`.${styles.ghost}`)?.style.border).toBe("1.5px solid var(--border-hairline)");
    });

    it("sets no text transform, tracking or raised edge", () => {
      renderButton();
      const base = ownRule(`.${styles.button}`);
      expect(base?.style.textTransform).toBe("");
      expect(base?.style.letterSpacing).toBe("");
      expect(base?.style.boxShadow).toBe("");
    });
  });
});
