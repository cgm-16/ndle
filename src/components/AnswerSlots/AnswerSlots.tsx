import { useEffect, useRef, type AnimationEvent, type CSSProperties } from "react";
import type { RoundResult, Tile as TileModel } from "../../game/types";
import { useI18n } from "../../i18n/I18nContext";
import { Tile } from "../Tile/Tile";
import styles from "./AnswerSlots.module.css";

/* The streak ladder accumulates, never swaps: streak 3 draws one chalk ring, 5
   a second, 8 a third and the six-fleck fan. Nothing above 8 escalates, and
   streaks 1–2 bloom with nothing added — the bloom is the floor, not the ring.
   A rung that fires from the first correct answer changes nothing when it is
   reached. */
const RING_STREAKS = [3, 5, 8];

const BURST_AT = 8;

/* 2d — the locked six: chalk flecks that start above the tiles' top edge and
   fan out 12px over the upper half circle, so they travel over the field and
   never over a face. Each carries the offset nd-fan interpolates to. */
const CHIPS = [
  { dx: "-11.8px", dy: "-2.1px" },
  { dx: "-8.9px", dy: "-8px" },
  { dx: "-3.3px", dy: "-11.5px" },
  { dx: "3.3px", dy: "-11.5px" },
  { dx: "8.9px", dy: "-8px" },
  { dx: "11.8px", dy: "-2.1px" },
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
  const rings = rewarded ? RING_STREAKS.filter((at) => streak >= at) : [];
  const burst = rewarded && streak >= BURST_AT;

  // Every element that plays part of the verdict carries data-moment, and the
  // group has settled when each of them has ended once. Counted by element
  // rather than by event, so a bubbling animationend from anything else — or
  // the same element reported twice — cannot settle it early. Under
  // prefers-reduced-motion every frame still runs, for 0.01ms, so the count
  // is still reached. A correct tile's own span is a moment; a wrong one's
  // are the stroke and the dust.
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

        // An empty slot is a socket, not a tile: no tile face. It keeps
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
          verdict === "correct" ? styles.bloom : verdict === "incorrect" ? undefined : styles.arriving;

        return (
          // Keyed by the tile rather than the slot, which is what makes the
          // arrival fire once: React remounts the slot when its tile changes
          // and keeps it when nothing did, and only a fresh element restarts a
          // CSS animation. Under a positional key the same node would be
          // reused and 9b, the most frequent motion in the app, would never
          // play again after the first selection.
          <span key={tile.id} className={styles.filled}>
            {/* The ladder is decoration on a moment the tile already carries:
                nothing here is reachable, and nothing here is named. */}
            {rings.map((at, ringIndex) => (
              <span
                key={at}
                className={styles.ring}
                aria-hidden="true"
                data-moment=""
                style={{ "--ring-order": ringIndex } as CSSProperties}
              />
            ))}
            <span className={moment} data-moment={verdict === "correct" ? "" : undefined}>
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
            {verdict === "incorrect" && <span className={styles.dust} aria-hidden="true" data-moment="" />}
            {verdict === "incorrect" && <span className={styles.stroke} aria-hidden="true" data-moment="" />}
            {burst &&
              CHIPS.map((chip) => (
                <span
                  key={chip.dx}
                  className={styles.chip}
                  aria-hidden="true"
                  data-moment=""
                  style={
                    {
                      "--dx": chip.dx,
                      "--dy": chip.dy,
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
