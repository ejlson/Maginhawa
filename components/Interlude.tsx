"use client";

import Image from "next/image";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { useRef } from "react";
import styles from "./Interlude.module.css";

// the site's shared enter curve
const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * A full-bleed photography interlude between chapters — the photograph IS
 * the section (Telescope's full-bleed editorial break), with ONE centred
 * cream display line overlaid. The frame is shorter than the image inside
 * it, and the image drifts slowly against the scroll (a few percent either
 * way) while the line holds still. Reduced motion pins the drift and the
 * line's rise becomes a fade.
 */
export default function Interlude() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["-6%", "6%"]);

  return (
    <section ref={ref} className={styles.section} data-nav-theme="dark">
      <motion.div
        className={styles.media}
        style={reduce ? undefined : { y }}
      >
        <Image
          className={styles.img}
          src="/images/belly.jpg"
          alt="Diners at Belly's window table"
          fill
          sizes="100vw"
        />
      </motion.div>

      {/* soft maroon veil so the overlaid line reads on the busy footage */}
      <div className={styles.veil} aria-hidden />

      <motion.h2
        className={styles.line}
        initial={
          reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(26px)" }
        }
        whileInView={{ opacity: 1, transform: "translateY(0px)" }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.9, ease: EASE }}
      >
        One family, seven kitchens.
      </motion.h2>
    </section>
  );
}
