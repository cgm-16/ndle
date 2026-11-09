import type { ReactNode } from "react";
import { GameOverScreen } from "../components/GameOverScreen/GameOverScreen";
import { GameScreen } from "../components/GameScreen/GameScreen";
import { LanguageToggle } from "../components/LanguageToggle/LanguageToggle";
import { TitleScreen } from "../components/TitleScreen/TitleScreen";
import { createTiles, sortTiles } from "../game/factories";
import { gameReducer } from "../game/gameReducer";
import type { GamePhase, GameState, Tile } from "../game/types";
import { getShareStats, type ShareDependencies } from "../services/sharing";
import {
  makeAnsweringState,
  makeEquation,
  makeFeedbackState,
  makeGameOverState,
  makeTile,
  PUZZLE_SAMPLE,
  sequentialIds,
} from "../test/fixtures";
import { ControlBoard, CopyPressedOnMount, ReducedMotionBoard } from "./harness";

export interface GalleryEntry {
  /** Stable across renders; used as the picker's React key. */
  id: string;
  /** Picker label. English only — the gallery is a dev tool, not a screen. */
  label: string;
  render: () => ReactNode;
}

// The gallery is for looking, not driving: every callback prop on every
// entry below is this one no-op rather than an inline arrow function apiece.
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

const ANSWERING_EQUATION = makeEquation(3, 4); // product 12: two answer slots
const ANSWERING_BASE_STATE = makeAnsweringState(ANSWERING_EQUATION);

// Built by running the real reducer rather than hand-assembling a
// GameState: SELECT_TILE moves a tile out of inventory into selectedTiles,
// so these conserve the fixed 10 live tiles the shipped game shows at this
// moment. Selecting digit 1 then digit 2 spells 12, the correct answer,
// matching what a player building this hand would actually do.
const ANSWERING_PARTIAL_STATE = gameReducer(ANSWERING_BASE_STATE, {
  type: "SELECT_TILE",
  tileId: "tile-1",
});
const ANSWERING_FULL_STATE = gameReducer(ANSWERING_PARTIAL_STATE, {
  type: "SELECT_TILE",
  tileId: "tile-2",
});

// A rack late in a run, where §1.12's empty sockets are the score. Every
// other state holds a nearly full hand, so the sockets have only ever been a
// minority of the rack. Four tiles that can still spell 6, because a hand
// that cannot answer its equation is gameOver rather than answering
// (canAttemptEquation, NEXT_ROUND); round is one past totalRounds, as §2.5
// requires of this phase.
const ANSWERING_DEPLETED_STATE = makeAnsweringState(makeEquation(2, 3), {
  inventory: [
    makeTile(0, "tile-0"),
    makeTile(3, "tile-3"),
    makeTile(6, "tile-6"),
    makeTile(9, "tile-9"),
  ],
  score: 5,
  round: 9,
  totalRounds: 8,
  currentStreak: 2,
  longestStreak: 3,
});

// score and currentStreak/longestStreak reflect the round this correct
// answer just won, matching what SUBMIT_CORRECT actually produces instead of
// showing a reward next to a HUD that still reads zero.
const FEEDBACK_CORRECT_STATE = makeFeedbackState(makeEquation(3, 3), {
  inventory: [
    makeTile(1, "tile-1"),
    makeTile(2, "tile-2"),
    makeTile(4, "tile-4"),
    makeTile(5, "tile-5"),
    makeTile(7, "reward-0", true),
    makeTile(8, "reward-1", true),
  ],
  score: 1,
  currentStreak: 1,
  longestStreak: 1,
  lastResult: {
    kind: "correct",
    submittedValue: 9,
    correctValue: 9,
    submittedTiles: [makeTile(9, "spent-0")],
    rewardTileIds: ["reward-0", "reward-1"],
  },
});

