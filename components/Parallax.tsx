"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import styles from "./Parallax.module.css";

/**
 * Scroll-linked parallax.
 *
 * Default: translates its children on the Y axis relative to scroll progress,
 * so the whole element drifts (recedes). The element travels `speed * 100%` of
 * its own offset range.
 *
 * `inset`: the frame stays put and the image pans *inside* it — an over-scaled
 * layer drifts within a clipped frame, an internal parallax rather than moving
 * the whole block. Pass `ratio` to fix the frame's aspect ratio, or `fill` to
 * let the frame take the full height of its layout parent instead.
 */
export default function Parallax({
  children,
  speed = 0.2,
  className,
  inset = false,
  ratio,
  fill = false,
}: {
  children: React.ReactNode;
  speed?: number;
  className?: string;
  inset?: boolean;
  ratio?: string;
  /** frame fills the parent's height — overrides `ratio` */
  fill?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const y = useTransform(
    scrollYProgress,
    [0, 1],
    [`${speed * 100}px`, `${-speed * 100}px`]
  );

  if (inset) {
    return (
      <div
        ref={ref}
        className={`${styles.frame} ${className ?? ""}`}
        style={
          fill ? { height: "100%" } : ratio ? { aspectRatio: ratio } : undefined
        }
      >
        {/* over-scaled so the vertical drift never exposes a frame edge */}
        <motion.div className={styles.inner} style={{ y, scale: 1.22 }}>
          {children}
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div ref={ref} className={className} style={{ y }}>
      {children}
    </motion.div>
  );
}
