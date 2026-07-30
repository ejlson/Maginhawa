"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { useRef } from "react";

/**
 * The page's mid-scroll MAROON ZONE — one continuous dark ground under the
 * About story, the As Seen In credential and the photo interlude, so the
 * three read as a single chapter band. As the zone's top edge scrolls up
 * into the screen its background scrubs cream → maroon (a simple colour
 * change tied to arrival, fully dark just above mid-screen, reversing on
 * the way back out); the zone then simply ENDS after the interlude — the
 * cream journal below carries its own ground. Reduced motion holds static
 * maroon.
 */
export default function MaroonZone({
  children,
}: {
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 1", "start 0.55"],
  });
  const bg = useTransform(scrollYProgress, [0, 1], ["#faf7f1", "#2f0000"]);

  return (
    <motion.div
      ref={ref}
      style={reduce ? { backgroundColor: "#2f0000" } : { backgroundColor: bg }}
    >
      {children}
    </motion.div>
  );
}
