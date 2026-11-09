import { useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import styles from "./GameHud.module.css";

export interface GameHudProps {
  score: number;
  currentStreak: number;
  round: number;
  /** The best score the table allows. */
  par: number;
}

export function GameHud({ score, currentStreak, round, par }: GameHudProps) {
  const { t } = useI18n();

  // 10e needs a number that is no longer in state: the count that falls is the
  // streak being replaced, and the props carry only the streak that replaced
  // it. Adjusted during render rather than in an effect, so the fall and the
  // zero it uncovers are in the DOM in the same commit and neither flashes on
  // its own. A break is a streak that had something to lose reaching zero: a
  // rise is not this moment, and neither is the first render of a run.
  const [previousStreak, setPreviousStreak] = useState(currentStreak);
  const [brokenFrom, setBrokenFrom] = useState<number | null>(null);
  if (previousStreak !== currentStreak) {
    setPreviousStreak(currentStreak);
    setBrokenFrom(currentStreak === 0 && previousStreak > 0 ? previousStreak : null);
  }

  return (
    <dl className={styles.hud}>
      <div className={styles.entry}>
        <dt>{t("hud.round")}</dt>
        <dd className={styles.primary}>{round}</dd>
      </div>
      <div className={styles.entry}>
        <dt>{t("hud.score")}</dt>
        <dd>{score}</dd>
      </div>
      <div className={styles.entry}>
        <dt>{t("hud.streak")}</dt>
        <dd
          className={
            currentStreak > 0 ? `${styles.streak} ${styles.streakActive}` : styles.streak
          }
        >
          {brokenFrom === null ? (
            currentStreak
          ) : (
            <>
              {/* The falling count and the zero it uncovers are siblings, never
                  nested: stacked opacities multiply, and the fall would be
                  invisible for exactly the half of the duration that should
                  read. The count is drawn by content: attr() rather than
                  written here, so it stays out of dd.textContent — App.test.tsx
                  reads the streak that way and a break must still read "0" —
                  and aria-hidden keeps it out of the accessible name, which
                  generated content does reach. */}
              <span className={styles.counterFall} data-fallen={brokenFrom} aria-hidden="true" />
              <span className={styles.counterZero}>{currentStreak}</span>
            </>
          )}
        </dd>
      </div>
      <div className={styles.entry}>
        <dt>{t("hud.par")}</dt>
        <dd>{par}</dd>
      </div>
    </dl>
  );
}
