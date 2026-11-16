import { test, expect } from "@playwright/test";
import { START_LABEL } from "./labels.js";

/* A discard plays through to the next row on its own, in the real app, with
   motion and under reduced motion. The round advances only once the rack's
   exit, the perch drop and the verdict's celebration have each reported
   `animationend` (product.md §1.7), so an engine that never fired one would
   freeze it on the verdict.

   The gallery cannot show this: its live screen passes a no-op `onNextRound`,
   so it never advances. This spec plays `/` instead, on a seeded deal, in both
   engines. */

/* mulberry32 seed 1 deals row 1 as 3 × 3 = 9 to the hand 1 5 7 8 9. Playing
   the 9 is correct, and the row's pay then overflows the hand past five tiles.
   If dealing changes and this stops holding, the preconditions below fail:
   pick another seed. */
const SEED = 1;

for (const reducedMotion of [false, true]) {
  test(`a discard advances to row 2 by itself${reducedMotion ? " under reduced motion" : ""}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: reducedMotion ? "reduce" : "no-preference" });
    await page.addInitScript((seed) => {
      let a = seed;
      Math.random = () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      window.localStorage.setItem("ndle.language", "en");
    }, SEED);
    await page.setViewportSize({ width: 393, height: 660 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    await page.getByRole("button", { name: START_LABEL.en, exact: true }).click();

    const equation = await page.locator("p", { hasText: /^\d × \d =$/ }).first().innerText();
    const [left, right] = equation.match(/\d/g)!.map(Number);
    for (const digit of String(left * right)) {
      const tile = page.locator("[data-cell] button:enabled").and(
        page.getByRole("button", { name: new RegExp(`^Digit ${digit}(,|$)`) }),
      );
      expect(await tile.count(), `seed ${SEED}: the hand holds a ${digit} for ${equation} (pick another seed)`).toBeGreaterThan(0);
      await tile.first().click();
    }
    await page.getByRole("button", { name: "Submit", exact: true }).click();

    await expect(page.locator("[data-active]"), `seed ${SEED}: row 1 overflows (pick another seed)`).toBeAttached();
    await expect(page.locator("[data-rail]"), `seed ${SEED}: the rail tile shows (pick another seed)`).toBeVisible();

    /* A record, not a retrying count: a Next Round that flashed up and went
       again would still satisfy `toHaveCount(0)` once it had gone. */
    await page.evaluate(() => {
      const w = window as unknown as { nextRoundSeen: boolean };
      w.nextRoundSeen = false;
      const look = () => {
        if ([...document.querySelectorAll("button")].some((b) => b.textContent?.trim() === "Next Round")) w.nextRoundSeen = true;
      };
      new MutationObserver(look).observe(document.body, { childList: true, subtree: true, characterData: true });
    });
    await page.locator("[data-cell] button:enabled").first().click();
    await expect(page.locator("dt", { hasText: /^Row$/ }).locator("xpath=following-sibling::dd[1]")).toHaveText("2/8");
    expect(await page.evaluate(() => (window as unknown as { nextRoundSeen: boolean }).nextRoundSeen), "Next Round never appeared").toBe(false);
    await expect(page.getByRole("button", { name: "Submit", exact: true })).toBeVisible();
  });
}
