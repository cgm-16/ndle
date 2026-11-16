import { test, expect, type Page } from "@playwright/test";
import { STATE_COUNT } from "./gallery.js";
import { START_LABEL } from "./labels.js";

/* The fit sweep: every gallery state, in both languages, at two phone widths,
   in a window 660 tall, with the top bar counted. Each state is measured on
   `gallery.html?state=<id>`, which renders only the bar and the screen: the
   default gallery's picker would add height the app does not have, and a
   screen measured without its bar passes 52px short.

   Playwright's WebKit (project "webkit", iPhone 15 emulation) runs this file
   too. It is not iOS Safari, so a real phone is still unmeasured. */

const WIDTHS = [393, 375] as const;
const HEIGHT = 660;
const LANGUAGES = ["en", "ko"] as const;
const BAR_HEIGHT = 52;
/* The ring is a 3px outline at a 3px offset, so it reaches 6px from a control. */
const RING_REACH = 6;
const CHALK = "rgb(238, 240, 234)";
const DUST = "rgb(170, 179, 191)";

interface Reading {
  barHeight: number;
  scrollHeight: number;
  scrollWidth: number;
  innerHeight: number;
  innerWidth: number;
  ringFailures: string[];
  /** How far the screen's `main` is from the frame's width, the bar's; null without a `main`. */
  frameWidthGap: number | null;
  /** How far the bar's centre label is from the bar's midpoint; null without a label. */
  centreOffset: number | null;
}

async function stateIds(page: Page): Promise<string[]> {
  await page.goto("/gallery.html");
  return page.locator("nav ul button[data-state-id]").evaluateAll((buttons) =>
    buttons.map((button) => button.getAttribute("data-state-id")!),
  );
}

/** Opens a state with the language set before load, so each reading is of a
    page that loaded in that language with its faces settled. Returns once the
    self-hosted faces the page uses have loaded, so no reading is of a fallback. */
async function openState(page: Page, id: string, language: string, width: number, height: number): Promise<void> {
  await page.addInitScript((lang) => window.localStorage.setItem("ndle.language", lang), language);
  await page.setViewportSize({ width, height });
  await page.goto(`/gallery.html?state=${id}`);
  await expect(page.locator("header")).toHaveCount(1);
  await expect(page.locator("header ~ *")).not.toHaveCount(0);
  await page.waitForFunction(
    (lang) => {
      const loaded = new Set(
        [...document.fonts].filter((face) => face.status === "loaded").map((face) => face.family.replace(/"/g, "")),
      );
      return loaded.has("Atkinson Hyperlegible") && (lang !== "ko" || loaded.has("Gothic A1"));
    },
    language,
  );
  await page.evaluate(() => document.fonts.ready);
  // Two frames flush the effects that reach a state on mount (a pressed Copy).
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  // Entry motion is a transform, which counts toward scrollable overflow.
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
}

/** The wordmark is set in Gaegu wherever it shows, so it must have loaded there. */
async function gaeguLoadedWhereUsed(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const uses = [...document.querySelectorAll("header p span, h1")].some((el) =>
      getComputedStyle(el).fontFamily.includes("Gaegu"),
    );
    return !uses || [...document.fonts].some((face) => face.family.includes("Gaegu") && face.status === "loaded");
  });
}

