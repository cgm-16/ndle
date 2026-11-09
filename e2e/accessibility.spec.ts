import { test, expect, type Page } from "@playwright/test";
import { START_LABEL, type Locale } from "./labels.js";

/* §8.5 — "Accessibility and responsive acceptance" — walked against the app,
 * one test per clause.
 *
 * The clause "No horizontal scroll at 320px" is NOT here: `viewport.spec.ts`
 * already owns it across twenty gallery states, both locales, and the arena
 * itself. This file owns the other eight, which had only ever been walked by
 * hand — the release walk of 2026-09-17 took a browser session and a page of
 * ad-hoc evaluate calls to produce readings no suite could reproduce.
 *
 * Every assertion below carries the count it swept. A sweep rooted at the wrong
 * node reports clean, which is the failure mode that let #85 survive three
 * measurement passes (https://github.com/cgm-16/ndle/blob/3ccd37b/docs/journal/journal-2026-09-15.md).
 */

const VIEWPORT = { width: 320, height: 640 } as const;

/* §1.12 "Interactive targets are at least 44 × 44 CSS pixels", which is also
   --target-min and the floor the rack's tracks are clamped to. */
const MIN_TARGET = 44;

/* SC 1.4.11: a focus indicator needs 3:1 against what it sits on. The ring is
   two-tone precisely because no single tone clears that on both the felt and
   the ceramic tile face — D1 in the design handover, measured at 1.10:1 on
   ceramic before the second tone existed. */
const MIN_INDICATOR_CONTRAST = 3;


/** Loads the app at a phone-width viewport in `locale` and starts a run, so the
    rack, the slots and the phase actions are all mounted. */
async function openArena(page: Page, locale: Locale = "en"): Promise<void> {
  await page.addInitScript(
    (lang) => window.localStorage.setItem("ndle.language", lang),
    locale,
  );
  await page.setViewportSize({ ...VIEWPORT });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole("button", { name: START_LABEL[locale], exact: true }).click();
  await expect(page.locator('[class*="inventory"]')).toBeVisible();
}

/** Fills every answer slot and submits, to reach `feedback`. The slot count is
    the product's digit length and the product is random, so the number of tiles
    to spend has to be read off the screen — Submit stays disabled until the last
    slot is filled. The verdict is whichever it is: the clause is that a verdict
    is announced, not which one. */
async function submitAnAnswer(page: Page): Promise<void> {
  const slots = await page.locator('button[aria-label^="Answer slot"]').count();
  expect(slots, "answer slots to fill").toBeGreaterThan(0);
  for (let i = 0; i < slots; i++) {
    await page.locator('button[aria-label^="Digit"]:not([disabled])').first().click();
  }
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(page.locator('[role="status"]')).toBeVisible();
}

test("every action, tile and slot is a semantic button", async ({ page }) => {
  await openArena(page);

  const reading = await page.evaluate(() => {
    const interactive = [
      ...document.querySelectorAll('[onclick], [role="button"], [tabindex]:not([tabindex="-1"])'),
    ];
    return {
      buttons: document.querySelectorAll("button").length,
      tiles: document.querySelectorAll('button[aria-label^="Digit"]').length,
      slots: document.querySelectorAll('button[aria-label^="Answer slot"]').length,
      notButtons: interactive
        .filter((el) => el.tagName !== "BUTTON")
        .map((el) => `${el.tagName}[role=${el.getAttribute("role")}]`),
    };
  });

  /* Both counts guard the sweep itself: if the rack or the slots stopped being
     buttons, `notButtons` could still come back empty. */
  expect(reading.tiles, "rack tiles found as buttons").toBeGreaterThan(0);
  expect(reading.slots, "answer slots found as buttons").toBeGreaterThan(0);
  expect(reading.notButtons, "interactive elements that are not <button>").toEqual([]);
});

test("focus order follows the visual hierarchy", async ({ page }) => {
  await openArena(page);
  /* Select a tile first: Submit, Clear and a filled slot are disabled in an
     empty `answering`, and a disabled control is not in the tab order at all —
     sweeping before the click would measure a third of the screen. */
  await page.locator('button[aria-label^="Digit"]:not([disabled])').first().click();

  const reading = await page.evaluate(() => {
    const focusable = [
      ...document.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"]), details > summary',
      ),
    ].filter((el) => el.getBoundingClientRect().width > 0);

    const order = focusable.map((el) => {
      const box = el.getBoundingClientRect();
      return {
        name: (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 24),
        y: Math.round(box.top + window.scrollY),
        x: Math.round(box.left),
      };
    });

    /* An inversion is a tab step that moves up the page, or leftwards within a
       row. The 8px row tolerance is for controls that share a row without
       sharing a top edge. */
    const inversions: string[] = [];
    for (let i = 1; i < order.length; i++) {
      const prev = order[i - 1];
      const next = order[i];
      if (next.y < prev.y - 8) inversions.push(`${prev.name}(y${prev.y}) -> ${next.name}(y${next.y})`);
      else if (Math.abs(next.y - prev.y) <= 8 && next.x < prev.x - 4)
        inversions.push(`${prev.name}(x${prev.x}) -> ${next.name}(x${next.x})`);
    }

    return {
      count: order.length,
      positiveTabindex: focusable.filter((el) => Number(el.getAttribute("tabindex") ?? 0) > 0).length,
      inversions,
    };
  });

  expect(reading.count, "focusable controls swept").toBeGreaterThanOrEqual(5);
  expect(reading.positiveTabindex, "controls with a positive tabindex").toBe(0);
  expect(reading.inversions, "tab steps that move up or left").toEqual([]);
});

