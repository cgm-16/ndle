import { useState } from "react";
import { PUZZLE_ROWS } from "../../game/balance";
import type { RoundResult } from "../../game/types";
import { useI18n } from "../../i18n/I18nContext";
import {
  copyResult,
  formatShareText,
  shareResult,
  type ShareDependencies,
  type ShareOutcome,
  type ShareStats,
} from "../../services/sharing";
import { ActionButton } from "../ActionButton/ActionButton";
import { Mark } from "../Mark/Mark";
import styles from "./GameOverScreen.module.css";

export interface GameOverScreenProps {
  /** One entry per row played; a row past the end of the list is unplayed. */
  rowResults: readonly RoundResult["kind"][];
  /** Its `kind` picks the Daily or the Practice variant. */
  stats: ShareStats;
  url: string;
  dependencies: ShareDependencies;
  /** Practice only. */
  onPlayAgain(): void;
  /** Daily only: the way into Practice. */
  onPractice(): void;
}

export function GameOverScreen({
  rowResults,
  stats,
  url,
  dependencies,
  onPlayAgain,
  onPractice,
}: GameOverScreenProps) {
  const { t, language } = useI18n();
  // "shared" renders no inline message: a successful native share hands off
  // to the OS share sheet, so there is nothing further to confirm here.
  const [status, setStatus] = useState<ShareOutcome | null>(null);

  // The preview is the text Share and Copy Result send.
  const shareText = formatShareText(stats, language, url);

  const handleShare = async () => {
    setStatus(await shareResult(shareText, url, dependencies));
  };

  const handleCopy = async () => {
    setStatus(await copyResult(shareText, dependencies));
  };

  // A table played to its end stopped on no row; an early end says why.
  const reason = rowResults.length === stats.rows ? "gameOver.tableReason" : "gameOver.reason";
  const title = stats.won
    ? t("gameOver.parTitle")
    : t("gameOver.shortTitle", { short: stats.par - stats.score });

  return (
    <main className={styles.screen}>
      <h1 className={styles.title}>
        {stats.kind === "daily" && (
          <>
            <span className={styles.number}>{t("gameOver.dailyNumber", { number: stats.number })}</span>{" "}
          </>
        )}
        {title}
      </h1>
      <p className={styles.reason}>{t(reason)}</p>
      <p className={styles.score}>{`${stats.score} / ${stats.rows}`}</p>
      <dl className={styles.cards}>
        <div className={styles.card}>
          <dt>{t("hud.par")}</dt>
          <dd>{stats.par}</dd>
        </div>
        <div className={styles.card}>
          <dt>{t("gameOver.longestStreak")}</dt>
          <dd>{stats.longestStreak}</dd>
        </div>
      </dl>
      <ol
        className={styles.marks}
        aria-label={t("gameOver.rowsLabel")}
        // WebKit strips list semantics from unstyled lists, and the label with them.
        role="list"
      >
        {Array.from({ length: PUZZLE_ROWS }, (_, index) => {
          const result = rowResults[index];
          const word =
            result === undefined ? t("gameOver.unplayed") : result === "correct" ? t("ledger.answered") : t("ledger.missed");
          const look = result === undefined ? styles.unplayed : result === "correct" ? styles.answered : styles.missed;
          return (
            <li key={index} className={`${styles.mark} ${look}`}>
              <span className={styles.markLabel}>{t("gameOver.rowMark", { row: index + 1, result: word })}</span>
              {result !== undefined && <Mark result={result} />}
            </li>
          );
        })}
      </ol>
      {stats.kind === "daily" && <p className={styles.nextTable}>{t("gameOver.nextTable")}</p>}
      <p className={styles.previewLabel}>{t("gameOver.shareText")}</p>
      <p className={styles.preview}>{shareText}</p>
      <div className={styles.row}>
        <ActionButton className={`${styles.button} ${styles.share}`} onClick={handleShare}>
          {t("action.share")}
        </ActionButton>
        <ActionButton variant="secondary" className={`${styles.button} ${styles.copy}`} onClick={handleCopy}>
          {t("action.copy")}
        </ActionButton>
      </div>
      {stats.kind === "daily" ? (
        <ActionButton variant="secondary" className={`${styles.button} ${styles.last}`} onClick={onPractice}>
          {t("title.practice")}
        </ActionButton>
      ) : (
        <>
          <ActionButton variant="secondary" className={`${styles.button} ${styles.last}`} onClick={onPlayAgain}>
            {t("action.playAgain")}
          </ActionButton>
          <p className={styles.restartHint}>{t("gameOver.restartHint")}</p>
        </>
      )}
      <p className={styles.status} role="status" aria-live="polite">
        {status === "copied" ? t("share.copied") : status === "failed" ? t("share.failed") : ""}
      </p>
    </main>
  );
}
