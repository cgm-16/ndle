import { describe, expect, it } from "vitest";
import { KIND_EQUATION_RATE } from "./balance";
import { generateEquation, generateKindEquation, generateRewardTiles } from "./generators";
import { canConstruct } from "./selectors";
import { makeTile, sequenceRandom, sequentialIds } from "../test/fixtures";

describe("generateEquation", () => {
  it("makes all 45 unordered pairs addressable exactly once", () => {
    const pairs = Array.from({ length: 45 }, (_, index) => {
      const random = sequenceRandom(index / 45, 0);
      const equation = generateEquation(random);
      return `${Math.min(equation.left, equation.right)}-${Math.max(equation.left, equation.right)}`;
    });
    expect(new Set(pairs).size).toBe(45);
    expect(pairs).toContain("1-1");
    expect(pairs).toContain("9-9");
  });

  it("randomizes display order without changing product", () => {
    const forward = generateEquation(sequenceRandom(2 / 45, 0.1));
    const reversed = generateEquation(sequenceRandom(2 / 45, 0.9));
    expect([forward.left, forward.right]).toEqual([1, 3]);
    expect([reversed.left, reversed.right]).toEqual([3, 1]);
    expect(forward.product).toBe(reversed.product);
  });

  it("consumes exactly two random samples: pair index then display order", () => {
    let calls = 0;
    const random = () => {
      calls += 1;
      return calls === 1 ? 2 / 45 : 0.1;
    };
    generateEquation(random);
    expect(calls).toBe(2);
  });

  it("throws RangeError when the pair-index sample is out of [0, 1)", () => {
    expect(() => generateEquation(sequenceRandom(1, 0))).toThrow(RangeError);
    expect(() => generateEquation(sequenceRandom(-0.1, 0))).toThrow(RangeError);
  });

  it("throws RangeError when the display-order sample is out of [0, 1)", () => {
    expect(() => generateEquation(sequenceRandom(0, 1))).toThrow(RangeError);
    expect(() => generateEquation(sequenceRandom(0, -0.1))).toThrow(RangeError);
  });

  it("maps the largest representable value below 1 to the last pair (9-9), not an out-of-range index", () => {
    const largestBelowOne = 0.9999999999999999;
    const equation = generateEquation(sequenceRandom(largestBelowOne, 0));
    expect([equation.left, equation.right]).toEqual([9, 9]);
  });
});

