"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import styles from "./Blog.module.css";
import { BLOG } from "@/lib/blog";
import Reveal from "./Reveal";

// The Cover Wall shows exactly three stories: the lead runs double width,
// two singles sit beneath it.
const COVERS = BLOG.slice(0, 3);

export default function Blog() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  // gentle scroll drift inside the featured cover only — the over-scan
  // scale keeps the pan from exposing the frame edges
  const imgY = useTransform(scrollYProgress, [0, 1], [-18, 18]);

  return (
    <section
      ref={sectionRef}
      className={styles.section}
      id="blog"
      data-nav-theme="light"
    >
      <div className={styles.head}>
        <span className={styles.eyebrow}>Blog</span>

        <Link
          href="/blog"
          className={styles.headCta}
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

      <div className={styles.wall}>
        {COVERS.map((post, i) => {
          const featured = i === 0;
          return (
            <Reveal
              key={post.slug}
              delay={i * 0.08}
              className={
                featured ? `${styles.cover} ${styles.coverFeatured}` : styles.cover
              }
            >
              <a
                className={styles.coverLink}
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {featured ? (
                  <motion.img
                    className={styles.coverImg}
                    src={post.image}
                    alt=""
                    draggable={false}
                    loading="lazy"
                    style={{ y: imgY, scale: 1.12 }}
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className={styles.coverImg}
                    src={post.image}
                    alt=""
                    draggable={false}
                    loading="lazy"
                  />
                )}

                <span className={styles.coverScrim} aria-hidden />

                <span className={styles.coverMeta}>
                  <span className={styles.coverSource}>{post.source}</span>
                  <span className={styles.coverDate}>{post.dateLabel}</span>
                </span>

                <span className={styles.coverCaption}>
                  <h3 className={styles.coverTitle}>{post.title}</h3>
                  <span className={styles.coverRule} aria-hidden />
                  <span className={styles.coverExcerpt}>{post.excerpt}</span>
                  {featured && (
                    // visual only — the whole cover is the link
                    <span className={styles.coverCta} aria-hidden>
                      <span className={styles.ctaLabel}>Read More</span>
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
                  )}
                </span>
              </a>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
