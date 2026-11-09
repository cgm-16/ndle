import type { CSSProperties } from "react";
import type { Tile as TileModel } from "../../game/types";
import { useI18n } from "../../i18n/I18nContext";
import { tileGlyph, tileLabel } from "./tileFace";
import styles from "./Tile.module.css";

export type TileSize = "lg" | "sm";

export type TileState = "resting" | "lifted" | "reward" | "marked" | "disabled";

export interface TileProps {
  value: Pick<TileModel, "digit">;
  /** lg = rack/slot tile. sm = compact, non-interactive tile. */
  size?: TileSize;
  state?: TileState;
  /** Omit to render a tile that carries no button role. */
  onClick?: () => void;
  /** Spoken label for the button form. Defaults to the localised tile name. */
  label?: string;
  /**
   * Toggle state, when the tile is one. Pass `false` as well as `true`: a
   * toggle that reports only its on-state gives no cue that the off-state is
   * pressable at all. Left undefined, the tile is a plain button.
   */
  pressed?: boolean;
  style?: CSSProperties;
}

/**
 * The single fired-ceramic tile. Every ceramic face in the game
 * is one of these: the rack tile, the filled answer slot, and the reward tile.
 *
 * The empty answer slot is not one — it is a socket cut into the felt, and its
 * rule stays in AnswerSlots.module.css.
 */
export function Tile({ value, size = "lg", state = "resting", onClick, label, pressed, style }: TileProps) {
  const { t } = useI18n();
  const glyph = tileGlyph(value);
  const className = [styles.tile, styles[size], styles[state]].join(" ");

  // Without onClick the tile is decorative: no button element and no button
  // role, so a later phase can mount answer slots inside feedback without
  // adding controls. A roleless element has no role that can carry an
  // accessible name, so `label` is deliberately ignored here and the glyph
  // itself is the text.
  if (onClick === undefined) {
    return (
      <span className={className} style={style}>
        {glyph}
      </span>
    );
  }

  return (
    <button
      type="button"
      className={className}
      style={style}
      aria-label={label ?? tileLabel(value, t)}
      aria-pressed={pressed}
      disabled={state === "disabled"}
      onClick={onClick}
    >
      {glyph}
    </button>
  );
}
