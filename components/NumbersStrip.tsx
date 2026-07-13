"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";
import styles from "./NumbersStrip.module.css";
import Reveal from "./Reveal";

// The group's story compressed into four editorial numerals — every value
// grounded in copy elsewhere on the site (Camden kitchen 1987, "seven
// dining rooms today", "thirty-eight years of Filipino kitchens", Belly
// added to the Michelin Guide in 2026).
const NUMBERS: { value: number; label: string }[] = [
  { value: 1987, label: "Established in Kentish Town" },
  { value: 7, label: "Restaurants" },
  { value: 38, label: "Years of kitchen experience" },
  { value: 2026, label: "Michelin Guide" },
];

/** One numeral that counts up to its value the first time it's seen. */
function CountUp({
  value,
  delay,
  play,
}: {
  value: number;
  delay: number;
  play: boolean;
}) {
  const [shown, setShown] = useState(play ? 0 : value);

  useEffect(() => {
    if (!play) return;
    const controls = animate(0, value, {
      duration: 1.4,
      delay,
      ease: [0.23, 1, 0.32, 1],
      onUpdate: (v) => setShown(Math.round(v)),
    });
    return () => controls.stop();
  }, [play, value, delay]);

  return <>{shown}</>;
}

/**
 * Numbers strip — the bridge between the About Us chapter (who we are)
 * and the Blog covers (what people write about us): credibility at a
 * glance, in one hairline-ruled row. The numerals count up as the strip
 * enters the viewport — once, then they hold still.
 */
export default function NumbersStrip() {
  const ref = useRef<HTMLDListElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });
  const reduceMotion = useReducedMotion();

  return (
    <section className={styles.section} data-nav-theme="light">
      <dl ref={ref} className={styles.strip}>
        {NUMBERS.map((n, i) => (
          <Reveal key={n.label} delay={i * 0.06} className={styles.item}>
            <dt className={styles.label}>{n.label}</dt>
            <dd className={styles.value}>
              {reduceMotion ? (
                n.value
              ) : (
                <CountUp value={n.value} delay={i * 0.12} play={inView} />
              )}
            </dd>
          </Reveal>
        ))}
      </dl>
    </section>
  );
}