describe("generateKindEquation", () => {
  it("delegates to the uniform draw when the gate sample clears kindRate, yielding the same equation for the remaining samples", () => {
    const pairSample = 2 / 45;
    const orderSample = 0.1;
    const kindEquation = generateKindEquation(sequenceRandom(0.99, pairSample, orderSample), []);
    const uniformEquation = generateEquation(sequenceRandom(pairSample, orderSample));
    expect(kindEquation).toEqual(uniformEquation);
  });

  it("switches paths exactly at KIND_EQUATION_RATE rather than at a rate of its own", () => {
    // Brackets the dial tightly on both sides. A loose bracket would still
    // pass if the gate were wired to some other constant, which is the whole
    // failure this guards: the dial in balance.ts must be the only threshold.
    // Self-referential by design — it pins the wiring, not the value, so
    // retuning the dial does not break it (AGENTS.md 4.5). It does assume a
    // dial strictly between 0 and 1, which balance.test.ts already enforces.
    const hand = [makeTile(1, "a"), makeTile(2, "b")];
    const pairSample = 2 / 45;

    const kind = generateKindEquation(
      sequenceRandom(KIND_EQUATION_RATE - 0.001, pairSample, 0.25),
      hand,
    );
    expect(canConstruct(hand, kind.product)).toBe(true);

    // The same pair sample indexes the full 45-pair pool instead, landing on
    // a product this hand cannot spell — so the two paths are distinguishable.
    const uniform = generateKindEquation(
      sequenceRandom(KIND_EQUATION_RATE + 0.001, pairSample, 0.25),
      hand,
    );
    expect(canConstruct(hand, uniform.product)).toBe(false);
  });

  it("only ever yields a product the hand can spell when the gate sample is under kindRate", () => {
    const hand = [makeTile(1, "a"), makeTile(2, "b")];
    const products = new Set<number>();
    // Sweep the full pair-index resolution so every bin of the constructible
    // subset gets a turn, not just whichever one a single sample happens to hit.
    for (let index = 0; index < 45; index++) {
      const equation = generateKindEquation(sequenceRandom(0, index / 45, 0.25), hand);
      expect(canConstruct(hand, equation.product)).toBe(true);
      products.add(equation.product);
    }
    expect(products.size).toBeGreaterThan(1);
  });

  it("falls back to the uniform draw rather than throwing when an empty hand can spell nothing", () => {
    const pairSample = 2 / 45;
    const orderSample = 0.1;
    const kindEquation = generateKindEquation(sequenceRandom(0, pairSample, orderSample), []);
    const uniformEquation = generateEquation(sequenceRandom(pairSample, orderSample));
    expect(kindEquation).toEqual(uniformEquation);
  });

  it("consumes exactly 3 random samples on the pure-delegate path", () => {
    let calls = 0;
    const random = () => {
      calls += 1;
      return calls === 1 ? 0.99 : 0.5;
    };
    generateKindEquation(random, []);
    expect(calls).toBe(3);
  });

  it("consumes exactly 3 random samples on the kind path", () => {
    let calls = 0;
    const random = () => {
      calls += 1;
      return calls === 1 ? 0 : 0.5;
    };
    const hand = [makeTile(1, "a"), makeTile(2, "b")];
    generateKindEquation(random, hand);
    expect(calls).toBe(3);
  });

  it("consumes exactly 3 random samples on the empty-subset fallback path", () => {
    let calls = 0;
    const random = () => {
      calls += 1;
      return calls === 1 ? 0 : 0.5;
    };
    generateKindEquation(random, []);
    expect(calls).toBe(3);
  });
});

describe("generateRewardTiles", () => {
  it.each([
    [0, 0],
    [0.099999, 0],
    [0.1, 1],
    [0.999999, 9],
  ])("maps random value %s to digit %s", (value, digit) => {
    const [tile] = generateRewardTiles(1, () => value, sequentialIds());
    expect(tile).toMatchObject({ digit, isNew: true });
  });

  it("consumes exactly count random samples and count IDs", () => {
    let randomCalls = 0;
    let idCalls = 0;
    const random = () => {
      randomCalls += 1;
      return 0.5;
    };
    const idFactory = () => {
      idCalls += 1;
      return `tile-${idCalls}`;
    };
    const tiles = generateRewardTiles(3, random, idFactory);
    expect(tiles).toHaveLength(3);
    expect(randomCalls).toBe(3);
    expect(idCalls).toBe(3);
  });

  it("returns an empty array and consumes nothing when count is 0", () => {
    let randomCalls = 0;
    let idCalls = 0;
    const tiles = generateRewardTiles(
      0,
      () => {
        randomCalls += 1;
        return 0.5;
      },
      () => {
        idCalls += 1;
        return "tile";
      },
    );
    expect(tiles).toEqual([]);
    expect(randomCalls).toBe(0);
    expect(idCalls).toBe(0);
  });

  it("throws RangeError for a negative count", () => {
    expect(() => generateRewardTiles(-1, () => 0.5, sequentialIds())).toThrow(RangeError);
  });

  it("throws RangeError for a non-integer count", () => {
    expect(() => generateRewardTiles(1.5, () => 0.5, sequentialIds())).toThrow(RangeError);
  });

  it("throws RangeError when a reward sample is out of [0, 1)", () => {
    expect(() => generateRewardTiles(1, () => 1, sequentialIds())).toThrow(RangeError);
    expect(() => generateRewardTiles(1, () => -0.1, sequentialIds())).toThrow(RangeError);
  });
});
