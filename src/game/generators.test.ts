import { describe, expect, it } from "vitest";
import { EQUATION_PAIRS, orientPair, readRandomSample, sampleBinIndex } from "./generators";

describe("EQUATION_PAIRS", () => {
  it("holds all 45 unordered pairs exactly once", () => {
    const pairs = EQUATION_PAIRS.map(([left, right]) => `${left}-${right}`);
    expect(new Set(pairs).size).toBe(45);
    expect(pairs).toContain("1-1");
    expect(pairs).toContain("9-9");
    expect(EQUATION_PAIRS.every(([left, right]) => left <= right)).toBe(true);
  });
});

describe("readRandomSample", () => {
  it("passes a sample in [0, 1) through", () => {
    expect(readRandomSample(() => 0)).toBe(0);
    expect(readRandomSample(() => 0.5)).toBe(0.5);
  });

  it("throws RangeError for a sample out of [0, 1)", () => {
    expect(() => readRandomSample(() => 1)).toThrow(RangeError);
    expect(() => readRandomSample(() => -0.1)).toThrow(RangeError);
    expect(() => readRandomSample(() => Number.NaN)).toThrow(RangeError);
  });
});

describe("sampleBinIndex", () => {
  it("addresses every pair from its bin's lower edge", () => {
    const indices = EQUATION_PAIRS.map((_, index) => sampleBinIndex(index / 45, 45));
    expect(indices).toEqual(EQUATION_PAIRS.map((_, index) => index));
  });

  it("maps the largest representable value below 1 to the last bin, not an out-of-range index", () => {
    expect(sampleBinIndex(0.9999999999999999, 45)).toBe(44);
  });
});

describe("orientPair", () => {
  it("flips display order at 0.5 without changing the product", () => {
    const forward = orientPair([1, 3], 0.1);
    const reversed = orientPair([1, 3], 0.9);
    expect([forward.left, forward.right]).toEqual([1, 3]);
    expect([reversed.left, reversed.right]).toEqual([3, 1]);
    expect(orientPair([1, 3], 0.5).left).toBe(3);
    expect(forward.product).toBe(reversed.product);
  });
});
