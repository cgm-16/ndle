import { test, expect, type Page } from "@playwright/test";
import { START_LABEL, type Locale } from "./labels.js";

/* Puzzle's thesis is that the table is on screen: the HUD with par, all eight
   ledger rows, the answer slots, the actions and the rack, on a phone, with
   no page scroll (puzzle design spec §8). jsdom performs no layout, so only a
   browser can read it.
 *
 * 393 x 660 is a common phone's viewport less its browser chrome. 375 is the
 * iPhone 13 mini's width, the playtest's phone, where Korean rows are likeliest
 * to wrap. Geometry only: the rules on this screen are the unit suite's.
 */
const VIEWPORTS = [
  { width: 393, height: 660 },
  { width: 375, height: 660 },
] as const;
const LOCALES = ["en", "ko"] as const;

/* `ledger.label` in both locales: the ledger's accessible name. */
const LEDGER_LABEL: Record<Locale, string> = { en: "Table", ko: "판" };

const ROWS = 8;
const SOCKETS = 5;

async function startPuzzle(page: Page, locale: Locale): Promise<void> {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole("button", { name: START_LABEL[locale], exact: true }).click();
  await expect(page.getByRole("list", { name: LEDGER_LABEL[locale] })).toBeVisible();
  // 10b rises the current row's equation, and a transformed box counts toward
  // scrollable overflow: a reading mid-rise is a reading of the motion.
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
}

/** The page's height against the window's, and the rack's bottom edge. */
async function readFit(page: Page) {
  return page.evaluate(() => ({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    scrollHeight: document.documentElement.scrollHeight,
    rackBottom: document.querySelector('[class*="inventory"]')!.getBoundingClientRect().bottom,
  }));
}

for (const locale of LOCALES) {
  test(`Puzzle's table fits a phone without page scroll in ${locale}`, async ({ page }) => {
    // Set before the first load: switching locale at runtime hangs the
    // renderer on the lazy Hangul font import.
    await page.addInitScript(
      (lang) => window.localStorage.setItem("ndle.language", lang),
      locale,
    );

    for (const { width, height } of VIEWPORTS) {
      await page.setViewportSize({ width, height });
      await startPuzzle(page, locale);
      const reading = await readFit(page);

      // Guards on the conditions, before the result: the window the harness
      // produced, and the ledger and rack this check is about, all present.
      expect(reading.innerWidth, "window width the harness produced").toBe(width);
      expect(reading.innerHeight, "window height the harness produced").toBe(height);
      await expect(
        page.getByRole("list", { name: LEDGER_LABEL[locale] }).getByRole("listitem"),
        "ledger rows",
      ).toHaveCount(ROWS);
      expect(
        await page.locator('[class*="inventory"]').evaluate((rack) => rack.children.length),
        "rack sockets",
      ).toBe(SOCKETS);

      expect(reading.scrollHeight, `page height at ${width} x ${height}`).toBeLessThanOrEqual(
        reading.innerHeight,
      );
      expect(reading.rackBottom, `rack bottom at ${width} x ${height}`).toBeLessThanOrEqual(
        reading.innerHeight,
      );
    }

    // The instrument has to be able to fail. The same screen in a window too
    // short for it must read as a scroll; if it also "fits", the reading above
    // measured nothing.
    await page.setViewportSize({ width: 393, height: 400 });
    const short = await readFit(page);
    expect(short.innerHeight, "window height the harness produced").toBe(400);
    expect(short.scrollHeight, "page height at 393 x 400").toBeGreaterThan(short.innerHeight);
  });
}
