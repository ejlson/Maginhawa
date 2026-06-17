"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

/**
 * Splits a string into words and reveals them one-by-one (mask + rise)
 * as the block scrolls into view — the editorial "text builds in" effect.
 */
export default function RevealText({
  text,
  className,
  delay = 0,
  stagger = 0.045,
}: {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px -10% 0px" });
  const words = text.split(" ");

  return (
    <span ref={ref} className={className} aria-label={text}>
      {words.map((word, i) => (
        <span
          key={i}
          style={{
            display: "inline-block",
            overflow: "hidden",
            verticalAlign: "top",
            paddingBottom: "0.22em",
            marginBottom: "-0.22em",
          }}
          aria-hidden
        >
          <motion.span
            style={{ display: "inline-block", willChange: "transform" }}
            initial={{ y: "125%" }}
            animate={inView ? { y: "0%" } : { y: "125%" }}
            transition={{
              duration: 0.8,
              delay: delay + i * stagger,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {word}
            {i < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </span>
  );
}
