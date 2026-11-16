import { useI18n } from "../../i18n/I18nContext";
import { Mark } from "../Mark/Mark";
import styles from "./OverflowControls.module.css";

export interface OverflowControlsProps {
  /** False outside overflow: the live region stays mounted, empty, so the
   * message arrives in a region that already exists (#31). */
  active: boolean;
}

/** The overflow band's message: the verdict that filled the hand, and what to do. */
export function OverflowControls({ active }: OverflowControlsProps) {
  const { t } = useI18n();

  return (
    <div className={styles.message} role="status" aria-live="polite">
      {active && (
        <>
          <p className={styles.verdict}>
            <Mark result="correct" />
            {t("result.correct")} · {t("result.handFull")}
          </p>
          {/* No Confirm: the mark that reaches the required count completes the
              discard in the reducer (§1.7). Puzzle's excess is always one. */}
          <p className={styles.instruction}>{t("overflow.instructionOne")}</p>
        </>
      )}
    </div>
  );
}
