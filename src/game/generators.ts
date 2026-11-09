import type { Equation, RandomSource } from "./types";
import { OPERAND_MAX, OPERAND_MIN } from "./constants";

// The canonical 45-entry pool of unordered operand pairs (1 <= left <= right <= 9).
export const EQUATION_PAIRS: ReadonlyArray<readonly [number, number]> = (() => {
  const pairs: Array<readonly [number, number]> = [];
  for (let left = OPERAND_MIN; left <= OPERAND_MAX; left++) {
    for (let right = left; right <= OPERAND_MAX; right++) {
      pairs.push([left, right]);
    }
  }
  return pairs;
})();

export function readRandomSample(random: RandomSource): number {
  const value = random();
  if (!(value >= 0 && value < 1)) {
    throw new RangeError(`RandomSource must return a value in [0, 1); received ${value}`);
  }
  return value;
}

// Maps a validated [0, 1) sample to an integer bin index in [0, binCount).
// A tiny epsilon nudge compensates for floating-point round-trip error at bin
// edges (e.g. 13/45 * 45 evaluates to 12.999999999999998 in IEEE-754), then
// the result is clamped so that nudge can never push the index out of range.
export function sampleBinIndex(value: number, binCount: number): number {
  const scaled = value * binCount + Number.EPSILON * binCount;
  return Math.min(Math.floor(scaled), binCount - 1);
}

export function orientPair(pair: readonly [number, number], orderSample: number): Equation {
  const [a, b] = pair;
  const shouldReverse = orderSample >= 0.5;
  const left = shouldReverse ? b : a;
  const right = shouldReverse ? a : b;
  return { left, right, product: left * right };
}
