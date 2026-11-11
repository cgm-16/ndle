import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Language } from "../../game/types";
import { I18nProvider } from "../../i18n/I18nContext";
import { TopBar } from "./TopBar";

function renderBar(language: Language, props: Parameters<typeof TopBar>[0]) {
  return render(
    <I18nProvider initialLanguage={language}>
      <TopBar {...props} />
    </I18nProvider>,
  );
}

describe("TopBar", () => {
  it("puts Back first in tab order, then the language toggle", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderBar("en", { onBack, label: "#12" });

    await user.tab();
    expect(screen.getByRole("button", { name: "Back" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "English" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it.each([
    ["en", "9dle", "Back"],
    ["ko", "구들", "뒤로"],
  ] as const)("shows the wordmark and the label in %s", (language, wordmark, back) => {
    renderBar(language, { onBack: () => {}, label: "#12" });

    expect(screen.getByText(wordmark)).toBeInTheDocument();
    expect(screen.getByText("#12")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: back })).toBeInTheDocument();
  });

  it("renders only the language toggle without Back or a label", () => {
    renderBar("en", {});

    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Back" })).not.toBeInTheDocument();
    expect(screen.queryByText("9dle")).not.toBeInTheDocument();
  });

  it("shows EN and 한 on the toggle while keeping the full language names", () => {
    renderBar("en", {});

    expect(screen.getByRole("button", { name: "English" })).toHaveTextContent("EN");
    expect(screen.getByRole("button", { name: "한국어" })).toHaveTextContent("한");
  });
});
