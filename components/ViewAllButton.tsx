"use client";

import Link from "next/link";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useRef, useState } from "react";
import styles from "./ViewAllButton.module.css";

const LABEL = "View All Our Restaurants";

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

export default function ViewAllButton() {
  const btnRef = useRef<HTMLAnchorElement>(null);
  const [hover, setHover] = useState(false);
  const [fill, setFill] = useState({ x: 0, y: 0, d: 0 });

  // magnetic pull toward the cursor
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 170, damping: 13, mass: 0.3 });
  const y = useSpring(my, { stiffness: 170, damping: 13, mass: 0.3 });

  const onMove = (e: React.MouseEvent) => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - (r.left + r.width / 2)) * 0.25);
    my.set((e.clientY - (r.top + r.height / 2)) * 0.45);
  };

  const onEnter = (e: React.MouseEvent) => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const cx = e.clientX - r.left;
    const cy = e.clientY - r.top;
    // diameter that covers the whole button from the entry point
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
    <section className={styles.wrap}>
      <span className={styles.kicker}>(There&apos;s more to explore)</span>

      <motion.div className={styles.magnet} style={{ x, y }}>
        <Link
          ref={btnRef}
          href="/restaurants"
          className={`${styles.btn} ${hover ? styles.isHover : ""}`}
          onMouseEnter={onEnter}
          onMouseMove={onMove}
          onMouseLeave={onLeave}
          aria-label={LABEL}
        >
          <span
            className={styles.fill}
            style={{ left: fill.x, top: fill.y, width: fill.d, height: fill.d }}
            aria-hidden
          />
          <span className={styles.label} aria-hidden>
            <span className={styles.l1}>{LABEL}</span>
            <span className={styles.l2}>{LABEL}</span>
          </span>
          <span className={styles.arrow} aria-hidden>
            <Arrow />
          </span>
        </Link>
      </motion.div>
    </section>
  );
}
