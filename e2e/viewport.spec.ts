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
   layout-taking scrollbar takes its 15px of layout width — the condition #85 names,
   and the reason a sweep at 320 alone is not enough. 393 is the frame's own
   width, and 408 the first width past it, where the arena stops growing and the
   screen is centred. */
const CONTENT_WIDTHS = [305, 320, 393, 408] as const;
const LOCALES = ["en", "ko"] as const;
const STATE_COUNT = 24;

/* The widths the arena is read at: one that shrinks the rack's columns, and
   one past the frame, where they stop growing. */
const ARENA_WIDTHS = [305, 408] as const;

/* The frame is 393px wide with a 16px gutter on each side, and the rack is five
   equal columns 8px apart over the arena's content. */
const FRAME_WIDTH = 393;
const GUTTER = 16;
const RACK_GAP = 8;
const RACK_TILE_H = 56;

/** The rack's column width at a content-box viewport width, before the 44px floor. */
function expectedTileWidth(viewport: number): number {
  const content = Math.min(viewport, FRAME_WIDTH) - 2 * GUTTER;
  return (content - 4 * RACK_GAP) / 5;
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
  // Scoped to the picker: the LanguageToggle also carries aria-pressed, and
  // renders only in some states.
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
        // The picker's own buttons: the LanguageToggle also carries
        // aria-pressed and would otherwise label the readings.
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
        (lang) => window.localStorage.setItem("ndle.language", lang),
        locale,
      );
      await page.goto("/gallery.html");
      await setContentWidth(page, width);
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

      // The states differ from each other by tens of elements, from the
      // sparsest interaction board to the streak 8 burst, so one figure
      // repeated for every state means the walk never left the first state.
      // T62 asked for a figure per state precisely because a range cannot tell
      // every state measured once from one state measured every time.
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
 * `fit-content`, which is floored by min-content — the rack's 44px track
 * floors plus the arena's padding — and no `min-width` can lower a fit-content
 * floor.
 *
 * 305 is the content width a 320px window gives the page once a
 * layout-taking scrollbar takes its 15px, so this reproduces the condition
 * without depending on the platform to draw a scrollbar at all.
 *
 * 408 is a reading past the 393px frame, where the arena stops growing and the
 * rack's columns with it.
 */
for (const locale of LOCALES) {
  for (const width of ARENA_WIDTHS) {
    test(`the arena fits a ${width}px viewport in ${locale}`, async ({
      page,
    }) => {
      await page.addInitScript(
        (lang) => window.localStorage.setItem("ndle.language", lang),
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
        const cells = [...rack.children].map((cell) => cell.getBoundingClientRect());
        const style = getComputedStyle(rack);
        return {
          viewport: de.clientWidth,
          scrollWidth: de.scrollWidth,
          mainLeft: main.getBoundingClientRect().left,
          mainWidth: main.getBoundingClientRect().width,
          rackWidth: rack.getBoundingClientRect().width,
          columns: style.gridTemplateColumns.split(" ").map(parseFloat),
          columnGap: parseFloat(style.columnGap),
          cellWidths: cells.map((box) => box.width),
          cellHeights: cells.map((box) => box.height),
          renderedTileW: cells[0]!.width,
          targetMin: parseFloat(
            getComputedStyle(de).getPropertyValue("--target-min"),
          ),
        };
      });

      // Guards on the conditions, before the result: a reading taken at the
      // wrong width or with the rack absent, proves nothing.
      expect(reading.viewport, "content width the harness produced").toBe(
        width,
      );
      expect(reading.rackWidth, "rack rendered").toBeGreaterThan(0);

      // One size at every width: five equal columns that fill the arena's
      // content, 8px apart and 56px tall, the arena at most the frame wide and
      // centred in the viewport.
      expect(reading.mainWidth, "arena width").toBeCloseTo(Math.min(width, FRAME_WIDTH), 0);
      expect(reading.mainLeft, "arena centred").toBeCloseTo((width - reading.mainWidth) / 2, 0);
      expect(reading.rackWidth, "rack fills the arena's content").toBeCloseTo(
        Math.min(width, FRAME_WIDTH) - 2 * GUTTER,
        0,
      );
      expect(reading.columns, "five columns").toHaveLength(5);
      for (const column of reading.columns) {
        expect(column, "equal columns").toBeCloseTo(expectedTileWidth(width), 0);
      }
      expect(reading.columnGap, "column gap").toBe(RACK_GAP);
      for (const cellWidth of reading.cellWidths) {
        expect(cellWidth, "every cell fills its column").toBeCloseTo(expectedTileWidth(width), 0);
      }
      for (const cellHeight of reading.cellHeights) {
        expect(cellHeight, "every cell is a tile tall").toBe(RACK_TILE_H);
      }

      expect(
        reading.mainWidth,
        "arena width against the viewport",
      ).toBeLessThanOrEqual(reading.viewport);
      expect(reading.scrollWidth, "document scroll width").toBeLessThanOrEqual(
        reading.viewport,
      );

      // §1.12 makes --target-min the floor of the rack's columns. A rack that
      // fits by shrinking past the target minimum has traded a WCAG failure for
      // a layout one, and the assertions above would not notice.
      expect(
        reading.renderedTileW,
        "rendered tile width against the target minimum",
      ).toBeGreaterThanOrEqual(reading.targetMin);
    });
  }
}

