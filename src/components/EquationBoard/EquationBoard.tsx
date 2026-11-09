import { useState } from "react";
import type { Equation } from "../../game/types";
import styles from "./EquationBoard.module.css";

export interface EquationBoardProps {
  equation: Equation;
  /** §1.10: `gameOver` prints the product and no other phase does. During
   * play the answer slots are what completes the equation, so printing it
   * there would hand the player the answer being asked for. */
  showProduct?: boolean;
}

export function EquationBoard({ equation, showProduct = false }: EquationBoardProps) {
  // 10b fires once per arriving equation, and only a fresh element restarts a
  // CSS animation — EquationBoard stays mounted across a round change, so the
  // rise has to come from a key that changes when the equation does.
  //
  // What "changes" means here is object identity, not the pair of digits.
  // plantTable draws each row from the 45 pairs and never rejects a repeat, so
  // a key built from left and right misses every row that repeats the
  // previous pair — reachable, not theoretical, and it fails by staying still,
  // which is the one way a motion defect looks exactly like correct rest.
  // The reducer holds one equation object per round, so identity is the round.
  //
  // Counted during render rather than in an effect: the remount then lands in
  // the same commit as the new equation, leaving no frame where the old one is
  // still on screen.
  const [arrivals, setArrivals] = useState({ equation, count: 0 });
  if (arrivals.equation !== equation) {
    setArrivals({ equation, count: arrivals.count + 1 });
  }

  const statement = `${equation.left} × ${equation.right} =`;

  return (
    <p key={arrivals.count} className={styles.equation}>
      {showProduct ? (
        // The equation keeps an element of its own so it stays addressable as
        // one string, while the paragraph still reads as the whole statement
        // to a screen reader. The split appears only alongside a product:
        // splitting with nothing after it would leave the paragraph and the
        // span carrying identical text and neither one distinguishable.
        <>
          <span>{statement}</span> <span>{equation.product}</span>
        </>
      ) : (
        statement
      )}
    </p>
  );
}
