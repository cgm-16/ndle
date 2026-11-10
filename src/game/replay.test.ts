import { describe, expect, it } from "vitest";
import { createTiles, createTitleState } from "./factories";
import { gameReducer } from "./gameReducer";
import { replayMoves } from "./replay";
import { isParMade } from "./selectors";
import {
  PUZZLE_SAMPLE,
  PUZZLE_SAMPLE_PAR_LINE,
  selectDigits,
  sequentialIds,
} from "../test/fixtures";

const hand = (digits: { digit: number }[]) => digits.map((tile) => tile.digit).join(" ");

describe("replayMoves", () => {
  it("replays the sample's par line to Made par 7 / 8", () => {
    const replay = replayMoves(PUZZLE_SAMPLE, PUZZLE_SAMPLE_PAR_LINE, sequentialIds())!;
    expect(replay.state.phase).toBe("gameOver");
    expect(replay.state.score).toBe(7);
    expect(isParMade(replay.state)).toBe(true);
  });

  it("stops at the next row after a complete move", () => {
    const { state } = replayMoves(PUZZLE_SAMPLE, PUZZLE_SAMPLE_PAR_LINE.slice(0, 3), sequentialIds())!;
    expect(state.phase).toBe("answering");
    expect(state.round).toBe(4);
    expect(hand(state.inventory)).toBe("1 2 6 7 8");
  });

  it("stops in overflow when the last move has no discard", () => {
    const line = [...PUZZLE_SAMPLE_PAR_LINE.slice(0, 7), { spend: [1, 2] as [1, 2] }];
    const { state } = replayMoves(PUZZLE_SAMPLE, line, sequentialIds())!;
    expect(state.phase).toBe("overflow");
    expect(state.round).toBe(8);
    expect(state.inventory).toHaveLength(6);
    expect(state.score).toBe(7);
  });

  it("rejects a move that spends a digit the hand lacks", () => {
    expect(replayMoves(PUZZLE_SAMPLE, [{ spend: [3, 3] }], sequentialIds())).toBeNull();
  });

  it("rejects a discard with no overflow", () => {
    expect(replayMoves(PUZZLE_SAMPLE, [{ spend: [5, 7], discard: 1 }], sequentialIds())).toBeNull();
  });

  it("rejects moves past the end of the run", () => {
    const line = [...PUZZLE_SAMPLE_PAR_LINE, { spend: [1] as [1] }];
    expect(replayMoves(PUZZLE_SAMPLE, line, sequentialIds())).toBeNull();
  });

  it("rejects an overflow stop that is not the last move", () => {
    const line = [...PUZZLE_SAMPLE_PAR_LINE.slice(0, 3), { spend: [7] as [7] }, { spend: [1] as [1] }];
    expect(replayMoves(PUZZLE_SAMPLE, line, sequentialIds())).toBeNull();
  });

  it("lets live play continue after a replay", () => {
    const ids = sequentialIds();
    const { state } = replayMoves(PUZZLE_SAMPLE, PUZZLE_SAMPLE_PAR_LINE.slice(0, 3), ids)!;
    const selected = selectDigits(state, 7);
    const next = gameReducer(selected, {
      type: "SUBMIT_CORRECT",
      rewardTiles: createTiles([4, 4], ids),
    });
    expect(next).not.toBe(selected);
    expect(next.score).toBe(3);
  });

  it("leaves the reducer at the replay's state when its actions are dispatched", () => {
    const { state, actions } = replayMoves(PUZZLE_SAMPLE, PUZZLE_SAMPLE_PAR_LINE, sequentialIds())!;
    expect(actions.reduce(gameReducer, createTitleState())).toEqual(state);
  });
});
