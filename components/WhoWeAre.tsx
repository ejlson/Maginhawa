"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import styles from "./WhoWeAre.module.css";
import Placeholder from "./Placeholder";
import Reveal from "./Reveal";
import RevealText from "./RevealText";
import Parallax from "./Parallax";
import MagneticButton from "./MagneticButton";

const PARAS = [
  {
    n: "01",
    title: "Our Story",
    body: "Born in Camden from a single family kitchen, the Maginhawa Group has grown into a family of restaurants bound by one idea — food that feels like home, wherever home is for you.",
  },
  {
    n: "02",
    title: "Our Kitchen",
    body: "From Filipino fusion to Caribbean fire, each kitchen reworks tradition with techniques borrowed from France, Japan and the street stalls of Manila. Bold, generous, unmistakably ours.",
  },
  {
    n: "03",
    title: "Our City",
    body: "London is our table. Across Camden, Soho, Kentish Town and Shoreditch, we bring people together over plates that cross cultures and start conversations.",
  },
];

export default function WhoWeAre() {
  const bodyRef = useRef<HTMLDivElement>(null);
  // anchored to the viewport centre: the row sits cascaded while it's in the
  // lower half, then slides down to bottom-align with the image as it scrolls
  // up past centre (and back to the cascade on the way down)
  const { scrollYProgress } = useScroll({
    target: bodyRef,
    offset: ["start center", "end center"],
  });

  // even diagonal (left highest → right lowest) — steep cascade
  const y0 = useTransform(scrollYProgress, [0, 0.5], [-360, 0]);
  const y1 = useTransform(scrollYProgress, [0, 0.5], [-240, 0]);
  const y2 = useTransform(scrollYProgress, [0, 0.5], [-120, 0]);
  const ys = [y0, y1, y2];

  return (
    <section className={styles.section} id="about-us">
      <div className="container">
        <div className={styles.statementWrap}>
          <Reveal className={styles.sEyebrow} as="span">
            (Who are We?)
          </Reveal>
          <h2 className={styles.statement}>
            <span className={styles.spacer} aria-hidden />
            <RevealText
              text="A vibrant Filipino/pan-Asian company in the heart of London. Explore our diverse range of stores that embody the essence of tradition with a modern twist."
              stagger={0.018}
            />
          </h2>
        </div>

        <div className={styles.body} ref={bodyRef}>
          {PARAS.map((p, i) => (
            <motion.div key={p.n} className={styles.col} style={{ y: ys[i] }}>
              <span className={styles.colHead}>
                {p.n}. {p.title}
              </span>
              <p className={styles.colBody}>{p.body}</p>
            </motion.div>
          ))}

          <Reveal delay={0.24} className={styles.imageCol}>
            <Parallax inset ratio="3 / 4" speed={0.16}>
              <Placeholder label="Image" />
            </Parallax>
          </Reveal>
        </div>

        <div className={styles.cta}>
          <MagneticButton label="Learn More About Us" theme="light" small />
        </div>
      </div>
    </section>
  );
}
