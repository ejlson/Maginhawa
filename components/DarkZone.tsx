"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import styles from "./DarkZone.module.css";

export default function DarkZone({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "start start"],
  });
  // the maroon zone rises up into place as it enters — parallax like the hero
  const y = useTransform(scrollYProgress, [0, 1], ["14vh", "0vh"]);

  return (
    <motion.div
      ref={ref}
      className={styles.zone}
      data-nav-theme="dark"
      style={{ y }}
    >
      {children}
    </motion.div>
  );
}