// 7b and 7c, the ladder above streak 3. The rings accumulate, so the streak 8
// state draws jade, gold and bright together — but one element carries one
// outline, so the rim escalates instead: at 8 the rim is the bright one, and
// the gold rim of the 5 tier is on screen at 5 and nowhere else
// (AnswerSlots). That exclusivity is why the ladder needs two states and not
// one at the top.
//
// A two-digit product rather than the single slot 3 x 3 gives: a ring's peak
// extent is 213x213 around a 64x80 tile, and two adjacent rings overlapping
// is the case §8.5 has never been read against.
const STREAK_EQUATION = makeEquation(3, 4); // product 12: two answer slots
const STREAK_REWARD_TILE_IDS = ["reward-0", "reward-1", "reward-2"];

// Hand-assembled rather than run through the reducer, because SUBMIT_CORRECT
// cannot land a two-digit answer in feedback from a full rack: two tiles
// spent earn getRewardCount(2) = 3, and 10 - 2 + 3 overflows. Eight held at
// submit is the largest hand that reaches feedback, and 8 - 2 + 3 = 9 is what
// it leaves. An unbroken streak is also the run's whole history, so score,
// round and totalRounds are the streak itself.
function makeStreakState(streak: number): GameState {
  return makeFeedbackState(STREAK_EQUATION, {
    inventory: sortTiles([
      makeTile(0, "tile-0"),
      makeTile(3, "tile-3"),
      makeTile(4, "tile-4"),
      makeTile(5, "tile-5"),
      makeTile(7, "tile-7"),
      makeTile(8, "tile-8"),
      makeTile(1, "reward-0", true),
      makeTile(2, "reward-1", true),
      makeTile(6, "reward-2", true),
    ]),
    score: streak,
    round: streak,
    totalRounds: streak,
    currentStreak: streak,
    longestStreak: streak,
    lastResult: {
      kind: "correct",
      submittedValue: STREAK_EQUATION.product,
      correctValue: STREAK_EQUATION.product,
      submittedTiles: [makeTile(1, "spent-0"), makeTile(2, "spent-1")],
      rewardTileIds: STREAK_REWARD_TILE_IDS,
    },
  });
}

const FEEDBACK_STREAK_5_STATE = makeStreakState(5);
const FEEDBACK_STREAK_8_STATE = makeStreakState(8);

// Built by running the real reducer for the same reason the answering states
// are: SUBMIT_INCORRECT is what puts the selected tiles into
// lastResult.submittedTiles and keeps them out of the rack. Taking
// makeFeedbackState's default result instead left submittedTiles empty, so
// the slots rendered as two empty sockets and 9f — the crack and its dust —
// had nothing to play on. 6 x 7 is 42, and 21 is the wrong answer a player
// who spelled the digits in the wrong order would submit.
const INCORRECT_EQUATION = makeEquation(6, 7); // product 42: two answer slots
const INCORRECT_PARTIAL_STATE = gameReducer(makeAnsweringState(INCORRECT_EQUATION), {
  type: "SELECT_TILE",
  tileId: "tile-2",
});
const INCORRECT_FULL_STATE = gameReducer(INCORRECT_PARTIAL_STATE, {
  type: "SELECT_TILE",
  tileId: "tile-1",
});
const FEEDBACK_INCORRECT_STATE = gameReducer(INCORRECT_FULL_STATE, { type: "SUBMIT_INCORRECT" });

// Overflow always follows SUBMIT_CORRECT, so the overflow state is built by
// running the real reducer: SUBMIT_CORRECT stamps every reward isNew, sorts
// only the tiles that fit and perches the newest arrivals past capacity
// (§1.5 step 7), and nothing hand-assembled could keep those rules in step.
function submitCorrectly(state: GameState, spentIds: readonly string[], rewardTiles: Tile[]): GameState {
  const selected = spentIds.reduce(
    (next, tileId) => gameReducer(next, { type: "SELECT_TILE", tileId }),
    state,
  );
  return gameReducer(selected, { type: "SUBMIT_CORRECT", rewardTiles });
}

