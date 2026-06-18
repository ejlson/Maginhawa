"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import styles from "./RestaurantLocations.module.css";
import Placeholder from "./Placeholder";
import ViewAllButton from "./ViewAllButton";

export default function RestaurantLocations() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // a centre curtain opens as the section scrolls in
  const clip = useTransform(
    scrollYProgress,
    [0.05, 0.42],
    ["inset(48% 0% 48% 0%)", "inset(0% 0% 0% 0%)"]
  );
  // slow zoom-out + vertical drift behind it for parallax depth
  const scale = useTransform(scrollYProgress, [0, 1], [1.35, 1.05]);
  const y = useTransform(scrollYProgress, [0, 1], ["-6%", "6%"]);

  return (
    <section ref={ref} className={styles.section}>
      <motion.div
        className={styles.reveal}
        style={{ clipPath: clip, WebkitClipPath: clip }}
      >
        <motion.div className={styles.bg} style={{ scale, y }}>
          <Placeholder ratio="auto" label="Map / locations showcase" />
        </motion.div>
      </motion.div>

      <div className={styles.cta}>
        <ViewAllButton />
      </div>
    </section>
  );
}
