import type { Digit, Equation, RandomSource, Tile, TileIdFactory } from "./types";
import { KIND_EQUATION_RATE } from "./balance";
import { OPERAND_MAX, OPERAND_MIN, REWARD_DIGIT_COUNT } from "./constants";
import { canConstruct } from "./selectors";

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

// Both generators end with the same order-flip; extracted once both call sites exist.
export function orientPair(pair: readonly [number, number], orderSample: number): Equation {
  const [a, b] = pair;
  const shouldReverse = orderSample >= 0.5;
  const left = shouldReverse ? b : a;
  const right = shouldReverse ? a : b;
  return { left, right, product: left * right };
}

export function generateEquation(random: RandomSource): Equation {
  const pairSample = readRandomSample(random);
  const pairIndex = sampleBinIndex(pairSample, EQUATION_PAIRS.length);
  const pair = EQUATION_PAIRS[pairIndex];
  if (!pair) {
    throw new RangeError(`No equation pair found at index ${pairIndex}`);
  }

  const orderSample = readRandomSample(random);
  return orientPair(pair, orderSample);
}

export function generateKindEquation(random: RandomSource, inventory: readonly Tile[]): Equation {
  const gateSample = readRandomSample(random);
  if (gateSample >= KIND_EQUATION_RATE) return generateEquation(random);

  const constructible = EQUATION_PAIRS.filter(([left, right]) =>
    canConstruct(inventory, left * right),
  );
  // An empty subset means the hand can spell nothing at all. Fall back to
  // the uniform draw; sampling an empty pool would throw.
  if (constructible.length === 0) return generateEquation(random);

  const pairSample = readRandomSample(random);
  const pair = constructible[sampleBinIndex(pairSample, constructible.length)];
  if (!pair) throw new RangeError(`No constructible pair at sample ${pairSample}`);
  return orientPair(pair, readRandomSample(random));
}

// Reward tiles are digits, drawn uniformly.
export function generateRewardTiles(
  count: number,
  random: RandomSource,
  idFactory: TileIdFactory,
): Tile[] {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError(`Reward count must be a non-negative integer; received ${count}`);
  }

  return Array.from({ length: count }, (): Tile => {
    const sample = readRandomSample(random);
    const digit = sampleBinIndex(sample, REWARD_DIGIT_COUNT) as Digit;
    return { id: idFactory(), digit, isNew: true };
  });
}
