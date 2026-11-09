import { useState } from "react";
import type { Equation } from "../../game/types";
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
import { EquationBoard } from "../EquationBoard/EquationBoard";
import styles from "./GameOverScreen.module.css";

export interface GameOverScreenProps {
  equation: Equation;
  stats: ShareStats;
  url: string;
  dependencies: ShareDependencies;
  onPlayAgain(): void;
}

export function GameOverScreen({
  equation,
  stats,
  url,
  dependencies,
  onPlayAgain,
}: GameOverScreenProps) {
  const { t, language } = useI18n();
  // "shared" renders no inline message: a successful native share hands off
  // to the OS share sheet, so there is nothing further to confirm here.
  const [status, setStatus] = useState<ShareOutcome | null>(null);

  const handleShare = async () => {
    const text = formatShareText(stats, language, url);
    const outcome = await shareResult(text, url, dependencies);
    setStatus(outcome);
  };

  const handleCopy = async () => {
    const text = formatShareText(stats, language, url);
    const outcome = await copyResult(text, dependencies);
    setStatus(outcome);
  };

  // A table played to its end leaves no terminal equation: the run did not
  // stop on one.
  const tableFinished = stats.mode === "puzzle" && stats.totalRounds === stats.rows;
  const reason = tableFinished ? "gameOver.tableReason" : "gameOver.reason";
  const shortOfPar = stats.mode === "puzzle" && !stats.won;
  const title =
    stats.mode === "puzzle"
      ? stats.won
        ? t("gameOver.parTitle")
        : t("gameOver.shortTitle", { short: stats.par - stats.score })
      : t("gameOver.title");

  return (
    <main className={styles.screen}>
      <div className={styles.terminal}>
        {tableFinished ? null : <EquationBoard equation={equation} showProduct />}
        {/* §1.8 keeps the terminal equation on screen to explain the loss, but
            the equation alone reads as a live prompt. The reason sits with the
            equation rather than inside the results block, so it defuses the
            thing it explains. */}
        <p className={styles.reason}>{t(reason)}</p>
      </div>
      <h1 className={`${styles.title} ${stats.won ? styles.won : shortOfPar ? styles.shortOfPar : ""}`}>
        {title}
      </h1>
      <dl className={styles.stats}>
        {/* Puzzle's score is read against its table, so Rounds played, which
            repeats the score's denominator, gives way to Par. */}
        {stats.mode === "puzzle" ? (
          <>
            <div className={styles.entry}>
              <dt>{t("hud.score")}</dt>
              <dd className={styles.primary}>{`${stats.score} / ${stats.rows}`}</dd>
            </div>
            <div className={styles.entry}>
              <dt>{t("hud.par")}</dt>
              <dd>{stats.par}</dd>
            </div>
          </>
        ) : (
          <>
            <div className={styles.entry}>
              <dt>{t("gameOver.rounds")}</dt>
              <dd className={styles.primary}>{stats.totalRounds}</dd>
            </div>
            <div className={styles.entry}>
              <dt>{t("hud.score")}</dt>
              <dd>{stats.score}</dd>
            </div>
          </>
        )}
        <div className={styles.entry}>
          <dt>{t("gameOver.longestStreak")}</dt>
          <dd>{stats.longestStreak}</dd>
        </div>
      </dl>
      <div className={styles.actions}>
        <ActionButton onClick={onPlayAgain}>{t("action.playAgain")}</ActionButton>
        {/* `gameOver.restartHint` belongs here, between the primary action and
            the row of alternatives: it names the key that presses the button
            directly above it, and as meta text under a button it explains, it
            adds no focal point of its own. */}
        <p className={styles.restartHint}>{t("gameOver.restartHint")}</p>
        <div className={styles.secondaryActions}>
          <ActionButton variant="secondary" onClick={handleShare}>
            {t("action.share")}
          </ActionButton>
          <ActionButton variant="ghost" onClick={handleCopy}>
            {t("action.copy")}
          </ActionButton>
        </div>
      </div>
      {/* The chop is reinforcement, never the confirmation itself: §1.12 asks
          for colour plus shape or text, and a mark carries no announcement.
          The status region beside it stays the accessible confirmation, so the
          chop is hidden from it. */}
      <div className={styles.confirmation}>
        {status === "copied" ? (
          <span className={styles.chop} aria-hidden="true">
            ✳
          </span>
        ) : null}
        <p className={styles.status} role="status" aria-live="polite">
          {status === "copied" ? t("share.copied") : status === "failed" ? t("share.failed") : ""}
        </p>
      </div>
    </main>
  );
}
