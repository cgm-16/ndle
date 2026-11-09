import { ActionButton } from "../ActionButton/ActionButton";
import { LanguageToggle } from "../LanguageToggle/LanguageToggle";
import { useI18n } from "../../i18n/I18nContext";
import type { MessageTree } from "../../i18n/messages";
import styles from "./TitleScreen.module.css";

export interface TitleScreenProps {
  onStart(): void;
}

/**
 * The four material rules, in the design's reading order. Each swatch is the
 * material the rule is about — a socket, a ceramic tile, a gold pip, a
 * vermilion pip — which is this system's iconography. The swatch class carries
 * the treatment; the rule text carries the meaning, so a swatch that failed to
 * paint would cost decoration, not information.
 */
const MATERIAL_RULES: { swatch: string; topic: keyof MessageTree["howToPlay"] }[] = [
  { swatch: styles.socket, topic: "capacity" },
  { swatch: styles.tile, topic: "correct" },
  { swatch: styles.gold, topic: "overflow" },
  { swatch: styles.verm, topic: "incorrect" },
];

/** Topics play never teaches on its own. Keyboard controls lead: it is the one
    of the four that no amount of playing reveals. */
const MORE_TOPICS = ["keyboard", "selecting", "slots", "progress"] as const;

export function TitleScreen({ onStart }: TitleScreenProps) {
  const { t } = useI18n();

  return (
    <main className={styles.screen}>
      <h1 className={styles.wordmark}>{t("title.name")}</h1>
      <p className={styles.summary}>{t("title.summary")}</p>
      <ul className={styles.materialRules}>
        {MATERIAL_RULES.map(({ swatch, topic }) => (
          <li key={topic} className={styles.materialRule}>
            <span className={`${styles.swatch} ${swatch}`} aria-hidden="true" />
            <span>{t(`howToPlay.${topic}`)}</span>
          </li>
        ))}
      </ul>
      <details className={styles.details}>
        <summary className={styles.summaryLabel}>{t("title.more")}</summary>
        <ul className={styles.rules}>
          {MORE_TOPICS.map((topic) => (
            <li key={topic}>{t(`howToPlay.${topic}`)}</li>
          ))}
        </ul>
      </details>
      <LanguageToggle />
      <ActionButton onClick={() => onStart()}>{t("action.start")}</ActionButton>
    </main>
  );
}
