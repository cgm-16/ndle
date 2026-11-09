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
  makeFeedbackState,
  makeGameOverState,
  makeOverflowState,
  makePuzzleRow,
  parLineAt,
  PUZZLE_SAMPLE_PAR_LINE,
  playRow,
  selectDigits,
  sequentialIds,
  tileWith,
} from "../../test/fixtures";
import slotStyles from "../AnswerSlots/AnswerSlots.module.css";
import rackStyles from "../TileInventory/TileInventory.module.css";
import { GameScreen, type GameScreenProps } from "./GameScreen";

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

// Row 1 of the sample, 3 × 5 = 15, with both slots filled.
const FULL_ANSWER = () => selectDigits(makeAnsweringState(), 1, 5);

describe("GameScreen interactions", () => {
  // 1. clicking duplicate digits dispatches the exact clicked ID
  it("dispatches SELECT_TILE with the exact clicked tile id among duplicate digits", async () => {
    const state = parLineAt(8); // 1 2 7 8 8
    const { dispatch } = renderScreen(state);

    const duplicates = screen.getAllByRole("button", { name: "Digit 8" });
    await userEvent.click(duplicates[1]);

    const second = state.inventory.filter((tile) => tile.digit === 8)[1]!;
    expect(dispatch).toHaveBeenCalledWith({ type: "SELECT_TILE", tileId: second.id });
  });

  // 2. digit key chooses the first matching sorted inventory tile
  it("selects the first matching sorted inventory tile on a digit key press", async () => {
    const state = parLineAt(8);
    const { dispatch } = renderScreen(state);

    await userEvent.keyboard("8");

    expect(dispatch).toHaveBeenCalledWith({ type: "SELECT_TILE", tileId: tileWith(state, 8).id });
  });

  // 3. filled slots reject additional digits
  it("does not dispatch on a digit key press when all answer slots are already filled", async () => {
    const state = selectDigits(parLineAt(3), 9); // 3 × 3, one slot
    const { dispatch } = renderScreen(state);

    await userEvent.keyboard("1");

    expect(dispatch).not.toHaveBeenCalled();
  });

  it("selects the tile holding the pressed digit", async () => {
    const state = makeAnsweringState();
    const { dispatch } = renderScreen(state);
    await userEvent.keyboard("4");
    expect(dispatch).toHaveBeenCalledWith({ type: "SELECT_TILE", tileId: tileWith(state, 4).id });
  });

  // 4. Backspace returns the most recent selected tile
  it("returns the most recently selected tile on Backspace", async () => {
    const state = FULL_ANSWER();
    const { dispatch } = renderScreen(state);

    await userEvent.keyboard("{Backspace}");

    expect(dispatch).toHaveBeenCalledWith({ type: "RETURN_TILE", tileId: state.selectedTiles[1]!.id });
  });

  // 4b. Escape clears the entire selection
  it("dispatches CLEAR_SELECTION on Escape when tiles are selected", async () => {
    const { dispatch } = renderScreen(FULL_ANSWER());

    await userEvent.keyboard("{Escape}");

    expect(dispatch).toHaveBeenCalledWith({ type: "CLEAR_SELECTION" });
  });

  it("does not dispatch on Escape when nothing is selected", async () => {
    const { dispatch } = renderScreen(makeAnsweringState());

    await userEvent.keyboard("{Escape}");

    expect(dispatch).not.toHaveBeenCalled();
  });

  // 5. Enter submits only when ready
  it("submits on Enter when all answer slots are filled", async () => {
    const { onSubmit } = renderScreen(FULL_ANSWER());

    await userEvent.keyboard("{Enter}");

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("does not submit on Enter when an answer slot is still empty", async () => {
    const { onSubmit } = renderScreen(selectDigits(makeAnsweringState(), 1));

    await userEvent.keyboard("{Enter}");

    expect(onSubmit).not.toHaveBeenCalled();
  });

  // 6. Enter has no overflow action: there is nothing to confirm (§1.11)
  it("does not confirm discard on Enter when the marked count is short of the excess", async () => {
    const { dispatch } = renderScreen(makeOverflowState());

    await userEvent.keyboard("{Enter}");

    expect(dispatch).not.toHaveBeenCalled();
  });

  // 7. Enter advances from feedback
  it("advances to the next round on Enter during feedback", async () => {
    const { onNextRound } = renderScreen(makeFeedbackState());

    await userEvent.keyboard("{Enter}");

    expect(onNextRound).toHaveBeenCalledTimes(1);
  });

  // 8. disabled shortcuts dispatch nothing
  describe("disabled keyboard shortcuts are no-ops", () => {
    it("ignores a digit key held with a modifier", async () => {
      const { dispatch } = renderScreen(makeAnsweringState());

      await userEvent.keyboard("{Meta>}4{/Meta}");

      expect(dispatch).not.toHaveBeenCalled();
    });

    it("ignores a repeated Enter keydown", () => {
      const { onSubmit } = renderScreen(FULL_ANSWER());

      fireEvent.keyDown(window, { key: "Enter", repeat: true });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("ignores a digit key with no matching tile in inventory", async () => {
      const { dispatch } = renderScreen(makeAnsweringState()); // 1 4 5 7 9

      await userEvent.keyboard("2");

      expect(dispatch).not.toHaveBeenCalled();
    });
  });

  // 9. intentional incorrect selection can be submitted
  it("allows submitting an intentionally incorrect answer via the Submit button", async () => {
    // The sacrifice: 57 for 15.
    const { onSubmit } = renderScreen(selectDigits(makeAnsweringState(), 5, 7));

    const submitButton = screen.getByRole("button", { name: "Submit" });
    expect(submitButton).toBeEnabled();
    await userEvent.click(submitButton);

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  // 10. Clear button visibility follows selection state
  it("disables Clear when nothing is selected", () => {
    renderScreen(makeAnsweringState());

    expect(screen.getByRole("button", { name: "Clear" })).toBeDisabled();
  });

  it("enables Clear once a tile is chosen", () => {
    renderScreen(selectDigits(makeAnsweringState(), 4));

    expect(screen.getByRole("button", { name: "Clear" })).toBeEnabled();
  });

  it("dispatches CLEAR_SELECTION when Clear is clicked", async () => {
    const { dispatch } = renderScreen(selectDigits(makeAnsweringState(), 4));

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
      const { onNextRound } = renderScreen(makeFeedbackState());

      screen.getByRole("button", { name: "Next Round" }).focus();
      await userEvent.keyboard("{Enter}");

      expect(onNextRound).toHaveBeenCalledTimes(1);
    });

    it("calls onSubmit exactly once with Submit focused", async () => {
      const { onSubmit } = renderScreen(FULL_ANSWER());

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
      const { dispatch, onSubmit } = renderScreen(FULL_ANSWER());

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
    renderScreen(makeAnsweringState()); // 3 × 5 = 15

    expect(screen.getByText("3 × 5 =")).toBeInTheDocument();
    expect(screen.queryByText("15")).not.toBeInTheDocument();
  });

  it("orders HUD, equation, Submit, and inventory for the answering phase", () => {
    renderScreen(makeAnsweringState());

    const hud = screen.getByText("Score").closest("dl");
    const equationEl = screen.getByText("3 × 5 =");
    const submit = screen.getByRole("button", { name: "Submit" });
    const inventoryTile = screen.getByRole("button", { name: "Digit 1" });
    expect(hud).not.toBeNull();

    // DOCUMENT_POSITION_FOLLOWING (4) means the argument node comes after `this` node.
    expect(hud!.compareDocumentPosition(equationEl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(equationEl.compareDocumentPosition(submit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(submit.compareDocumentPosition(inventoryTile) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("renders interactive answer slots and a select-mode inventory in answering, without feedback", () => {
    renderScreen(makeAnsweringState());

    expect(screen.getByRole("button", { name: "Answer slot 1: empty" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Digit 1" })).toBeEnabled();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("keeps the submitted tiles on screen in feedback with no answer-slot button", () => {
    // The sacrifice, 5 then 7. The ledger draws digits too, so the slots are
    // read on their own.
    renderScreen(makeFeedbackState());

    const slots = document.querySelector<HTMLElement>(`.${slotStyles.slots}`)!;
    expect(within(slots).getByText("5")).toBeInTheDocument();
    expect(within(slots).getByText("7")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Answer slot/ })).not.toBeInTheDocument();
  });

  /* The ladder is gated on the streak the answer just earned, and only this
     screen knows it. `SUBMIT_CORRECT` increments `currentStreak` in the same
     transition that enters feedback, so the reducer's count already includes
     the round on screen — one ring at 3 rather than three is what says the
     count travelled rather than a constant. */
  it("gates the streak ladder on the streak the judged answer earned", () => {
    // Row 4's 7, the third answer since the sacrifice, after its discard.
    const ids = sequentialIds();
    const state = playRow(parLineAt(4, ids), PUZZLE_SAMPLE_PAR_LINE[3]!, ids);
    expect(state.currentStreak).toBe(3);
    renderScreen(state);

    // One ring per filled slot, and the answer fills one.
    expect(document.querySelectorAll(`.${slotStyles.ring}`)).toHaveLength(1);
  });

  it("renders a read-only inventory, feedback, and Next Round in feedback, with no answer-slot button", () => {
    renderScreen(makeFeedbackState());

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
    renderScreen(makeOverflowState());

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Correct");
    const instruction = screen.getByText("Choose a tile to discard.");
    expect(screen.queryByRole("button", { name: "Confirm Discard" })).not.toBeInTheDocument();
    const discardTile = screen.getByRole("button", { name: "Digit 1" });
    expect(discardTile).toHaveAttribute("aria-pressed", "false");

    // HUD -> equation/feedback context -> phase action -> inventory (§1.10).
    expect(status.compareDocumentPosition(instruction) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(instruction.compareDocumentPosition(discardTile) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  // Some screen readers do not announce what a live region already holds when
  // it is inserted, so the region has to exist, empty, before the verdict
  // arrives in it (#31).
  it("keeps the feedback status region mounted, empty, from answering into feedback", () => {
    const screenFor = (state: GameState) => (
      <I18nProvider initialLanguage="en">
        <GameScreen state={state} dispatch={vi.fn()} onSubmit={vi.fn()} onNextRound={vi.fn()} />
      </I18nProvider>
    );
    const { rerender } = render(screenFor(makeAnsweringState()));
    const status = screen.getByRole("status");
    expect(status).toBeEmptyDOMElement();

    rerender(screenFor(makeFeedbackState()));

    expect(screen.getByRole("status")).toBe(status);
    expect(status).toHaveTextContent("Incorrect");
  });

  it("keeps the feedback status region mounted across the overflow-to-feedback transition", () => {
    const overflowState = makeOverflowState();
    const { rerender } = render(
      <I18nProvider initialLanguage="en">
        <GameScreen state={overflowState} dispatch={vi.fn()} onSubmit={vi.fn()} onNextRound={vi.fn()} />
      </I18nProvider>,
    );
    const statusBeforeConfirm = screen.getByRole("status");

    const feedbackState = gameReducer(overflowState, {
      type: "TOGGLE_DISCARD",
      tileId: tileWith(overflowState, 6).id,
    });
    rerender(
      <I18nProvider initialLanguage="en">
        <GameScreen state={feedbackState} dispatch={vi.fn()} onSubmit={vi.fn()} onNextRound={vi.fn()} />
      </I18nProvider>,
    );

    expect(screen.getByRole("status")).toBe(statusBeforeConfirm);
  });

  it("does not auto-advance out of feedback without user action", () => {
    const { onNextRound, dispatch } = renderScreen(makeFeedbackState());

    expect(onNextRound).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });
});

describe("GameScreen overflow collapse", () => {
  it("dispatches exactly one TOGGLE_DISCARD for a forced single-tile discard under StrictMode", async () => {
    const user = userEvent.setup();
    const state = makeOverflowState(); // 1 2 4 6 8, a 4 on the rail -> required 1
    const dispatch = vi.fn();
    render(
      <StrictMode>
        <I18nProvider initialLanguage="en">
          <GameScreen state={state} dispatch={dispatch} onSubmit={vi.fn()} onNextRound={vi.fn()} />
        </I18nProvider>
      </StrictMode>,
    );

    // The 4s are the row's pay and both read "Digit 4, New tile", so "Digit 6"
    // is a name that resolves to a single button.
    await user.click(screen.getByRole("button", { name: "Digit 6" }));

    // The reducer completes the discard on this mark (§1.7); the screen only
    // forwards it, once, so StrictMode's double render cannot double it.
    expect(dispatch.mock.calls.map(([action]) => action.type)).toEqual(["TOGGLE_DISCARD"]);
  });

  it("dispatches a single mark on an overflow tap and renders no Confirm", async () => {
    const state = makeOverflowState();
    const { dispatch } = renderScreen(state);

    expect(screen.queryByRole("button", { name: "Confirm Discard" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Digit 6" }));

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({ type: "TOGGLE_DISCARD", tileId: tileWith(state, 6).id });
  });

  it("marks a tile via a digit key press during overflow", async () => {
    const state = makeOverflowState();
    const { dispatch } = renderScreen(state);

    await userEvent.keyboard("6");

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({ type: "TOGGLE_DISCARD", tileId: tileWith(state, 6).id });
  });

  it("marks on a digit key press at a required count of one, leaving completion to the reducer", async () => {
    const { dispatch } = renderScreen(makeOverflowState()); // required 1

    await userEvent.keyboard("8");

    expect(dispatch.mock.calls.map(([action]) => action.type)).toEqual(["TOGGLE_DISCARD"]);
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
    const dispatch = vi.fn();
    render(
      <StrictMode>
        <I18nProvider initialLanguage="en">
          <GameScreen state={FULL_ANSWER()} dispatch={dispatch} onSubmit={vi.fn()} onNextRound={vi.fn()} />
        </I18nProvider>
      </StrictMode>,
    );

    await user.keyboard("{Escape}");

    expect(dispatch.mock.calls.map(([action]) => action.type)).toEqual(["CLEAR_SELECTION"]);
  });
});

describe("GameScreen after a discard", () => {
  // Row 4's overflow with its rail tile discarded: the seated tiles stay put,
  // so no survivor drops and the departure is the rack's only moment.
  const discardedFeedback = (overflow = makeOverflowState()) =>
    gameReducer(overflow, { type: "TOGGLE_DISCARD", tileId: overflow.inventory[5]!.id });

  const end = (element: Element) => {
    fireEvent.animationEnd(element);
    fireEvent(element, new Event("webkitAnimationEnd", { bubbles: true }));
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
    const overflow = makeOverflowState();
    const onNextRound = vi.fn();
    const screenFor = (state: GameState) => (
      <I18nProvider initialLanguage="en">
        <GameScreen state={state} dispatch={vi.fn()} onSubmit={vi.fn()} onNextRound={onNextRound} />
      </I18nProvider>
    );
    const { container, rerender } = render(screenFor(overflow));
    const gone = overflow.inventory[5]!;
    rerender(screenFor(discardedFeedback(overflow)));

    // The verdict's bloom and ring finish first; the departure is the last half.
    [...container.querySelectorAll("[data-moment]")].forEach(end);
    expect(onNextRound).not.toHaveBeenCalled();
    end(container.querySelector(`[data-departing="${gone.id}"]`)!);
    expect(onNextRound).toHaveBeenCalledTimes(1);
  });

  it("waits for the verdict's celebration as well as the departure before advancing", () => {
    // A correct answer at streak 8 plays the bloom, three rings and the burst
    // on its slot. Those mount with feedback, after the discard completes, so
    // the 420ms exit ends before the 720ms burst does. No table reaches
    // streak 8 by row 4, so it is set on row 4's answer.
    const overflow = { ...makeOverflowState(), currentStreak: 8 };
    const onNextRound = vi.fn();
    const screenFor = (state: GameState) => (
      <I18nProvider initialLanguage="en">
        <GameScreen state={state} dispatch={vi.fn()} onSubmit={vi.fn()} onNextRound={onNextRound} />
      </I18nProvider>
    );
    const { container, rerender } = render(screenFor(overflow));
    const gone = overflow.inventory[5]!;
    rerender(screenFor(discardedFeedback(overflow)));

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
    // re-sort here would seat this second 4 and perch the 8 instead.
    renderScreen(makeOverflowState());
    // The rail sits above the rack, so the perched tile comes first.
    const tiles = screen.getAllByRole("button", { name: /^Digit/ });
    expect(tiles[0]).toHaveAccessibleName("Digit 4, New tile");
    expect(tiles.slice(1).map((tile) => tile.textContent)).toEqual(["1", "2", "4", "6", "8"]);
  });
});

describe("GameScreen in Puzzle", () => {
  it("shows the ledger and par", () => {
    renderScreen(makeAnsweringState());
    expect(screen.getByRole("list", { name: "Table" })).toBeInTheDocument();
    expect(screen.getByText("Par").nextElementSibling).toHaveTextContent("7");
  });

  it("draws the rack as one row of exactly five sockets", () => {
    renderScreen(makeAnsweringState());
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
    renderScreen(
      gameReducer(makeGameOverState(), {
        type: "RESTART_RUN",
        table: next,
        inventory: sortTiles(createTiles(next.hand, sequentialIds())),
      }),
    );

    const rows = within(screen.getByRole("list", { name: "Table" })).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveAttribute("aria-current", "step");
    expect(rows[0]).toHaveTextContent("Row 1, 2 × 6, pays 1, 3, and 5");
    expect(rows[0]).not.toHaveTextContent("missed");
  });
});
