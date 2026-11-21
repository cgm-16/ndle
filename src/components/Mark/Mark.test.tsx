import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "../../i18n/I18nContext";
import type { Language } from "../../game/types";
import { Mark } from "./Mark";

function shapeOf(language: Language, result: "correct" | "incorrect") {
  const { container } = render(
    <I18nProvider initialLanguage={language}>
      <Mark result={result} />
    </I18nProvider>,
  );
  const svg = container.querySelector("svg")!;
  expect(svg).toHaveAttribute("aria-hidden", "true");
  return svg.getAttribute("data-shape");
}

describe("Mark", () => {
  it.each([
    ["en", "correct", "check"],
    ["ko", "correct", "circle"],
    ["en", "incorrect", "cross"],
    ["ko", "incorrect", "cross"],
  ] as const)("draws %s %s as %s", (language, result, shape) => {
    expect(shapeOf(language, result)).toBe(shape);
  });
});
