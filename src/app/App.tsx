import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { ActionButton } from "../components/ActionButton/ActionButton";
import { GameOverScreen } from "../components/GameOverScreen/GameOverScreen";
import { GameScreen } from "../components/GameScreen/GameScreen";
import { LanguageToggle } from "../components/LanguageToggle/LanguageToggle";
import { TitleScreen, type DailyEntry } from "../components/TitleScreen/TitleScreen";
import { createPuzzleStart, createTitleState } from "../game/factories";
import { gameReducer } from "../game/gameReducer";
import { createSubmit, replayMoves } from "../game/replay";
import { isRunComplete } from "../game/selectors";
import { todaysDaily } from "../game/dailyTables";
import type { GameAction, PuzzleMove, PuzzleTable, TileIdFactory } from "../game/types";
import type { DailyRecord, DailyStore } from "../services/dailyStorage";
import { useI18n } from "../i18n/I18nContext";
import { getShareStats, type ShareDependencies } from "../services/sharing";
import styles from "./App.module.css";

export interface AppDependencies {
  nextTileId: TileIdFactory;
  gameUrl: string;
  /** Deals a Practice table. Called only from event handlers, once per run. */
  dealPuzzle(): PuzzleTable;
  /** Read on mount, on Back and in event handlers, never in the reducer. */
  now(): Date;
  dailyStore: DailyStore;
  dailyTables: readonly PuzzleTable[];
}

// Within a tab the in-memory record is never older than storage, and when
// storage is blocked or a save fails it is the only current copy.
function todaysRecord(dailyStore: DailyStore, memory: DailyRecord | null, number: number): DailyRecord | null {
  return memory?.number === number ? memory : dailyStore.load();
}

function dailyEntry({ now, dailyStore, dailyTables }: AppDependencies, memory: DailyRecord | null): DailyEntry {
  const today = todaysDaily(now(), dailyTables);
  if (today === null) return { status: "none" };
  const record = todaysRecord(dailyStore, memory, today.number);
  const played = record !== null && record.number === today.number && record.outcome !== null;
  return { status: played ? "played" : "open", number: today.number };
}

export interface AppProps {
  dependencies: AppDependencies;
  shareDependencies: ShareDependencies;
}

type Play = { kind: "daily"; number: number } | { kind: "practice" };

