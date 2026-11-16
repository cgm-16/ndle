import type { PuzzleTable, RoundResult } from "../../game/types";
import { useI18n } from "../../i18n/I18nContext";
import { Mark } from "../Mark/Mark";
import styles from "./PuzzleLedger.module.css";

export interface PuzzleLedgerProps {
  table: PuzzleTable;
  /** The displayed round, 1-based: row `round` is the current row. */
  round: number;
  rowResults: readonly RoundResult["kind"][];
}

/**
 * Puzzle's table, face up: every row with the tiles it pays, and the played
 * rows marked. Each row reads as one sentence; what it draws is hidden from
 * assistive tech, so the equation and pay digits are not announced twice.
 *
 * The current row and a played row are independent: in feedback the row just
 * submitted is both, so it keeps its frame while it shows its mark.
 */
export function PuzzleLedger({ table, round, rowResults }: PuzzleLedgerProps) {
  const { t, language } = useI18n();
  const payList = new Intl.ListFormat(language, { type: "conjunction" });

  return (
    <ol
      className={styles.ledger}
      aria-label={t("ledger.label")}
      // WebKit strips list semantics from unstyled lists, and the label with them.
      role="list"
    >
      {table.rows.map(({ equation, pay }, index) => {
        const result = index < rowResults.length ? rowResults[index] : undefined;
        const current = index === round - 1;
        const label = t("ledger.row", {
          row: index + 1,
          left: equation.left,
          right: equation.right,
          pay: payList.format(pay.map(String)),
        });
        const className = [
          styles.row,
          current && styles.current,
          result && styles.played,
          result === "incorrect" && styles.missed,
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <li key={index} className={className} aria-current={current ? "step" : undefined}>
            <span className={styles.label}>
              {result === undefined
                ? label
                : `${label}, ${t(result === "correct" ? "ledger.answered" : "ledger.missed")}`}
            </span>
            <div className={styles.visual} aria-hidden="true">
              <span className={current ? styles.now : styles.number}>
                {current ? t("ledger.now") : index + 1}
              </span>
              <span className={styles.equation}>{`${equation.left} × ${equation.right}`}</span>
              {result !== undefined ? (
                <span className={styles.outcome}>
                  <Mark result={result} />
                  {t(result === "correct" ? "ledger.answered" : "ledger.missed")}
                </span>
              ) : (
                <span className={styles.pay}>
                  {current && <span className={styles.paysLabel}>{t("ledger.pays")}</span>}
                  {pay.map((digit, payIndex) => (
                    <span key={payIndex} className={styles.payTile}>
                      {digit}
                    </span>
                  ))}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
