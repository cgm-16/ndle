import { afterEach, describe, expect, it, vi } from "vitest";
import { LANGUAGE_STORAGE_KEY, getInitialLanguage, saveLanguage } from "./storage";

function setNavigatorLocale(language: string, languages: string[] = [language]) {
  Object.defineProperty(window.navigator, "language", {
    value: language,
    configurable: true,
  });
  Object.defineProperty(window.navigator, "languages", {
    value: languages,
    configurable: true,
  });
}

describe("LANGUAGE_STORAGE_KEY", () => {
  it("is the exact key the spec requires", () => {
    expect(LANGUAGE_STORAGE_KEY).toBe("ndle.language");
  });
});

describe("getInitialLanguage", () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("prefers a valid stored ko over an English browser locale", () => {
    setNavigatorLocale("en-US");
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "ko");

    expect(getInitialLanguage()).toBe("ko");
  });

  it("prefers a valid stored en over a Korean browser locale", () => {
    setNavigatorLocale("ko-KR");
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "en");

    expect(getInitialLanguage()).toBe("en");
  });

  it("chooses Korean for a ko browser locale when storage is absent", () => {
    localStorage.clear();
    setNavigatorLocale("ko");

    expect(getInitialLanguage()).toBe("ko");
  });

  it("chooses Korean for a ko-KR browser locale when the stored value is invalid", () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "fr");
    setNavigatorLocale("ko-KR");

    expect(getInitialLanguage()).toBe("ko");
  });

  it("chooses English for an unrelated browser locale", () => {
    localStorage.clear();
    setNavigatorLocale("fr-FR");

    expect(getInitialLanguage()).toBe("en");
  });

  it("chooses English when the browser reports no locale", () => {
    localStorage.clear();
    setNavigatorLocale("", []);

    expect(getInitialLanguage()).toBe("en");
  });

  it("chooses Korean when navigator.language matches even if the first languages entry does not", () => {
    localStorage.clear();
    setNavigatorLocale("ko-KR", ["en-US"]);

    expect(getInitialLanguage()).toBe("ko");
  });

  it("chooses Korean when the first languages entry matches even if navigator.language does not", () => {
    localStorage.clear();
    setNavigatorLocale("fr-FR", ["ko-KR"]);

    expect(getInitialLanguage()).toBe("ko");
  });

  it("falls back to browser detection without crashing when reading storage throws", () => {
    setNavigatorLocale("ko-KR");
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage blocked");
    });

    expect(() => getInitialLanguage()).not.toThrow();
    expect(getInitialLanguage()).toBe("ko");
  });
});

describe("saveLanguage", () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("writes only the language storage key", () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");

    saveLanguage("ko");

    expect(setItemSpy).toHaveBeenCalledTimes(1);
    expect(setItemSpy).toHaveBeenCalledWith(LANGUAGE_STORAGE_KEY, "ko");
  });

  it("does not throw when writing to storage fails", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage blocked");
    });

    expect(() => saveLanguage("en")).not.toThrow();
  });
});
