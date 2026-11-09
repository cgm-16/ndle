import { useEffect, useRef, type AnimationEvent, type CSSProperties } from "react";
import type { RoundResult, Tile as TileModel } from "../../game/types";
import { useI18n } from "../../i18n/I18nContext";
import { Tile } from "../Tile/Tile";
import styles from "./AnswerSlots.module.css";

/* The streak ladder accumulates, never swaps: streak 3 adds the jade ring, 5 a
   second ring in gold plus a gold rim on the answer tiles, 8 a third ring, the
   brightest rim and the six-chip burst. Nothing above 8 escalates, and streaks
   1–2 bloom with nothing added — the bloom is the floor, not the ring. A rung
   that fires from the first correct answer changes nothing when it is reached. */
const RING_TIERS = [
  { at: 3, ring: styles.ringJade, rim: "" },
  { at: 5, ring: styles.ringGold, rim: styles.rim },
  { at: 8, ring: styles.ringBright, rim: styles.rimBright },
];

const BURST_AT = 8;

/* 2d — the locked six. Ceramic shards off the tile's own bottom edge, each
   carrying the trajectory oz-fan interpolates. The design staggers them
   40 + index × 12 ms. */
const CHIPS = [
  { dx: "-46px", peak: "-36px", land: "34px", rot: "-140deg" },
  { dx: "-26px", peak: "-54px", land: "28px", rot: "96deg" },
  { dx: "-8px", peak: "-62px", land: "36px", rot: "-62deg" },
  { dx: "13px", peak: "-58px", land: "30px", rot: "124deg" },
  { dx: "31px", peak: "-47px", land: "33px", rot: "-104deg" },
  { dx: "51px", peak: "-31px", land: "26px", rot: "162deg" },
];

export interface AnswerSlotsProps {
  slotCount: 1 | 2;
  selectedTiles: readonly TileModel[];
  /**
   * Omit to render the whole group read-only: no slot carries a button role,
   * so a phase can keep the tiles on screen without offering a screen reader
   * a control it cannot use. Distinct from `disabled`, which keeps the
   * buttons and disables them.
   */
  onReturn?(tileId: string): void;
  disabled: boolean;
  /**
   * How the round judged the tiles in these slots, once it has judged them.
   * Omitted while the player is still answering: unjudged is a third state,
   * not a default of either verdict, and the tiles are neither yet.
   */
  verdict?: RoundResult["kind"];
  /**
   * The streak the answer on screen just earned, which is what the ladder is
   * gated on. `SUBMIT_CORRECT` increments `currentStreak` in the same
   * transition that enters `feedback`, so during feedback the reducer's count
   * already includes the round being judged.
   */
  streak?: number;
  /**
   * Called once every moment the verdict plays on these slots has finished:
   * the bloom or crack, the dust, the rings and the burst. Only a judged group
   * settles; a group with no tile in it settles on its first render.
   */
  onSettled?(): void;
}

