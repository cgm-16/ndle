// Puzzle's solver and deal, ported from docs/research/game-modes/03-puzzle/sims/solver.ts
// (printed-pay model only). The wall model, the lookahead bot and the seeded
// PRNG stay there: a seeded source must not ship, and tests replay the research
// tables through seededRandom in src/test/fixtures.ts instead.
import {
  PUZZLE_CAPACITY,
  PUZZLE_MIN_ONLY_MOVES,
  PUZZLE_MIN_PAR,
  PUZZLE_PLANT_RATE,
  PUZZLE_ROWS,
} from "./balance";
import { REWARD_DIGIT_COUNT } from "./constants";
import {
  EQUATION_PAIRS,
  orientPair,
  readRandomSample,
  sampleBinIndex,
} from "./generators";
import { getAnswerLength, getRewardCount } from "./selectors";
import type { Digit, PuzzleDeal, PuzzleRow, PuzzleTable, RandomSource } from "./types";

export interface PuzzleSolution {
  par: number;
  /** Decisions on the canonical par line that offer two or more options, exactly one of which keeps par. */
  onlyMoves: number;
  /** True when every line that scores par misses a row it could have answered. */
  sacrificeRequired: boolean;
}

// A bound, not a dial: at the shipped band about one plant in seven is
// accepted, so 200 failures in a row have probability about 10^-14.
export const PUZZLE_DEAL_ATTEMPTS = 200;

const DIGITS: readonly Digit[] = Array.from({ length: REWARD_DIGIT_COUNT }, (_, digit) => digit as Digit);

const digitsOf = (value: number): Digit[] => String(value).split("").map(Number) as Digit[];

// Tiles are interchangeable by digit, so a hand is searched as copies per digit.
const countDigits = (digits: readonly Digit[]): number[] => {
  const counts = DIGITS.map(() => 0);
  for (const digit of digits) counts[digit]++;
  return counts;
};

// The hand after a correct answer spends the product's digits and takes the
// pay, before any overflow discard.
const takeAnswer = (counts: number[], digits: readonly Digit[], pay: readonly Digit[]): number[] => {
  const answered = counts.slice();
  for (const digit of digits) answered[digit]--;
  for (const digit of pay) answered[digit]++;
  return answered;
};

type CorrectOption = { kind: "correct"; discard: Digit | null; counts: number[]; size: number };
type MissOption = { kind: "miss"; spend: Digit[]; counts: number[]; size: number };
type Option = CorrectOption | MissOption;

const isCorrect = (option: Option): option is CorrectOption => option.kind === "correct";
const scored = (option: Option): number => (isCorrect(option) ? 1 : 0);

