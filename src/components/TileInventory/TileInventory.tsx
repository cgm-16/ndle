import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Tile as TileModel } from "../../game/types";
import { useI18n } from "../../i18n/I18nContext";
import { Tile } from "../Tile/Tile";
import { tileLabel } from "../Tile/tileFace";
import styles from "./TileInventory.module.css";

/** Columns in the rack's grid (`--rack-columns` in spacing.css): up to this many sockets fit one row. */
const RACK_COLUMNS = 5;

/** A discard the rack is still drawing (8c): the hand as it stood before the
 * discard, and the ids whose exit has not yet played. */
interface Departure {
  tiles: readonly TileModel[];
  leaving: readonly string[];
  /** Rail tiles that survived, still to drop into the freed seats (8a·2). */
  seating: readonly string[];
  /** Every rail tile that survived, landed or not: none of them fires 9i. */
  seated: readonly string[];
  /** Each seating tile's offset from its seat to where it perched. */
  drops: Readonly<Record<string, { dx: number; dy: number }>>;
}

export interface TileInventoryProps {
  tiles: readonly TileModel[];
  mode: "select" | "discard" | "readOnly";
  pendingDiscards: readonly string[];
  /** Ids of tiles sitting in the answer slots. Each renders as an empty
   * socket in its own cell instead of a tile, so the rack never reflows. */
  liftedIds: readonly string[];
  /** Live capacity: the tiles seated, and the index past which tiles perch. */
  capacity: number;
  onTile(tileId: string): void;
  /** Called once a discard's departing tiles have all finished leaving. */
  onSettled?(): void;
}

