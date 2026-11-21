import type { RoundResult } from "../../game/types";
import { useI18n } from "../../i18n/I18nContext";

export interface MarkProps {
  result: RoundResult["kind"];
}

/**
 * The one correct-or-wrong mark: ✓ in English, ○ in Korean, ✗ for wrong. An
 * SVG, because Gothic A1 draws no ✓ or ✗. Stroked in currentColor, 1em square.
 */
export function Mark({ result }: MarkProps) {
  const { language } = useI18n();
  const shape = result === "incorrect" ? "cross" : language === "ko" ? "circle" : "check";
  return (
    <svg
      aria-hidden="true"
      data-shape={shape}
      width="1em"
      height="1em"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {shape === "check" && <path d="M3 8.5l3.5 3.5L13 4.5" />}
      {shape === "circle" && <circle cx="8" cy="8" r="5" />}
      {shape === "cross" && <path d="M4 4l8 8M12 4l-8 8" />}
    </svg>
  );
}