export function App({ dependencies, shareDependencies }: AppProps) {
  const { t } = useI18n();
  const [state, dispatch] = useReducer(gameReducer, undefined, createTitleState);
  const [play, setPlay] = useState<Play>({ kind: "practice" });
  // The Daily's record as App last saved it, whether or not storage kept it.
  // Only event handlers and the outcome effect write it, never render or the
  // reducer, so StrictMode saves each move once.
  const dailyRecord = useRef<DailyRecord | null>(null);
  // The title's Daily entry, read when the title shows: on mount, and on Back,
  // which can read the in-memory record where render cannot.
  const [titleDaily, setTitleDaily] = useState(() => dailyEntry(dependencies, null));

  const handlePractice = useCallback(() => {
    dispatch(createPuzzleStart(dependencies.dealPuzzle(), dependencies.nextTileId));
    setPlay({ kind: "practice" });
  }, [dependencies]);

  const handleDaily = useCallback(() => {
    const { now, dailyTables, dailyStore, nextTileId } = dependencies;
    const today = todaysDaily(now(), dailyTables);
    // The title disables Daily when there is no table, so this only guards the type.
    if (today === null) return;
    const record = todaysRecord(dailyStore, dailyRecord.current, today.number);
    const replay = record?.number === today.number ? replayMoves(today.table, record.moves, nextTileId) : null;
    if (record !== null && replay !== null) {
      // The replay drew its ids from nextTileId, so live play continues past them.
      for (const action of replay.actions) dispatch(action);
      dailyRecord.current = record;
    } else {
      // No record of today, or one that fails to replay: the day starts fresh
      // and overwrites it.
      dispatch(createPuzzleStart(today.table, nextTileId));
      dailyRecord.current = { version: 1, number: today.number, moves: [], outcome: null };
      dailyStore.save(dailyRecord.current);
    }
    setPlay({ kind: "daily", number: today.number });
  }, [dependencies]);

  const handleBack = useCallback(() => {
    setTitleDaily(dailyEntry(dependencies, dailyRecord.current));
    dispatch({ type: "RETURN_TO_TITLE" });
  }, [dependencies]);

  const handleRestart = useCallback(() => {
    // A Daily gets one attempt: Play Again does not start it over, and its R
    // listener is off.
    if (play.kind === "daily") return;
    dispatch({ ...createPuzzleStart(dependencies.dealPuzzle(), dependencies.nextTileId), type: "RESTART_RUN" });
  }, [dependencies, play]);

  // Dispatches a move's action. In a Daily it first records the move, but only
  // if the reducer accepts the action: a record that fails to replay would
  // restart the day.
  const playMove = useCallback(
    (action: GameAction, record: (moves: PuzzleMove[]) => PuzzleMove[]) => {
      const daily = dailyRecord.current;
      if (play.kind === "daily" && daily !== null && gameReducer(state, action) !== state) {
        dailyRecord.current = { ...daily, moves: record(daily.moves) };
        dependencies.dailyStore.save(dailyRecord.current);
      }
      dispatch(action);
    },
    [play, state, dependencies],
  );

  const handleSubmit = useCallback(() => {
    const action = createSubmit(state, dependencies.nextTileId);
    // Submit only renders in `answering`, which always has a current row, so
    // this only guards the type.
    if (action === null) return;
    playMove(action, (moves) => [...moves, { spend: state.selectedTiles.map((tile) => tile.digit) }]);
  }, [state, dependencies, playMove]);

  // GameScreen's taps and keys both reach the reducer through this, so a
  // discard is recorded however it was made.
  const handleGameAction = useCallback(
    (action: GameAction) => {
      const tile = action.type === "TOGGLE_DISCARD" ? state.inventory.find((item) => item.id === action.tileId) : undefined;
      if (tile === undefined) {
        dispatch(action);
        return;
      }
      // The reducer takes a discard only in overflow, which the move's submit opened.
      // Overflow is always one tile, so an accepted TOGGLE_DISCARD completes the discard.
      playMove(action, (moves) => [...moves.slice(0, -1), { ...moves[moves.length - 1], discard: tile.digit }]);
    },
    [state.inventory, playMove],
  );

  // The reducer reads the next row from the table, and ends the run past its last.
  const handleNextRound = useCallback(() => dispatch({ type: "NEXT_ROUND" }), []);

  // A finished Daily saves its outcome. The write is idempotent, so a second
  // run of the effect under StrictMode changes nothing.
  useEffect(() => {
    const daily = dailyRecord.current;
    if (state.phase !== "gameOver" || play.kind !== "daily" || daily === null) return;
    const { score, par, longestStreak } = getShareStats(state, play);
    dailyRecord.current = { ...daily, outcome: { score, par, longestStreak } };
    dependencies.dailyStore.save(dailyRecord.current);
  }, [state, play, dependencies]);

  // §1.11: gameOver restarts a Practice run on R, as Play Again does. Enter has
  // no global shortcut in this phase — it destroyed the score screen with the
  // tap already in flight from the Submit/Enter rhythm that reached it — and R
  // activates no button, so this needs no focus guard. useGameKeyboard
  // (mounted inside GameScreen) only covers answering/feedback/overflow, and
  // title intentionally has no global Enter shortcut (the focused title
  // buttons keep ordinary browser behavior), so gameOver needs its own
  // listener here.
  useEffect(() => {
    if (state.phase !== "gameOver" || play.kind === "daily") return;

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
  }, [state.phase, play.kind, handleRestart]);

  return (
    <div className={styles.app}>
      {state.phase !== "title" && (
        <div className={styles.languageBar}>
          {/* Not a move: a Daily keeps its record. It shares the language
              bar's row, so it costs the table no height, and it comes first
              in tab order. */}
          <ActionButton variant="ghost" onClick={handleBack}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 3 5 8l5 5" />
            </svg>{" "}
            {t("action.back")}
          </ActionButton>
          <LanguageToggle />
        </div>
      )}

      {state.phase === "title" && (
        <TitleScreen daily={titleDaily} onDaily={handleDaily} onPractice={handlePractice} />
      )}

      {(state.phase === "answering" || state.phase === "feedback" || state.phase === "overflow") && (
        <GameScreen
          state={state}
          dispatch={handleGameAction}
          onSubmit={handleSubmit}
          onNextRound={handleNextRound}
        />
      )}

      {state.phase === "gameOver" && (
        <GameOverScreen
          // A table played to its end stopped on no equation.
          equation={isRunComplete(state) ? null : state.equation}
          stats={getShareStats(state, play)}
          url={dependencies.gameUrl}
          dependencies={shareDependencies}
          onPlayAgain={handleRestart}
          onPractice={handlePractice}
        />
      )}
    </div>
  );
}
