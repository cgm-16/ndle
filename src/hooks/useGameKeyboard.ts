import { useEffect } from "react";
import type { Digit, GameAction, GameState } from "../game/types";
import { getAnswerLength, getOverflowCount, isSubmissionReady } from "../game/selectors";

const DIGIT_KEY_PATTERN = /^[0-9]$/;

// Controls the browser activates on Enter by itself. This is a property of
// HTML rather than of this screen's current markup, so it names the whole set
// and not only the buttons that happen to be mounted today.
const ENTER_ACTIVATES = "a[href], button, input, select, textarea";

export interface UseGameKeyboardArgs {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  onSubmit(): void;
  onNextRound(): void;
}

// Attaches one keydown listener for the lifetime of the mounted game screen
// and translates §1.11 keyboard shortcuts into the same semantic events the
// on-screen controls dispatch. It never mutates state directly and never
// dispatches an action the reducer would reject: readiness is checked with
// the same selectors the on-screen buttons use before dispatching.
export function useGameKeyboard({ state, dispatch, onSubmit, onNextRound }: UseGameKeyboardArgs): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "Enter" && event.repeat) return;
      // §1.11 already states this rule for gameOver and title: a focused
      // button keeps normal browser behavior and the global shortcut stands
      // aside. `answering` is where leaving it unstated cost the player
      // tiles — Enter on a focused Clear reached this listener, and
      // preventDefault() below suppressed the button's own activation, so
      // CLEAR_SELECTION never dispatched and the answer submitted instead.
      // Standing aside changes the mechanism, not the outcome: every control
      // this defers to reaches the same callback through its own onClick.
      if (event.key === "Enter" && event.target instanceof Element && event.target.matches(ENTER_ACTIVATES))
        return;

      if (state.phase === "answering") {
        if (DIGIT_KEY_PATTERN.test(event.key)) {
          if (state.equation === null) return;
          if (state.selectedTiles.length >= getAnswerLength(state.equation)) return;
          const digit = Number(event.key) as Digit;
          const tile = state.inventory.find((item) => item.digit === digit);
          if (!tile) return;
          event.preventDefault();
          dispatch({ type: "SELECT_TILE", tileId: tile.id });
          return;
        }

        if (event.key === "Backspace") {
          const mostRecent = state.selectedTiles[state.selectedTiles.length - 1];
          if (!mostRecent) return;
          event.preventDefault();
          dispatch({ type: "RETURN_TILE", tileId: mostRecent.id });
          return;
        }

        if (event.key === "Escape") {
          if (state.selectedTiles.length === 0) return;
          event.preventDefault();
          dispatch({ type: "CLEAR_SELECTION" });
          return;
        }

        if (event.key === "Enter") {
          if (!isSubmissionReady(state)) return;
          event.preventDefault();
          onSubmit();
        }
        return;
      }

      if (state.phase === "overflow") {
        if (DIGIT_KEY_PATTERN.test(event.key)) {
          const required = getOverflowCount(state);
          if (state.pendingDiscards.length >= required) return;
          const digit = Number(event.key) as Digit;
          // Skip tiles already marked, so repeated presses walk through duplicates
          // instead of toggling one tile on and off.
          const tile = state.inventory.find(
            (item) => item.digit === digit && !state.pendingDiscards.includes(item.id),
          );
          if (!tile) return;
          event.preventDefault();
          dispatch({ type: "TOGGLE_DISCARD", tileId: tile.id });
        }
        return;
      }

      if (state.phase === "feedback") {
        // After a discard the round advances on its own (§1.11).
        if (event.key === "Enter" && !state.lastResult?.discarded) {
          event.preventDefault();
          onNextRound();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state, dispatch, onSubmit, onNextRound]);
}
