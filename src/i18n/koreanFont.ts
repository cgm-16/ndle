// Gothic A1's Korean subset is far too large to hand an English player (see
// tokens/fonts.css), so it is not among the faces the app self-hosts eagerly.
// It loads on demand, exactly once, the first time the interface needs it.
// Only 400 and 700 load; Hangul asked for at 500 or 600 renders the nearest of
// the two (see tokens/fonts.css).
let koreanFontLoad: Promise<void> | null = null;

export function loadKoreanFont(): Promise<void> {
  if (!koreanFontLoad) {
    koreanFontLoad = Promise.all([
      import("@fontsource/gothic-a1/korean-400.css"),
      import("@fontsource/gothic-a1/korean-700.css"),
    ]).then(
      () => undefined,
      () => {
        // A failed load is not fatal: the locale still renders, just
        // degraded to the fallback face, so this stays silent rather than
        // surfacing as console noise or an unhandled rejection.
      },
    );
  }
  return koreanFontLoad;
}
