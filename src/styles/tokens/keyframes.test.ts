import { describe, expect, it } from "vitest";
import keyframesSource from "./keyframes.css?raw";

/* An `animation:` naming a keyframe no stylesheet defines fails silently — no
   error, no warning, no motion (https://github.com/cgm-16/ozterisk/blob/main/docs/journal/journal-2026-08-09.md). Nothing catches it at
   build time, nothing catches it in review, and a rendering test cannot see it
   either, because jsdom performs no layout. So the whole class is caught here
   instead: read the sources, and require that every keyframe src/ animates is
   one keyframes.css defines.
   This reads files rather than rendering, so it is also the one motion check
   jsdom's missing layout does not compromise. It guards renames as much as
   typos — rename a keyframe out from under a consumer and this goes red. */

/* Raw source of everything that ships, keyed by path relative to this file.
   Tests are excluded: they animate nothing, and their own fixture strings
   would be scanned as if they did. */
const sources = Object.entries(
  import.meta.glob("../../**/*.{css,ts,tsx}", {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>,
).filter(([path]) => !path.includes(".test."));

/* `animation:` and `animation-name:` in stylesheets, `animation:` and
   `animationName:` in the inline styles the design system writes in .tsx. A
   declaration ends at `;` or a brace, never at a newline — a wrapped
   declaration is normal in this repo (see Tile.module.css's `transition:`). */
const ANIMATION_DECLARATION = /animation(?:-name|Name)?\s*:\s*([^;{}]+)/g;

/* Every keyframe in this repo is `oz-`-prefixed, so within an animation value
   that prefix identifies the name and nothing else: no duration, no easing, no
   `infinite`, no keyword list to keep in sync. */
const KEYFRAME_REFERENCE = /oz-[a-z0-9-]+/g;

const defined = new Set(
  [...keyframesSource.matchAll(/@keyframes\s+([\w-]+)/g)].map(([, name]) => name),
);

function keyframesUsedIn(source: string): string[] {
  return [...source.matchAll(ANIMATION_DECLARATION)].flatMap(
    ([, value]) => value.match(KEYFRAME_REFERENCE) ?? [],
  );
}

const referenced = sources.flatMap(([path, source]) =>
  keyframesUsedIn(source).map((name) => `${name} (${path})`),
);

describe("keyframes.css", () => {
  it("is the file the motion vocabulary is parsed from", () => {
    // Guards the guard: a parse that silently found nothing would let anything through.
    expect(defined.has("oz-bloom")).toBe(true);
    expect(defined.size).toBeGreaterThanOrEqual(10);
  });

  it("is read by a collector that sees the shapes this repo writes", () => {
    // Guards the guard from the other side: until the first moment is wired,
    // nothing in src/ animates, so the subset below holds however little the
    // collector finds. These fixtures are what keeps it from finding nothing.
    expect(keyframesUsedIn(".a { animation: oz-bloom var(--dur-bloom) both; }")).toEqual([
      "oz-bloom",
    ]);
    expect(keyframesUsedIn('<i style={{ animation: "oz-chop 900ms" }} />')).toEqual(["oz-chop"]);
    // global.css retires motion by duration alone, and naming no keyframe is
    // not a missing one. Widening the pattern to match this reintroduces the
    // false positives the oz- prefix exists to avoid.
    expect(keyframesUsedIn("* { animation-duration: 0.01ms !important; }")).toEqual([]);
  });

  // Classic's moments (§1.12): the seal, the perch resolving, the re-seat, and
  // 8c's slide-off, which supersedes oz-tip-off — one frame for a tile leaving
  // the table, not two.
  it("defines Classic's frames, and 8c only as oz-slide-off", () => {
    for (const name of ["oz-slide-off", "oz-seal", "oz-seal-rim", "oz-perch-drop", "oz-reseat"]) {
      expect(defined.has(name), name).toBe(true);
    }
    expect(defined.has("oz-tip-off")).toBe(false);
  });

  it("defines every keyframe src/ animates", () => {
    expect(referenced.filter((use) => !defined.has(use.split(" ")[0]))).toEqual([]);
  });
});