async function read(page: Page): Promise<Reading> {
  return page.evaluate(
    ({ reach, chalk, dust }) => {
      const de = document.documentElement;
      const controls = [...document.querySelectorAll<HTMLElement>('button, [role="button"], a, summary')].filter(
        (el) => el.getBoundingClientRect().width > 0,
      );
      const name = (el: Element) => `${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]}`;
      type Edges = { left: number; right: number; top: number; bottom: number };
      // Two boxes' rings meet when they are closer than `reach` on both axes.
      const near = (a: Edges, b: Edges) =>
        Math.max(a.left - b.right, b.left - a.right) < reach - 0.01 &&
        Math.max(a.top - b.bottom, b.top - a.bottom) < reach - 0.01;
      // A chalk or dust element's solid shadow is its edge too (the tile's
      // `0 3px 0` thickness), so its box reaches as far below as the shadow's y.
      const edgeOf = (el: HTMLElement) => {
        const box = el.getBoundingClientRect();
        const drop = Math.max(
          0,
          ...getComputedStyle(el)
            .boxShadow.split(/,(?![^(]*\))/)
            .filter((shadow) => shadow.trim() !== "none" && !shadow.includes("inset"))
            .map((shadow) => Number(/(-?[\d.]+)px\s+(-?[\d.]+)px/.exec(shadow)?.[2] ?? 0)),
        );
        return { left: box.left, right: box.right, top: box.top, bottom: box.bottom + drop, width: box.width };
      };
      const ringFailures: string[] = [];
      controls.forEach((a, i) => {
        const box = a.getBoundingClientRect();
        for (const b of controls.slice(i + 1)) {
          if (a.contains(b) || b.contains(a)) continue;
          if (near(box, b.getBoundingClientRect())) ringFailures.push(`${name(a)} / ${name(b)}`);
        }
        for (const el of document.body.querySelectorAll<HTMLElement>("*")) {
          if (a.contains(el)) continue;
          const bg = getComputedStyle(el).backgroundColor;
          if (bg !== chalk && bg !== dust) continue;
          const other = edgeOf(el);
          if (other.width > 0 && near(box, other)) ringFailures.push(`${name(a)} / ${name(el)} (${bg})`);
        }
      });
      const main = document.querySelector("main");
      const bar = document.querySelector("header")!.getBoundingClientRect();
      const centre = document.querySelector("header p")?.getBoundingClientRect();
      return {
        frameWidthGap: main ? Math.abs(main.getBoundingClientRect().width - bar.width) : null,
        centreOffset: centre ? Math.abs(centre.left + centre.width / 2 - (bar.left + bar.width / 2)) : null,
        barHeight: document.querySelector("header")!.getBoundingClientRect().height,
        scrollHeight: de.scrollHeight,
        scrollWidth: de.scrollWidth,
        innerHeight: window.innerHeight,
        innerWidth: window.innerWidth,
        ringFailures,
      };
    },
    { reach: RING_REACH, chalk: CHALK, dust: DUST },
  );
}

/** The one measuring function: opens a state and reads it. The sweep and the
    must-fail cases both go through it and through `overflows`. */
async function measure(page: Page, id: string, language: string, width: number, height: number) {
  await openState(page, id, language, width, height);
  return read(page);
}

/** The title and game over fill the frame: `main` is as wide as the bar. */
const FILLS_FRAME = /^(title|game-over)/;

const overflows = (r: Reading) => r.scrollHeight > r.innerHeight || r.scrollWidth > r.innerWidth;

test("the sweep covers every gallery state", async ({ page }) => {
  const ids = await stateIds(page);
  expect(ids.length, "gallery state ids").toBe(STATE_COUNT);
  expect(new Set(ids).size, "distinct ids").toBe(ids.length);
});

for (const language of LANGUAGES) {
  for (const width of WIDTHS) {
    test(`every state fits ${width} x ${HEIGHT} in ${language}, bar counted`, async ({ page }) => {
      test.setTimeout(120_000);
      const ids = await stateIds(page);
      expect(ids.length, "gallery state ids").toBe(STATE_COUNT);
      const problems: string[] = [];

      for (const id of ids) {
        const reading = await measure(page, id, language, width, HEIGHT);
        expect(reading.innerWidth, `${id}: window width the harness produced`).toBe(width);
        expect(reading.innerHeight, `${id}: window height the harness produced`).toBe(HEIGHT);
        expect(reading.barHeight, `${id}: the bar's height`).toBe(BAR_HEIGHT);
        // Back and the toggle differ in width, so only equal side columns keep the label centred.
        if (reading.centreOffset !== null) expect(reading.centreOffset, `${id}: label offset from the bar's midpoint`).toBeLessThanOrEqual(2);
        if (FILLS_FRAME.test(id)) {
          expect(reading.frameWidthGap, `${id}: has a main`).not.toBeNull();
          expect(reading.frameWidthGap, `${id}: main's width against the frame's`).toBeLessThanOrEqual(1);
        }
        expect(await gaeguLoadedWhereUsed(page), `${id}: Gaegu loaded where used`).toBe(true);

        const key = `${id} ${language} ${width}`;
        if (overflows(reading)) {
          problems.push(`${key}: scrollHeight ${reading.scrollHeight} of ${reading.innerHeight}, scrollWidth ${reading.scrollWidth} of ${reading.innerWidth}`);
        }
        if (reading.ringFailures.length > 0) problems.push(`${key} ring: ${reading.ringFailures.join("; ")}`);
      }

      expect(problems, "states that overflow or crowd a focus ring").toEqual([]);
    });
  }
}

