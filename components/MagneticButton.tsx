"use client";

import styles from "./MagneticButton.module.css";

function Arrow() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  );
}

/**
 * Clear liquid-glass pill button. A whisper of tint over a lightly blurred
 * backdrop with a broad, soft recess inside; hover/focus relaxes the recess
 * and widens the pill — all in CSS.
 */
export default function MagneticButton({
  label,
  type = "button",
  onClick,
  ariaLabel,
  arrow = true,
  small = false,
  theme = "dark",
}: {
  label: string;
  type?: "button" | "submit";
  onClick?: () => void;
  ariaLabel?: string;
  arrow?: boolean;
  small?: boolean;
  theme?: "dark" | "light";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`${styles.btn} ${small ? styles.small : ""} ${theme === "light" ? styles.light : ""}`}
      aria-label={ariaLabel ?? label}
    >
      <span className={styles.label} aria-hidden>
        {label}
      </span>
      {arrow && (
        <span className={styles.arrow} aria-hidden>
          <Arrow />
        </span>
      )}
    </button>
  );
}
