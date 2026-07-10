"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import styles from "./Blog.module.css";
import { BLOG } from "@/lib/blog";
import Reveal from "./Reveal";

const FEATURED = BLOG[0];
// four adjacent stories in the "Latest post" column — a tight, editorial
// count that matches the reference layout rather than a long rail.
const RECENT = BLOG.slice(1, 5);

// Human-friendly label for the article's category. The data model calls
// press hits "inclusion"; readers see "Coverage" instead.
const CATEGORY_LABEL: Record<string, string> = {
  feature: "Latest",
  review: "Review",
  news: "News",
  inclusion: "Coverage",
};

export default function Blog() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const imgY = useTransform(scrollYProgress, [0, 1], [-22, 22]);

  const category = CATEGORY_LABEL[FEATURED.category] ?? FEATURED.category;

  return (
    <section
      ref={sectionRef}
      className={styles.section}
      id="blog"
      data-nav-theme="light"
    >
      <span className={styles.eyebrow}>Blog</span>

      <Reveal className={styles.featuredReveal}>
        <a
          className={styles.featured}
          href={FEATURED.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <div className={styles.featuredInner}>
            <div className={styles.featuredMedia}>
              <motion.img
                src={FEATURED.image}
                alt={FEATURED.title}
                draggable={false}
                loading="lazy"
                style={{ y: imgY, scale: 1.14 }}
              />
            
              <div className={styles.featuredScrim} aria-hidden />
              <span className={styles.categoryPill}>{category}</span>
              <div className={styles.featuredCaption}>
                <span className={styles.featuredMeta}>
                  <span>{FEATURED.dateLabel}</span>
                  <span className={styles.metaDot} aria-hidden>
                    ·
                  </span>
                  <span>{FEATURED.source}</span>
                </span>
                <h3 className={styles.featuredTitle}>{FEATURED.title}</h3>
                <p className={styles.featuredExcerpt}>{FEATURED.excerpt}</p>
                {/* Read-more CTA lives INSIDE the frosted caption panel —
                    same card, no extra element to click. Pure visual;
                    the wrapping <a> handles navigation. */}
                <span className={styles.featuredCta} aria-hidden>
                  <span className={styles.ctaLabel}>Read the Story</span>
                  <svg
                    className={styles.ctaArrow}
                    viewBox="0 0 32 10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M0 5 H26" />
                    <path d="M22 1 L26 5 L22 9" />
                  </svg>
                </span>
              </div>
            </div>
          </div>
        </a>
      </Reveal>

      <div className={styles.rail}>
        <h2 className={styles.railHeading}>Latest post</h2>

        {/* Stagger the four rows in — 60ms between items keeps the cascade
            in Emil's 30–80ms window, so the list reads together without
            feeling like it's queuing up one at a time. */}
        <motion.ul
          className={styles.railList}
          aria-label="More news"
          initial="hidden"
          whileInView="shown"
          viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
          variants={{
            hidden: {},
            shown: { transition: { staggerChildren: 0.06, delayChildren: 0.12 } },
          }}
        >
          {RECENT.map((item) => (
            <motion.li
              key={item.slug}
              className={styles.railItem}
              variants={{
                hidden: { opacity: 0, y: 18, filter: "blur(6px)" },
                shown: {
                  opacity: 1,
                  y: 0,
                  filter: "blur(0px)",
                  transition: { duration: 0.75, ease: [0.23, 1, 0.32, 1] },
                },
              }}
            >
              <a
                className={styles.railLink}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className={styles.railThumb}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image}
                    alt=""
                    draggable={false}
                    loading="lazy"
                  />
                </span>
                <span className={styles.railBody}>
                  <span className={styles.railTitle}>{item.title}</span>
                  <span className={styles.railMeta}>
                    <span>{item.dateLabel}</span>
                    <span className={styles.metaDot} aria-hidden>
                      ·
                    </span>
                    <span>{item.source}</span>
                  </span>
                </span>
              </a>
            </motion.li>
          ))}
        </motion.ul>

        {/* Read-more sits at the foot of the rail card so the two CTAs
            (featured card + rail card) mirror each other structurally —
            one call to action per surface. */}
        <Link
          href="/blog"
          className={styles.railCta}
          aria-label="Read all posts from the Maginhawa blog"
        >
          <span className={styles.ctaLabel}>Read All Posts</span>
          <svg
            className={styles.ctaArrow}
            viewBox="0 0 32 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M0 5 H26" />
            <path d="M22 1 L26 5 L22 9" />
          </svg>
        </Link>
      </div>
    </section>
  );
}
