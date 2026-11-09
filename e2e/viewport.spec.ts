import { test, expect, type Page } from "@playwright/test";
import { START_LABEL } from "./labels.js";

/* §8.5 — "No horizontal scroll at 320px" — walked across every gallery state in
   both locales.
 *
 * This exists because jsdom performs no layout, so the 341 unit tests cannot
 * see an overflow at all: that is how #84 survived a measurement pass. It also
 * exists because #85 took four manual attempts to measure, and three of them
 * came back clean while measuring the wrong thing. Those three are the reason
 * for the guards below — every one of them would have failed a guard, and none
 * of them would have failed on "did anything overflow".
 *
 * Method and the four attempts: https://github.com/cgm-16/ndle/blob/3ccd37b/docs/journal/journal-2026-09-15.md.
 */

/* 320 is §8.5's bar. 305 is what a 320px window actually gives the page once a
   classic scrollbar takes its 15px of layout width — the condition #85 names,
   and the reason a sweep at 320 alone is not enough. 407 is the last width
   below `spacing.css`'s `min-width: 408px`, so it pins the narrow rack tier's
   upper edge; a regression that only appears one pixel under the breakpoint has
   somewhere to be caught. 408 is the first width above it, and the middle
   tier's tightest: overhang is largest where content is smallest within a tier,
   and until #130 no sweep had ever run on that side of the boundary at all.

   Layout cannot tell why it has a given content width, only what it is — but a
   MEDIA QUERY can, and that is where the equivalence breaks. `spacing.css`
   matches the scrollbar-INCLUSIVE viewport while every reading below is taken
   against the content box, so which tier answers a given content width depends
   on whether the platform draws a scrollbar that takes layout width. The tier
   is therefore derived from the outer box and asserted, never assumed: a sweep
   that comes back clean having measured the wrong tier is the exact shape of
   the three #85 attempts that reported `clean` and counted for nothing. */
const CONTENT_WIDTHS = [305, 320, 407, 408] as const;
const LOCALES = ["en", "ko"] as const;
const STATE_COUNT = 27;

/* `spacing.css` — the narrow tier's tile, the middle tier's, and the boundary
   between them. The 48rem tier is out of range for every width swept here. */
const ARENA_WIDTHS = [305, 408] as const;
const NARROW_TILE_W = 52;
const MIDDLE_TILE_W = 66;
const MIDDLE_TIER_MIN = 408;

/** The tile width the rack should be at, given the outer box the media query
    actually sees. */
function expectedTileWidth(outerWidth: number): number {
  return outerWidth >= MIDDLE_TIER_MIN ? MIDDLE_TILE_W : NARROW_TILE_W;
}

/** The tier token `spacing.css` resolved to, in px. Read off the custom
    property rather than off a rendered cell: the tracks are
    `minmax(0, --tile-w)` and shrink inside a narrow container, so a rendered
    width identifies the tier only while the tier already fits. */
async function tierTileWidth(page: Page): Promise<number> {
  return page.evaluate(() =>
    parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--tile-w"),
    ),
  );
}

interface StateReading {
  state: string;
  elements: number;
  peak: number;
  past: number;
  horizontalScroll: boolean;
}

/** Sizes the window so the *content* box is exactly `width`, whatever the
    scrollbar does. Playwright's viewport sets the outer box, so a scrollbar
    that takes layout width would otherwise silently shift every reading. */
async function setContentWidth(page: Page, width: number): Promise<number> {
  await page.setViewportSize({ width, height: 900 });
  const gutter = await page.evaluate(
    () => window.innerWidth - document.documentElement.clientWidth,
  );
  if (gutter > 0)
    await page.setViewportSize({ width: width + gutter, height: 900 });
  return gutter;
}

/** Walks every gallery state, returning one reading each. The element count is
    part of the reading rather than a detail: a sweep rooted at the wrong node
    measures nothing and reports it clean, which is what T62 hit when it swept
    `main` on the four interaction boards. */