// Endless's overflow case: 3 x 3 spends the 9 and getRewardCount(1) = 2
// tiles come back, 10 - 1 + 2 = 11. The first reward is seated and sorted; the
// second, the newest arrival, perches past capacity whatever its digit.
const OVERFLOW_REQUIRED_1_STATE = submitCorrectly(
  makeAnsweringState(makeEquation(3, 3)),
  ["tile-9"],
  [makeTile(0, "reward-0"), makeTile(1, "reward-1")],
);

// Puzzle (spec §7): the sample at row 1, its hand dealt, every row still to
// play. e2e/puzzle-fit.spec.ts measures the same screen in the app, dealt from
// the title screen.
const ANSWERING_PUZZLE_STATE = makeAnsweringState(PUZZLE_SAMPLE.rows[0].equation, {
  mode: "puzzle",
  table: PUZZLE_SAMPLE,
  rowResults: [],
  inventory: sortTiles(createTiles(PUZZLE_SAMPLE.hand, sequentialIds())),
});

// Row 4 of the sample's par line: the sacrifice missed, 14 and 9 answered, so
// the ledger draws both marks beside the frame and the pays still to come. The
// hand is what that line holds there, and the streak is the two answers since
// the miss.
const ANSWERING_PUZZLE_ROW_4_STATE = makeAnsweringState(PUZZLE_SAMPLE.rows[3].equation, {
  mode: "puzzle",
  table: PUZZLE_SAMPLE,
  rowResults: ["incorrect", "correct", "correct"],
  inventory: sortTiles(createTiles([1, 2, 6, 7, 8], sequentialIds())),
  round: 4,
  totalRounds: 3,
  score: 2,
  currentStreak: 2,
  longestStreak: 2,
});

// The feedback a discard leaves behind: no Next Round, because the round
// advances on its own once the departing tile has played (§1.7). In the
// gallery nothing departs, so this is the resting frame of that moment.
const FEEDBACK_AFTER_DISCARD_STATE = gameReducer(OVERFLOW_REQUIRED_1_STATE, {
  type: "TOGGLE_DISCARD",
  tileId: "tile-5",
});

// Puzzle's game over (spec §7) after the sample's par line: the table played to
// its end with par made, so the heading is gold and no equation is shown. The
// hand is what that line holds after row 8, and the streak is the seven
// answers since the sacrifice.
const GAME_OVER_PUZZLE_STATE = makeGameOverState(PUZZLE_SAMPLE.rows[7].equation, {
  mode: "puzzle",
  table: PUZZLE_SAMPLE,
  rowResults: ["incorrect", "correct", "correct", "correct", "correct", "correct", "correct", "correct"],
  inventory: sortTiles(createTiles([2, 2, 7, 8, 8], sequentialIds())),
  score: 7,
  totalRounds: 8,
  round: 9,
  longestStreak: 7,
});

const GAME_OVER_STATE = makeGameOverState(makeEquation(7, 8));

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
      id: "answering-puzzle",
      label: "Answering — Puzzle, the sample at row 1",
      render: () => renderGameScreen(ANSWERING_PUZZLE_STATE),
    },
    {
      id: "answering-puzzle-row-4",
      label: "Answering — Puzzle at row 4, three rows marked",
      render: () => renderGameScreen(ANSWERING_PUZZLE_ROW_4_STATE),
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
      label: "Overflow — required 1 (Endless)",
      render: () => renderGameScreen(OVERFLOW_REQUIRED_1_STATE),
    },
  ],
  gameOver: [
    {
      id: "game-over-idle",
      label: "Game over — idle",
      render: () => renderGameOverScreen(GAME_OVER_STATE, RESOLVING_SHARE_DEPENDENCIES),
    },
    {
      id: "game-over-puzzle",
      label: "Game over — Puzzle, made par",
      render: () => renderGameOverScreen(GAME_OVER_PUZZLE_STATE, RESOLVING_SHARE_DEPENDENCIES),
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
