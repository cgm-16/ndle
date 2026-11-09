/**
 * Tuning dials. Changing a value by hand is not automatically safe — check
 * the economy invariant in balance.test.ts, which guards the combinations
 * that break a run, and see INVENTORY_CAPACITY below for a dial whose safe
 * range is currently a single value.
 *
 * Domain definitions that change what the game *is* — operand range, digit
 * spread — live in constants.ts instead.
 */

/**
 * Tiles the inventory holds before overflow forces a discard.
 * Economy: raising this raises the unbiased buildable rate b. Unbiased,
 * b(10) ~= 48%, b(11) ~= 52%, b(12) ~= 57%, b(13) ~= 60%. KIND_EQUATION_RATE
 * biases every draw toward products the current hand can already spell,
 * which pushes the *effective* rate b' well above the unbiased figure: at
 * the shipped KIND_EQUATION_RATE = 0.2, b'(10) ~= 58%, b'(11) ~= 62%,
 * b'(12) ~= 65%, b'(13) ~= 68%, against a cliff at b' ~= 63% where drift
 * flips positive and runs stop ending. Capacity 11 already crosses the
 * cliff's safety margin and fails balance.test.ts, so at the shipped kind
 * rate 10 is the only value this dial can currently hold — raising it
 * requires first lowering KIND_EQUATION_RATE, or adding another
 * counterweight. Lowering it is not free either: createInitialInventory
 * (factories.ts) hardcodes ten starting tiles via ALL_DIGITS, uncoupled
 * from this dial, so a capacity below 10 starts every run already over
 * capacity — that fails loudly, across many unrelated tests, not silently.
 */
export const INVENTORY_CAPACITY = 10;

/**
 * Extra tiles returned above the number spent on a correct answer.
 * Net inventory change per correct answer is exactly +REWARD_BONUS.
 * Economy: drift = b*REWARD_BONUS - (1-b)*averageMissCost()
 * Range: 1 = shipped. 0 removes overflow entirely, deleting the discard
 * mechanic. Above 1 makes runs unloseable at any realistic b.
 */
export const REWARD_BONUS = 1;

/**
 * Share of equations drawn only from products the current hand can spell.
 * Economy: b' = KIND_EQUATION_RATE + (1 - KIND_EQUATION_RATE) * b
 * 0.2 -> 58%, safely under the 63% cliff. 0.3 -> 63.6%, over it.
 * The value most likely to need retuning after real play.
 */
export const KIND_EQUATION_RATE = 0.2;

/**
 * Classic's opening capacity, and the size of its round-robin opening hand.
 * Economy: Classic deliberately opens above the cliff — at 20 the biased
 * buildable rate b'(20) ~= 0.84 against the 0.63 cliff, so the early tray is
 * generous — and the descent to CLASSIC_FLOOR carries it back under. Board
 * count is START - FLOOR, so this is the run's decision budget.
 * Range: 19–21, the rows the small rack draws (7 x 3 wide, 6 x 4 narrow, in
 * TileInventory.module.css); that also holds every digit in the opening deal.
 */
export const CLASSIC_START_CAPACITY = 20;

/**
 * The capacity at which a Classic run is complete (the win).
 * Economy: b'(5) ~= 0.38, well below the cliff, so the late tray is where
 * runs are lost. Lower floors make the finish harder and the run longer.
 * Range: >= 2, the longest answer.
 */
export const CLASSIC_FLOOR = 5;

/**
 * Submissions, correct or not, between two Classic seals.
 * Economy: sets run length — (START - FLOOR) * CLASSIC_SEAL_EVERY submissions,
 * 28 at the shipped values — without spending boards. A submission clock is
 * positional: it never watches how well the player is doing.
 * Range: integer >= 1.
 */
export const CLASSIC_SEAL_EVERY = 2;

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