async function sweep(page: Page): Promise<StateReading[]> {
  // Scoped to the picker: the title's mode select and the LanguageToggle
  // also carry aria-pressed, and render only in some states.
  const buttons = page.locator("nav ul button[aria-pressed]");
  const states = await buttons.count();
  expect(states, "gallery state count").toBe(STATE_COUNT);

  const readings: StateReading[] = [];
  for (let i = 0; i < STATE_COUNT; i += 1) {
    await buttons.nth(i).click();
    readings.push(
      await page.evaluate(() => {
        const stage = document.querySelector('div[class*="stage"]');
        if (!stage)
          throw new Error("no gallery stage — the sweep root is wrong");
        const viewport = document.documentElement.clientWidth;
        let peak = 0;
        let past = 0;
        let elements = 0;
        for (const el of [stage, ...stage.querySelectorAll("*")]) {
          const box = el.getBoundingClientRect();
          if (!box.width && !box.height) continue;
          elements += 1;
          if (box.right > peak) peak = box.right;
          if (box.right > viewport + 0.5) past += 1;
        }
        // The picker's own buttons: the LanguageToggle and the mode select
        // also carry aria-pressed and would otherwise label the readings.
        const picker = [...document.querySelectorAll("nav ul button[aria-pressed]")];
        return {
          state:
            picker.find((b) => b.getAttribute("aria-pressed") === "true")
              ?.textContent ?? "?",
          elements,
          peak: Number(peak.toFixed(1)),
          past,
          horizontalScroll: document.documentElement.scrollWidth > viewport,
        };
      }),
    );
  }
  return readings;
}

for (const width of CONTENT_WIDTHS) {
  for (const locale of LOCALES) {
    test(`no element escapes a ${width}px viewport in ${locale}`, async ({
      page,
    }) => {
      // Set before the first load: switching locale at runtime hangs the
      // renderer on the lazy Hangul font import.
      await page.addInitScript(
        (lang) => window.localStorage.setItem("one-zero.language", lang),
        locale,
      );
      await page.goto("/gallery.html");
      const gutter = await setContentWidth(page, width);
      // Fonts change metrics, so a reading taken before they resolve is a
      // reading of the fallback face.
      await page.evaluate(() => document.fonts.ready);

      const viewport = await page.evaluate(
        () => document.documentElement.clientWidth,
      );

      // Guards on the conditions of the reading, asserted before its result.
      // Each of these caught a manual attempt that reported no overflow.
      expect(viewport, "content width the harness actually produced").toBe(
        width,
      );
      // The tier the media query answered with, against the tier the outer box
      // asks for. Equal to `width` wherever the platform draws no scrollbar,
      // and deliberately not assumed to be: a reading in the wrong tier is
      // still a clean reading, which is how three of #85's four attempts
      // passed while measuring nothing.
      expect(
        await tierTileWidth(page),
        `rack tier at content ${width}, gutter ${gutter}`,
      ).toBe(expectedTileWidth(width + gutter));

      const readings = await sweep(page);

      // A locale that silently failed to load renders as the other one, and
      // every figure below would still read clean.
      const languageActive = await page.evaluate(() => {
        const [en] = document.querySelectorAll("button[aria-pressed]");
        return en.getAttribute("aria-pressed") === "true" ? "en" : "ko";
      });
      expect(languageActive, "active language segment").toBe(locale);

      for (const reading of readings) {
        expect(
          reading.elements,
          `${reading.state}: elements swept`,
        ).toBeGreaterThan(0);
        expect(
          reading.past,
          `${reading.state}: elements past the right edge`,
        ).toBe(0);
        expect(
          reading.horizontalScroll,
          `${reading.state}: horizontal scroll`,
        ).toBe(false);
        expect(
          reading.peak,
          `${reading.state}: peak right edge`,
        ).toBeLessThanOrEqual(viewport);
        // A collapsed container would satisfy every assertion above by being
        // too small to overflow anything.
        expect(
          reading.peak,
          `${reading.state}: content spans the viewport`,
        ).toBeGreaterThan(viewport / 2);
      }

      // The states differ from each other by tens of elements — 10 on the
      // sparsest interaction board against 85 at streak 8 — so one figure
      // repeated nineteen times means the walk never left the first state.
      // T62 asked for a figure per state precisely because a range cannot tell
      // nineteen states measured once from one state measured nineteen times.
      const distinctCounts = new Set(readings.map((r) => r.elements));
      expect(
        distinctCounts.size,
        "distinct element counts across states",
      ).toBeGreaterThan(1);
    });
  }
}

