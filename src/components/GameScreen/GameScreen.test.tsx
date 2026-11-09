import { StrictMode } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createTiles, sortTiles } from "../../game/factories";
import { gameReducer } from "../../game/gameReducer";
import type { GameState, PuzzleTable } from "../../game/types";
import { I18nProvider } from "../../i18n/I18nContext";
import {
  makeAnsweringState,
  makeEquation,
  makeFeedbackState,
  makeGameOverState,
  makeOverflowInventory,
  makeOverflowState,
  makePuzzleRow,
  makeTile,
  PUZZLE_SAMPLE,
  sequentialIds,
} from "../../test/fixtures";
import slotStyles from "../AnswerSlots/AnswerSlots.module.css";
import rackStyles from "../TileInventory/TileInventory.module.css";
import { GameScreen, type GameScreenProps } from "./GameScreen";

// A 12-tile inventory (excess 2), where a first mark is only a mark.
// makeOverflowState's 11-tile default completes on its first mark, so
// covering the unfinished state needs an inventory override, not a change to
// that default (which every other overflow test still relies on).
const TWELVE_TILE_INVENTORY = makeOverflowInventory(12);

function renderScreen(state: GameState) {
  const dispatch = vi.fn();
  const onSubmit = vi.fn();
  const onNextRound = vi.fn();
  const props: GameScreenProps = { state, dispatch, onSubmit, onNextRound };
  render(
    <I18nProvider initialLanguage="en">
      <GameScreen {...props} />
    </I18nProvider>,
  );
  return { dispatch, onSubmit, onNextRound };
}

