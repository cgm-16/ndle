import { describe, expect, it } from "vitest";
import {
  INVENTORY_CAPACITY,
  KIND_EQUATION_RATE,
  REWARD_BONUS,
} from "./balance";
import {
  averageMissCost,
  buildableRateCliff,
  projectBiasedRate,
  projectBuildableRate,
  projectDrift,
} from "../test/economy";

// The model assumes a uniformly-composed hand. A player who discards to
// maximise digit coverage does better than uniform, so the true rate sits
// somewhat above the projection and the real margin is thinner than this.
const CLIFF_MARGIN = 0.02;

function report(): string {
  const base = projectBuildableRate(INVENTORY_CAPACITY);
  const biased = projectBiasedRate(base, KIND_EQUATION_RATE);
  const cliff = buildableRateCliff();
  return [
    `capacity           ${INVENTORY_CAPACITY}`,
    `reward bonus       +${REWARD_BONUS}`,
    `kind rate          ${KIND_EQUATION_RATE}`,
    `base buildable b   ${base.toFixed(4)}`,
    `biased buildable b ${biased.toFixed(4)}`,
    `cliff b*           ${cliff.toFixed(4)}`,
    `margin             ${(cliff - biased).toFixed(4)} (need > ${CLIFF_MARGIN})`,
    `drift/round        ${projectDrift(biased).toFixed(4)} (need < 0)`,
  ].join("\n");
}

describe("economy invariant", () => {
  it("keeps runs finite: expected drift per round is negative", () => {
    const base = projectBuildableRate(INVENTORY_CAPACITY);
    const biased = projectBiasedRate(base, KIND_EQUATION_RATE);
    expect(projectDrift(biased), report()).toBeLessThan(0);
  });

  it("keeps a safety margin under the cliff where drift would flip positive", () => {
    const base = projectBuildableRate(INVENTORY_CAPACITY);
    const biased = projectBiasedRate(base, KIND_EQUATION_RATE);
    expect(buildableRateCliff() - biased, report()).toBeGreaterThan(CLIFF_MARGIN);
  });

  // Pins the model itself: a silent bug here would weaken the guard above
  // invisibly, since both assertions read through these functions.
  it("pins the economy model's own numbers", () => {
    expect(projectBuildableRate(10)).toBeCloseTo(0.4797, 4);
    expect(averageMissCost()).toBeCloseTo(1.7111, 4);
    expect(buildableRateCliff()).toBeCloseTo(0.6311, 4);
  });
});
