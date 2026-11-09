import type { Tile } from "../../game/types";
import type { I18nValue } from "../../i18n/types";

// What a tile engraves: its digit.
export function tileGlyph(value: Pick<Tile, "digit">): string {
  return String(value.digit);
}

// The spoken name a digit tile's "Digit {digit}" gives (§1.14).
export function tileLabel(value: Pick<Tile, "digit">, t: I18nValue["t"]): string {
  return t("tile.digitLabel", { digit: value.digit });
}
