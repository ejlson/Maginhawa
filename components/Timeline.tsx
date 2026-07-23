"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import styles from "./Timeline.module.css";
import Placeholder from "./Placeholder";

// opening order (years are placeholders apart from the ones in the copy)
const EVENTS = [
  { year: "1987", name: "Bintang", img: "/images/bintang.jpg" },
  { year: "2007", name: "Guanabana", img: "/images/guanabana.jpg" },
  { year: "2017", name: "Mamasons", img: "" },
  { year: "2018", name: "Ramo Ramen", img: "/images/ramo.jpg" },
  { year: "2019", name: "Hoodwood", img: "/images/hoowood.jpg" },
  { year: "2025", name: "Café Mama & Sons", img: "/images/cafemama.jpg" },
  { year: "2025", name: "Belly", img: "/images/belly.jpg" },
];

export default function Timeline() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [dist, setDist] = useState(0);

  // how far the track overflows the viewport → the horizontal travel
  useEffect(() => {
    const measure = () => {
      const t = trackRef.current;
      if (!t) return;
      setDist(Math.max(0, t.scrollWidth - window.innerWidth));
    };
    measure();
    const t = window.setTimeout(measure, 600); // after images load
    window.addEventListener("resize", measure);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", measure);
    };
  }, []);

  // the section is (100svh + travel) tall; scrolling that extra distance drives
  // the track left, then normal scrolling resumes
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  const x = useTransform(scrollYProgress, [0, 1], [0, -dist]);

  return (
    <section
      ref={sectionRef}
      className={styles.section}
      style={{ height: `calc(100svh + ${dist}px)` }}
    >
      <div className={styles.sticky}>
        <span className={styles.eyebrow}>(Our Journey)</span>

        <motion.div ref={trackRef} className={styles.track} style={{ x }}>
          {EVENTS.map((e) => (
            <div key={e.name} className={styles.item}>
              <span className={styles.year}>{e.year}</span>
              <div className={styles.itemImg}>
                {e.img ? (
                  <img src={e.img} alt={e.name} />
                ) : (
                  <Placeholder ratio="3 / 4" label={e.name} />
                )}
              </div>
              <span className={styles.name}>{e.name}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
