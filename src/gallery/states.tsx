import type { ReactNode } from "react";
import { GameOverScreen } from "../components/GameOverScreen/GameOverScreen";
import { GameScreen } from "../components/GameScreen/GameScreen";
import { LanguageToggle } from "../components/LanguageToggle/LanguageToggle";
import { TitleScreen } from "../components/TitleScreen/TitleScreen";
import { gameReducer } from "../game/gameReducer";
import type { GamePhase, GameState } from "../game/types";
import { getShareStats, type ShareDependencies } from "../services/sharing";
import {
  makeAnsweringState,
  makeFeedbackState,
  makeGameOverState,
  makeOverflowState,
  parLineAt,
  PUZZLE_SAMPLE_PAR_LINE,
  playRow,
  selectDigits,
  sequentialIds,
  tileWith,
} from "../test/fixtures";
import { ControlBoard, CopyPressedOnMount, LiveGameScreen, ReducedMotionBoard } from "./harness";

export interface GalleryEntry {
  /** Stable across renders; used as the picker's React key. */
  id: string;
  /** Picker label. English only — the gallery is a dev tool, not a screen. */
  label: string;
  render: () => ReactNode;
}

// The gallery is for looking, not driving: apart from the overflow entry's
// discard (LiveGameScreen), every callback prop on every entry below is this
// one no-op rather than an inline arrow function apiece.
const noop = () => {};

function renderGameScreen(state: GameState): ReactNode {
  return <GameScreen state={state} dispatch={noop} onSubmit={noop} onNextRound={noop} />;
}

// GameOverScreen takes flat equation/stats props rather than a GameState;
// this adapts a `makeGameOverState` fixture to that shape.
function renderGameOverScreen(state: GameState, dependencies: ShareDependencies): ReactNode {
  // Reducer invariant (§2.5): equation === null only in `title`, and
  // makeGameOverState always sets phase to `gameOver`, so this only guards
  // the type.
  if (state.equation === null) return null;
  return (
    <GameOverScreen
      equation={state.equation}
      stats={getShareStats(state)}
      url="https://example.test/"
      dependencies={dependencies}
      onPlayAgain={noop}
    />
  );
}

// Every state below is the sample's par line (src/test/fixtures.ts) played
// through the real reducer, so each one conserves its tiles, its ids and its
// statistics the way the shipped game does at that moment. The one figure set
// by hand is the streak 8 state's streak.

// Row 1, 3 x 5 = 15, two answer slots. Selecting 1 then 5 spells the correct
// answer, which is what a player building this hand would actually do.
const ANSWERING_BASE_STATE = makeAnsweringState();
const ANSWERING_PARTIAL_STATE = selectDigits(ANSWERING_BASE_STATE, 1);
const ANSWERING_FULL_STATE = selectDigits(ANSWERING_PARTIAL_STATE, 5);

// A rack where §1.12's empty sockets are the score. Every other answering
// state holds a full hand of five, so the sockets have only ever been a
// minority of the rack there. Row 2, after the sacrifice spent two tiles:
// 1 4 9 against 7 x 2 = 14.
const ANSWERING_DEPLETED_STATE = parLineAt(2);

// A row of the par line played and judged, its discard made if it has one.
function rowJudged(row: number): GameState {
  const ids = sequentialIds();
  return playRow(parLineAt(row, ids), PUZZLE_SAMPLE_PAR_LINE[row - 1]!, ids);
}

// Row 2 answered, 14 from 1 4 9, paid 8 1 6: the correct answer within
// capacity, so feedback carries its rewards and a Next Round.
const FEEDBACK_CORRECT_STATE = rowJudged(2);

