import { describe, expect, it } from "vitest";
import colors from "./colors.css?raw";

const declarations = new Map<string, string>(
  [...colors.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((match) => [match[1], match[2].trim()]),
);

/** Follows var() aliases down to the hex a custom property finally holds. */
function resolve(name: string): string {
  const value = declarations.get(name);
  if (value === undefined) throw new Error(`${name} is not declared in colors.css`);
  const alias = value.match(/^var\((--[\w-]+)\)$/);
  if (alias) return resolve(alias[1]);
  if (!/^#[0-9a-f]{6}$/i.test(value)) throw new Error(`${name} resolves to ${value}, not a hex colour`);
  return value;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(foreground: string, background: string): number {
  const [hi, lo] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

const of = (foreground: string, background: string) => ratio(resolve(foreground), resolve(background));

describe("palette contrast", () => {
  it("matches the board's readings to two decimals", () => {
    const readings = {
      "chalk on slate": of("--chalk", "--slate"),
      "dust on slate": of("--dust", "--slate"),
      "socket on slate": of("--socket", "--slate"),
      "blue on slate": of("--blue", "--slate"),
      "blue on raised": of("--blue", "--raised"),
      "pink on slate": of("--pink", "--slate"),
    };
    expect(Object.fromEntries(Object.entries(readings).map(([k, v]) => [k, v.toFixed(2)]))).toEqual({
      "chalk on slate": "13.45",
      "dust on slate": "7.29",
      "socket on slate": "4.29",
      "blue on slate": "9.06",
      "blue on raised": "7.59",
      "pink on slate": "8.08",
    });
  });

  it("fails a pair that should fail: blue on chalk is below 3", () => {
    const blueOnChalk = of("--blue", "--chalk");
    expect(blueOnChalk.toFixed(2)).toBe("1.48");
    expect(blueOnChalk).toBeLessThan(3);
  });

  it.each([
    ["--text-primary", "--surface-surround"],
    ["--text-meta", "--surface-surround"],
    ["--text-on-tile", "--chalk"],
    ["--text-on-accent", "--accent"],
    ["--state-incorrect", "--slate"],
    ["--accent", "--slate"],
    ["--text-primary", "--surface-raised"],
  ])("text %s on %s is at least 4.5:1", (foreground, background) => {
    expect(of(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ["--focus-ring", "--slate"],
    ["--focus-ring", "--raised"],
    ["--socket", "--slate"],
    ["--dust", "--slate"],
    ["--pink", "--slate"],
    ["--blue", "--slate"],
  ])("non-text %s on %s is at least 3:1", (foreground, background) => {
    expect(of(foreground, background)).toBeGreaterThanOrEqual(3);
  });
});
