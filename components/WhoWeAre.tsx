"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState } from "react";
import styles from "./WhoWeAre.module.css";
import Reveal from "./Reveal";
import RevealText from "./RevealText";
import Parallax from "./Parallax";
import MagneticButton from "./MagneticButton";

// img = stand-in photography; swap for real Story / Kitchen / City shots later
const PARAS = [
  {
    n: "01",
    title: "Our Story",
    img: "/images/bintang.jpg",
    body: "Born in Camden from a single family kitchen, the Maginhawa Group has grown into a family of restaurants bound by one idea — food that feels like home, wherever home is for you.",
  },
  {
    n: "02",
    title: "Our Kitchen",
    img: "/images/ramo.jpg",
    body: "From Filipino fusion to Caribbean fire, each kitchen reworks tradition with techniques borrowed from France, Japan and the street stalls of Manila. Bold, generous, unmistakably ours.",
  },
  {
    n: "03",
    title: "Our City",
    img: "/images/guanabana.jpg",
    body: "London is our table. Across Camden, Soho, Kentish Town and Shoreditch, we bring people together over plates that cross cultures and start conversations.",
  },
];

export default function WhoWeAre() {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  // anchored to the viewport centre: the row sits cascaded while it's in the
  // lower half, then slides down to bottom-align with the image as it scrolls up
  const { scrollYProgress } = useScroll({
    target: bodyRef,
    offset: ["start center", "end center"],
  });

  // sequential catch-up cascade: 01 drops to 02, then 01+02 to 03, then all down
  const stops = [0, 0.2, 0.4, 0.6];
  const y0 = useTransform(scrollYProgress, stops, [-360, -240, -120, 0]);
  const y1 = useTransform(scrollYProgress, stops, [-240, -240, -120, 0]);
  const y2 = useTransform(scrollYProgress, stops, [-120, -120, -120, 0]);
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
            <motion.div
              key={p.n}
              className={`${styles.col} ${active === i ? styles.colActive : ""}`}
              style={{ y: ys[i] }}
              onMouseEnter={() => setActive(i)}
            >
              <span className={styles.ghost} aria-hidden>
                {p.n}
              </span>
              <span className={styles.colHead}>{p.title}</span>
              <p className={styles.colBody}>{p.body}</p>
            </motion.div>
          ))}

          <Reveal delay={0.24} className={styles.imageCol}>
            <Parallax inset ratio="3 / 4" speed={0.16}>
              {/* photo crossfades to match the hovered/active paragraph */}
              <div className={styles.photoStack}>
                {PARAS.map((p, i) => (
                  <img
                    key={p.n}
                    src={p.img}
                    alt=""
                    aria-hidden
                    className={styles.photo}
                    style={{ opacity: active === i ? 1 : 0 }}
                  />
                ))}
              </div>
            </Parallax>
            <div className={styles.photoScrim} aria-hidden />
            <div className={styles.imageBtn}>
              <MagneticButton label="Learn More About Us" theme="dark" small />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
