import { useI18n } from "../../i18n/I18nContext";
import styles from "./OverflowControls.module.css";

export function OverflowControls() {
  const { t } = useI18n();

  return (
    <div className={styles.controls}>
      {/* No Confirm: the mark that reaches the required count completes the
          discard in the reducer (§1.7). Puzzle's excess is always one. */}
      <p className={styles.instruction}>{t("overflow.instructionOne")}</p>
    </div>
  );
}
