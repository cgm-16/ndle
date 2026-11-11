import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../i18n/I18nContext";
import { TitleScreen, type DailyEntry } from "./TitleScreen";

const props = (daily: DailyEntry = { status: "open", number: 3 }) => ({
  daily,
  onDaily: vi.fn(),
  onPractice: vi.fn(),
});

describe("TitleScreen", () => {
  it.each([
    [{ status: "open", number: 3 }, "Daily #3", "오늘의 판 #3"],
    [{ status: "played", number: 3 }, "Today's result #3", "오늘의 결과 #3"],
    [{ status: "none" }, "No table today", "오늘은 판이 없습니다"],
  ] as const)("labels the %j Daily entry in both languages", async (daily, en, ko) => {
    render(
      <I18nProvider initialLanguage="en">
        <TitleScreen {...props(daily)} />
      </I18nProvider>,
    );
    expect(screen.getByRole("button", { name: en })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Practice" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "한국어" }));
    expect(screen.getByRole("button", { name: ko })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "연습" })).toBeInTheDocument();
  });

  it("disables the Daily entry when there is no table, and keeps Practice enabled", async () => {
    const p = props({ status: "none" });
    render(
      <I18nProvider initialLanguage="en">
        <TitleScreen {...p} />
      </I18nProvider>,
    );
    expect(screen.getByRole("button", { name: "No table today" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Practice" }));
    expect(p.onPractice).toHaveBeenCalledTimes(1);
    expect(p.onDaily).not.toHaveBeenCalled();
  });

  it("opens the Daily from its entry", async () => {
    const p = props();
    render(
      <I18nProvider initialLanguage="en">
        <TitleScreen {...p} />
      </I18nProvider>,
    );
    expect(screen.getByRole("heading", { name: "9dle" })).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Daily #3" }));
    expect(p.onDaily).toHaveBeenCalledTimes(1);
    expect(p.onPractice).not.toHaveBeenCalled();
  });

  it("keeps the expanded rules collapsed by default and reveals them on request", async () => {
    render(
      <I18nProvider initialLanguage="en">
        <TitleScreen {...props()} />
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
        <TitleScreen {...props()} />
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
        <TitleScreen {...props()} />
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
        <TitleScreen {...props()} />
      </I18nProvider>,
    );

    expect(screen.getByRole("button", { name: "Practice" })).toBeInTheDocument();
    expect(screen.getByText("More")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "한국어" }));

    expect(screen.getByRole("heading", { name: "구들" })).toBeVisible();
    expect(screen.getByRole("button", { name: "연습" })).toBeInTheDocument();
    expect(screen.getByText("더 보기")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "언어" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "English" }));

    expect(screen.getByRole("button", { name: "Practice" })).toBeInTheDocument();
  });

  it("names the game 9dle in plain text, with no mark", () => {
    const { container } = render(
      <I18nProvider initialLanguage="en">
        <TitleScreen {...props()} />
      </I18nProvider>,
    );

    expect(screen.getByRole("heading", { name: "9dle" })).toHaveTextContent(/^9dle$/);
    expect(container).not.toHaveTextContent("\u2733");
  });

  // Cascade resolution, which jsdom does decide. The screen carries no motion
  // of its own: §1.12's inventory names no title entrance.
  it("animates nothing on the screen", () => {
    const { container } = render(
      <I18nProvider initialLanguage="en">
        <TitleScreen {...props()} />
      </I18nProvider>,
    );

    for (const element of container.querySelectorAll("*")) {
      expect(getComputedStyle(element).animationName).toBe("none");
    }
  });
});