describe("GameScreen interactions", () => {
  // 1. clicking duplicate digits dispatches the exact clicked ID
  it("dispatches SELECT_TILE with the exact clicked tile id among duplicate digits", async () => {
    const equation = makeEquation(2, 3); // product 6, one slot
    const inventory = [makeTile(2, "b"), makeTile(2, "c")];
    const state = makeAnsweringState(equation, { inventory, selectedTiles: [] });
    const { dispatch } = renderScreen(state);

    const duplicates = screen.getAllByRole("button", { name: "Digit 2" });
    await userEvent.click(duplicates[1]);

    expect(dispatch).toHaveBeenCalledWith({ type: "SELECT_TILE", tileId: "c" });
  });

  // 2. digit key chooses the first matching sorted inventory tile
  it("selects the first matching sorted inventory tile on a digit key press", async () => {
    const equation = makeEquation(2, 3);
    const inventory = [makeTile(2, "b"), makeTile(2, "c")];
    const state = makeAnsweringState(equation, { inventory, selectedTiles: [] });
    const { dispatch } = renderScreen(state);

    await userEvent.keyboard("2");

    expect(dispatch).toHaveBeenCalledWith({ type: "SELECT_TILE", tileId: "b" });
  });

  // 3. filled slots reject additional digits
  it("does not dispatch on a digit key press when all answer slots are already filled", async () => {
    const equation = makeEquation(2, 3); // one slot
    const inventory = [makeTile(4, "extra")];
    const selectedTiles = [makeTile(6, "sel")];
    const state = makeAnsweringState(equation, { inventory, selectedTiles });
    const { dispatch } = renderScreen(state);

    await userEvent.keyboard("4");

    expect(dispatch).not.toHaveBeenCalled();
  });

  it("selects the tile holding the pressed digit", async () => {
    const { dispatch } = renderScreen(
      makeAnsweringState(makeEquation(2, 2), { inventory: [makeTile(4, "four")], selectedTiles: [] }),
    );
    await userEvent.keyboard("4");
    expect(dispatch).toHaveBeenCalledWith({ type: "SELECT_TILE", tileId: "four" });
  });

  // 4. Backspace returns the most recent selected tile
  it("returns the most recently selected tile on Backspace", async () => {
    const equation = makeEquation(7, 8); // product 56, two slots
    const selectedTiles = [makeTile(5, "first"), makeTile(6, "second")];
    const state = makeAnsweringState(equation, { inventory: [], selectedTiles });
    const { dispatch } = renderScreen(state);

    await userEvent.keyboard("{Backspace}");

    expect(dispatch).toHaveBeenCalledWith({ type: "RETURN_TILE", tileId: "second" });
  });

  // 4b. Escape clears the entire selection
  it("dispatches CLEAR_SELECTION on Escape when tiles are selected", async () => {
    const equation = makeEquation(7, 8); // product 56, two slots
    const selectedTiles = [makeTile(5, "first"), makeTile(6, "second")];
    const state = makeAnsweringState(equation, { inventory: [], selectedTiles });
    const { dispatch } = renderScreen(state);

    await userEvent.keyboard("{Escape}");

    expect(dispatch).toHaveBeenCalledWith({ type: "CLEAR_SELECTION" });
  });

  it("does not dispatch on Escape when nothing is selected", async () => {
    const equation = makeEquation(7, 8);
    const state = makeAnsweringState(equation, { inventory: [], selectedTiles: [] });
    const { dispatch } = renderScreen(state);

    await userEvent.keyboard("{Escape}");

    expect(dispatch).not.toHaveBeenCalled();
  });

  // 5. Enter submits only when ready
  it("submits on Enter when all answer slots are filled", async () => {
    const equation = makeEquation(7, 8);
    const state = makeAnsweringState(equation, {
      inventory: [],
      selectedTiles: [makeTile(5, "a"), makeTile(6, "b")],
    });
    const { onSubmit } = renderScreen(state);

    await userEvent.keyboard("{Enter}");

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("does not submit on Enter when an answer slot is still empty", async () => {
    const equation = makeEquation(7, 8);
    const state = makeAnsweringState(equation, {
      inventory: [],
      selectedTiles: [makeTile(5, "a")],
    });
    const { onSubmit } = renderScreen(state);

    await userEvent.keyboard("{Enter}");

    expect(onSubmit).not.toHaveBeenCalled();
  });

  // 6. Enter has no overflow action: there is nothing to confirm (§1.11)
  it("does nothing on Enter in overflow, even with marks placed", async () => {
    const equation = makeEquation(3, 3);
    const state = makeOverflowState(equation, {
      inventory: TWELVE_TILE_INVENTORY,
      pendingDiscards: ["tile-0"],
    });
    const { dispatch } = renderScreen(state);

    await userEvent.keyboard("{Enter}");

    expect(dispatch).not.toHaveBeenCalled();
  });

  it("does not confirm discard on Enter when the marked count is short of the excess", async () => {
    const equation = makeEquation(3, 3);
    const state = makeOverflowState(equation, { pendingDiscards: [] });
    const { dispatch } = renderScreen(state);

    await userEvent.keyboard("{Enter}");

    expect(dispatch).not.toHaveBeenCalled();
  });

  // 7. Enter advances from feedback
  it("advances to the next round on Enter during feedback", async () => {
    const equation = makeEquation(3, 3);
    const state = makeFeedbackState(equation);
    const { onNextRound } = renderScreen(state);

    await userEvent.keyboard("{Enter}");

    expect(onNextRound).toHaveBeenCalledTimes(1);
  });

  // 8. disabled shortcuts dispatch nothing
  describe("disabled keyboard shortcuts are no-ops", () => {
    it("ignores a digit key held with a modifier", async () => {
      const equation = makeEquation(2, 3);
      const inventory = [makeTile(4, "a")];
      const state = makeAnsweringState(equation, { inventory, selectedTiles: [] });
      const { dispatch } = renderScreen(state);

      await userEvent.keyboard("{Meta>}4{/Meta}");

      expect(dispatch).not.toHaveBeenCalled();
    });

    it("ignores a repeated Enter keydown", () => {
      const equation = makeEquation(7, 8);
      const state = makeAnsweringState(equation, {
        inventory: [],
        selectedTiles: [makeTile(5, "a"), makeTile(6, "b")],
      });
      const { onSubmit } = renderScreen(state);

      fireEvent.keyDown(window, { key: "Enter", repeat: true });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("ignores a digit key with no matching tile in inventory", async () => {
      const equation = makeEquation(2, 3);
      const inventory = [makeTile(4, "a")];
      const state = makeAnsweringState(equation, { inventory, selectedTiles: [] });
      const { dispatch } = renderScreen(state);

      await userEvent.keyboard("9");

      expect(dispatch).not.toHaveBeenCalled();
    });
  });

  // 9. intentional incorrect selection can be submitted
  it("allows submitting an intentionally incorrect answer via the Submit button", async () => {
    const equation = makeEquation(5, 6); // correct product is 30
    const selectedTiles = [makeTile(6, "a"), makeTile(5, "b")]; // deliberately wrong: 65
    const state = makeAnsweringState(equation, { inventory: [], selectedTiles });
    const { onSubmit } = renderScreen(state);

    const submitButton = screen.getByRole("button", { name: "Submit" });
    expect(submitButton).toBeEnabled();
    await userEvent.click(submitButton);

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  // 10. Clear button visibility follows selection state
  it("disables Clear when nothing is selected", () => {
    const equation = makeEquation(5, 6);
    const state = makeAnsweringState(equation, { inventory: [], selectedTiles: [] });
    renderScreen(state);

    expect(screen.getByRole("button", { name: "Clear" })).toBeDisabled();
  });

  it("enables Clear once a tile is chosen", () => {
    const equation = makeEquation(5, 6);
    const state = makeAnsweringState(equation, {
      inventory: [],
      selectedTiles: [makeTile(3, "sel")],
    });
    renderScreen(state);

    expect(screen.getByRole("button", { name: "Clear" })).toBeEnabled();
  });

  it("dispatches CLEAR_SELECTION when Clear is clicked", async () => {
    const equation = makeEquation(5, 6);
    const state = makeAnsweringState(equation, {
      inventory: [],
      selectedTiles: [makeTile(3, "sel")],
    });
    const { dispatch } = renderScreen(state);

    await userEvent.click(screen.getByRole("button", { name: "Clear" }));

    expect(dispatch).toHaveBeenCalledWith({ type: "CLEAR_SELECTION" });
  });

  // Regression coverage: the phase action button (Next Round / Confirm
  // Discard / Submit) is a real focusable <button>, and Enter on a focused
  // button natively triggers a click. The shortcut and the button agree on
  // these three, so both mechanisms give the right answer and only the count
  // can be wrong. The hook stands aside for a focused control, leaving the
  // button's own activation as the single path to the callback; these lock
  // in that it is a single path, whichever side of the guard it runs on.
  describe("Enter does not double-fire when the phase action button has focus", () => {
    it("calls onNextRound exactly once with Next Round focused", async () => {
      const equation = makeEquation(3, 3);
      const state = makeFeedbackState(equation);
      const { onNextRound } = renderScreen(state);

      screen.getByRole("button", { name: "Next Round" }).focus();
      await userEvent.keyboard("{Enter}");

      expect(onNextRound).toHaveBeenCalledTimes(1);
    });

    it("calls onSubmit exactly once with Submit focused", async () => {
      const equation = makeEquation(7, 8);
      const state = makeAnsweringState(equation, {
        inventory: [],
        selectedTiles: [makeTile(5, "a"), makeTile(6, "b")],
      });
      const { onSubmit } = renderScreen(state);

      screen.getByRole("button", { name: "Submit" }).focus();
      await userEvent.keyboard("{Enter}");

      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
  });

  // The mirror of the block above: there the shortcut and the focused button
  // agree, so either mechanism gives the right answer. Clear is the control
  // they disagree on. Enter reached the window listener, preventDefault()
  // suppressed the button's own activation, and the answer submitted instead
  // of clearing — spending the tiles the player was trying to take back,
  // with no undo.
  describe("Enter defers to a focused control the shortcut does not stand in for", () => {
    it("clears instead of submitting with Clear focused", async () => {
      // Both conditions hold together by construction: Clear is enabled
      // whenever a tile is selected, and a full set of slots implies that.
      const equation = makeEquation(7, 8);
      const state = makeAnsweringState(equation, {
        inventory: [],
        selectedTiles: [makeTile(5, "a"), makeTile(6, "b")],
      });
      const { dispatch, onSubmit } = renderScreen(state);

      screen.getByRole("button", { name: "Clear" }).focus();
      await userEvent.keyboard("{Enter}");

      expect(dispatch).toHaveBeenCalledWith({ type: "CLEAR_SELECTION" });
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });
});

describe("GameScreen phase composition", () => {
  // The other half of §1.10's claim that gameOver is the only phase to print
  // the product: printing it here hands the player the answer they are being
  // asked for.
  it("does not print the product while the round is live", () => {
    const equation = makeEquation(3, 4); // product 12
    const state = makeAnsweringState(equation, { inventory: [makeTile(1, "a")] });
    renderScreen(state);

    expect(screen.getByText("3 × 4 =")).toBeInTheDocument();
    expect(screen.queryByText("12")).not.toBeInTheDocument();
  });

  it("orders HUD, equation, Submit, and inventory for the answering phase", () => {
    const equation = makeEquation(3, 4);
    const state = makeAnsweringState(equation, { inventory: [makeTile(1, "a")] });
    renderScreen(state);

    const hud = screen.getByText("Score").closest("dl");
    const equationEl = screen.getByText("3 × 4 =");
    const submit = screen.getByRole("button", { name: "Submit" });
    const inventoryTile = screen.getByRole("button", { name: "Digit 1" });
    expect(hud).not.toBeNull();

    // DOCUMENT_POSITION_FOLLOWING (4) means the argument node comes after `this` node.
    expect(hud!.compareDocumentPosition(equationEl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(equationEl.compareDocumentPosition(submit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(submit.compareDocumentPosition(inventoryTile) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("renders interactive answer slots and a select-mode inventory in answering, without feedback", () => {
    const equation = makeEquation(3, 4);
    const state = makeAnsweringState(equation, { inventory: [makeTile(1, "a")] });
    renderScreen(state);

    expect(screen.getByRole("button", { name: "Answer slot 1: empty" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Digit 1" })).toBeEnabled();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("keeps the submitted tiles on screen in feedback with no answer-slot button", () => {
    const equation = makeEquation(3, 4); // product 12, two slots
    // Digits 5 and 6 appear in neither the equation, the submitted value, the
    // correct value, nor the inventory, so getByText finds only the slots.
    const state = makeFeedbackState(equation, {
      inventory: [],
      lastResult: {
        kind: "incorrect",
        submittedValue: 0,
        correctValue: equation.product,
        submittedTiles: [makeTile(5, "a"), makeTile(6, "b")],
        rewardTileIds: [],
      },
    });
    renderScreen(state);

    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Answer slot/ })).not.toBeInTheDocument();
  });

  /* The ladder is gated on the streak the answer just earned, and only this
     screen knows it. `SUBMIT_CORRECT` increments `currentStreak` in the same
     transition that enters feedback, so the reducer's count already includes
     the round on screen — one ring at 3 rather than three is what says the
     count travelled rather than a constant. */
  it("gates the streak ladder on the streak the judged answer earned", () => {
    const equation = makeEquation(3, 4); // product 12, two slots
    const state = makeFeedbackState(equation, {
      currentStreak: 3,
      lastResult: {
        kind: "correct",
        submittedValue: equation.product,
        correctValue: equation.product,
        submittedTiles: [makeTile(1, "a"), makeTile(2, "b")],
        rewardTileIds: [],
      },
    });
    renderScreen(state);

    // One ring per filled slot, and the answer fills two.
    expect(document.querySelectorAll(`.${slotStyles.ring}`)).toHaveLength(2);
  });

  it("renders a read-only inventory, feedback, and Next Round in feedback, with no answer-slot button", () => {
    const equation = makeEquation(3, 3);
    const state = makeFeedbackState(equation, { inventory: [makeTile(1, "a")] });
    renderScreen(state);

    const status = screen.getByRole("status");
    const nextRound = screen.getByRole("button", { name: "Next Round" });
    const inventoryTile = screen.getByRole("button", { name: "Digit 1" });
    expect(status).toHaveTextContent("Incorrect");
    expect(inventoryTile).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Answer slot/ })).not.toBeInTheDocument();

    // HUD -> equation/feedback context -> phase action -> inventory (§1.10).
    expect(status.compareDocumentPosition(nextRound) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(nextRound.compareDocumentPosition(inventoryTile) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("renders a discard-mode inventory, preserved feedback, and the instruction with no Confirm in overflow", () => {
    const equation = makeEquation(3, 3);
    const state = makeOverflowState(equation, {
      inventory: TWELVE_TILE_INVENTORY,
      pendingDiscards: ["tile-0"],
    });
    renderScreen(state);

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Incorrect");
    const instruction = screen.getByText("Choose a tile to discard.");
    expect(screen.queryByRole("button", { name: "Confirm Discard" })).not.toBeInTheDocument();
    const discardTile = screen.getByRole("button", { name: "Digit 0, Marked for discard" });
    expect(discardTile).toHaveAttribute("aria-pressed", "true");

    // HUD -> equation/feedback context -> phase action -> inventory (§1.10).
    expect(status.compareDocumentPosition(instruction) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(instruction.compareDocumentPosition(discardTile) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  // Some screen readers do not announce what a live region already holds when
  // it is inserted, so the region has to exist, empty, before the verdict
  // arrives in it (#31).
  it("keeps the feedback status region mounted, empty, from answering into feedback", () => {
    const equation = makeEquation(3, 3);
    const screenFor = (state: GameState) => (
      <I18nProvider initialLanguage="en">
        <GameScreen state={state} dispatch={vi.fn()} onSubmit={vi.fn()} onNextRound={vi.fn()} />
      </I18nProvider>
    );
    const { rerender } = render(screenFor(makeAnsweringState(equation)));
    const status = screen.getByRole("status");
    expect(status).toBeEmptyDOMElement();

    rerender(screenFor(makeFeedbackState(equation)));

    expect(screen.getByRole("status")).toBe(status);
    expect(status).toHaveTextContent("Incorrect");
  });

  it("keeps the feedback status region mounted across the overflow-to-feedback transition", () => {
    const equation = makeEquation(3, 3);
    const overflowState = makeOverflowState(equation, { pendingDiscards: ["tile-0"] });
    const { rerender } = render(
      <I18nProvider initialLanguage="en">
        <GameScreen state={overflowState} dispatch={vi.fn()} onSubmit={vi.fn()} onNextRound={vi.fn()} />
      </I18nProvider>,
    );
    const statusBeforeConfirm = screen.getByRole("status");

    const feedbackState = makeFeedbackState(equation, {
      inventory: overflowState.inventory.filter((tile) => tile.id !== "tile-0"),
    });
    rerender(
      <I18nProvider initialLanguage="en">
        <GameScreen state={feedbackState} dispatch={vi.fn()} onSubmit={vi.fn()} onNextRound={vi.fn()} />
      </I18nProvider>,
    );

    expect(screen.getByRole("status")).toBe(statusBeforeConfirm);
  });

  it("does not auto-advance out of feedback without user action", () => {
    const equation = makeEquation(3, 3);
    const state = makeFeedbackState(equation);
    const { onNextRound, dispatch } = renderScreen(state);

    expect(onNextRound).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("does not auto-confirm discard merely from reaching the exact required count", () => {
    const equation = makeEquation(3, 3);
    const state = makeOverflowState(equation, { pendingDiscards: ["tile-0"] });
    const { dispatch } = renderScreen(state);

    expect(dispatch).not.toHaveBeenCalled();
  });
});

describe("GameScreen overflow collapse", () => {
  it("dispatches exactly one TOGGLE_DISCARD for a forced single-tile discard under StrictMode", async () => {
    const user = userEvent.setup();
    const state = makeOverflowState(makeEquation(3, 3)); // 11 tiles -> required 1
    const dispatch = vi.fn();
    render(
      <StrictMode>
        <I18nProvider initialLanguage="en">
          <GameScreen state={state} dispatch={dispatch} onSubmit={vi.fn()} onNextRound={vi.fn()} />
        </I18nProvider>
      </StrictMode>,
    );

    // Digit 5 (index 5 of 11, digits cycle 0-8 then wrap to 0,1): the only
    // digits that repeat in this fixture are 0 and 1, so "Digit 5" is the
    // one accessible name guaranteed to resolve to a single button.
    await user.click(screen.getByRole("button", { name: "Digit 5" }));

    // The reducer completes the discard on this mark (§1.7); the screen only
    // forwards it, once, so StrictMode's double render cannot double it.
    expect(dispatch.mock.calls.map(([action]) => action.type)).toEqual(["TOGGLE_DISCARD"]);
  });

  it("dispatches a single mark on a multi-tile (12-tile) overflow tap and renders no Confirm", async () => {
    const equation = makeEquation(3, 3);
    const state = makeOverflowState(equation, { inventory: TWELVE_TILE_INVENTORY }); // required 2
    const { dispatch } = renderScreen(state);

    expect(screen.queryByRole("button", { name: "Confirm Discard" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Digit 5" }));

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({ type: "TOGGLE_DISCARD", tileId: "tile-5" });
  });

  it("marks a tile via a digit key press during overflow", async () => {
    const equation = makeEquation(3, 3);
    const state = makeOverflowState(equation, { inventory: TWELVE_TILE_INVENTORY }); // required 2
    const { dispatch } = renderScreen(state);

    await userEvent.keyboard("5");

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({ type: "TOGGLE_DISCARD", tileId: "tile-5" });
  });

  it("marks on a digit key press at a required count of one, leaving completion to the reducer", async () => {
    const equation = makeEquation(3, 3);
    const state = makeOverflowState(equation); // 11 tiles -> required 1
    const { dispatch } = renderScreen(state);

    await userEvent.keyboard("5");

    expect(dispatch.mock.calls.map(([action]) => action.type)).toEqual(["TOGGLE_DISCARD"]);
  });

  it("walks through duplicate-digit tiles on repeated presses instead of re-toggling an already-marked one", async () => {
    const equation = makeEquation(3, 3);
    // required 2; digit 0 appears twice (tile-0, tile-9) with tile-0 already marked.
    const state = makeOverflowState(equation, {
      inventory: TWELVE_TILE_INVENTORY,
      pendingDiscards: ["tile-0"],
    });
    const { dispatch } = renderScreen(state);

    await userEvent.keyboard("0");

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({ type: "TOGGLE_DISCARD", tileId: "tile-9" });
  });

  it("ignores a digit key press once the required discard count is already marked", async () => {
    const equation = makeEquation(3, 3);
    const state = makeOverflowState(equation, { pendingDiscards: ["tile-0"] }); // required 1, already met
    const { dispatch } = renderScreen(state);

    await userEvent.keyboard("5");

    expect(dispatch).not.toHaveBeenCalled();
  });
});

// Regression coverage for useGameKeyboard's effect-registered `keydown`
// listener. Unlike a plain onClick (which cannot double-fire under
// StrictMode — only render bodies, reducers, and effect setup/cleanup are
// double-invoked), a dropped `useEffect` cleanup here would leave two
// `window.addEventListener("keydown", ...)` registrations live, so a single
// key press would dispatch twice. Escape is used because exactly one press
// yields exactly one action, making a doubled dispatch immediately visible
// in the asserted sequence.
describe("useGameKeyboard under React.StrictMode", () => {
  it("dispatches CLEAR_SELECTION exactly once for a single Escape press", async () => {
    const user = userEvent.setup();
    const equation = makeEquation(7, 8);
    const state = makeAnsweringState(equation, {
      inventory: [],
      selectedTiles: [makeTile(5, "a"), makeTile(6, "b")],
    });
    const dispatch = vi.fn();
    render(
      <StrictMode>
        <I18nProvider initialLanguage="en">
          <GameScreen state={state} dispatch={dispatch} onSubmit={vi.fn()} onNextRound={vi.fn()} />
        </I18nProvider>
      </StrictMode>,
    );

    await user.keyboard("{Escape}");

    expect(dispatch.mock.calls.map(([action]) => action.type)).toEqual(["CLEAR_SELECTION"]);
  });
});

// The capacity meter reads the same union the rack draws. Selecting a tile
// moves it out of state.inventory and into state.selectedTiles, so a meter
// reading inventory alone drops by one per selection and contradicts the rack
// beside it, which keeps a socket for every tile in that union. It is wrong in
// the direction that hides overflow: it shows headroom the player has not got.
//
// This is asserted at the GameScreen level on purpose. CapacityMeter's own
// tests pass `held` by hand, so they constrain the component and can never
// reach the wiring — which is how this shipped past 261 green tests once.
const EIGHT_HELD_DIGITS = [0, 1, 2, 3, 4, 5, 6, 7] as const;

describe("GameScreen capacity meter", () => {
  it("counts tiles in the answer slots as still held", () => {
    const equation = makeEquation(3, 4);
    const inventory = EIGHT_HELD_DIGITS.map((digit) => makeTile(digit, `held-${digit}`));
    const state = makeAnsweringState(equation, {
      inventory,
      selectedTiles: [makeTile(8, "lifted-a"), makeTile(9, "lifted-b")],
    });
    renderScreen(state);

    expect(screen.getByRole("img", { name: "Capacity 10 of 10" })).toBeInTheDocument();
  });

  it("drops the count only when a tile actually leaves", () => {
    const equation = makeEquation(3, 4);
    const inventory = EIGHT_HELD_DIGITS.map((digit) => makeTile(digit, `held-${digit}`));
    renderScreen(makeAnsweringState(equation, { inventory, selectedTiles: [] }));

    expect(screen.getByRole("img", { name: "Capacity 8 of 10" })).toBeInTheDocument();
  });
});

describe("GameScreen after a discard", () => {
  const discardedFeedback = (inventory = makeOverflowInventory(10), overrides: Partial<GameState> = {}) => {
    const state = makeFeedbackState(makeEquation(3, 3), { inventory, ...overrides });
    return { ...state, lastResult: { ...state.lastResult!, discarded: true } };
  };

  it("renders no Next Round, because the round advances on its own (§1.7)", () => {
    renderScreen(discardedFeedback());
    expect(screen.queryByRole("button", { name: "Next Round" })).not.toBeInTheDocument();
  });

  it("leaves Enter inert while the discard settles", async () => {
    const { onNextRound } = renderScreen(discardedFeedback());
    await userEvent.keyboard("{Enter}");
    expect(onNextRound).not.toHaveBeenCalled();
  });

  it("advances to the next round once the departing tile has played", () => {
    const overflow = makeOverflowState(makeEquation(3, 3));
    const onNextRound = vi.fn();
    const screenFor = (state: GameState) => (
      <I18nProvider initialLanguage="en">
        <GameScreen state={state} dispatch={vi.fn()} onSubmit={vi.fn()} onNextRound={onNextRound} />
      </I18nProvider>
    );
    const { container, rerender } = render(screenFor(overflow));
    const gone = overflow.inventory[10]!;
    rerender(screenFor(discardedFeedback(overflow.inventory.filter((tile) => tile !== gone))));

    const departing = container.querySelector(`[data-departing="${gone.id}"]`)!;
    expect(onNextRound).not.toHaveBeenCalled();
    fireEvent.animationEnd(departing);
    fireEvent(departing, new Event("webkitAnimationEnd", { bubbles: true }));
    expect(onNextRound).toHaveBeenCalledTimes(1);
  });

  it("waits for the verdict's celebration as well as the departure before advancing", () => {
    // A correct answer at streak 8 plays the bloom, three rings and the burst
    // on its slot. Those mount with feedback, after the discard completes, so
    // the 420ms exit ends before the 720ms burst does.
    const answer = makeTile(9, "answer");
    const correct = (state: GameState): GameState => ({
      ...state,
      currentStreak: 8,
      lastResult: {
        ...state.lastResult!,
        kind: "correct",
        submittedValue: 9,
        submittedTiles: [answer],
      },
    });
    const overflow = correct(makeOverflowState(makeEquation(3, 3)));
    const onNextRound = vi.fn();
    const screenFor = (state: GameState) => (
      <I18nProvider initialLanguage="en">
        <GameScreen state={state} dispatch={vi.fn()} onSubmit={vi.fn()} onNextRound={onNextRound} />
      </I18nProvider>
    );
    const { container, rerender } = render(screenFor(overflow));
    const gone = overflow.inventory[10]!;
    rerender(screenFor(correct(discardedFeedback(overflow.inventory.filter((tile) => tile !== gone)))));

    const end = (element: Element) => {
      fireEvent.animationEnd(element);
      fireEvent(element, new Event("webkitAnimationEnd", { bubbles: true }));
    };
    end(container.querySelector(`[data-departing="${gone.id}"]`)!);
    expect(onNextRound).not.toHaveBeenCalled();

    const moments = [...container.querySelectorAll("[data-moment]")];
    expect(moments).toHaveLength(1 + 3 + 6); // the bloom, three rings, six chips
    moments.slice(0, -1).forEach(end);
    expect(onNextRound).not.toHaveBeenCalled();
    end(moments[moments.length - 1]!);
    expect(onNextRound).toHaveBeenCalledTimes(1);
  });

  it("draws the rack in the reducer's order outside answering, so the newest arrival stays on the rail", () => {
    // The reducer leaves the newest arrival past capacity (§1.5 step 7); a
    // re-sort here would pull this 0 to the front and perch a 9 instead.
    const seated = makeOverflowInventory(10).map((tile) => ({ ...tile, digit: 9 as const }));
    const state = makeOverflowState(makeEquation(3, 3), {
      inventory: [...seated, makeTile(0, "newest", true)],
    });
    renderScreen(state);
    // The rail sits above the rack, so the perched tile comes first.
    const tiles = screen.getAllByRole("button", { name: /^Digit/ });
    expect(tiles[0]).toHaveAccessibleName("Digit 0, New tile");
    expect(tiles.slice(1).every((tile) => tile.textContent === "9")).toBe(true);
  });
});

describe("GameScreen in Puzzle", () => {
  // The gallery's answering-puzzle state: the sample at row 1, its hand dealt.
  const SAMPLE_AT_ROW_1 = makeAnsweringState(PUZZLE_SAMPLE.rows[0].equation, {
    mode: "puzzle",
    table: PUZZLE_SAMPLE,
    rowResults: [],
    inventory: sortTiles(createTiles(PUZZLE_SAMPLE.hand, sequentialIds())),
  });

  it("shows the ledger and par, and no capacity meter", () => {
    renderScreen(SAMPLE_AT_ROW_1);
    expect(screen.getByRole("list", { name: "Table" })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /^Capacity/ })).not.toBeInTheDocument();
    expect(screen.getByText("Par").nextElementSibling).toHaveTextContent("7");
  });

  it("draws the rack as one row of exactly five sockets", () => {
    renderScreen(SAMPLE_AT_ROW_1);
    const rack = screen.getByRole("button", { name: "Digit 1" }).closest(`.${rackStyles.rack}`);
    expect(rack).toHaveAttribute("data-size", "row");
    expect(rack!.querySelector(`.${rackStyles.inventory}`)!.children).toHaveLength(5);
  });

  // Review Focus 4: a stale table would show, and check pays against, the run
  // that ended.
  it("shows a replayed run's own table, from its row 1", () => {
    const next: PuzzleTable = {
      hand: [1, 2, 4, 6, 8],
      rows: [makePuzzleRow(2, 6, [1, 3, 5]), makePuzzleRow(4, 2, [6, 0])],
      par: 1,
    };
    const over = makeGameOverState(PUZZLE_SAMPLE.rows[3].equation, {
      mode: "puzzle",
      table: PUZZLE_SAMPLE,
      rowResults: ["incorrect", "correct", "correct"],
      round: 4,
      totalRounds: 3,
    });
    renderScreen(
      gameReducer(over, {
        type: "RESTART_RUN",
        equation: next.rows[0].equation,
        inventory: sortTiles(createTiles(next.hand, sequentialIds())),
        table: next,
      }),
    );

    const rows = within(screen.getByRole("list", { name: "Table" })).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveAttribute("aria-current", "step");
    expect(rows[0]).toHaveTextContent("Row 1, 2 × 6, pays 1, 3, and 5");
    expect(rows[0]).not.toHaveTextContent("missed");
  });
});
