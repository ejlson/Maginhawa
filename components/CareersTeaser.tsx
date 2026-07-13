import Link from "next/link";
import styles from "./CareersTeaser.module.css";
import { JOBS } from "@/lib/jobs";
import Reveal from "./Reveal";

// The index shows the first four live roles; /join-us carries the rest.
const SHOWN = JOBS.slice(0, 4);

/**
 * Careers teaser — the Open-Roles Index. Instead of talking about
 * hiring, show it: a sidebar statement on the left, the actual open
 * roles as hairline rows on the right (the Awards & Recognition row
 * language), each a doorway into /join-us.
 */
export default function CareersTeaser() {
  return (
    <section className={styles.section} data-nav-theme="light">
      <div className={styles.grid}>
        {/* left column — the frame */}
        <div className={styles.side}>
          <Reveal as="span" className={styles.eyebrow}>
            Careers
          </Reveal>

          <Reveal>
            <h2 className={styles.statement}>
              <em className={styles.highlight}>We&rsquo;re hiring</em> across
              our kitchens, restaurants, and head office.
            </h2>
          </Reveal>

          <Reveal delay={0.08}>
            <Link href="/join-us" className={styles.cta}>
              <span className={styles.ctaLabel}>See All Roles</span>
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
          </Reveal>
        </div>

        {/* right column — the roles themselves */}
        <ul className={styles.roleList} aria-label="Open roles">
          {SHOWN.map((job, i) => (
            <Reveal as="li" key={job.id} delay={i * 0.06}>
              <Link
                href="/join-us#open-roles"
                className={styles.roleRow}
                aria-label={`${job.title} at ${job.restaurantName} — read the details`}
              >
                <span className={styles.roleTitle}>{job.title}</span>
                <span className={styles.roleMeta}>
                  {job.restaurantName} · {job.location}
                </span>
                <svg
                  className={styles.roleArrow}
                  viewBox="0 0 24 10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M0 5 H18" />
                  <path d="M14 1 L18 5 L14 9" />
                </svg>
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