// Every option moves the table on one row, so the next state is (k + 1, option.counts, option.size).
function createSearch(deal: PuzzleDeal) {
  if (deal.hand.length > PUZZLE_CAPACITY) {
    throw new RangeError(
      `Opening hand of ${deal.hand.length} tiles is over capacity ${PUZZLE_CAPACITY}`,
    );
  }
  const rows = deal.rows.map(({ equation, pay }) => ({
    product: equation.product,
    digits: digitsOf(equation.product),
    pay,
  }));

  // Enumeration order is load-bearing: correct options first (discard digit
  // ascending), then misses (one-digit: spent digit ascending; two-digit: pairs
  // a <= b ascending). The canonical par line takes the first optimal option.
  function options(k: number, counts: number[], size: number): Option[] {
    if (k >= rows.length) return [];
    const { product, digits, pay } = rows[k];
    // The loss: too few tiles for the next answer.
    if (size < digits.length) return [];
    const out: Option[] = [];
    if (digits.every((d) => counts[d] >= digits.filter((x) => x === d).length)) {
      const answered = takeAnswer(counts, digits, pay);
      const answeredSize = size - digits.length + pay.length;
      const excess = answeredSize - PUZZLE_CAPACITY;
      if (excess > 1) {
        throw new RangeError(`Row ${k} pays ${pay.length}, more than one over what it takes`);
      }
      if (excess === 1) {
        for (const discard of DIGITS) {
          if (answered[discard] === 0) continue;
          const kept = answered.slice();
          kept[discard]--;
          out.push({ kind: "correct", discard, counts: kept, size: PUZZLE_CAPACITY });
        }
      } else {
        out.push({ kind: "correct", discard: null, counts: answered, size: answeredSize });
      }
    }
    if (digits.length === 1) {
      for (const spent of DIGITS) {
        if (counts[spent] === 0 || spent === product) continue;
        const left = counts.slice();
        left[spent]--;
        out.push({ kind: "miss", spend: [spent], counts: left, size: size - 1 });
      }
    } else {
      // Any pair misses: the product's own pair misses when submitted reversed.
      for (const a of DIGITS) {
        for (const b of DIGITS) {
          if (b < a || (a === b ? counts[a] < 2 : counts[a] < 1 || counts[b] < 1)) continue;
          const left = counts.slice();
          left[a]--;
          left[b]--;
          out.push({ kind: "miss", spend: [a, b], counts: left, size: size - 2 });
        }
      }
    }
    return out;
  }

  // The best score still reachable from a state, over the options keepOptions leaves.
  const makeBestScore = (keepOptions: (options: Option[]) => Option[]) => {
    const memo = new Map<string, number>();
    const bestScore = (k: number, counts: number[], size: number): number => {
      const id = `${k}|${counts.join(",")}`;
      const hit = memo.get(id);
      if (hit !== undefined) return hit;
      let best = 0;
      for (const option of keepOptions(options(k, counts, size))) {
        best = Math.max(best, scored(option) + bestScore(k + 1, option.counts, option.size));
      }
      memo.set(id, best);
      return best;
    };
    return bestScore;
  };
  const bestScore = makeBestScore((all) => all);
  // A miss only when no correct answer is available.
  const bestScoreWithoutSacrifice = makeBestScore((all) => {
    const correct = all.filter(isCorrect);
    return correct.length > 0 ? correct : all;
  });

  return {
    rows,
    options,
    bestScore,
    bestScoreWithoutSacrifice,
    root: { counts: countDigits(deal.hand), size: deal.hand.length },
  };
}

export function solvePuzzle(deal: PuzzleDeal): PuzzleSolution {
  const { options, bestScore, bestScoreWithoutSacrifice, root } = createSearch(deal);
  const par = bestScore(0, root.counts, root.size);

  // Walk the canonical par line: the first optimal option at every decision.
  let { counts, size } = root;
  let needed = par;
  let onlyMoves = 0;
  for (let k = 0; ; k++) {
    const available = options(k, counts, size);
    if (available.length === 0) break;
    const keepsPar = available.filter(
      (option) => scored(option) + bestScore(k + 1, option.counts, option.size) === needed,
    );
    if (available.length >= 2 && keepsPar.length === 1) onlyMoves++;
    const [pick] = keepsPar;
    needed -= scored(pick);
    ({ counts, size } = pick);
  }

  return {
    par,
    onlyMoves,
    sacrificeRequired: bestScoreWithoutSacrifice(0, root.counts, root.size) < par,
  };
}

// The digit held in most copies among those allowed; ties go to the higher digit.
const mostCopies = (counts: readonly number[], isAllowed: (digit: Digit) => boolean): Digit =>
  [...DIGITS]
    .reverse()
    .filter((digit) => counts[digit] > 0 && isAllowed(digit))
    .reduce((best, digit) => (counts[digit] > counts[best] ? digit : best));

