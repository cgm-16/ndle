import type { CSSProperties, ReactNode } from "react";
import styles from "./ActionButton.module.css";

export type ActionButtonVariant = "primary" | "secondary" | "ghost";

export interface ActionButtonProps {
  /** Sentence-case label: "Play Again", "Next Round". */
  children: ReactNode;
  /** Default "primary". */
  variant?: ActionButtonVariant;
  /** A disabled button is drawn at 45% opacity. */
  disabled?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
  /** A screen's rule overrides the button's own (height, type size) because the screen's module stylesheet is emitted after ActionButton.module.css, at equal specificity. */
  className?: string;
}

/**
 * The system's only button. Moves 1px down on press and fades when
 * disabled — all through CSS state selectors rather than pointer/focus event
 * handlers.
 */
export function ActionButton({
  children,
  variant = "primary",
  disabled = false,
  onClick,
  style,
  className,
}: ActionButtonProps) {
  const classes = [styles.button, styles[variant], className].filter(Boolean).join(" ");

  return (
    <button type="button" className={classes} disabled={disabled} onClick={onClick} style={style}>
      {children}
    </button>
  );
}