test("the focus indicator clears 3:1 on every surface it can appear on", async ({ page }) => {
  await openArena(page);
  /* One real keystroke first. `:focus-visible` follows the browser's own
     keyboard-modality heuristic, and a programmatic focus() after a click does
     not satisfy it — the ring would read as absent and the test would pass on a
     measurement of nothing. */
  await page.keyboard.press("Tab");

  const reading = await page.evaluate(async () => {
    const relativeLuminance = ([r, g, b]: number[]): number => {
      const channel = (value: number) => {
        const v = value / 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    };
    const contrast = (a: number[], b: number[]): number => {
      const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
      return Number(((hi + 0.05) / (lo + 0.05)).toFixed(2));
    };
    const rgb = (text: string): number[][] =>
      (text.match(/rgba?\(([^)]+)\)/g) ?? []).map((match) =>
        (match.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number),
      );

    const tile = document.querySelector<HTMLButtonElement>('button[aria-label^="Digit"]:not([disabled])');
    if (!tile) return { tones: [], surfaces: [], focusVisible: false };
    tile.focus();
    /* The ring fades in on a transition, and a computed style read on the frame
       the focus lands reports the *start* of that transition — a fully
       transparent ring, which measures as black and fails against the felt. Wait
       the transition out rather than sampling mid-flight. */
    await Promise.all(tile.getAnimations().map((animation) => animation.finished.catch(() => {})));
    const tileStyle = getComputedStyle(tile);

    /* The ring is the inset part of the focused tile's box-shadow; the rest is
       the tile's own edge and drop. Reading the tones off the element rather
       than off --ring-focus keeps this honest if the composition changes. */
    const tones = tileStyle.boxShadow
      .split(/,(?![^(]*\))/)
      .filter((part) => part.includes("inset"))
      .flatMap((part) => rgb(part));

    /* Ceramic is a gradient, so both stops count as surfaces the ring meets. */
    const ceramic = rgb(tileStyle.backgroundImage);
    const felt = rgb(getComputedStyle(document.body).backgroundColor)[0];
    const activeSegment = document.querySelector('button[aria-pressed="true"]');
    const segment = activeSegment ? rgb(getComputedStyle(activeSegment).backgroundColor)[0] : null;

    const surfaces = [
      ...ceramic.map((color, i) => ({ name: `ceramic stop ${i + 1}`, color })),
      { name: "felt", color: felt },
      ...(segment ? [{ name: "active language segment", color: segment }] : []),
    ].map((surface) => ({
      name: surface.name,
      best: Math.max(...tones.map((tone) => contrast(tone, surface.color))),
    }));

    return { tones, surfaces, focusVisible: tile.matches(":focus-visible") };
  });

  expect(reading.focusVisible, "the tile matched :focus-visible").toBe(true);
  /* Two tones is the fix for D1, not an incidental detail: one tone cannot
     clear 3:1 on both the felt and the ceramic. */
  expect(reading.tones.length, "tones composing the ring").toBeGreaterThanOrEqual(2);
  expect(reading.surfaces.length, "surfaces measured against").toBeGreaterThanOrEqual(4);
  for (const surface of reading.surfaces) {
    expect(surface.best, `best tone against ${surface.name}`).toBeGreaterThanOrEqual(
      MIN_INDICATOR_CONTRAST,
    );
  }
});

test("the verdict is announced, and carried by words rather than colour", async ({ page }) => {
  await openArena(page);
  await submitAnAnswer(page);

  const reading = await page.evaluate(() => {
    const regions = [...document.querySelectorAll('[aria-live], [role="status"], [role="alert"]')];
    return regions.map((el) => ({
      role: el.getAttribute("role"),
      live: el.getAttribute("aria-live"),
      text: (el.textContent ?? "").trim(),
    }));
  });

  expect(reading.length, "live regions in feedback").toBeGreaterThan(0);
  const status = reading[0];
  expect(status.role, "the feedback region's role").toBe("status");
  expect(status.live, "the feedback region's politeness").toBe("polite");
  /* The verdict as a word is what makes the state legible without the hue —
     §1.12's "never colour alone" clause, checked where colour actually carries
     meaning. */
  expect(status.text, "the announced verdict").toMatch(/Correct|Incorrect/);
  expect(status.text, "the submitted value, announced with it").toMatch(/Your answer/);
});

