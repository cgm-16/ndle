import { test, expect, type Page } from "@playwright/test";
import { START_LABEL, type Locale } from "./labels.js";

/* §8.5 — "Accessibility and responsive acceptance" — walked against the app,
 * one test per clause.
 *
 * The clause "No horizontal scroll at 320px" is NOT here: `viewport.spec.ts`
 * already owns it across twenty-two gallery states, both locales, and the arena
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

/* The ring is one rule in global.css: a 3px outline at a 3px offset, in the
   palette's blue (#8ccff2), on every control. The offset clears the tile's own
   3px dust edge. Walked with real Tab presses, because `:focus-visible` follows
   the browser's keyboard-modality heuristic and a programmatic focus() after a
   click does not satisfy it. */
async function walkFocusRings(page: Page, tabs: number) {
  const readings: { name: string; style: string; width: string; color: string; offset: string }[] = [];
  for (let i = 0; i < tabs; i++) {
    await page.keyboard.press("Tab");
    readings.push(
      await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        const style = getComputedStyle(el);
        return {
          name: (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 24),
          style: style.outlineStyle,
          width: style.outlineWidth,
          color: style.outlineColor,
          offset: style.outlineOffset,
        };
      }),
    );
  }
  return readings;
}

test("every focused control wears a 3px blue outline at a 3px offset", async ({ page }) => {
  await page.setViewportSize({ ...VIEWPORT });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  const onTitle = await walkFocusRings(page, 4);

  await page.getByRole("button", { name: START_LABEL.en, exact: true }).click();
  await expect(page.locator('[class*="inventory"]')).toBeVisible();
  const inArena = await walkFocusRings(page, 8);

  const readings = [...onTitle, ...inArena];
  expect(readings.length, "focus stops measured").toBe(12);
  for (const reading of readings) {
    expect(reading, `ring on ${reading.name}`).toMatchObject({
      style: "solid",
      width: "3px",
      color: "rgb(140, 207, 242)",
      offset: "3px",
    });
  }
});

/* Looked up in document.fonts, never with document.fonts.check(): check()
   answers true for a face no stylesheet declares (check("16px NoSuchFace") is
   true with an empty FontFaceSet). */
async function loadedFaces(page: Page, family: string): Promise<string[]> {
  return page.evaluate(async (name) => {
    await document.fonts.ready;
    return [...document.fonts]
      .filter((face) => face.family.replace(/"/g, "") === name && face.status === "loaded")
      .map((face) => face.weight);
  }, family);
}

test("English loads Atkinson Hyperlegible 400 and 700, and the title loads Gaegu 700", async ({ page }) => {
  await page.setViewportSize({ ...VIEWPORT });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  /* Slices load on use, so wait for the faces the title actually draws. */
  await page.waitForFunction(() =>
    [...document.fonts].some((face) => face.family.replace(/"/g, "") === "Gaegu" && face.status === "loaded"),
  );

  expect(await loadedFaces(page, "Atkinson Hyperlegible"), "Atkinson faces loaded").toEqual(
    expect.arrayContaining(["400", "700"]),
  );
  expect(await loadedFaces(page, "Gaegu"), "Gaegu faces loaded").toContain("700");
  /* The instrument fails on a face nothing declares. */
  expect(await loadedFaces(page, "NoSuchFace"), "an undeclared face").toEqual([]);
});

test("Korean loads Gothic A1 400 and 700", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("ndle.language", "ko"));
  await page.setViewportSize({ ...VIEWPORT });
  await page.goto("/");
  await page.waitForFunction(
    () =>
      ["400", "700"].every((weight) =>
        [...document.fonts].some(
          (face) => face.family.replace(/"/g, "") === "Gothic A1" && face.weight === weight && face.status === "loaded",
        ),
      ),
  );
  expect(await loadedFaces(page, "Gothic A1")).toEqual(expect.arrayContaining(["400", "700"]));
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

/** Measures every button and disclosure summary on the page. */
async function sweepTargets(page: Page) {
  return page.evaluate(() => {
    const targets = [...document.querySelectorAll("button, summary")].map((el) => {
      const box = el.getBoundingClientRect();
      return {
        name: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 24),
        width: Number(box.width.toFixed(1)),
        height: Number(box.height.toFixed(1)),
      };
    });
    return {
      count: targets.length,
      undersized: targets.filter((b) => b.width < 44 || b.height < 44),
      minWidth: Math.min(...targets.map((b) => b.width)),
      minHeight: Math.min(...targets.map((b) => b.height)),
    };
  });
}

test("every interactive target is at least 44px", async ({ page }) => {
  await openArena(page);

  const reading = await sweepTargets(page);

  expect(reading.count, "targets swept").toBeGreaterThanOrEqual(5);
  expect(reading.undersized, "targets under 44px").toEqual([]);
  expect(reading.minWidth, "narrowest target").toBeGreaterThanOrEqual(MIN_TARGET);
  expect(reading.minHeight, "shortest target").toBeGreaterThanOrEqual(MIN_TARGET);
});

test("every interactive target on the title is at least 44px, More included", async ({ page }) => {
  await page.setViewportSize({ ...VIEWPORT });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);

  const reading = await sweepTargets(page);

  // Daily, Practice, the language toggle's two halves and the More summary.
  expect(reading.count, "targets swept").toBeGreaterThanOrEqual(5);
  expect(reading.undersized, "targets under 44px").toEqual([]);
});

test("Korean copy renders in a Hangul face and does not clip", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("ndle.language", "ko"));
  await page.setViewportSize({ ...VIEWPORT });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  /* The title screen is the clipping risk: its three steps and the More
     disclosure, which holds six topics, are the longest strings in either
     locale. */
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