// The journal's T84 myopic bot at skill 100%: it answers whenever it can,
// never sacrifices, discards the most-copied digit, and on a forced miss spends
// the most-copied digits (never the product's digit, for a one-digit product).
export function playMyopic(deal: PuzzleDeal): number {
  const { rows, options, root } = createSearch(deal);
  let { counts, size } = root;
  let score = 0;
  for (let k = 0; ; k++) {
    const available = options(k, counts, size);
    if (available.length === 0) return score;
    const { product, digits, pay } = rows[k];
    const correct = available.filter(isCorrect);
    let pick: Option;
    if (correct.length === 1) {
      [pick] = correct;
    } else if (correct.length > 1) {
      const discard = mostCopies(takeAnswer(counts, digits, pay), () => true);
      [pick] = correct.filter((option) => option.discard === discard);
    } else {
      const left = counts.slice();
      const spend: Digit[] = [];
      for (let i = 0; i < digits.length; i++) {
        const spent = mostCopies(left, (digit) => digits.length === 2 || digit !== product);
        spend.push(spent);
        left[spent]--;
      }
      spend.sort((a, b) => a - b);
      [pick] = available.filter((option) => !isCorrect(option) && option.spend.join() === spend.join());
    }
    score += scored(pick);
    ({ counts, size } = pick);
  }
}

// Removes one held tile, chosen by the source.
function dropRandomHeld(counts: number[], random: RandomSource): void {
  const held = counts.flatMap((copies, digit) => Array<number>(copies).fill(digit));
  counts[held[sampleBinIndex(readRandomSample(random), held.length)]]--;
}

// Deals forward along a hidden random line. With probability PUZZLE_PLANT_RATE
// a row's pair comes from the products that line's hand can spell (the kind
// bias, applied at deal time), otherwise uniformly. Pays are uniform digits.
// The line answers when it can, discarding a random held tile on overflow, and
// otherwise misses with random tiles. It only shapes the deal; solvePuzzle
// decides par, and nothing about the line is shown. The order of draws below is
// part of the contract: a seeded source replays the research tables.
export function plantTable(random: RandomSource): PuzzleDeal {
  const pool = DIGITS.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = sampleBinIndex(readRandomSample(random), i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const hand = pool.slice(0, PUZZLE_CAPACITY);

  const held = countDigits(hand);
  // No two-digit product repeats a digit, so holding each digit once is enough.
  const spells = (product: number) => digitsOf(product).every((digit) => held[digit] >= 1);
  const rows: PuzzleRow[] = [];
  for (let k = 0; k < PUZZLE_ROWS; k++) {
    const spellable = EQUATION_PAIRS.filter(([left, right]) => spells(left * right));
    const source =
      readRandomSample(random) < PUZZLE_PLANT_RATE && spellable.length > 0
        ? spellable
        : EQUATION_PAIRS;
    const pair = source[sampleBinIndex(readRandomSample(random), source.length)];
    const equation = orientPair(pair, readRandomSample(random));
    const digits = digitsOf(equation.product);
    const pay = Array.from(
      { length: getRewardCount(getAnswerLength(equation)) },
      () => DIGITS[sampleBinIndex(readRandomSample(random), DIGITS.length)],
    );
    rows.push({ equation, pay });

    const size = held.reduce((total, copies) => total + copies, 0);
    // The line is dead for this row; later rows are still dealt.
    if (size < digits.length) continue;
    if (spells(equation.product)) {
      for (const digit of digits) held[digit]--;
      for (const digit of pay) held[digit]++;
      if (size + 1 > PUZZLE_CAPACITY) dropRandomHeld(held, random);
    } else {
      for (let i = 0; i < digits.length; i++) dropRandomHeld(held, random);
    }
  }
  return { hand, rows };
}

// Plants and solves until a table lands in the band (the draft's §5), for at
// most `attempts` plants. At the bound it returns the last table planted, with
// its par solved so the screen stays honest; only the band is skipped.
export function dealPuzzle(random: RandomSource, attempts = PUZZLE_DEAL_ATTEMPTS): PuzzleTable {
  for (let attempt = 1; ; attempt++) {
    const deal = plantTable(random);
    const { par, onlyMoves } = solvePuzzle(deal);
    const inBand =
      par >= PUZZLE_MIN_PAR && onlyMoves >= PUZZLE_MIN_ONLY_MOVES && playMyopic(deal) < par;
    if (inBand || attempt >= attempts) return { ...deal, par };
  }
}
