import { StrictMode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageToggle } from "../components/LanguageToggle/LanguageToggle";
import { I18nProvider } from "./I18nContext";

const KOREAN_FONT_SPECIFIER = "@fontsource/gothic-a1/korean-400.css";

// Node reports unhandled rejections on `process`, and @types/node is not among
// this project's tsconfig `types`, so the two methods used below are declared
// here rather than by widening the app's global types.
declare const process: {
  on(event: "unhandledRejection", listener: () => void): void;
  off(event: "unhandledRejection", listener: () => void): void;
};

describe("loadKoreanFont", () => {
  afterEach(() => {
    vi.doUnmock(KOREAN_FONT_SPECIFIER);
    vi.resetModules();
  });

  it("dynamically imports the Korean face only once across repeated calls", async () => {
    const cssImport = vi.fn().mockResolvedValue({});
    vi.doMock(KOREAN_FONT_SPECIFIER, cssImport);
    const { loadKoreanFont } = await import("./koreanFont");

    // The module registry alone would already dedupe repeated import() calls
    // to the same specifier, so a call count of 1 doesn't by itself prove
    // koreanFont.ts caches anything. The same-instance check below is what
    // the registry cannot fake: it only holds if loadKoreanFont remembers
    // and returns its first promise rather than deriving a fresh one.
    const first = loadKoreanFont();
    const second = loadKoreanFont();
    const third = loadKoreanFont();
    expect(second).toBe(first);
    expect(third).toBe(first);

    await first;

    expect(cssImport).toHaveBeenCalledTimes(1);
  });

  it("does not throw or warn when the import rejects", async () => {
    const cssImport = vi.fn(() => {
      throw new Error("font fetch failed");
    });
    vi.doMock(KOREAN_FONT_SPECIFIER, cssImport);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { loadKoreanFont } = await import("./koreanFont");

    await expect(loadKoreanFont()).resolves.toBeUndefined();

    // Confirms the mock actually intercepted the specifier rather than the
    // real font module quietly loading and resolving instead.
    expect(cssImport).toHaveBeenCalledTimes(1);
    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
  });
});

describe("I18nProvider Korean font loading", () => {
  it("does not load the Korean face for the English locale", () => {
    const loadKoreanFont = vi.fn().mockResolvedValue(undefined);

    render(
      <I18nProvider initialLanguage="en" loadKoreanFont={loadKoreanFont}>
        <div />
      </I18nProvider>,
    );

    expect(loadKoreanFont).not.toHaveBeenCalled();
  });

  it("loads the Korean face on mount when the initial language is Korean", () => {
    const loadKoreanFont = vi.fn().mockResolvedValue(undefined);

    render(
      <I18nProvider initialLanguage="ko" loadKoreanFont={loadKoreanFont}>
        <div />
      </I18nProvider>,
    );

    expect(loadKoreanFont).toHaveBeenCalledTimes(1);
  });

  it("loads the Korean face when the language switches to Korean", async () => {
    const loadKoreanFont = vi.fn().mockResolvedValue(undefined);

    render(
      <I18nProvider initialLanguage="en" loadKoreanFont={loadKoreanFont}>
        <LanguageToggle />
      </I18nProvider>,
    );
    expect(loadKoreanFont).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "한국어" }));

    expect(loadKoreanFont).toHaveBeenCalledTimes(1);
  });

  it("renders without an unhandled rejection when the injected loader rejects", async () => {
    const unhandledRejection = vi.fn();
    process.on("unhandledRejection", unhandledRejection);
    // A plain function, not vi.fn: the spy records settled results, which means
    // it attaches its own handler to the promise it returns and no rejection
    // passed through it can ever go unhandled. Counting calls by hand is what
    // keeps this test able to fail.
    let calls = 0;
    const loadKoreanFont = () => {
      calls += 1;
      return Promise.reject(new Error("font fetch failed"));
    };

    render(
      <I18nProvider initialLanguage="ko" loadKoreanFont={loadKoreanFont}>
        <span>child</span>
      </I18nProvider>,
    );

    // Node reports an unhandled rejection a macrotask after the microtask
    // queue drains, so the listener has to outlive one turn to be conclusive.
    await new Promise((resolve) => setTimeout(resolve, 0));
    process.off("unhandledRejection", unhandledRejection);

    expect(calls).toBe(1);
    expect(unhandledRejection).not.toHaveBeenCalled();
    expect(screen.getByText("child")).toBeInTheDocument();
  });

  it("does not call the injected loader again while the language stays Korean", async () => {
    const loadKoreanFont = vi.fn().mockResolvedValue(undefined);

    render(
      <I18nProvider initialLanguage="ko" loadKoreanFont={loadKoreanFont}>
        <LanguageToggle />
      </I18nProvider>,
    );
    expect(loadKoreanFont).toHaveBeenCalledTimes(1);

    // Already Korean; re-clicking does not change the language state, so the
    // effect must not fire again.
    await userEvent.click(screen.getByRole("button", { name: "한국어" }));

    expect(loadKoreanFont).toHaveBeenCalledTimes(1);
  });
});

describe("I18nProvider wired to the real Korean font loader", () => {
  afterEach(() => {
    vi.doUnmock(KOREAN_FONT_SPECIFIER);
    vi.resetModules();
  });

  it("fetches the Korean face exactly once when toggled en → ko → en → ko", async () => {
    const cssImport = vi.fn().mockResolvedValue({});
    vi.doMock(KOREAN_FONT_SPECIFIER, cssImport);
    const { I18nProvider: FreshI18nProvider } = await import("./I18nContext");
    const { LanguageToggle: FreshLanguageToggle } = await import(
      "../components/LanguageToggle/LanguageToggle"
    );

    render(
      <StrictMode>
        <FreshI18nProvider initialLanguage="en">
          <FreshLanguageToggle />
        </FreshI18nProvider>
      </StrictMode>,
    );

    const koreanButton = screen.getByRole("button", { name: "한국어" });
    const englishButton = screen.getByRole("button", { name: "English" });

    await userEvent.click(koreanButton);
    await userEvent.click(englishButton);
    await userEvent.click(koreanButton);

    await waitFor(() => expect(cssImport).toHaveBeenCalledTimes(1));
  });

  // The test above mounts at initialLanguage="en", so StrictMode's doubled
  // mount effect runs while language is still "en" and never calls the
  // loader; every loadKoreanFont() call there comes from a later update
  // effect, which StrictMode does not double-invoke. Mounting directly into
  // Korean is what actually exercises the doubled mount effect this app
  // hits in production, since I18nProvider is mounted inside StrictMode in
  // both src/main.tsx and src/gallery/main.tsx.
  it("fetches the Korean face exactly once when mounted directly into Korean under StrictMode", async () => {
    const cssImport = vi.fn().mockResolvedValue({});
    vi.doMock(KOREAN_FONT_SPECIFIER, cssImport);
    const { I18nProvider: FreshI18nProvider } = await import("./I18nContext");

    render(
      <StrictMode>
        <FreshI18nProvider initialLanguage="ko">
          <div />
        </FreshI18nProvider>
      </StrictMode>,
    );

    await waitFor(() => expect(cssImport).toHaveBeenCalledTimes(1));
  });
});