test("every interactive target is at least 44px", async ({ page }) => {
  await openArena(page);

  const reading = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll("button")].map((el) => {
      const box = el.getBoundingClientRect();
      return {
        name: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 24),
        width: Number(box.width.toFixed(1)),
        height: Number(box.height.toFixed(1)),
      };
    });
    return {
      count: buttons.length,
      undersized: buttons.filter((b) => b.width < 44 || b.height < 44),
      minWidth: Math.min(...buttons.map((b) => b.width)),
      minHeight: Math.min(...buttons.map((b) => b.height)),
    };
  });

  expect(reading.count, "targets swept").toBeGreaterThanOrEqual(5);
  expect(reading.undersized, "targets under 44px").toEqual([]);
  expect(reading.minWidth, "narrowest target").toBeGreaterThanOrEqual(MIN_TARGET);
  expect(reading.minHeight, "shortest target").toBeGreaterThanOrEqual(MIN_TARGET);
});

test("Korean copy renders in a Hangul face and does not clip", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("ndle.language", "ko"));
  await page.setViewportSize({ ...VIEWPORT });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  /* The title screen is the clipping risk: the pitch paragraph and the four
     material rules are the longest strings in either locale, and the disclosure
     holds four more. */
  await page.locator("details").evaluate((el: HTMLDetailsElement) => (el.open = true));

  /* The Hangul face is imported lazily, on the language rather than on load, so
     it is still arriving when the page settles. Wait for the app's own face to
     reach `loaded` — NOT `document.fonts.check()`, which is satisfied by a
     system copy of the same family and therefore passes on a machine that has
     Gothic A1 installed even when the bundle ships none. That is a false
     pass on any machine that has Gothic A1 installed. */
  await page.waitForFunction(() =>
    [...document.fonts].some((face) => /Gothic A1/.test(face.family) && face.status === "loaded"),
  );

  const reading = await page.evaluate(() => {
    const all = [...document.querySelectorAll("*")];
    return {
      lang: document.documentElement.lang,
      hangulFaces: [...document.fonts]
        .filter((face) => /Gothic A1/.test(face.family) && face.status === "loaded")
        .map((face) => `${face.family} ${face.weight}`),
      /* Loaded is not the same as used: §1.12 requires the locale's own face to
         be in the stack that actually sets its interface text. */
      interfaceStack: getComputedStyle(document.querySelector("main")!).fontFamily,
      elements: all.length,
      overflowing: all
        .filter((el) => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1)
        .map((el) => `${el.tagName}.${String(el.className).slice(0, 18)} ${el.scrollWidth}>${el.clientWidth}`),
      text: (document.querySelector("main")?.innerText ?? "").slice(0, 40),
    };
  });

  expect(reading.lang, "document language").toBe("ko");
  expect(reading.hangulFaces, "the bundle's own Hangul faces, loaded").not.toEqual([]);
  expect(reading.interfaceStack, "the face setting Korean interface text").toContain("Gothic A1");
  expect(reading.elements, "elements swept").toBeGreaterThan(20);
  expect(reading.text, "Korean copy rendered").toMatch(/[가-힣]/);
  expect(reading.overflowing, "elements whose content overflows their own box").toEqual([]);
});

test("reduced motion removes motion wholesale, press offsets included", async ({ page }) => {
  await page.setViewportSize({ ...VIEWPORT });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);

  const durations = () =>
    page.evaluate(() => {
      const longest = (el: Element) => {
        const style = getComputedStyle(el);
        return Math.max(
          ...style.transitionDuration.split(",").map(parseFloat),
          ...style.animationDuration.split(",").map(parseFloat),
        );
      };
      return {
        moving: [...document.querySelectorAll("*")].filter((el) => longest(el) > 0.001).length,
        pressOffset: getComputedStyle(document.documentElement).getPropertyValue("--press-offset").trim(),
      };
    });

  /* The before-reading is the instrument check. Without it this test passes on
     a page that has no motion to remove, which is the same nothing it would
     measure if the media query stopped matching. */
  const normal = await durations();
  expect(normal.moving, "elements carrying motion normally").toBeGreaterThan(0);
  expect(normal.pressOffset, "press offset normally").not.toBe("0px");

  await page.emulateMedia({ reducedMotion: "reduce" });
  const reduced = await durations();

  expect(reduced.moving, "elements still carrying motion under reduced motion").toBe(0);
  expect(reduced.pressOffset, "press offset under reduced motion").toBe("0px");
});