/* The sweep above walks `gallery.html`, and #85 is invisible from there. The
   gallery renders each state inside `.board`, a mirror of `.screen` that sits
   in `.stage` — a different element, with its own padding and its own
   `min-width: 0`. The app's own `main.screen` is never in that tree, and
   `main.screen` is the element that overflows.
 *
 * Why it overflows: `.app` is a column flex container, so `main` is a flex
 * item whose cross axis is horizontal, and `.screen`'s `margin: 0 auto`
 * suppresses the stretch that would size it to its container. That leaves it
 * `fit-content`, which is floored by min-content — the rack's fixed tracks
 * plus the arena's padding — and no `min-width` can lower a fit-content floor.
 *
 * 305 is the content width a 320px window gives the page once a classic
 * scrollbar takes its 15px, and the narrow tier still fires there, so this
 * reproduces the condition without depending on the platform to draw a
 * scrollbar at all.
 *
 * 408 is the same reading on the other side of `spacing.css`'s boundary, where
 * the rack's tracks jump from 292px to 378px against an arena that gained only
 * one pixel. #130 raised that band as never measured, and it was: the sweep
 * above stopped at 407.
 */
for (const locale of LOCALES) {
  for (const width of ARENA_WIDTHS) {
    test(`the arena fits a ${width}px viewport in ${locale}`, async ({
      page,
    }) => {
      await page.addInitScript(
        (lang) => window.localStorage.setItem("one-zero.language", lang),
        locale,
      );
      await page.goto("/");
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => document.fonts.ready);

      // The rack only exists in `answering`, and the rack is what sets the
      // floor. On `title` the arena has nothing wide in it and every assertion
      // below would pass without measuring the thing this test is about.
      //
      // By name rather than position: `TitleScreen` renders `LanguageToggle`
      // inside its own `<main>`, so the first button in the arena is `English`,
      // and clicking that leaves the run unstarted and the rack absent.
      await page
        .getByRole("button", { name: START_LABEL[locale], exact: true })
        .click();
      await expect(page.locator('[class*="inventory"]')).toBeVisible();

      const reading = await page.evaluate(() => {
        const de = document.documentElement;
        const main = document.querySelector("main")!;
        const rack = document.querySelector('[class*="inventory"]')!;
        const cell = document.querySelector(
          '[class*="cell"], [class*="socket"]',
        )!;
        return {
          viewport: de.clientWidth,
          scrollWidth: de.scrollWidth,
          mainWidth: main.getBoundingClientRect().width,
          rackWidth: rack.getBoundingClientRect().width,
          renderedTileW: cell.getBoundingClientRect().width,
          tierTileW: parseFloat(
            getComputedStyle(de).getPropertyValue("--tile-w"),
          ),
          targetMin: parseFloat(
            getComputedStyle(de).getPropertyValue("--target-min"),
          ),
        };
      });

      // Guards on the conditions, before the result: a reading taken at the
      // wrong width, in the wrong tier, or with the rack absent, proves nothing.
      expect(reading.viewport, "content width the harness produced").toBe(
        width,
      );
      expect(reading.tierTileW, `rack tier at ${width}`).toBe(
        expectedTileWidth(width),
      );
      expect(reading.rackWidth, "rack rendered").toBeGreaterThan(0);

      expect(
        reading.mainWidth,
        "arena width against the viewport",
      ).toBeLessThanOrEqual(reading.viewport);
      expect(reading.scrollWidth, "document scroll width").toBeLessThanOrEqual(
        reading.viewport,
      );

      // §1.12 makes the tier figure a maximum and --target-min the floor. Both
      // halves are load-bearing: a rack that fits by shrinking past the target
      // minimum has traded a WCAG failure for a layout one, and the assertion
      // above alone would not notice.
      expect(
        reading.renderedTileW,
        "rendered tile width against the target minimum",
      ).toBeGreaterThanOrEqual(reading.targetMin);
    });
  }
}

/* Below a 276px content box the target minimum starts to bind — five tiles at
   44 plus four gaps at 8 is 252, and the arena spends 24 more on padding. The
   rack stops shrinking there and the page scrolls instead.
 *
 * That trade is the point of the floor, so it gets its own reading. §8.5 asks
 * for no horizontal scroll at 320px and is silent below it; the target minimum
 * has no lower bound. Browser zoom is how a real reader arrives here, and a
 * reader at 400% is precisely the one who needs 44px kept.
 *
 * One locale: the rack's tracks are fixed lengths and the Hangul face changes
 * no figure in this reading. The 305px sweep above covers both.
 */
