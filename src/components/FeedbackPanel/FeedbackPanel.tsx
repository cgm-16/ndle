import type { Equation, RoundResult, Tile as TileModel } from "../../game/types";
import { useI18n } from "../../i18n/I18nContext";
import { Mark } from "../Mark/Mark";
import styles from "./FeedbackPanel.module.css";

export interface FeedbackPanelProps {
  /** Null while answering: the live region renders empty, so the verdict
   * arrives in a region that already exists. Some screen readers do not
   * announce what a region holds when it is inserted. */
  result: RoundResult | null;
  /** The row the result judged; a miss prints it with its product. */
  equation: Equation;
  rewardTiles: readonly TileModel[];
}

/** Renders the announced verdict line: the mark, the word, and one detail. */
export function FeedbackPanel({ result, equation, rewardTiles }: FeedbackPanelProps) {
  const { t } = useI18n();
  if (result === null) return <div className={styles.idle} role="status" aria-live="polite" />;
  const isCorrect = result.kind === "correct";
  const detail = isCorrect
    ? rewardTiles.length > 0
      ? t("result.rewards", { digits: rewardTiles.map((tile) => tile.digit).join(" ") })
      : null
    : `${equation.left} × ${equation.right} = ${equation.product}`;

  return (
    <div
      className={[styles.panel, isCorrect ? styles.correct : styles.incorrect, result.discarded && styles.beforeRail]
        .filter(Boolean)
        .join(" ")}
      role="status"
      aria-live="polite"
    >
      <Mark result={result.kind} />
      <span>
        {isCorrect ? t("result.correct") : t("result.incorrect")}
        {detail !== null && <span className={styles.detail}> · {detail}</span>}
      </span>
      {/* The slots show the submitted tiles, so a miss announces them too and
          the region carries both the played and the right answer (§1.12). */}
      {!isCorrect && <span className={styles.hidden}>{t("result.played", { value: result.submittedValue })}</span>}
    </div>
  );
}