/** Renders the fixed-socket rack, including lifted and departing tile states. */
export function TileInventory({
  tiles,
  mode,
  pendingDiscards,
  liftedIds,
  capacity,
  onTile,
  onSettled,
}: TileInventoryProps) {
  const { t } = useI18n();
  const [departure, setDeparture] = useState<Departure | null>(null);
  // A tile that leaves state unmounts, and CSS cannot animate an unmounted
  // node, so 8c has to be drawn from a copy the rack keeps. Both halves of
  // "which tile just left, and did it leave by discard" are only legible
  // against the previous render, because the TOGGLE_DISCARD that completes a
  // discard drops the tile in the same action that leaves the discard phase.
  // Adjusting state during render rather than in an effect keeps the held tile
  // on screen from the first frame after the drop, with no gap for it to
  // disappear in.
  //
  // The discard test is the phase the rack was in, not pendingDiscards. The
  // mark that reaches the required count completes the discard in the reducer,
  // so that tile goes straight from "not marked" to "gone" — it was never once
  // rendered with its id in pendingDiscards. `mode` is
  // "discard" for exactly the overflow phase, which is the one phase a tile
  // can leave the rack this way, and a submitted tile leaves from "select".
  const [previous, setPrevious] = useState({ tiles, mode });
  if (previous.tiles !== tiles) {
    const present = new Set(tiles.map((tile) => tile.id));
    const leaving =
      previous.mode === "discard"
        ? previous.tiles.filter((tile) => !present.has(tile.id)).map((tile) => tile.id)
        : [];
    setPrevious({ tiles, mode });
    // The tiles that were past capacity and are still held survived the
    // discard on the rail; the reducer has seated them in the freed sockets.
    const seating = previous.tiles
      .slice(capacity)
      .filter((tile) => present.has(tile.id))
      .map((tile) => tile.id);
    if (leaving.length > 0) {
      setDeparture({ tiles: previous.tiles, leaving, seating, seated: seating, drops: {} });
    }
  }

  // While a discard plays, the rack draws the hand as it stood before it. The
  // reducer has already seated a surviving rail tile in the freed socket, so
  // splicing the departing tile back into the new hand would shove every later
  // tile a cell over; the snapshot keeps each tile where the player saw it.
  const rackTiles = departure !== null && departure.leaving.length > 0 ? departure.tiles : tiles;
  const present = new Set(tiles.map((tile) => tile.id));

  // Retires one departing tile; the last one settles the discard. The next
  // round waits on this (§1.7), so a departure that never reported its end
  // would freeze the run — which is why a cancelled animation retires too.
  // Tiles leaving together end in the same frame and React batches their
  // handlers, so each retire is a functional update: read from the render's
  // closure, the second handler would restore the id the first removed.
  //
  // When the exits end, each surviving rail tile's seat is still on screen —
  // the departing tile it replaces holds it — so the fall 8a·2 draws is
  // measured then, from layout offsets, which transforms do not move.
  const measureDrops = (): Departure["drops"] => {
    const rack = rackRef.current;
    if (rack === null || departure === null) return {};
    const drops: Record<string, { dx: number; dy: number }> = {};
    for (const id of departure.seating) {
      const from = rack.querySelector<HTMLElement>(`[data-rail="${id}"]`);
      const to = rack.querySelector<HTMLElement>(`[data-cell="${tiles.findIndex((tile) => tile.id === id)}"]`);
      if (from && to) drops[id] = { dx: from.offsetLeft - to.offsetLeft, dy: from.offsetTop - to.offsetTop };
    }
    return drops;
  };
  const retire = (tileId: string) => {
    const drops = measureDrops();
    setDeparture((current) => {
      if (current === null) return current;
      const leaving = current.leaving.filter((id) => id !== tileId);
      return { ...current, leaving, drops: leaving.length > 0 ? current.drops : drops };
    });
  };
  const land = (tileId: string) =>
    setDeparture((current) =>
      current && { ...current, seating: current.seating.filter((id) => id !== tileId) },
    );
  const dropping =
    departure !== null && departure.leaving.length === 0 ? new Set(departure.seating) : new Set<string>();
  // A settled departure stays in state, drawn as no departure at all, until
  // the next discard replaces it; the effect only has to announce it, once.
  const settled =
    departure !== null && departure.leaving.length === 0 && departure.seating.length === 0;
  const onSettledRef = useRef(onSettled);
  useEffect(() => {
    onSettledRef.current = onSettled;
  });
  useEffect(() => {
    if (settled) onSettledRef.current?.();
  }, [settled]);
  const rackRef = useRef<HTMLDivElement>(null);
  // A discard starts below the fold on most phones. One instant scroll brings
  // the rack's bottom on screen, and the prompt and rail above it come too;
  // it does nothing when the rack is already in view (§1.12).
  const discarding = mode === "discard";
  useEffect(() => {
    if (discarding) rackRef.current?.scrollIntoView({ block: "nearest", behavior: "instant" });
  }, [discarding]);
  // The native cancel listener below is bound once; these carry it the
  // current render's handlers, whose measurement reads the current hand.
  const retireRef = useRef(retire);
  const landRef = useRef(land);
  useEffect(() => {
    retireRef.current = retire;
    landRef.current = land;
  });
  useEffect(() => {
    // React has no onAnimationCancel, so the rack listens for it natively.
    const rack = rackRef.current;
    if (rack === null) return;
    // Swapping a cell's animation-name cancels the animation it replaces — a
    // reward tile discarded inside its 9i fire cancels oz-fire as its exit
    // starts — so only a cancel of the exit the cell is running retires it.
    const onCancel = (event: Event) => {
      const cell = (event.target as Element).closest("[data-departing], [data-seating]");
      if (!cell) return;
      const cancelled = (event as AnimationEvent).animationName;
      if (cancelled !== getComputedStyle(cell).animationName) return;
      const departing = cell.getAttribute("data-departing");
      const seating = cell.getAttribute("data-seating");
      if (departing) retireRef.current(departing);
      if (seating) landRef.current(seating);
    };
    rack.addEventListener("animationcancel", onCancel);
    return () => rack.removeEventListener("animationcancel", onCancel);
  }, []);

  // §1.12: the live capacity's sockets always render — the empty sockets are
  // the score. Tiles past the live capacity never add a row; they perch on the
  // rail above.
  const perched = rackTiles.slice(capacity);

  const renderTile = (tile: TileModel, cell: number | null) => {
    const onRail = cell === null;
    const place = onRail ? { "data-rail": tile.id } : { "data-cell": cell, "data-tile": tile.id };
    if (!present.has(tile.id)) {
      // The reducer has already dropped this tile and nothing outside the
      // rack needs to know it is still drawn, so it carries no role and is
      // hidden: it has left the game. Retired on animationend rather than
      // on a timer, which would be a second source of truth for a duration
      // the stylesheet owns — and under prefers-reduced-motion the global
      // 0.01ms rule still fires the event, so the same path retires the
      // tile instantly with no branch for it.
      return (
        <div
          key={tile.id}
          className={`${styles.cell} ${styles.cellDeparting}`}
          aria-hidden="true"
          {...place}
          data-departing={tile.id}
          onAnimationEnd={() => retire(tile.id)}
        >
          <Tile value={tile} state="marked" />
        </div>
      );
    }

    if (liftedIds.includes(tile.id)) {
      // A lifted cell is a socket, not a styled Tile: the tile it holds
      // is already named in the answer slots, so this cell must carry
      // no button role and no accessible name of its own.
      return <div key={tile.id} className={`${styles.socket} ${styles.socketLifted}`} {...place} />;
    }

    const isMarkedForDiscard = mode === "discard" && pendingDiscards.includes(tile.id);
    const labelParts = [tileLabel(tile, t)];
    if (tile.isNew) labelParts.push(t("tile.newLabel"));
    if (isMarkedForDiscard) labelParts.push(t("tile.discardLabel"));

    // 8a and 9i collide on the cells past capacity, which hold the newest
    // arrivals — reward tiles, almost every time (§1.5 step 7). Those are
    // the arrivals that did not land, so they rim-reject instead of firing.
    // One that later drops into a freed seat is still new until the round
    // changes, and firing then would start it from nothing in its seat.
    const moment =
      onRail
        ? ` ${styles.cellRimReject}`
        : tile.isNew && !departure?.seated.includes(tile.id)
          ? ` ${styles.cellNew}`
          : "";

    // 8a·2: a rail tile the discard spared falls into the seat it freed, from
    // where it perched. It is mounted in that seat and flies in from the rail.
    const drop = !onRail && dropping.has(tile.id) ? (departure?.drops[tile.id] ?? { dx: 0, dy: 0 }) : null;
    if (drop !== null) {
      return (
        <div
          key={tile.id}
          className={`${styles.cell} ${styles.cellPerchDrop}`}
          style={{ "--dx": `${drop.dx}px`, "--dy": `${drop.dy}px` } as CSSProperties}
          {...place}
          data-seating={tile.id}
          onAnimationEnd={() => land(tile.id)}
        >
          <Tile value={tile} state="disabled" label={labelParts.join(", ")} />
        </div>
      );
    }

    return (
      <div key={tile.id} className={`${styles.cell}${moment}`} {...place}>
        <Tile
          value={tile}
          state={
            isMarkedForDiscard
              ? "marked"
              : mode === "readOnly"
                ? "disabled"
                : tile.isNew
                  ? "reward"
                  : "resting"
          }
          label={labelParts.join(", ")}
          pressed={mode === "discard" ? isMarkedForDiscard : undefined}
          onClick={() => onTile(tile.id)}
        />
      </div>
    );
  };

  return (
    <div ref={rackRef} className={styles.rack} data-size={capacity <= RACK_COLUMNS ? "row" : undefined}>
      {/* The rail is in flow above the tray, and 8a·2's offsets were measured
          with it there. It stays, empty and one tile high, until the last
          dropping tile lands: gone with the fall, it would lift every seat by
          its height mid-drop and start the tile that far above its perch. */}
      {(perched.length > 0 || dropping.size > 0) && (
        <div className={styles.rail}>
          {perched.map((tile) => renderTile(tile, null))}
        </div>
      )}
      <div className={styles.inventory}>
        {Array.from({ length: capacity }, (_, index) => {
          const tile = rackTiles[index];
          if (tile === undefined) return <div key={`empty-${index}`} className={styles.socket} />;
          return renderTile(tile, index);
        })}
      </div>
    </div>
  );
}
