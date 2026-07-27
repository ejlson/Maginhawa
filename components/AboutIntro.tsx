"use client";

import Image from "next/image";
import Link from "next/link";
import styles from "./AboutIntro.module.css";
import Reveal from "./Reveal";

/**
 * Editorial "who we are" chapter that follows the Press strip.
 *
 * A split-screen magazine spread (the Verta / Hypebeast reference):
 * LEFT — a tall photograph carrying a short display line and the est.
 * meta; RIGHT — the statement panel: the group's positioning sentence at
 * display scale, then an inset portrait beside a narrow column of body
 * copy, closing with the Our story link. Square corners throughout —
 * printed photography has no radius. Seated on the global grid's
 * middle-10 columns, same as the Discover grid above it.
 */
export default function AboutIntro() {
  return (
    <section className={styles.section} data-nav-theme="light">
      <div className={styles.spread}>
        {/* left page — full-height photography with the brand line over it */}
        <Reveal className={styles.photoPanel}>
          <div className={styles.photoFrame}>
            <Image
              className={styles.photo}
              src="/images/careers-team.jpg"
              alt="The Maginhawa family at work"
              fill
              sizes="(max-width: 900px) 100vw, 42vw"
            />
            {/* soft top scrim so the cream display line reads on any frame */}
            <div className={styles.photoScrim} aria-hidden />
            <h2 className={styles.photoLine}>
              Made with heritage,
              <br />
              served with heart.
            </h2>
            <span className={styles.photoMeta}>Est. 1987 — London</span>
          </div>
        </Reveal>

        {/* right page — the statement panel */}
        <div className={styles.panel}>
          <Reveal delay={0.08}>
            <p className={styles.statement}>
              A family of London restaurants that carries deep culinary
              tradition with a distinctly{" "}
              <em className={styles.highlight}>modern voice</em> —{" "}
              <em className={styles.highlight}>Filipino at heart</em>,
              pan-Asian and Caribbean by kitchen.
            </p>
          </Reveal>

          <Reveal delay={0.14} className={styles.panelBody}>
            <div className={styles.inset}>
              <Image
                className={styles.insetImg}
                src="/images/omarshah.jpeg"
                alt="Chef Omar Shah, founder of the Maginhawa Group"
                fill
                sizes="(max-width: 900px) 60vw, 20vw"
              />
            </div>

            <div className={styles.paras}>
              <p>
                Maginhawa began in 1987 as Chef Omar&apos;s family kitchen on
                Kentish Town Road. Nearly four decades on, the same family
                runs seven distinct dining rooms across London — each with
                its own voice, all serving from the same heart.
              </p>
              <p>
                The name means &ldquo;comfortable&rdquo; in Tagalog, and it
                is the brief for everything we do: food with deep roots,
                rooms that feel like home, and service that treats every
                guest as family.
              </p>

              <Link
                href="/about"
                className={styles.cta}
                aria-label="Read about Maginhawa Group"
              >
                <span className={styles.ctaLabel}>Our story</span>
                <svg
                  className={styles.ctaChevron}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