// 7b and 7c, the ladder above streak 3. The rings accumulate, so the streak 8
// state draws jade, gold and bright together — but one element carries one
// outline, so the rim escalates instead: at 8 the rim is the bright one, and
// the gold rim of the 5 tier is on screen at 5 and nowhere else
// (AnswerSlots). That exclusivity is why the ladder needs two states and not
// one at the top.
//
// Two-digit products, because a ring's peak extent is 213x213 around a 64x80
// tile, and two adjacent rings overlapping is the case §8.5 has never been
// read against. Row 6, 8 x 3 = 24, is the par line's fifth answer in a row.
// Row 8, 3 x 4 = 12, is its seventh, and par 7 caps any streak on this table
// there, so streak 8 is set on it for display. Both rows overflow, so both are
// shown after their discard, with no Next Round.
const FEEDBACK_STREAK_5_STATE = rowJudged(6);
const FEEDBACK_STREAK_8_STATE: GameState = { ...rowJudged(8), currentStreak: 8 };

// The sacrifice judged: 57 for 15. SUBMIT_INCORRECT is what puts the selected
// tiles into lastResult.submittedTiles and keeps them out of the rack, so 9f —
// the crack and its dust — has two tiles to play on.
const FEEDBACK_INCORRECT_STATE = makeFeedbackState();

// Row 4, 1 x 7: the 7 spent from 1 2 6 7 8 and the row's 4 4 paid. The first 4
// is seated and sorted; the second, the newest arrival, perches past capacity
// whatever its digit (§1.5 step 7).
const OVERFLOW_REQUIRED_1_STATE = makeOverflowState();

// Row 4 of the sample's par line: the sacrifice missed, 14 and 9 answered, so
// the ledger draws both marks beside the frame and the pays still to come.
const ANSWERING_ROW_4_STATE = parLineAt(4);

// The feedback a discard leaves behind: no Next Round, because the round
// advances on its own once the departing tile has played (§1.7). In the
// gallery nothing departs, so this is the resting frame of that moment. The
// par line discards the 6 here.
const FEEDBACK_AFTER_DISCARD_STATE = gameReducer(OVERFLOW_REQUIRED_1_STATE, {
  type: "TOGGLE_DISCARD",
  tileId: tileWith(OVERFLOW_REQUIRED_1_STATE, 6).id,
});

// The sample's par line played to its end with par made, so the heading is
// gold and no equation is shown.
const GAME_OVER_STATE = makeGameOverState();

const RESOLVING_SHARE_DEPENDENCIES: ShareDependencies = {
  writeClipboard: async () => {},
};

// nativeShare: undefined keeps Share on the same clipboard path Copy Result
// uses, so a rejecting writeClipboard reaches share.failed from either button.
const REJECTING_SHARE_DEPENDENCIES: ShareDependencies = {
  nativeShare: undefined,
  writeClipboard: async () => {
    throw new Error("clipboard write failed");
  },
};

const HOVER_NOTE =
  "Move a real pointer over each control: matches(':hover') is as unreadable in an automated probe as matches(':active') is. No component declares a :hover rule, so a hover reading equal to the resting reading is the system as built, not a failed probe.";

const FOCUS_VISIBLE_NOTE =
  "Tab to each control; never click it. :focus-visible survives a click on an already-focused element, so a click-driven reading shows a ring the spec withholds. Four rules draw a ring — the button's, the tile's two, and the language toggle's own — so the toggle is on this board and on no other.";

const DISABLED_NOTE =
  "Every control here is disabled: flat, hairline outline, and resting 4px low so that becoming available reads as a rise (11d). It is a comparison against the enabled board, not a reading on its own.";

const REDUCED_MOTION_NOTE =
  "Read every element below under prefers-reduced-motion: reduce AND under normal. global.css neutralises animation and transition durations with !important, so the reduce reading alone cannot tell a wired animation from an unwired one — only the pair can. Animations: the ladder's top tier and the crack that takes its dust with it. Transitions: the button and the tile beneath them.";

