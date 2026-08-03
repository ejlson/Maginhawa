"use client";

import { useRef } from "react";
import Link from "next/link";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import styles from "./CareersTeaser.module.css";
import { JOBS } from "@/lib/jobs";
import Reveal from "./Reveal";

// The index shows the first four live roles; /careers carries the rest.
const SHOWN = JOBS.slice(0, 4);

const CULTURE: { image: string; label: string; copy: string }[] = [
  {
    image: "/images/careers-team.jpg",
    label: "Our Culture",
    copy: "We work hard, support each other, and celebrate every win.",
  },
  {
    image: "/blog/DSCF3035-web.jpg",
    label: "Grow With Us",
    copy: "From first job to head chef, we invest in your growth.",
  },
];

function ThinArrow() {
  return (
    <svg
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
  );
}

/**
 * Careers chapter — the wireframe spread: display heading top-left with
 * saffron emphasis, the caps lede beside it (drifting downward as the
 * page scrolls — a slow parallax beat), Chef Omar's philosophy
 * photograph right, two small culture squares bottom-left and the
 * openings table under the photograph.
 */
export default function CareersTeaser() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();

  // the lede rides with the scroll — travelling down its column while
  // the section passes through the viewport
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const drift = useTransform(scrollYProgress, [0, 1], [0, 140]);

  return (
    <section ref={ref} className={styles.section} data-nav-theme="light">
      <Reveal as="span" className={styles.eyebrow}>
        Careers
      </Reveal>

      <div className={styles.grid}>
        {/* ---------- heading, top-left ---------- */}
        <Reveal className={styles.headingWrap}>
          <h2 className={styles.heading}>
            Build <em className={styles.accent}>your future</em>.
            <br />
            Be part of <em className={styles.accent}>our story</em>.
          </h2>
        </Reveal>

        {/* ---------- the lede — starts on the heading's top line, then
            drifts down with the scroll ---------- */}
        <motion.div
          className={styles.ledeWrap}
          style={{ y: reduce ? 0 : drift }}
        >
          {/* <p className={styles.lede}>Good food starts with good people.</p>
          <p className={styles.lede}>
            We&rsquo;re a family with a shared purpose to feed, connect and
            grow.
          </p> */}
        </motion.div>

        {/* ---------- the philosophy photograph, right ---------- */}
        <Reveal className={styles.philoWrap}>
          <figure className={styles.philosophy}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/omarshah.jpeg"
              alt="Chef Omar plating in the kitchen"
              loading="lazy"
              draggable={false}
            />
            <span className={styles.philoScrim} aria-hidden />
            <figcaption className={styles.philoText}>
              <span className={styles.philoLabel}>Our Philosophy</span>
              <blockquote className={styles.philoQuote}>
                &ldquo;We look after our guests by looking after each
                other.&rdquo;
              </blockquote>
              <span className={styles.philoSig}>— Chef Omar</span>
            </figcaption>
          </figure>
        </Reveal>

        {/* ---------- two small culture squares, bottom-left ---------- */}
        <div className={styles.cultureRow}>
          {CULTURE.map((c, i) => (
            <Reveal key={c.label} delay={i * 0.08}>
              <figure className={styles.cultureCard}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.image} alt="" loading="lazy" draggable={false} />
                <span className={styles.cultureScrim} aria-hidden />
                <figcaption className={styles.cultureText}>
                  <span className={styles.cultureLabel}>{c.label}</span>
                  <span className={styles.cultureCopy}>{c.copy}</span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>

        {/* ---------- the openings table, under the photograph ---------- */}
        <div className={styles.openings}>
          <div className={styles.openingsHead}>
            <span className={styles.openingsLabel}>Current Openings</span>
            <Link href="/careers" className={styles.cta}>
              <span className={styles.ctaLabel}>See All Roles</span>
              <ThinArrow />
            </Link>
          </div>

          <ul className={styles.roleList} aria-label="Open roles">
            {SHOWN.map((job, i) => (
              <Reveal as="li" key={job.id} delay={i * 0.06}>
                <Link
                  href="/careers#open-roles"
                  className={styles.roleRow}
                  aria-label={`${job.title} at ${job.restaurantName} — read the details`}
                >
                  <span className={styles.roleTitle}>{job.title}</span>
                  <span className={styles.roleMeta}>
                    {job.restaurantName} · {job.location}
                  </span>
                  <span className={styles.roleApply}>
                    Apply
                    <ThinArrow />
                  </span>
                </Link>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