test("the rack holds the target minimum below the 320px gate", async ({
  page,
}) => {
  await page.goto("/");
  await page.setViewportSize({ width: 260, height: 900 });
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole("button", { name: START_LABEL.en, exact: true }).click();
  await expect(page.locator('[class*="inventory"]')).toBeVisible();

  const reading = await page.evaluate(() => {
    const de = document.documentElement;
    const cell = document.querySelector('[class*="cell"], [class*="socket"]')!;
    return {
      viewport: de.clientWidth,
      renderedTileW: cell.getBoundingClientRect().width,
      targetMin: parseFloat(
        getComputedStyle(de).getPropertyValue("--target-min"),
      ),
    };
  });

  expect(reading.viewport, "content width the harness produced").toBe(260);
  expect(
    reading.viewport,
    "below the width where the floor binds",
  ).toBeLessThan(276);

  // The only assertion this width gets. Horizontal scroll here is the
  // deliberate consequence of keeping the control legal, so asserting its
  // absence would lock in the opposite trade.
  expect(
    reading.renderedTileW,
    "rendered tile width against the target minimum",
  ).toBeGreaterThanOrEqual(reading.targetMin);
});

/* Classic's stepped rack in the app itself, not the gallery: its first size is
   7 x 44 in a tray, capped at 6 x 44 where the arena cannot hold it (§1.12).
   305 is the 320px gate with a scrollbar, where the narrow size must fit with
   a pixel to spare; 402 is the phone the handoff drew; 1280 is desktop. The
   answer slots keep the arena's tile size in every rack size, and the rack's
   rows are the footprint's, never one more.
 *
 * Layout only: which size the rack chose is the reading, not a rule under test.
 */
const CLASSIC_WIDTHS = [
  { width: 305, cols: 6 },
  { width: 402, cols: 7 },
  { width: 1280, cols: 7 },
] as const;

for (const locale of LOCALES) {
  for (const { width, cols } of CLASSIC_WIDTHS) {
    test(`Classic's rack fits a ${width}px content box in ${locale}`, async ({
      page,
    }) => {
      await page.addInitScript(
        (lang) => window.localStorage.setItem("one-zero.language", lang),
        locale,
      );
      await page.goto("/");
      await setContentWidth(page, width);
      await page.evaluate(() => document.fonts.ready);
      await page.getByRole("button", { name: /^(Classic|클래식)/ }).click();
      await page
        .getByRole("button", { name: START_LABEL[locale], exact: true })
        .click();
      // Read once the tray is visible. The rack's size is a container query,
      // resolved in style, so no later frame differs from this one; this
      // reading cannot itself tell a first frame from a later one.
      await expect(page.locator('[class*="tray"]')).toBeVisible();

      const reading = await page.evaluate(() => {
        const de = document.documentElement;
        const tray = document.querySelector('[class*="tray"]')!;
        const style = getComputedStyle(tray);
        const tile = tray.querySelector('[data-tile]')!;
        const slot = document.querySelector('[aria-label^="Answer slot"], [aria-label^="정답 칸"]');
        return {
          viewport: de.clientWidth,
          scrollWidth: de.scrollWidth,
          trayRight: tray.getBoundingClientRect().right,
          columns: style.gridTemplateColumns.split(" ").length,
          rows: style.gridTemplateRows.split(" ").length,
          // Wide, the 20-size draws 21 of its 24 cells; CSS hides the rest.
          cells: [...tray.children].filter((cell) => getComputedStyle(cell).display !== "none").length,
          tileW: tile.getBoundingClientRect().width,
          slotW: slot ? slot.getBoundingClientRect().width : 0,
          targetMin: parseFloat(getComputedStyle(de).getPropertyValue("--target-min")),
          // The arena's tile width: the rack sets its own --tile-w, the slots do not.
          arenaTileW: parseFloat(getComputedStyle(de).getPropertyValue("--tile-w")),
        };
      });

      // Guards on the conditions, before the result.
      expect(reading.viewport, "content width the harness produced").toBe(width);
      expect(reading.columns, `rack size chosen at ${width}`).toBe(cols);
      expect(reading.slotW, "an answer slot was found").toBeGreaterThan(0);

      expect(reading.scrollWidth, "document scroll width").toBeLessThanOrEqual(reading.viewport);
      expect(reading.trayRight, "tray right edge").toBeLessThanOrEqual(reading.viewport);
      expect(reading.tileW, "tile against the target minimum").toBeGreaterThanOrEqual(reading.targetMin);
      expect(reading.rows * reading.columns, "rows are the footprint's, never one more").toBe(reading.cells);
      expect(reading.slotW, "answer slots stay at the arena's tier, not the rack's size").toBe(reading.arenaTileW);
    });
  }
}

