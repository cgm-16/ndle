import type { CSSProperties, ReactNode } from "react";
import styles from "./ActionButton.module.css";

export type ActionButtonVariant = "primary" | "secondary" | "ghost";

export interface ActionButtonProps {
  /** Title Case label: "Play Again", "Next Round". Rendered uppercase. */
  children: ReactNode;
  /** Default "primary". */
  variant?: ActionButtonVariant;
  /** A disabled button is FLAT — no shadow. "Not yet" reads as "not raised". */
  disabled?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
}

/**
 * The system's only button. Rises when it becomes available, depresses on
 * press, and lies flat against the felt when disabled — all through CSS
 * state selectors rather than pointer/focus event handlers.
 */
export function ActionButton({ children, variant = "primary", disabled = false, onClick, style }: ActionButtonProps) {
  const className = `${styles.button} ${styles[variant]}`;

  return (
    <button type="button" className={className} disabled={disabled} onClick={onClick} style={style}>
      {children}
    </button>
  );
}
