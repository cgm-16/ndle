import { useI18n } from "../../i18n/I18nContext";
import { ActionButton } from "../ActionButton/ActionButton";
import { LanguageToggle } from "../LanguageToggle/LanguageToggle";
import styles from "./TopBar.module.css";

export interface TopBarProps {
  /** Shown on the game and game-over screens; omitted on the title. */
  onBack?: () => void;
  /** The centre label: "#12" for a Daily, "Practice" for Practice; omitted on the title. */
  label?: string;
}

/** The one bar every screen shares: Back at the left edge, the wordmark and label in the centre, the language toggle at the right. */
export function TopBar({ onBack, label }: TopBarProps) {
  const { t } = useI18n();

  return (
    <header className={styles.bar}>
      {/* Not a move: a Daily keeps its record. It comes first in tab order. */}
      {onBack && (
        <ActionButton variant="ghost" className={styles.back} onClick={onBack}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 3 5 9l6 6" />
          </svg>
          {t("action.back")}
        </ActionButton>
      )}
      {label !== undefined && (
        <p className={styles.centre}>
          <span className={styles.wordmark}>{t("title.name")}</span>
          <span className={styles.label}>{label}</span>
        </p>
      )}
      <LanguageToggle />
    </header>
  );
}