/* §8.5 through an overflow, in the app. A correct answer in Endless's first
   round always overflows — a one-digit answer spends one tile and earns two, a
   two-digit one spends two and earns three — so the newest arrival perches on
   the rail. The rail is right-aligned and 8a pivots the perched tile on its
   lower-left edge, so its rest pose reaches right of its own cell; 8c then
   tips a discarded tile further right still. Both are read here: the perch
   after its frame has finished, and the slide-off at every tenth of its
   frame, paused, because a reading straight after a click sees neither.
 *
 * 305 is the 320px gate with a classic scrollbar; 375 a common phone.
 */
const OVERFLOW_WIDTHS = [305, 320, 375] as const;

for (const width of OVERFLOW_WIDTHS) {
  test(`an overflow and its discard stay inside a ${width}px content box`, async ({
    page,
  }) => {
    await page.addInitScript(() => window.localStorage.setItem("one-zero.language", "en"));
    await page.goto("/");
    await setContentWidth(page, width);
    await page.evaluate(() => document.fonts.ready);
    await page.getByRole("button", { name: START_LABEL.en, exact: true }).click();

    // Answer the first equation correctly: its digits are all in the opening
    // hand of one of each.
    const equation = await page.getByText(/^\d+ × \d+ =$/).textContent();
    const [a, b] = equation!.match(/\d+/g)!.map(Number);
    for (const digit of String(a! * b!)) {
      await page.getByRole("button", { name: `Digit ${digit}`, exact: true }).click();
    }
    await page.getByRole("button", { name: "Submit" }).click();

    const railTile = page.locator("[data-rail]");
    await expect(railTile).toBeVisible();
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));

    const perch = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      tileRight: document.querySelector("[data-rail]")!.getBoundingClientRect().right,
      // Resolved tracks include any implicit row a perched tile would add.
      gridRows: getComputedStyle(document.querySelector("[data-cell]")!.parentElement!).gridTemplateRows.split(" ").length,
      railInGrid: document.querySelector("[data-cell]")!.parentElement!.contains(document.querySelector("[data-rail]")),
    }));
    expect(perch.viewport, "content width the harness produced").toBe(width);
    expect(perch.tileRight, "perched tile's right edge").toBeLessThanOrEqual(perch.viewport);
    expect(perch.scrollWidth, "document scroll width with a tile perched").toBeLessThanOrEqual(perch.viewport);
    expect(perch.railInGrid, "the perched tile sits outside the rack's grid").toBe(false);
    expect(perch.gridRows, "the rail adds no row to the rack").toBe(2);

    // Mark the perched tile: the one required mark completes the discard, and
    // the tile tips off the rack.
    await railTile.click();
    const slideOff = await page.evaluate(() => {
      const departing = document.querySelector("[data-departing]");
      if (!departing) throw new Error("no departing tile — the discard did not start");
      const [frame] = departing.getAnimations();
      if (!frame) throw new Error("the departing tile plays no animation");
      frame.pause();
      const duration = Number(frame.effect!.getComputedTiming().duration);
      const widths: number[] = [];
      for (let step = 0; step <= 10; step += 1) {
        frame.currentTime = (duration * step) / 10;
        widths.push(document.documentElement.scrollWidth);
      }
      return { viewport: document.documentElement.clientWidth, widest: Math.max(...widths) };
    });
    expect(slideOff.widest, "document scroll width during the slide-off").toBeLessThanOrEqual(slideOff.viewport);
  });
}
