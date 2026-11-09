import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../i18n/I18nContext";
import { TitleScreen } from "./TitleScreen";
import styles from "./TitleScreen.module.css";

describe("TitleScreen", () => {
  it("starts a run with no mode to choose", async () => {
    const onStart = vi.fn();
    render(
      <I18nProvider initialLanguage="en">
        <TitleScreen onStart={onStart} />
      </I18nProvider>,
    );
    expect(screen.queryByRole("group", { name: "Mode" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Start Run" }));
    expect(onStart).toHaveBeenCalledWith();
  });

  it("starts only from the explicit action", async () => {
    const onStart = vi.fn();
    render(
      <I18nProvider initialLanguage="en">
        <TitleScreen onStart={onStart} />
      </I18nProvider>,
    );
    expect(screen.getByRole("heading", { name: "ozterisk" })).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Start Run" }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("does not start the run before the button is pressed", () => {
    const onStart = vi.fn();
    render(
      <I18nProvider initialLanguage="en">
        <TitleScreen onStart={onStart} />
      </I18nProvider>,
    );

    expect(onStart).not.toHaveBeenCalled();
  });

  it("keeps the expanded rules collapsed by default and reveals them on request", async () => {
    render(
      <I18nProvider initialLanguage="en">
        <TitleScreen onStart={vi.fn()} />
      </I18nProvider>,
    );

    const summary = screen.getByText("More");
    const disclosure = summary.closest("details");
    expect(disclosure).not.toBeNull();
    expect(disclosure).not.toHaveAttribute("open");

    await userEvent.click(summary);

    expect(disclosure).toHaveAttribute("open");
  });

  it("explains every required rule topic once expanded", async () => {
    render(
      <I18nProvider initialLanguage="en">
        <TitleScreen onStart={vi.fn()} />
      </I18nProvider>,
    );

    await userEvent.click(screen.getByText("More"));

    // selecting and returning tiles
    expect(
      screen.getByText(/Click or tap an inventory tile to place it/),
    ).toBeInTheDocument();
    // ordered answer slots
    expect(
      screen.getByText(/Answer slots fill in the order you select tiles/),
    ).toBeInTheDocument();
    // the printed pay, and correct and incorrect outcomes
    expect(
      screen.getByText(/A correct answer spends its tiles and pays the digits printed on its row/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/An incorrect answer removes the tiles you spent/),
    ).toBeInTheDocument();
    // five-tile capacity
    expect(screen.getByText(/Your hand holds at most five tiles/)).toBeInTheDocument();
    // overflow discarding
    expect(
      screen.getByText(/choose one tile to discard before play continues/),
    ).toBeInTheDocument();
    // par
    expect(screen.getByText(/Par is the best score the table allows/)).toBeInTheDocument();
    // score, streak, round, and the end of a table
    expect(
      screen.getByText(/Round shows which row of the table is current, score counts correct answers/),
    ).toBeInTheDocument();
    expect(screen.getByText(/The table ends after row 8/)).toBeInTheDocument();
    // keyboard controls
    expect(
      screen.getByText(/Press a digit key to select a matching tile/),
    ).toBeInTheDocument();
  });

  it("states the four material rules on the felt, outside the disclosure", () => {
    render(
      <I18nProvider initialLanguage="en">
        <TitleScreen onStart={vi.fn()} />
      </I18nProvider>,
    );

    // getByText reaches inside a closed <details>, so presence alone would pass
    // even if every rule were still in the panel. The closest("details") check
    // is what makes this a test of where the rules are.
    for (const rule of [
      /Your hand holds at most five tiles/,
      /A correct answer spends its tiles and pays the digits printed on its row/,
      /choose one tile to discard before play continues/,
      /An incorrect answer removes the tiles you spent/,
    ]) {
      expect(screen.getByText(rule).closest("details")).toBeNull();
    }

    expect(screen.getByText("More").closest("details")).not.toHaveAttribute("open");
  });

  it("switches all visible copy live when the language toggle changes languages", async () => {
    render(
      <I18nProvider initialLanguage="en">
        <TitleScreen onStart={vi.fn()} />
      </I18nProvider>,
    );

    expect(screen.getByRole("button", { name: "Start Run" })).toBeInTheDocument();
    expect(screen.getByText("More")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "한국어" }));

    expect(screen.getByRole("heading", { name: "ozterisk" })).toBeVisible();
    expect(screen.getByRole("button", { name: "게임 시작" })).toBeInTheDocument();
    expect(screen.getByText("더 보기")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "언어" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "English" }));

    expect(screen.getByRole("button", { name: "Start Run" })).toBeInTheDocument();
  });

  // 11C. Cascade resolution, which jsdom does decide; that the mark actually
  // settles, and over how long, is T56's to measure in a browser.
  it("settles the mark on entrance and animates nothing else on the screen", () => {
    const { container } = render(
      <I18nProvider initialLanguage="en">
        <TitleScreen onStart={vi.fn()} />
      </I18nProvider>,
    );

    const mark = container.querySelector(`.${styles.markTile}`);
    expect(mark).not.toBeNull();
    expect(getComputedStyle(mark as Element).animationName).toBe("oz-title-settle");

    // The mark settles; the screen does not. A staggered sequence across the
    // wordmark, the rules and the button would be decorative motion outside
    // §1.12's named inventory, and the rules are the first thing a new player
    // reads.
    for (const element of container.querySelectorAll("*")) {
      if (element === mark) continue;
      expect(getComputedStyle(element).animationName).toBe("none");
    }
  });
});
