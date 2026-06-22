"use client";

import { useRef } from "react";
import styles from "./Blog.module.css";
import Parallax from "./Parallax";
import Reveal from "./Reveal";
import RevealText from "./RevealText";
import MagneticButton from "./MagneticButton";
import { FEATURED_BLOG, TOP_THREE } from "@/lib/blog";
import { useRouteTransition } from "./PageTransition";

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{ transform: direction === "left" ? "rotate(180deg)" : "none" }}
    >
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}

export default function Blog() {
  const navigate = useRouteTransition();
  const railRef = useRef<HTMLUListElement>(null);

  const scrollRail = (dir: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) return;
    const card = rail.querySelector<HTMLElement>("li");
    const cardWidth = card?.offsetWidth ?? 280;
    const gap = parseFloat(getComputedStyle(rail).columnGap) || 18;
    rail.scrollBy({ left: dir * (cardWidth + gap), behavior: "smooth" });
  };

  return (
    <section className={styles.section} id="blog">
      <div className="container">
        <div className={styles.head}>
          <Reveal className={styles.eyebrow} as="span">
            (Blog)
          </Reveal>
          <h2 className={styles.title}>
            <span className={styles.spacer} aria-hidden />
            <RevealText
              text="Explore the latest stories, openings, and ideas shaping the Maginhawa Group."
              stagger={0.018}
            />
          </h2>
        </div>

        <Reveal>
          <a
            className={styles.featured}
            href={FEATURED_BLOG.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Parallax
              inset
              ratio="16 / 10"
              speed={0.14}
              className={styles.featuredMedia}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={FEATURED_BLOG.image} alt={FEATURED_BLOG.title} />
            </Parallax>
            <div className={styles.featuredBody}>
              <span className={styles.featuredTag}>
                <span className={styles.latestMark}>Latest</span>
                <span className={styles.tagMuted}>
                  {" "}· {FEATURED_BLOG.dateLabel} · {FEATURED_BLOG.source}
                </span>
              </span>
              <h3 className={styles.featuredTitle}>{FEATURED_BLOG.title}</h3>
              <p className={styles.featuredExcerpt}>{FEATURED_BLOG.excerpt}</p>
              <span className={styles.featuredLink}>
                Read the story <span aria-hidden>→</span>
              </span>
            </div>
          </a>
        </Reveal>

        <Reveal>
          <div className={styles.railWrap} aria-label="More blog entries">
            <button
              type="button"
              className={`${styles.railArrow} ${styles.railArrowLeft}`}
              onClick={() => scrollRail(-1)}
              aria-label="Scroll blog entries left"
            >
              <Chevron direction="left" />
            </button>

            <ul ref={railRef} className={styles.rail}>
              {TOP_THREE.map((item) => (
                <li key={item.slug} className={styles.cardItem}>
                  <a
                    className={styles.card}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <div className={styles.cardMedia}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.image} alt={item.title} draggable={false} />
                    </div>
                    <div className={styles.cardOverlay}>
                      <span className={styles.cardMeta}>
                        {item.dateLabel} · {item.source}
                      </span>
                      <h3 className={styles.cardTitle}>{item.title}</h3>
                    </div>
                  </a>
                </li>
              ))}
            </ul>

            <button
              type="button"
              className={`${styles.railArrow} ${styles.railArrowRight}`}
              onClick={() => scrollRail(1)}
              aria-label="Scroll blog entries right"
            >
              <Chevron direction="right" />
            </button>
          </div>
        </Reveal>

        <Reveal>
          <div className={styles.viewAllWrap}>
            <MagneticButton
              label="View all our blogs"
              theme="light"
              onClick={() => navigate("/blog")}
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