export function AnswerSlots({
  slotCount,
  selectedTiles,
  onReturn,
  disabled,
  verdict,
  streak = 0,
  onSettled,
}: AnswerSlotsProps) {
  const { t } = useI18n();
  const positions = Array.from({ length: slotCount }, (_, index) => index);

  // Nothing on the ladder plays on an incorrect answer, and nothing plays
  // while the round is still unjudged.
  const rewarded = verdict === "correct";
  const rings = rewarded ? RING_TIERS.filter((tier) => streak >= tier.at) : [];
  const burst = rewarded && streak >= BURST_AT;
  // The rings accumulate; the rim escalates. One element carries one outline,
  // so the highest tier reached supplies it and the tier below is replaced,
  // not stacked with.
  const rim = rings[rings.length - 1]?.rim ?? "";

  // Every element that plays part of the verdict carries data-moment, and the
  // group has settled when each of them has ended once. Counted by element
  // rather than by event, so a bubbling animationend from anything else — or
  // the same element reported twice — cannot settle it early. Under
  // prefers-reduced-motion every frame still runs, for 0.01ms, so the count
  // is still reached.
  const filledCount = selectedTiles.slice(0, slotCount).length;
  const momentsPerTile =
    1 + (verdict === "incorrect" ? 1 : 0) + rings.length + (burst ? CHIPS.length : 0);
  const expectedMoments = verdict === undefined ? null : filledCount * momentsPerTile;
  const ended = useRef(new Set<EventTarget>());
  const settledRef = useRef(false);
  const settle = () => {
    if (settledRef.current) return;
    settledRef.current = true;
    onSettled?.();
  };
  const onAnimationEnd = (event: AnimationEvent<HTMLDivElement>) => {
    if (expectedMoments === null) return;
    if (!(event.target instanceof Element) || !event.target.hasAttribute("data-moment")) return;
    ended.current.add(event.target);
    if (ended.current.size >= expectedMoments) settle();
  };
  // Nothing to wait for: settle as soon as the group is on screen.
  useEffect(() => {
    if (expectedMoments === 0) settle();
  });

  return (
    <div className={styles.slots} onAnimationEnd={onAnimationEnd}>
      {positions.map((index) => {
        const tile = selectedTiles[index];
        const position = index + 1;

        // An empty slot is a socket, not a tile: no ceramic anywhere. It keeps
        // its own rule in this component's stylesheet.
        if (tile === undefined) {
          // Read-only, the socket is not a control, and a roleless element has
          // no role that can carry an accessible name. role="img" is one that
          // can.
          if (onReturn === undefined) {
            return (
              <span
                key={`empty-${index}`}
                className={styles.slot}
                role="img"
                aria-label={t("answerSlot.empty", { position })}
              />
            );
          }

          return (
            <button
              key={`empty-${index}`}
              type="button"
              className={styles.slot}
              aria-label={t("answerSlot.empty", { position })}
              disabled
            />
          );
        }

        // A filled slot plays exactly one moment: a tile is either arriving or
        // being judged, and two animations on one element would leave only the
        // last of them anyway.
        const moment =
          verdict === "correct"
            ? styles.bloom
            : verdict === "incorrect"
              ? styles.crack
              : styles.arriving;

        return (
          // Keyed by the tile rather than the slot, which is what makes the
          // arrival fire once: React remounts the slot when its tile changes
          // and keeps it when nothing did, and only a fresh element restarts a
          // CSS animation. Under a positional key the same node would be
          // reused and 9b, the most frequent motion in the app, would never
          // play again after the first selection.
          <span key={tile.id} className={styles.filled}>
            {verdict === "incorrect" && <span className={styles.dust} aria-hidden="true" data-moment="" />}
            {/* The ladder is decoration on a moment the tile already carries:
                nothing here is reachable, and nothing here is named. */}
            {rings.map((tier) => (
              <span
                key={tier.at}
                className={`${styles.ring} ${tier.ring}`}
                aria-hidden="true"
                data-moment=""
              />
            ))}
            <span
              className={rim === "" ? moment : `${moment} ${rim}`}
              data-moment={verdict === undefined ? undefined : ""}
            >
              <Tile
                value={tile}
                state={disabled ? "disabled" : "resting"}
                label={t("answerSlot.filled", {
                  position,
                  digit: tile.digit,
                })}
                onClick={onReturn && (() => onReturn(tile.id))}
              />
            </span>
            {burst &&
              CHIPS.map((chip, chipIndex) => (
                <span
                  key={chip.rot}
                  className={styles.chip}
                  aria-hidden="true"
                  data-moment=""
                  style={
                    {
                      "--dx": chip.dx,
                      "--peak": chip.peak,
                      "--land": chip.land,
                      "--rot": chip.rot,
                      animationDelay: `${40 + chipIndex * 12}ms`,
                    } as CSSProperties
                  }
                />
              ))}
          </span>
        );
      })}
    </div>
  );
}
