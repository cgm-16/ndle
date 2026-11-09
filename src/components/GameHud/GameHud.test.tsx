import { cleanup, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "../../i18n/I18nContext";
import { GameHud, type GameHudProps } from "./GameHud";
import styles from "./GameHud.module.css";

function hudTree(props: GameHudProps) {
  return (
    <I18nProvider initialLanguage="en">
      <GameHud {...props} />
    </I18nProvider>
  );
}

function renderHud(overrides: Partial<GameHudProps> = {}) {
  const props: GameHudProps = { score: 0, currentStreak: 0, round: 1, ...overrides };
  const view = render(hudTree(props));
  return {
    ...view,
    rerenderHud: (next: Partial<GameHudProps>) => view.rerender(hudTree({ ...props, ...next })),
  };
}

// The same reach App.test.tsx's hudField uses, so what these tests read is what
// that suite reads.
const streakValue = () => screen.getByText("Streak").nextElementSibling as HTMLElement;
const fallen = (container: HTMLElement) => container.querySelector(`.${styles.counterFall}`);
const zero = (container: HTMLElement) => container.querySelector(`.${styles.counterZero}`);

describe("GameHud", () => {
  it("states a par only when given one, after the three figures", () => {
    renderHud({ par: 7 });
    const terms = screen.getAllByRole("term").map((term) => term.textContent);
    expect(terms).toEqual(["Round", "Score", "Streak", "Par"]);
    expect(screen.getByText("Par").nextElementSibling).toHaveTextContent("7");
    cleanup();

    renderHud();
    expect(screen.queryByText("Par")).not.toBeInTheDocument();
  });

  it("labels round, score and streak with their values", () => {
    renderHud({ score: 12, currentStreak: 3, round: 4 });
    expect(screen.getByText("Round").nextElementSibling).toHaveTextContent("4");
    expect(screen.getByText("Score").nextElementSibling).toHaveTextContent("12");
    expect(streakValue()).toHaveTextContent("3");
  });
});

/* 10e. The gating is what jsdom can decide — which streak transitions produce
   the fall, and which elements carry it. Duration and appearance are measured
   in a browser. */
describe("GameHud streak break", () => {
  it("drops the old count and fades a zero in beneath it, as siblings", () => {
    const { container, rerenderHud } = renderHud({ currentStreak: 7 });
    rerenderHud({ currentStreak: 0 });

    const falling = fallen(container);
    const arriving = zero(container);
    expect(falling).not.toBeNull();
    expect(arriving).not.toBeNull();
    // Siblings, never nested: two stacked opacities multiply, and the fall goes
    // invisible for exactly the half of the duration that should read.
    expect(falling!.parentElement).toBe(arriving!.parentElement);
    expect(arriving!.contains(falling!)).toBe(false);
    expect(getComputedStyle(falling!).animationName).toBe("oz-counter-fall");
    expect(getComputedStyle(arriving!).animationName).toBe("oz-counter-zero");
  });

  it("falls the streak it is replacing, which is no longer in state", () => {
    const { container, rerenderHud } = renderHud({ currentStreak: 7 });
    rerenderHud({ currentStreak: 0 });
    expect(fallen(container)).toHaveAttribute("data-fallen", "7");
  });

  /* The falling count is a leftover, not a value: it is drawn by content:
     attr() so it stays out of textContent — App.test.tsx reads the streak as
     dd.textContent and a break must still read "0" — and hidden from assistive
     tech, which does see generated content. */
  it("reads as the current streak alone, in text and to assistive tech", () => {
    const { container, rerenderHud } = renderHud({ currentStreak: 7 });
    rerenderHud({ currentStreak: 0 });
    expect(streakValue().textContent).toBe("0");
    expect(fallen(container)).toHaveAttribute("aria-hidden", "true");
  });

  it("does not fall on a rising streak", () => {
    const { container, rerenderHud } = renderHud({ currentStreak: 4 });
    rerenderHud({ currentStreak: 5 });
    expect(fallen(container)).toBeNull();
    expect(zero(container)).toBeNull();
  });

  it("does not fall on the first render of a run", () => {
    const { container } = renderHud({ currentStreak: 0 });
    expect(fallen(container)).toBeNull();
  });

  it("does not fall when a run resumes mid-streak", () => {
    const { container } = renderHud({ currentStreak: 7 });
    expect(fallen(container)).toBeNull();
  });

  it("clears the fallen count once the streak starts again", () => {
    const { container, rerenderHud } = renderHud({ currentStreak: 7 });
    rerenderHud({ currentStreak: 0 });
    rerenderHud({ currentStreak: 1 });
    expect(fallen(container)).toBeNull();
    expect(streakValue().textContent).toBe("1");
  });
});
