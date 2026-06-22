"use client";

import { useState } from "react";
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
  const [active, setActive] = useState(0);

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

        <div className={styles.body}>
          <div className={styles.textStack}>
            {PARAS.map((p, i) => (
              <Reveal key={p.n} delay={i * 0.08}>
                <div
                  className={`${styles.col} ${active === i ? styles.colActive : ""}`}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  tabIndex={0}
                >
                  <div className={styles.colHead}>
                    <span className={styles.num} aria-hidden>
                      {p.n}
                    </span>
                    <span className={styles.title}>{p.title}</span>
                  </div>
                  <p className={styles.colBody}>{p.body}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal className={styles.imageCol} delay={0.16}>
            <Parallax inset speed={0.16} className={styles.imgFrameFull}>
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
