"use client";

import { motion } from "framer-motion";
import styles from "./Timeline.module.css";
import Reveal from "./Reveal";

// opening years (1987/2007/2017/2018 from the restaurant copy; the rest are
// placeholders until confirmed)
const EVENTS = [
  { year: "1987", name: "Bintang" },
  { year: "2007", name: "Guanabana" },
  { year: "2017", name: "Mamasons" },
  { year: "2018", name: "Ramo Ramen" },
  { year: "2019", name: "Café Mama & Sons" },
  { year: "2021", name: "Belly" },
  { year: "2024", name: "Hoodwood" },
];

export default function Timeline() {
  return (
    <section className={styles.section}>
      <div className="container">
        <Reveal className={styles.eyebrow} as="span">
          (Our Journey)
        </Reveal>

        <div className={styles.track}>
          <motion.span
            className={styles.rail}
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: "-18% 0px -18% 0px" }}
            transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1] }}
          />

          {EVENTS.map((e, i) => (
            <motion.div
              key={e.name}
              className={styles.node}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
              transition={{
                duration: 0.55,
                delay: 0.3 + i * 0.12,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <span className={styles.dot} aria-hidden />
              <span className={styles.year}>{e.year}</span>
              <span className={styles.name}>{e.name}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
