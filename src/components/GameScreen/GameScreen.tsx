import { useEffect, useRef, useState } from "react";
import { sortTiles } from "../../game/factories";
import type { GameAction, GameState } from "../../game/types";
import { PUZZLE_CAPACITY } from "../../game/balance";
import { getAnswerLength, isSubmissionReady } from "../../game/selectors";
import { useGameKeyboard } from "../../hooks/useGameKeyboard";
import { useI18n } from "../../i18n/I18nContext";
import { ActionButton } from "../ActionButton/ActionButton";
import { AnswerSlots } from "../AnswerSlots/AnswerSlots";
import { FeedbackPanel } from "../FeedbackPanel/FeedbackPanel";
import { GameHud } from "../GameHud/GameHud";
import { OverflowControls } from "../OverflowControls/OverflowControls";
import { EquationBoard } from "../EquationBoard/EquationBoard";
import { PuzzleLedger } from "../PuzzleLedger/PuzzleLedger";
import { TileInventory } from "../TileInventory/TileInventory";
import styles from "./GameScreen.module.css";

export interface GameScreenProps {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  onSubmit(): void;
  onNextRound(): void;
}

export function GameScreen({ state, dispatch, onSubmit, onNextRound }: GameScreenProps) {
  const { t } = useI18n();
  useGameKeyboard({ state, dispatch, onSubmit, onNextRound });

  // After a discard the round advances on its own (§1.7), once both halves of
  // the moment have played: the rack's exit and the verdict's celebration on
  // the answer slots. The celebration starts with feedback, when the discard
  // completes, so the 320ms streak-8 fan can still be playing when the 200ms
  // exit and the perch drop after it end, and advancing on the exit alone
  // would unmount it midway. Each half reports the
  // submission it settled, so a report from one round never counts for the
  // next.
  const [rackSettled, setRackSettled] = useState<number | null>(null);
  const [slotsSettled, setSlotsSettled] = useState<number | null>(null);
  // The overflow band's right cell, where the rack renders its rail. It stays
  // mounted in every phase so a discarded rail tile can finish leaving.
  const [railHost, setRailHost] = useState<HTMLElement | null>(null);
  const advancesAlone =
    state.phase === "feedback" && state.lastResult?.discarded === true;
  const readyToAdvance =
    advancesAlone && rackSettled === state.totalRounds && slotsSettled === state.totalRounds;
  const onNextRoundRef = useRef(onNextRound);
  useEffect(() => {
    onNextRoundRef.current = onNextRound;
  });
  useEffect(() => {
    if (readyToAdvance) onNextRoundRef.current();
  }, [readyToAdvance]);

  // Reducer invariant (§2.5): table and equation are null only in `title`.
  // GameScreen never renders `title` (TitleScreen owns it), so this only
  // guards the type.
  if (state.equation === null || state.table === null) return null;

  const { lastResult } = state;
  // The pay is the row's printed digits; the hand is sorted and may have
  // dropped a paid tile, so neither is the source.
  const rewardDigits =
    lastResult?.kind === "correct" ? (state.table.rows[state.round - 1]?.pay ?? []) : [];

  return (
    <main className={styles.screen}>
      <GameHud
        score={state.score}
        currentStreak={state.currentStreak}
        round={state.round}
        totalRounds={state.table.rows.length}
        par={state.table.par}
      />
      <div className={styles.ledger}>
        <PuzzleLedger table={state.table} round={state.round} rowResults={state.rowResults} />
      </div>

      {/* One band holds the answer row and the phase's action in every phase,
          so the rack never moves. */}
      <div className={styles.band} data-compact={state.phase === "overflow" || state.phase === "feedback" ? "" : undefined}>
        <div className={styles.answerRow}>
          <EquationBoard equation={state.equation} />

          {/* One group for the whole round, so a played tile keeps its node from
              answering through overflow into feedback: a remounted slot would
              replay its arrival. Keyed by the round, so each round's group
              settles afresh. After submit the tiles are
              lastResult.submittedTiles, the array the reducer moved them to.
              Past answering there is no onReturn: read-only slots carry no
              button role, and no phase after it takes a tile back. The verdict
              waits for feedback, where the celebration plays. */}
          <AnswerSlots
            key={state.round}
            slotCount={getAnswerLength(state.equation)}
            selectedTiles={state.phase === "answering" ? state.selectedTiles : (lastResult?.submittedTiles ?? [])}
            onReturn={state.phase === "answering" ? (tileId) => dispatch({ type: "RETURN_TILE", tileId }) : undefined}
            verdict={state.phase === "feedback" ? lastResult?.kind : undefined}
            streak={state.currentStreak}
            disabled={false}
            onSettled={() => setSlotsSettled(state.totalRounds)}
          />
        </div>

        {/* Both live regions stay mounted in every phase, and only the phase's
            own holds content: overflow's message is OverflowControls. */}
        <FeedbackPanel
          result={state.phase === "overflow" ? null : lastResult}
          equation={state.equation}
          rewardDigits={rewardDigits}
        />

        {state.phase === "answering" && (
          <div className={styles.actions}>
            <ActionButton
              className={styles.clear}
              variant="secondary"
              onClick={() => dispatch({ type: "CLEAR_SELECTION" })}
              disabled={state.selectedTiles.length === 0}
            >
              {t("action.clear")}
            </ActionButton>

            <ActionButton
              className={styles.submit}
              onClick={onSubmit}
              disabled={!isSubmissionReady(state)}
            >
              {t("action.submit")}
            </ActionButton>
          </div>
        )}

        {/* After a discard the round advances on its own once the rack has
            settled (§1.7), so there is nothing to press. */}
        {state.phase === "feedback" && !lastResult?.discarded && (
          <ActionButton className={styles.next} onClick={onNextRound}>{t("action.next")}</ActionButton>
        )}

        <div className={styles.overflow} data-active={state.phase === "overflow" ? "" : undefined}>
          <OverflowControls active={state.phase === "overflow"} />
          <div ref={setRailHost} className={styles.railCell} />
        </div>
      </div>

      <div className={styles.rack}>
        <TileInventory
          // Only answering re-sorts, to keep lifted tiles in their sockets; every
          // other phase draws the reducer's order, which perches the newest
          // arrivals past capacity (§1.5 step 7).
          tiles={
            state.phase === "answering"
              ? sortTiles([...state.inventory, ...state.selectedTiles])
              : state.inventory
          }
          liftedIds={state.selectedTiles.map((tile) => tile.id)}
          capacity={PUZZLE_CAPACITY}
          railHost={railHost}
          mode={state.phase === "answering" ? "select" : state.phase === "overflow" ? "discard" : "readOnly"}
          pendingDiscards={state.pendingDiscards}
          onSettled={() => {
            if (advancesAlone) setRackSettled(state.totalRounds);
          }}
          onTile={(tileId) => {
            if (state.phase === "answering") dispatch({ type: "SELECT_TILE", tileId });
            // The mark that reaches the required count completes the discard in the
            // reducer, so rendering an already-marked state still requires user action.
            if (state.phase === "overflow") dispatch({ type: "TOGGLE_DISCARD", tileId });
          }}
        />
      </div>
    </main>
  );
}
