"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";

type RevealProps = {
  children: React.ReactNode;
  /** stagger delay in seconds (30–80ms between siblings feels right) */
  delay?: number;
  /** initial vertical offset in px — defaults to 28 */
  y?: number;
  className?: string;
  as?: "div" | "span" | "li" | "p" | "h2" | "section";
  /** if false, reveal replays every time the element re-enters */
  once?: boolean;
};

/**
 * Scroll-triggered reveal — the editorial "settles into view" feel.
 * Follows Emil's principles: strong ease-out curve, animate transform +
 * opacity only, honour reduced motion. A whisper of blur bridges the
 * fade so the two states never look like separate objects overlapping.
 */
export default function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
  as = "div",
  once = true,
}: RevealProps) {
  const shouldReduce = useReducedMotion();

  const variants: Variants = shouldReduce
    ? {
        hidden: { opacity: 0 },
        shown: {
          opacity: 1,
          transition: { duration: 0.4, ease: "easeOut", delay },
        },
      }
    : {
        hidden: { opacity: 0, y, filter: "blur(6px)" },
        shown: {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          transition: {
            duration: 0.9,
            // Emil's strong ease-out: fast to start, gentle to settle
            ease: [0.23, 1, 0.32, 1],
            delay,
          },
        },
      };

  const Component = motion[as];
  return (
    <Component
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="shown"
      viewport={{ once, margin: "-12% 0px -12% 0px" }}
    >
      {children}
    </Component>
  );
}
