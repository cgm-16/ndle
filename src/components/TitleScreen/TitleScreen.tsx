import { useState } from "react";
import type { GameMode } from "../../game/types";
import { ActionButton } from "../ActionButton/ActionButton";
import { LanguageToggle } from "../LanguageToggle/LanguageToggle";
import { useI18n } from "../../i18n/I18nContext";
import type { MessageTree } from "../../i18n/messages";
import styles from "./TitleScreen.module.css";

export interface TitleScreenProps {
  onStart(mode: GameMode): void;
}

const MODES = ["endless", "puzzle"] as const;

/**
 * The four material rules, in the design's reading order. Each swatch is the
 * material the rule is about — a socket, a ceramic tile, a gold pip, a
 * vermilion pip — which is this system's iconography. The swatch class carries
 * the treatment; the rule text carries the meaning, so a swatch that failed to
 * paint would cost decoration, not information.
 */
const MATERIAL_RULES: { swatch: string; topic: keyof MessageTree["howToPlay"] }[] = [
  { swatch: styles.socket, topic: "capacity" },
  { swatch: styles.tile, topic: "correct" },
  { swatch: styles.gold, topic: "overflow" },
  { swatch: styles.verm, topic: "incorrect" },
];

/** Topics play never teaches on its own. Keyboard controls lead: it is the one
    of the four that no amount of playing reveals. */
const MORE_TOPICS = ["keyboard", "selecting", "slots", "progress", "puzzle"] as const;

export function TitleScreen({ onStart }: TitleScreenProps) {
  const { t } = useI18n();
  // Not persisted (§1.16): a reload is a fresh title with Puzzle chosen.
  const [mode, setMode] = useState<GameMode>("puzzle");

  return (
    <main className={styles.screen}>
      {/* Ref 11C's mark tile. It wears the resting tile's tokens without being
          a Tile: the primitive's `digit` is a number (M5.5c), and ✳ is not one.
          Hidden from the accessibility tree so the glyph cannot be announced
          twice, once here and once inside the wordmark. */}
      <span className={styles.markTile} aria-hidden="true">
        &#10035;
      </span>
      {/* The visible wordmark is oz✳terisk; the accessible name is ozterisk.
          The two diverge on purpose — the ✳ is the brand's ornament, not a
          letter of the word, and a screen reader announcing "oz asterisk
          terisk" would be reading the decoration aloud. The label comes from
          the catalogue so `title.name` stays the single source of the word. */}
      <h1 className={styles.wordmark} aria-label={t("title.name")}>
        oz<span className={styles.mark}>&#10035;</span>terisk
      </h1>
      <p className={styles.summary}>{t("title.summary")}</p>
      <ul className={styles.materialRules}>
        {MATERIAL_RULES.map(({ swatch, topic }) => (
          <li key={topic} className={styles.materialRule}>
            <span className={`${styles.swatch} ${swatch}`} aria-hidden="true" />
            <span>{t(`howToPlay.${topic}`)}</span>
          </li>
        ))}
      </ul>
      <details className={styles.details}>
        <summary className={styles.summaryLabel}>{t("title.more")}</summary>
        <ul className={styles.rules}>
          {MORE_TOPICS.map((topic) => (
            <li key={topic}>{t(`howToPlay.${topic}`)}</li>
          ))}
        </ul>
      </details>
      <div className={styles.modes} role="group" aria-label={t("title.mode")}>
        {MODES.map((option) => (
          <button
            key={option}
            type="button"
            className={styles.mode}
            aria-pressed={mode === option}
            onClick={() => setMode(option)}
          >
            <span className={styles.modeName}>{t(`mode.${option}`)}</span>
            <span className={styles.modeHint}>{t(`mode.${option}Hint`)}</span>
          </button>
        ))}
      </div>
      <LanguageToggle />
      <ActionButton onClick={() => onStart(mode)}>{t("action.start")}</ActionButton>
    </main>
  );
}
