/**
 * Tuning dials. Changing a value by hand is not automatically safe: each dial
 * documents its effect and the range it was measured at.
 *
 * Domain definitions that change what the game *is* — operand range, digit
 * spread — live in constants.ts instead.
 */

/**
 * Tiles a row pays above the number its answer spends, so a correct answer
 * nets +REWARD_BONUS: plantTable prints getRewardCount(answer length) digits on
 * every row, and the reducer refuses a pay of any other length.
 * Range: 1 = shipped, a pay of 2 for a one-digit product and 3 for a two-digit
 * one. 0 removes overflow entirely, deleting the discard mechanic. Above 1, one
 * answer can push the hand two or more tiles past PUZZLE_CAPACITY.
 */
export const REWARD_BONUS = 1;

/**
 * Puzzle's sockets: the hand never holds more, and the opening deal fills it.
 * Economy: the draft's band figures (docs/research/game-modes/03-puzzle) are
 * measured at 5. At 6 the band moves: the draft's other settings, capacity 6
 * and 6-row tables, put 11-16% of plants in band at PUZZLE_PLANT_RATE 0.6.
 */
export const PUZZLE_CAPACITY = 5;

/**
 * Rows per Puzzle table, and so the run's length and the ceiling on par.
 * Economy: the band figures are measured at 8; 6-row tables put 11-16% of
 * plants in band at PUZZLE_PLANT_RATE 0.6.
 */
export const PUZZLE_ROWS = 8;

/**
 * Share of Puzzle rows drawn only from products the hidden line's hand can
 * spell, applied at deal time (plantTable).
 * Economy: 1.0 makes every table clearable, though the myopic bot still scores
 * only about three rows in four; the uniform deal (0) is 0.0% clearable. At
 * 0.6, about one plant in seven lands in the band set by PUZZLE_MIN_PAR and
 * PUZZLE_MIN_ONLY_MOVES.
 */
export const PUZZLE_PLANT_RATE = 0.6;

/**
 * The lowest par the deal accepts.
 * Economy: raising it thins the band, so the deal spends more attempts per
 * table. Lowering it admits tables with less at stake.
 */
export const PUZZLE_MIN_PAR = 7;

/**
 * The fewest only-moves on the par line the deal accepts: decisions with two
 * or more options of which exactly one keeps par.
 * Economy: with PUZZLE_MIN_PAR, about one plant in seven is accepted. Raising
 * it thins the band further.
 */
export const PUZZLE_MIN_ONLY_MOVES = 2;
