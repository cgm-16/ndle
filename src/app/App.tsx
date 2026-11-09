import { useCallback, useEffect, useReducer } from "react";
import { GameOverScreen } from "../components/GameOverScreen/GameOverScreen";
import { GameScreen } from "../components/GameScreen/GameScreen";
import { LanguageToggle } from "../components/LanguageToggle/LanguageToggle";
import { TitleScreen } from "../components/TitleScreen/TitleScreen";
import { createPuzzleStart, createTiles, createTitleState } from "../game/factories";
import { gameReducer } from "../game/gameReducer";
import { answerMatches, isRunComplete } from "../game/selectors";
import type { PuzzleTable, TileIdFactory } from "../game/types";
import { getShareStats, type ShareDependencies } from "../services/sharing";
import styles from "./App.module.css";

export interface AppDependencies {
  nextTileId: TileIdFactory;
  gameUrl: string;
  /** Deals a Practice table. Called only from event handlers, once per run. */
  dealPuzzle(): PuzzleTable;
}

export interface AppProps {
  dependencies: AppDependencies;
  shareDependencies: ShareDependencies;
}

export function App({ dependencies, shareDependencies }: AppProps) {
  const [state, dispatch] = useReducer(gameReducer, undefined, createTitleState);

  const handleStart = useCallback(() => {
    dispatch(createPuzzleStart(dependencies.dealPuzzle(), dependencies.nextTileId));
  }, [dependencies]);

  const handleRestart = useCallback(() => {
    dispatch({ ...createPuzzleStart(dependencies.dealPuzzle(), dependencies.nextTileId), type: "RESTART_RUN" });
  }, [dependencies]);

  const handleSubmit = useCallback(() => {
    // Reducer invariant (§2.5): table and equation are null only in `title`,
    // and Submit only renders in `answering`, so this only guards the type.
    if (state.equation === null || state.table === null) return;
    if (answerMatches(state.selectedTiles, state.equation.product)) {
      // A row pays the tiles printed on it.
      const rewardTiles = createTiles(state.table.rows[state.round - 1].pay, dependencies.nextTileId);
      dispatch({ type: "SUBMIT_CORRECT", rewardTiles });
    } else {
      dispatch({ type: "SUBMIT_INCORRECT" });
    }
  }, [
    state.equation,
    state.selectedTiles,
    state.table,
    state.round,
    dependencies,
  ]);

  // The reducer reads the next row from the table, and ends the run past its last.
  const handleNextRound = useCallback(() => dispatch({ type: "NEXT_ROUND" }), []);

  // §1.11: gameOver restarts the run on R, equivalent to Play Again. Enter has
  // no global shortcut in this phase — it destroyed the score screen with the
  // tap already in flight from the Submit/Enter rhythm that reached it — and R
  // activates no button, so this needs no focus guard. useGameKeyboard
  // (mounted inside GameScreen) only covers answering/feedback/overflow, and
  // title intentionally has no global Enter shortcut (the focused Start Run
  // button keeps ordinary browser behavior), so gameOver needs its own
  // listener here.
  useEffect(() => {
    if (state.phase !== "gameOver") return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      // Neither key property is correct alone: event.key carries a jamo under a
      // Korean IME, a shipped locale, and event.code is physical-position-based,
      // so a Dvorak player pressing the key labelled R sends KeyP. Either one
      // matching is enough.
      const isRestartKey = event.key === "r" || event.key === "R" || event.code === "KeyR";
      if (!isRestartKey || event.repeat) return;
      event.preventDefault();
      handleRestart();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state.phase, handleRestart]);

  return (
    <div className={styles.app}>
      {state.phase !== "title" && (
        <div className={styles.languageBar}>
          <LanguageToggle />
        </div>
      )}

      {state.phase === "title" && <TitleScreen onStart={handleStart} />}

      {(state.phase === "answering" || state.phase === "feedback" || state.phase === "overflow") && (
        <GameScreen
          state={state}
          dispatch={dispatch}
          onSubmit={handleSubmit}
          onNextRound={handleNextRound}
        />
      )}

      {state.phase === "gameOver" && (
        <GameOverScreen
          // A table played to its end stopped on no equation.
          equation={isRunComplete(state) ? null : state.equation}
          stats={getShareStats(state)}
          url={dependencies.gameUrl}
          dependencies={shareDependencies}
          onPlayAgain={handleRestart}
        />
      )}
    </div>
  );
}
