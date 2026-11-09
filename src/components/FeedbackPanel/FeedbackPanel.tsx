import type { RoundResult, Tile as TileModel } from "../../game/types";
import { useI18n } from "../../i18n/I18nContext";
import { Tile } from "../Tile/Tile";
import styles from "./FeedbackPanel.module.css";

export interface FeedbackPanelProps {
  /** Null while answering: the live region renders empty, so the verdict
   * arrives in a region that already exists. Some screen readers do not
   * announce what a region holds when it is inserted (#31). */
  result: RoundResult | null;
  rewardTiles: readonly TileModel[];
}

/** Renders the announced outcome, submitted answer, and any earned tiles. */
export function FeedbackPanel({ result, rewardTiles }: FeedbackPanelProps) {
  const { t } = useI18n();
  if (result === null) return <div className={styles.idle} role="status" aria-live="polite" />;
  const isCorrect = result.kind === "correct";

  return (
    <div
      className={`${styles.panel} ${isCorrect ? styles.correct : styles.incorrect}`}
      role="status"
      aria-live="polite"
    >
      <p className={styles.headline}>{isCorrect ? t("result.correct") : t("result.incorrect")}</p>
      {isCorrect ? (
        <>
          <p className={styles.submitted}>{t("result.submitted", { value: result.correctValue })}</p>
          {rewardTiles.length > 0 && (
            <p className={styles.rewardSummary}>
              {t("result.rewards", { count: rewardTiles.length })}
            </p>
          )}
          {/* The tiles stay on screen and leave the accessibility tree: the
              panel announces itself, and §1.14's result.rewards states the
              count once. Nothing is lost by hiding them: TileInventory renders
              the same arrivals in every phase, and a tile carries "New tile" in
              its own accessible name until NEXT_ROUND clears isNew. */}
          <ul className={styles.rewards} aria-hidden="true">
            {rewardTiles.map((tile) => (
              <li key={tile.id} className={styles.reward}>
                <Tile value={tile} size="sm" state="reward" />
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className={styles.comparison}>
          <p>{t("result.submitted", { value: result.submittedValue })}</p>
          <p>{t("result.answer", { value: result.correctValue })}</p>
        </div>
      )}
    </div>
  );
}
