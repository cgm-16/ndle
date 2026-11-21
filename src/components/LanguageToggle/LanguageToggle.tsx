import type { Language } from "../../game/types";
import { useI18n } from "../../i18n/I18nContext";
import styles from "./LanguageToggle.module.css";

// Language names are language-invariant labels, not translated copy: "English"
// always reads "English" and "한국어" always reads "한국어", regardless of the
// interface language currently active. The accessible name is the full name;
// the visible text is its short form.
const LANGUAGES: ReadonlyArray<{ code: Language; name: string; short: string }> = [
  { code: "en", name: "English", short: "EN" },
  { code: "ko", name: "한국어", short: "한" },
];

export function LanguageToggle() {
  const { language, setLanguage, t } = useI18n();

  return (
    <div className={styles.toggle} role="group" aria-label={t("language.groupLabel")}>
      {LANGUAGES.map(({ code, name, short }) => (
        <button
          key={code}
          type="button"
          className={styles.button}
          aria-label={name}
          aria-pressed={language === code}
          onClick={() => setLanguage(code)}
        >
          {short}
        </button>
      ))}
    </div>
  );
}
