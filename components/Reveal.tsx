"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

type RevealProps = {
  children: React.ReactNode;
  /** stagger delay in seconds */
  delay?: number;
  /** distance to travel up, px */
  y?: number;
  className?: string;
  as?: "div" | "span" | "li" | "p" | "h2" | "section";
  once?: boolean;
};

/**
 * Fades + slides its children up when scrolled into view.
 * Used for section text/labels so copy animates in on scroll.
 */
export default function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
  as = "div",
  once = true,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once, margin: "-12% 0px -12% 0px" });
  const MotionTag = motion[as] as typeof motion.div;
  // reduced motion: keep the fade for comprehension, drop the upward travel.
  // `useReducedMotion` reads the media query synchronously, so it differs
  // between SSR (always false) and the first client render — which produced a
  // hydration mismatch on the `transform` of the initial state. Defer reading
  // it until after mount so the server and first client render agree.
  const prefersReduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const reduce = mounted ? prefersReduced : false;
  const dy = reduce ? 0 : y;

  return (
    <MotionTag
      ref={ref}
      className={className}
      initial={{ opacity: 0, transform: `translateY(${dy}px)` }}
      animate={
        inView
          ? { opacity: 1, transform: "translateY(0px)" }
          : { opacity: 0, transform: `translateY(${dy}px)` }
      }
      transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </MotionTag>
  );
}
