import { useEffect, useRef, type ReactNode } from "react";
import { ActionButton } from "../components/ActionButton/ActionButton";
import { AnswerSlots } from "../components/AnswerSlots/AnswerSlots";
import { Tile } from "../components/Tile/Tile";
import { useI18n } from "../i18n/I18nContext";
import { makeTile } from "../test/fixtures";
import styles from "./Gallery.module.css";

/* The gallery's own components: what a state needs that no game screen
   provides — a driver for a state the component only reaches on a press, and
   the boards for the conditions that are not phases. They live here rather
   than beside the state table because a module that exports a component and a
   catalogue exports neither to Fast Refresh. */

// The gallery is for looking, not driving: every callback prop here is this
// one no-op, as in the state table.
const noop = () => {};

// GameOverScreen holds the share outcome in local state, so the copied and
// failed confirmations exist only once Copy Result has been pressed: rendered
// at rest, both entries showed the idle screen and 11C's chop had no gallery
// surface at all. The press happens on mount rather than a stand-in being
// drawn, so what those entries show is the component's own state, reached the
// way a player reaches it. Matched on the button's own text, which is what
// makes it the Copy button in either language.
export function CopyPressedOnMount({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const label = t("action.copy");
    for (const button of stage.current?.querySelectorAll("button") ?? []) {
      if (button.textContent === label) {
        button.click();
        return;
      }
    }
  }, [t]);

  return <div ref={stage}>{children}</div>;
}

// Hover, focus-visible and the press are pseudo-class states: no fixture can
// render one, only a driver can produce it. What the gallery owes the walk is
// the controls that carry them, at the width the arena gives them rather than
// the stage's — a control that sizes to its container reads wider here than
// on the screen — and the note that says how the state has to be driven,
// since each of these has been read wrong before.
export function ControlBoard({
  note,
  disabled,
  children,
}: {
  note: string;
  disabled: boolean;
  /** A control only one of these states needs, mounted inside the arena. */
  children?: ReactNode;
}) {
  const { t } = useI18n();

  return (
    <div className={styles.board}>
      <p className={styles.boardNote}>{note}</p>
      <div className={styles.boardRow}>
        <ActionButton disabled={disabled} onClick={noop}>
          {t("action.submit")}
        </ActionButton>
        <ActionButton variant="secondary" disabled={disabled} onClick={noop}>
          {t("action.clear")}
        </ActionButton>
        <ActionButton variant="ghost" disabled={disabled} onClick={noop}>
          {t("action.copy")}
        </ActionButton>
      </div>
      <div className={styles.boardRow}>
        <Tile value={{ digit: 4 }} state={disabled ? "disabled" : "resting"} onClick={noop} />
        <Tile value={{ digit: 7 }} state={disabled ? "disabled" : "marked"} onClick={noop} />
      </div>
      {children}
    </div>
  );
}

// The animation carriers and the transition carriers in one selection, so
// both readings come off one state: the ladder's top tier, the crack that
// takes its dust with it, and the button and tile whose motion is a
// transition rather than an animation. Mounted as AnswerSlots directly rather
// than as a GameScreen, because this is not a moment of a run — it is the set
// of things that move.
export function ReducedMotionBoard({ note }: { note: string }) {
  const { t } = useI18n();

  return (
    <div className={styles.board}>
      <p className={styles.boardNote}>{note}</p>
      <AnswerSlots
        slotCount={2}
        selectedTiles={[makeTile(1, "moving-0"), makeTile(2, "moving-1")]}
        verdict="correct"
        streak={8}
        disabled={false}
      />
      <AnswerSlots
        slotCount={2}
        selectedTiles={[makeTile(2, "moving-2"), makeTile(1, "moving-3")]}
        verdict="incorrect"
        disabled={false}
      />
      <div className={styles.boardRow}>
        <ActionButton onClick={noop}>{t("action.next")}</ActionButton>
        <Tile value={{ digit: 4 }} onClick={noop} />
      </div>
    </div>
  );
}
