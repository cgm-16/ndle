import { act, cleanup, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import slotStyles from "../components/AnswerSlots/AnswerSlots.module.css";
import gameOverStyles from "../components/GameOverScreen/GameOverScreen.module.css";
import { INVENTORY_CAPACITY } from "../game/balance";
import type { Language } from "../game/types";
import { I18nProvider } from "../i18n/I18nContext";
import { GALLERY_STATES, type GalleryEntry } from "./states";

const allEntries = (): GalleryEntry[] => Object.values(GALLERY_STATES).flat();

function entryById(id: string): GalleryEntry {
  const entry = allEntries().find((candidate) => candidate.id === id);
  if (entry === undefined) throw new Error(`gallery entry "${id}" not found`);
  return entry;
}

// The game-over copy entries press Copy Result on mount and the outcome lands
// a microtask later, so every read of a rendered entry has to flush before it
// asserts — and the flush has to be inside act, or React reports the update as
// unwrapped.
async function renderEntry(entry: GalleryEntry, language: Language = "en") {
  const view = render(<I18nProvider initialLanguage={language}>{entry.render()}</I18nProvider>);
  await act(async () => {});
  return view;
}

describe("gallery catalogue", () => {
  it("declares at least one entry for every group", () => {
    for (const [group, entries] of Object.entries(GALLERY_STATES)) {
      expect(entries, `no gallery entry covers ${group}`).not.toHaveLength(0);
    }
  });

  it("gives every entry a unique id", () => {
    const ids = allEntries().map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // A state that renders its sibling cannot be assessed against a visual bar,
  // and the gallery has carried that defect once already: two game-over
  // entries passed byte-identical arguments and differed in name alone
  // (#105). Compared as markup rather than eyeballed, because the defect
  // recurs and the eye is what missed it.
  it("renders no two entries with the same markup", async () => {
    const seen = new Map<string, string>();
    for (const entry of allEntries()) {
      const { container } = await renderEntry(entry);
      const twin = [...seen].find(([, markup]) => markup === container.innerHTML)?.[0];
      expect(twin, `${entry.id} renders exactly what ${twin} renders`).toBeUndefined();
      seen.set(entry.id, container.innerHTML);
      cleanup();
    }
  });

  // SELECT_TILE moves a tile out of inventory into an answer slot; it never
  // adds one. So the live tile count (inventory buttons + filled answer-slot
  // buttons) must stay at INVENTORY_CAPACITY once every slot is filled, not
  // grow past it the way an additively hand-assembled selection would.
  it("conserves tile count in answering-full: inventory plus filled slots equals INVENTORY_CAPACITY", () => {
    render(<I18nProvider initialLanguage="en">{entryById("answering-full").render()}</I18nProvider>);

    const inventoryTiles = screen.getAllByRole("button", { name: /^Digit \d$/ });
    const filledSlots = screen.getAllByRole("button", { name: /^Answer slot \d: \d$/ });
    expect(inventoryTiles.length + filledSlots.length).toBe(INVENTORY_CAPACITY);
  });

  // The rack empties as a run goes on and §1.12 makes the empty sockets the
  // score, so a nearly-spent rack is a state in its own right — and it is the
  // one no fixture reached, which is how #84 survived a measurement pass.
  it("renders a rack holding fewer than eight tiles", () => {
    render(
      <I18nProvider initialLanguage="en">{entryById("answering-depleted").render()}</I18nProvider>,
    );
    expect(screen.getAllByRole("button", { name: /^Digit \d$/ }).length).toBeLessThan(8);
  });

  // makeOverflowInventory (src/test/fixtures.ts) is shared with the rest of
  // the suite, so a future change to its id format or size handling could
  // make rewardTileIds.includes(tile.id) match nothing inside
  // makeOverflowInventoryWithRewards (states.tsx), silently dropping every
  // tray New-tile badge while the render-without-throwing test below stays
  // green. Expected counts are named here rather than derived from
  // states.tsx, so a break in the stamping logic can't also break the value
  // this test compares against.
  const OVERFLOW_ENTRY_REWARD_COUNTS: Record<string, number> = {
    "overflow-required-1": 2,
    "overflow-required-2": 3,
    "overflow-marked": 3,
  };

  it("badges exactly as many overflow-tray tiles New as each entry's reward count", () => {
    for (const entry of GALLERY_STATES.overflow) {
      const expectedCount = OVERFLOW_ENTRY_REWARD_COUNTS[entry.id];
      if (expectedCount === undefined) {
        throw new Error(`no expected reward count recorded for gallery entry "${entry.id}"`);
      }

      render(<I18nProvider initialLanguage="en">{entry.render()}</I18nProvider>);
      const badgedTiles = screen.getAllByRole("button", { name: /New tile$/ });
      expect(badgedTiles, `expected ${expectedCount} New-badged tray tiles for ${entry.id}`).toHaveLength(
        expectedCount,
      );
      cleanup();
    }
  });

  // TOGGLE_DISCARD is the only action that fills pendingDiscards, and no
  // fixture ever set it, so the marked tile had only ever been rendered by
  // jsdom — which performs no layout. One of the two tiles this hand must
  // shed is marked, which is the half-made decision: the discard stays open
  // until the second mark completes it.
  it("marks one tile for discard in overflow-marked, with the discard still open", () => {
    render(
      <I18nProvider initialLanguage="en">{entryById("overflow-marked").render()}</I18nProvider>,
    );
    expect(screen.getAllByRole("button", { name: /Marked for discard$/ })).toHaveLength(1);
    expect(screen.getByText("Choose 2 tiles to discard.")).toBeInTheDocument();
  });

  it("shows the submitted tiles in feedback-incorrect", () => {
    const { container } = render(
      <I18nProvider initialLanguage="en">{entryById("feedback-incorrect").render()}</I18nProvider>,
    );

    // Feedback slots are read-only, so a filled one carries no role at all and
    // an empty one is the role="img" socket: none left is the whole claim.
    expect(screen.queryAllByRole("img", { name: /^Answer slot \d: empty$/ })).toHaveLength(0);
    // 9f — the crack takes its dust with it, one of each per submitted tile.
    expect(container.querySelectorAll(`.${slotStyles.dust}`)).toHaveLength(2);
  });

  // The rings accumulate and the rim escalates (AnswerSlots), so streak 8
  // draws every ring but only the brightest rim: 7b's gold rim exists at
  // streak 5 and nowhere else, which is why the ladder needs two states
  // rather than one at the top.
  it("draws the gold rim at streak 5 and the bright rim, three rings and the burst at streak 8", async () => {
    const streakFive = await renderEntry(entryById("feedback-streak-5"));
    expect(streakFive.container.querySelectorAll(`.${slotStyles.ring}`)).toHaveLength(4);
    expect(streakFive.container.querySelectorAll(`.${slotStyles.chip}`)).toHaveLength(0);
    expect(streakFive.container.querySelectorAll(`.${slotStyles.rim}`)).toHaveLength(2);
    expect(streakFive.container.querySelectorAll(`.${slotStyles.rimBright}`)).toHaveLength(0);
    cleanup();

    const streakEight = await renderEntry(entryById("feedback-streak-8"));
    expect(streakEight.container.querySelectorAll(`.${slotStyles.ring}`)).toHaveLength(6);
    expect(streakEight.container.querySelectorAll(`.${slotStyles.chip}`)).toHaveLength(12);
    expect(streakEight.container.querySelectorAll(`.${slotStyles.rimBright}`)).toHaveLength(2);
    expect(streakEight.container.querySelectorAll(`.${slotStyles.rim}`)).toHaveLength(0);
  });

  // 11C's chop and the status beside it are GameOverScreen's own local state,
  // reached only by pressing Copy Result. Both copy entries have to arrive at
  // rest showing the outcome they are named for.
  it("shows each game-over copy outcome at rest", async () => {
    const copied = await renderEntry(entryById("game-over-copy-succeeded"));
    expect(screen.getByRole("status")).toHaveTextContent("Result copied.");
    expect(copied.container.querySelector(`.${gameOverStyles.chop}`)).not.toBeNull();
    cleanup();

    const failed = await renderEntry(entryById("game-over-copy-failed"));
    expect(screen.getByRole("status")).toHaveTextContent("Could not share or copy the result.");
    expect(failed.container.querySelector(`.${gameOverStyles.chop}`)).toBeNull();
  });

  // Four rules in the system draw a focus ring, and LanguageToggle's is the
  // one no other board carries. Mounting it on the focus-visible board is
  // also what makes that board differ from the hover board in what it
  // renders rather than in what its note says about it.
  it("mounts the language toggle on the focus-visible board and on no other", async () => {
    await renderEntry(entryById("interaction-focus-visible"));
    expect(screen.getByRole("group", { name: "Language" })).toBeInTheDocument();
    cleanup();

    await renderEntry(entryById("interaction-hover"));
    expect(screen.queryByRole("group", { name: "Language" })).toBeNull();
  });

  it("disables every control in the disabled interaction state", async () => {
    const { container } = await renderEntry(entryById("interaction-disabled"));
    const controls = [...container.querySelectorAll("button")];
    expect(controls.length).toBeGreaterThan(0);
    for (const control of controls) expect(control).toBeDisabled();
  });

  // A reduced-motion fixture is not a screenshot with nothing moving:
  // global.css neutralises every animation with !important, so a component
  // carrying no motion at all passes a `reduce`-only reading. This state has
  // to hold real carriers for the normal-direction reading to mean anything.
  it("carries animated elements in the reduced-motion state", async () => {
    const { container } = await renderEntry(entryById("interaction-reduced-motion"));
    expect(container.querySelectorAll(`.${slotStyles.chip}`).length).toBeGreaterThan(0);
    expect(container.querySelectorAll(`.${slotStyles.dust}`).length).toBeGreaterThan(0);
    expect(container.querySelectorAll("button:not(:disabled)").length).toBeGreaterThan(0);
  });

  // Every entry must render in both languages (not just en): a translation
  // path that only a Korean render exercises is exactly the kind of bug this
  // gallery exists to surface, so a test that only tried en would not fail
  // when that bug is present.
  it("renders every entry without throwing, in both languages", async () => {
    for (const language of ["en", "ko"] as const) {
      for (const entry of allEntries()) {
        expect(() =>
          render(<I18nProvider initialLanguage={language}>{entry.render()}</I18nProvider>),
        ).not.toThrow();
        await act(async () => {});
        cleanup();
      }
    }
  });
});
