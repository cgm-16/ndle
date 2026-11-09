import type { Language } from "../game/types";

export const LANGUAGE_STORAGE_KEY = "ndle.language";

function isValidLanguage(value: unknown): value is Language {
  return value === "en" || value === "ko";
}

function beginsWithKo(locale: string | undefined): boolean {
  return typeof locale === "string" && locale.toLowerCase().startsWith("ko");
}

function detectBrowserLanguage(): Language {
  const languages = navigator.languages;
  const firstLanguagesEntry = languages && languages.length > 0 ? languages[0] : undefined;
  return beginsWithKo(navigator.language) || beginsWithKo(firstLanguagesEntry) ? "ko" : "en";
}

export function getInitialLanguage(): Language {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isValidLanguage(stored)) return stored;
  } catch {
    // localStorage may be unavailable (privacy mode, disabled storage, etc.); fall back to browser detection.
  }
  return detectBrowserLanguage();
}

export function saveLanguage(language: Language): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Ignore storage failures; the selection still applies in memory for this session.
  }
}
