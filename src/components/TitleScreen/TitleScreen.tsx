import { ActionButton } from "../ActionButton/ActionButton";
import { useI18n } from "../../i18n/I18nContext";
import { messages } from "../../i18n/messages";
import styles from "./TitleScreen.module.css";

export type DailyEntry =
  | { status: "open"; number: number }
  | { status: "played"; number: number }
  | { status: "none" };

export interface TitleScreenProps {
  daily: DailyEntry;
  onDaily(): void;
  onPractice(): void;
}

/**
 * The topics the three steps do not state. Keyboard controls come last: no
 * amount of playing reveals them, so they sit where a player who opened More
 * will read on.
 */
const MORE_TOPICS = ["selecting", "slots", "incorrect", "overflow", "progress", "keyboard"] as const;

const STEPS = ["how1", "how2", "how3"] as const;

export function TitleScreen({ daily, onDaily, onPractice }: TitleScreenProps) {
  const { t } = useI18n();

  return (
    <main className={styles.screen}>
      <div className={styles.top}>
        <h1 className={styles.wordmark}>
          <span lang="en" className={styles.english}>{messages.en.title.name}</span>{" "}
          <span lang="ko" className={styles.korean}>{messages.ko.title.name}</span>
        </h1>
        <p className={styles.tagline}>{t("title.tagline")}</p>
        <ol
          className={styles.steps}
          // WebKit strips list semantics from unstyled lists, so the order goes with them.
          role="list"
        >
          {STEPS.map((step, index) => (
            <li key={step} className={styles.step}>
              <span className={styles.numeral} aria-hidden="true">{index + 1}</span>
              <span>{t(`title.${step}`)}</span>
            </li>
          ))}
        </ol>
        <details className={styles.details}>
          <summary className={styles.summaryLabel}>{t("title.more")}</summary>
          <ul className={styles.rules}>
            {MORE_TOPICS.map((topic) => (
              <li key={topic}>{t(`howToPlay.${topic}`)}</li>
            ))}
          </ul>
        </details>
      </div>
      <div className={styles.bottom}>
        <ActionButton className={styles.daily} onClick={onDaily} disabled={daily.status === "none"}>
          {daily.status === "none"
            ? t("title.dailyNone")
            : t(daily.status === "open" ? "title.daily" : "title.dailyPlayed", { number: daily.number })}
        </ActionButton>
        <ActionButton className={styles.practice} variant="secondary" onClick={onPractice}>
          {t("title.practice")}
        </ActionButton>
        <p className={styles.note}>{t("title.note")}</p>
      </div>
    </main>
  );
}