/* Below a 284px viewport the target minimum starts to bind — five tiles at 44
   plus four gaps at 8 is 252, and the arena spends 32 more on its gutters. The
   rack stops shrinking there and the page scrolls instead.
 *
 * That trade is the point of the floor, so it gets its own reading. §8.5 asks
 * for no horizontal scroll at 320px and is silent below it; the target minimum
 * has no lower bound. Browser zoom is how a real reader arrives here, and a
 * reader at 400% is precisely the one who needs 44px kept.
 *
 * One locale: the rack's tracks are sized by the arena, not by text, so the
 * Hangul face changes no figure in this reading. The 305px sweep above covers both.
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
    const cell = document.querySelector('[class*="inventory"]')!.children[0]!;
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
  ).toBeLessThan(284);

  // The only assertion this width gets. Horizontal scroll here is the
  // deliberate consequence of keeping the control legal, so asserting its
  // absence would lock in the opposite trade.
  expect(
    reading.renderedTileW,
    "rendered tile width against the target minimum",
  ).toBeGreaterThanOrEqual(reading.targetMin);
});

/* §8.5 through an overflow. The gallery's overflow-required-1 entry is row 4
   of the sample's par line answered: six tiles in five sockets, so the newest
   arrival perches on the rail. A live deal is random and its first rows need
   not overflow, so the fixed table is read from the gallery, whose overflow
   entry runs the real reducer and so plays the discard. The rail's tile is
   left-aligned in the band's 88px cell and 8a pivots it on its lower-left
   edge, so its rest pose reaches right of its own cell; 8c then tips a
   discarded tile further right still. Both are read here: the perch after its frame has
   finished, and the slide-off at every tenth of its frame, paused, because a
   reading straight after a click sees neither.
 *
 * 305 is the 320px gate with a layout-taking scrollbar; 375 a common phone.
 */
const OVERFLOW_WIDTHS = [305, 320, 375] as const;

for (const width of OVERFLOW_WIDTHS) {
  test(`an overflow and its discard stay inside a ${width}px content box`, async ({
    page,
  }) => {
    await page.addInitScript(() => window.localStorage.setItem("ndle.language", "en"));
    await page.goto("/gallery.html");
    await setContentWidth(page, width);
    await page.evaluate(() => document.fonts.ready);
    await page
      .locator("nav ul button[aria-pressed]", { hasText: /^Overflow — required 1$/ })
      .click();

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
    // Five sockets are one row of the rack's five columns.
    expect(perch.gridRows, "the rail adds no row to the rack").toBe(1);

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

/* The mark that completes a discard also ends the overflow phase. The rail's
   cell, and the rail label in it, must not move in that render: the tile still
   leaving is drawn there, and the perch drop is measured from it. Read in the
   first frame after the mark, for a rack tile (the rail tile then drops into
   its socket) and for the rail tile's own discard. */
for (const own of [false, true]) {
  test(`the rail cell does not move when ${own ? "the rail tile" : "a rack tile"} is discarded`, async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("ndle.language", "en"));
    await page.goto("/gallery.html");
    await page.setViewportSize({ width: 393, height: 900 });
    await page.evaluate(() => document.fonts.ready);
    await page.locator("nav ul button[aria-pressed]", { hasText: /^Overflow — required 1$/ }).click();
    await expect(page.locator("[data-rail]")).toBeVisible();
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));

    const read = () =>
      page.evaluate(() => {
        const box = (el: Element) => {
          const { left, top, width, height } = el.getBoundingClientRect();
          return { left, top, width, height };
        };
        return {
          cell: box(document.querySelector('[class*="railCell"]')!),
          label: box(document.querySelector('[class*="railLabel"]')!),
        };
      });
    const before = await read();
    expect(before.cell.width, "the rail cell in overflow").toBe(88);

    await (own ? page.locator("[data-rail] button") : page.locator("[data-cell] button").first()).click();
    await expect(page.locator("[data-departing]")).toHaveCount(1);
    const after = await read();

    for (const part of ["cell", "label"] as const) {
      for (const edge of ["left", "top", "width", "height"] as const) {
        expect(Math.abs(after[part][edge] - before[part][edge]), `${part} ${edge} moved`).toBeLessThanOrEqual(1);
      }
    }
  });
}