test("the sweep reports an overflow in a window too short for the screen", async ({ page }) => {
  const reading = await measure(page, "answering-empty", "en", 393, 400);
  expect(reading.innerHeight, "window height the harness produced").toBe(400);
  expect(overflows(reading), `page height ${reading.scrollHeight} at 393 x 400`).toBe(true);
});

test("the sweep reports an overflow in a state whose stack fits only without the bar", async ({ page }) => {
  const tall = await measure(page, "answering-empty", "en", 393, 1400);
  expect(overflows(tall), "the screen fits a tall window").toBe(false);
  const screenHeight = Math.ceil(await page.evaluate(() => document.querySelector("main")!.getBoundingClientRect().height));
  // Taller than the screen, shorter than the screen and its bar.
  const height = screenHeight + BAR_HEIGHT - 1;
  const withBar = await measure(page, "answering-empty", "en", 393, height);
  expect(withBar.innerHeight, "window height the harness produced").toBe(height);
  expect(withBar.barHeight, "the bar is counted").toBe(BAR_HEIGHT);
  // Measured, not derived: hide the bar and the same window fits.
  await page.addStyleTag({ content: "header { display: none !important; }" });
  const withoutBar = await read(page);
  expect(overflows(withoutBar), `without the bar, page height ${withoutBar.scrollHeight} of ${height}`).toBe(false);
  expect(overflows(withBar), `with the bar, page height ${withBar.scrollHeight} of ${height}`).toBe(true);
});

/** Replaces the screen with `html` on a page the sweep passes, then reads it
    through the sweep's own `read`. */
async function readInjected(page: Page, html: string) {
  await measure(page, "title", "en", 393, HEIGHT);
  await page.evaluate((markup) => (document.querySelector("main")!.innerHTML = `<div>${markup}</div>`), html);
  return read(page);
}

const button = (marginTop: number) => `<button style="display:block;width:100px;height:44px;margin-top:${marginTop}px">b</button>`;

test("the ring-reach check reports two buttons 4px apart, and passes them 12px apart", async ({ page }) => {
  expect((await readInjected(page, button(0) + button(12))).ringFailures, "12px apart").toEqual([]);
  expect((await readInjected(page, button(0) + button(4))).ringFailures.length, "4px apart").toBeGreaterThan(0);
});

test("the ring-reach check counts a tile's solid shadow edge", async ({ page }) => {
  const tile = `<div style="width:100px;height:44px;background:${CHALK};box-shadow:0 3px 0 ${DUST}"></div>`;
  // 8px below the tile's border box is 5px below its shadow edge: under the reach.
  expect((await readInjected(page, tile + button(12))).ringFailures, "12px below the border box").toEqual([]);
  expect((await readInjected(page, tile + button(8))).ringFailures.length, "8px below the border box").toBeGreaterThan(0);
});

for (const language of LANGUAGES) {
  test(`the title's buttons and note sit at the frame's foot at 393 x ${HEIGHT} in ${language}`, async ({ page }) => {
    await openState(page, "title", language, 393, HEIGHT);
    const foot = await page.evaluate(
      ({ practice }) => {
        const main = document.querySelector("main")!;
        const button = [...main.querySelectorAll("button")].find((b) => b.textContent === practice)!.getBoundingClientRect();
        const note = main.querySelector("p:last-child")!.getBoundingClientRect();
        return {
          padding: parseFloat(getComputedStyle(main).paddingBottom),
          noteBottomGap: window.innerHeight - note.bottom,
          buttonBottomGap: window.innerHeight - button.bottom,
          noteHeight: note.height,
        };
      },
      { practice: START_LABEL[language] },
    );
    // Within a pixel of the frame's bottom padding, and not floating above it.
    expect(foot.noteBottomGap, "note's distance from the viewport's bottom").toBeGreaterThanOrEqual(foot.padding - 1);
    expect(foot.noteBottomGap, "note's distance from the viewport's bottom").toBeLessThanOrEqual(foot.padding + 1);
    expect(foot.buttonBottomGap, "Practice's distance from the viewport's bottom").toBeLessThanOrEqual(foot.padding + foot.noteHeight + 16);
  });
}
