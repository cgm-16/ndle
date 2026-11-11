import { isParMade } from "../game/selectors";
import type { GameState, Language } from "../game/types";
import { messages } from "../i18n/messages";

/** Which mode a run was played in. */
export type PlayVariant = { kind: "daily"; number: number } | { kind: "practice" };

/** `won`: made par. `rows`: the table's length. */
export type ShareStats = { score: number; longestStreak: number; par: number; rows: number; won: boolean } & PlayVariant;

/** The statistics a finished run shows and shares. */
export function getShareStats(state: GameState, variant: PlayVariant): ShareStats {
  const { table } = state;
  if (table === null) throw new RangeError("A run's statistics need its table; the title state has none");
  return {
    score: state.score,
    longestStreak: state.longestStreak,
    par: table.par,
    rows: table.rows.length,
    won: isParMade(state),
    ...variant,
  };
}

// §1.15: the name and the outcome lead, ahead of the figures. The words are
// the dictionary's, so the shared text and the screen cannot drift apart. A
// Daily's text carries its table number and the figures only, never a row.
export function formatShareText(stats: ShareStats, language: Language, url: string): string {
  const { title, gameOver, share } = messages[language];
  const { score, rows, par, longestStreak } = stats;
  const outcome = stats.won ? gameOver.parTitle : gameOver.shortTitle.replace("{short}", String(par - score));
  const ko = language === "ko";
  if (stats.kind === "daily") {
    return `${title.name} #${stats.number} — ${outcome} — ${score}/${rows} · ${ko ? "목표" : "par"} ${par}\n${url}`;
  }
  const heading = `${title.name} ${title.practice} — ${outcome}`;
  return ko
    ? `${heading} — 점수: ${score}/${rows} · 목표 ${par}\n최장 연속 정답: ${longestStreak}\n\n${share.puzzleAsk}\n${url}`
    : `${heading} — Score: ${score}/${rows} · par ${par}\nLongest streak: ${longestStreak}\n\n${share.puzzleAsk}\n${url}`;
}

export interface ShareDependencies {
  nativeShare?: (data: ShareData) => Promise<void>;
  writeClipboard: (text: string) => Promise<void>;
}

export type ShareOutcome = "shared" | "copied" | "failed";

export async function shareResult(
  text: string,
  url: string,
  dependencies: ShareDependencies,
): Promise<ShareOutcome> {
  if (dependencies.nativeShare) {
    try {
      await dependencies.nativeShare({ text, url });
      return "shared";
    } catch {
      return "failed";
    }
  }
  return copyResult(text, dependencies);
}

export async function copyResult(
  text: string,
  dependencies: Pick<ShareDependencies, "writeClipboard">,
): Promise<ShareOutcome> {
  try {
    await dependencies.writeClipboard(text);
    return "copied";
  } catch {
    return "failed";
  }
}
