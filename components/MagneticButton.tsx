"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { useRef, useState } from "react";
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
 * Pill button with the house treatment: magnetic cursor pull + a cream circle
 * that radiates from the entry point on hover, the label sliding maroon↔cream.
 * Styled for dark (maroon) backgrounds.
 */
export default function MagneticButton({
  label,
  type = "button",
  onClick,
  ariaLabel,
  arrow = true,
  small = false,
  theme = "dark",
  hoverAccent = false,
}: {
  label: string;
  type?: "button" | "submit";
  onClick?: () => void;
  ariaLabel?: string;
  arrow?: boolean;
  small?: boolean;
  theme?: "dark" | "light";
  /** when true, the radiating fill is saffron (text + arrow still flip to
   *  the btn-bg colour, giving a saffron-button-with-maroon-type hover) */
  hoverAccent?: boolean;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [hover, setHover] = useState(false);
  const [fill, setFill] = useState({ x: 0, y: 0, d: 0 });
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 170, damping: 13, mass: 0.3 });
  const y = useSpring(my, { stiffness: 170, damping: 13, mass: 0.3 });

  const onMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - (r.left + r.width / 2)) * 0.25);
    my.set((e.clientY - (r.top + r.height / 2)) * 0.4);
  };
  const onEnter = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const cx = e.clientX - r.left;
    const cy = e.clientY - r.top;
    const d =
      2 *
      Math.max(
        Math.hypot(cx, cy),
        Math.hypot(r.width - cx, cy),
        Math.hypot(cx, r.height - cy),
        Math.hypot(r.width - cx, r.height - cy)
      );
    setFill({ x: cx, y: cy, d });
    setHover(true);
  };
  const onLeave = () => {
    mx.set(0);
    my.set(0);
    setHover(false);
  };

  return (
    <motion.div className={styles.magnet} style={{ x, y }}>
      <button
        ref={ref}
        type={type}
        onClick={onClick}
        className={`${styles.btn} ${small ? styles.small : ""} ${theme === "light" ? styles.light : ""} ${hoverAccent ? styles.hoverAccent : ""} ${hover ? styles.isHover : ""}`}
        onMouseEnter={onEnter}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        aria-label={ariaLabel ?? label}
      >
        <span
          className={styles.fill}
          style={{ left: fill.x, top: fill.y, width: fill.d, height: fill.d }}
          aria-hidden
        />
        <span className={styles.label} aria-hidden>
          <span className={styles.l1}>{label}</span>
          <span className={styles.l2}>{label}</span>
        </span>
        {arrow && (
          <span className={styles.arrow} aria-hidden>
            <Arrow />
          </span>
        )}
      </button>
    </motion.div>
  );
}
