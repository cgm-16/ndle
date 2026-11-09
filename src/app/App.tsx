import { useCallback, useEffect, useReducer } from "react";
import { GameOverScreen } from "../components/GameOverScreen/GameOverScreen";
import { GameScreen } from "../components/GameScreen/GameScreen";
import { LanguageToggle } from "../components/LanguageToggle/LanguageToggle";
import { TitleScreen } from "../components/TitleScreen/TitleScreen";
import { createInitialInventory, createTiles, createTitleState, sortTiles } from "../game/factories";
import { gameReducer } from "../game/gameReducer";
import { generateKindEquation, generateRewardTiles } from "../game/generators";
import { answerMatches, getCapacity, getRewardCount, isRunComplete } from "../game/selectors";
import type { Equation, GameMode, PuzzleTable, RandomSource, Tile, TileIdFactory } from "../game/types";
import { getShareStats, type ShareDependencies } from "../services/sharing";
import styles from "./App.module.css";

export interface AppDependencies {
  random: RandomSource;
  nextTileId: TileIdFactory;
  gameUrl: string;
  /** Deals Puzzle's next table. Called only from event handlers, once per run. */
  dealPuzzle(): PuzzleTable;
}

export interface AppProps {
  dependencies: AppDependencies;
  shareDependencies: ShareDependencies;
}

// What a run opens with. The opening hand fills the mode's starting capacity
// (§1.3); Puzzle's hand and first equation come from the table it deals.
function startState(
  dependencies: AppDependencies,
  mode: GameMode,
): { equation: Equation; inventory: Tile[]; table?: PuzzleTable } {
  if (mode === "puzzle") {
    const table = dependencies.dealPuzzle();
    return {
      equation: table.rows[0].equation,
      inventory: sortTiles(createTiles(table.hand, dependencies.nextTileId)),
      table,
    };
  }
  const inventory = createInitialInventory(dependencies.nextTileId, getCapacity(mode, 0));
  return { equation: generateKindEquation(dependencies.random, inventory), inventory };
}

export function App({ dependencies, shareDependencies }: AppProps) {
  const [state, dispatch] = useReducer(gameReducer, undefined, createTitleState);

  const handleStart = useCallback(
    (mode: GameMode) => {
      dispatch({ type: "START_RUN", mode, ...startState(dependencies, mode) });
    },
    [dependencies],
  );

  // RESTART_RUN keeps the run's mode, so the hand is dealt for it too.
  const handleRestart = useCallback(() => {
    dispatch({ type: "RESTART_RUN", ...startState(dependencies, state.mode) });
  }, [dependencies, state.mode]);

  const handleSubmit = useCallback(() => {
    // Reducer invariant (§2.5): equation === null only in `title`, and Submit
    // only renders in `answering`, so this only guards the type.
    if (state.equation === null) return;
    if (answerMatches(state.selectedTiles, state.equation.product)) {
      // A Puzzle row pays the tiles printed on it; the other modes draw theirs.
      const rewardTiles = state.table
        ? createTiles(state.table.rows[state.round - 1].pay, dependencies.nextTileId)
        : generateRewardTiles(
            getRewardCount(state.selectedTiles.length),
            dependencies.random,
            dependencies.nextTileId,
          );
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

  const handleNextRound = useCallback(() => {
    // At Classic's floor or Puzzle's last row the advance ends the run (§1.8
    // step 0): no equation is drawn, and the current one, never shown again,
    // keeps the reducer's invariant.
    if (isRunComplete(state)) {
      if (state.equation === null) return;
      dispatch({ type: "NEXT_ROUND", equation: state.equation });
      return;
    }
    // state.inventory is already final (post-discard) at `feedback`; a stale
    // capture here would silently bias equations against the previous round's hand.
    const equation = state.table
      ? state.table.rows[state.round].equation
      : generateKindEquation(dependencies.random, state.inventory);
    dispatch({ type: "NEXT_ROUND", equation });
  }, [dependencies, state]);

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

      {state.phase === "gameOver" && state.equation !== null && (
        <GameOverScreen
          equation={state.equation}
          stats={getShareStats(state)}
          hand={state.inventory}
          url={dependencies.gameUrl}
          dependencies={shareDependencies}
          onPlayAgain={handleRestart}
        />
      )}
    </div>
  );
}
