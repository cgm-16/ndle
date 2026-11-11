export type Locale = "en" | "ko";

/* `title.practice` in both locales. The accessible name is the only stable handle
   on the control that moves the app out of `title`, and both e2e specs need to
   get past it before they can measure anything. */
export const START_LABEL: Record<Locale, string> = {
  en: "Practice",
  ko: "연습",
};