// Keyed by phase so that adding a GamePhase member fails typecheck until the
// gallery covers it. A flat array with a hand-written phase list would rot
// silently, which is the failure this structure exists to prevent.
//
// `interaction` is the one key that is not a phase: hover, focus-visible,
// disabled and reduced motion are conditions any screen can be in rather than
// moments the reducer can reach, and M5.5g's gate names all four.
export const GALLERY_STATES: Record<GamePhase | "interaction", GalleryEntry[]> = {
  title: [{ id: "title", label: "Title", render: () => <TitleScreen onStart={noop} /> }],
  answering: [
    {
      id: "answering-empty",
      label: "Answering — empty slots",
      render: () => renderGameScreen(ANSWERING_BASE_STATE),
    },
    {
      id: "answering-partial",
      label: "Answering — partially filled",
      render: () => renderGameScreen(ANSWERING_PARTIAL_STATE),
    },
    {
      id: "answering-full",
      label: "Answering — all slots filled",
      render: () => renderGameScreen(ANSWERING_FULL_STATE),
    },
    {
      id: "answering-depleted",
      label: "Answering — a depleted rack",
      render: () => renderGameScreen(ANSWERING_DEPLETED_STATE),
    },
    {
      id: "answering-puzzle-row-4",
      label: "Answering — Puzzle at row 4, three rows marked",
      render: () => renderGameScreen(ANSWERING_ROW_4_STATE),
    },
  ],
  feedback: [
    {
      id: "feedback-correct",
      label: "Feedback — correct, with rewards",
      render: () => renderGameScreen(FEEDBACK_CORRECT_STATE),
    },
    {
      id: "feedback-incorrect",
      label: "Feedback — incorrect, with the answer comparison",
      render: () => renderGameScreen(FEEDBACK_INCORRECT_STATE),
    },
    {
      id: "feedback-after-discard",
      label: "Feedback — after a discard (no Next Round)",
      render: () => renderGameScreen(FEEDBACK_AFTER_DISCARD_STATE),
    },
    {
      id: "feedback-streak-5",
      label: "Feedback — correct at streak 5 (second ring, gold rim)",
      render: () => renderGameScreen(FEEDBACK_STREAK_5_STATE),
    },
    {
      id: "feedback-streak-8",
      label: "Feedback — correct at streak 8 (third ring, the burst)",
      render: () => renderGameScreen(FEEDBACK_STREAK_8_STATE),
    },
  ],
  overflow: [
    {
      id: "overflow-required-1",
      label: "Overflow — required 1",
      render: () => <LiveGameScreen initial={OVERFLOW_REQUIRED_1_STATE} />,
    },
  ],
  gameOver: [
    {
      id: "game-over-idle",
      label: "Game over — idle",
      render: () => renderGameOverScreen(GAME_OVER_STATE, RESOLVING_SHARE_DEPENDENCIES),
    },
    {
      id: "game-over-copy-succeeded",
      label: "Game over — copy succeeded",
      render: () => (
        <CopyPressedOnMount>
          {renderGameOverScreen(GAME_OVER_STATE, RESOLVING_SHARE_DEPENDENCIES)}
        </CopyPressedOnMount>
      ),
    },
    {
      id: "game-over-copy-failed",
      label: "Game over — copy failed",
      render: () => (
        <CopyPressedOnMount>
          {renderGameOverScreen(GAME_OVER_STATE, REJECTING_SHARE_DEPENDENCIES)}
        </CopyPressedOnMount>
      ),
    },
  ],
  interaction: [
    {
      id: "interaction-hover",
      label: "Interaction — hover",
      render: () => <ControlBoard note={HOVER_NOTE} disabled={false} />,
    },
    {
      id: "interaction-focus-visible",
      label: "Interaction — focus-visible",
      // LanguageToggle carries a :focus-visible rule of its own, and the
      // picker's copy of it sits outside the arena container, where a figure
      // read off it need not be the figure it has on a screen. So the ring
      // that only this component draws is read on a copy that is inside.
      render: () => (
        <ControlBoard note={FOCUS_VISIBLE_NOTE} disabled={false}>
          <LanguageToggle />
        </ControlBoard>
      ),
    },
    {
      id: "interaction-disabled",
      label: "Interaction — disabled",
      render: () => <ControlBoard note={DISABLED_NOTE} disabled />,
    },
    {
      id: "interaction-reduced-motion",
      label: "Interaction — reduced motion",
      render: () => <ReducedMotionBoard note={REDUCED_MOTION_NOTE} />,
    },
  ],
};
