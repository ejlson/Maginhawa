"use client";

import Link from "next/link";
import styles from "./ReadyCta.module.css";

/**
 * Ready-to-join CTA — a full-breath cream moment over a slowly roaming WebGL
 * lava lamp. The invitation reads small → big ("THE NEXT GREAT SERVICE" into a
 * large upright "STARTS WITH YOU"), all-caps and in mix-blend-mode difference
 * so the type inverts against the lava (the richardsancho.com effect); an
 * editorial link leads to careers.
 *
 * The section is taller than the viewport and the content pins (`.pin` is
 * sticky) so the text holds centred while the lava wanders behind it and, on
 * the way out, the Locations film slides up and fully covers the invitation.
 */
export default function ReadyCta() {
  return (
    <section
      className={styles.section}
      data-nav-theme="light"
      aria-label="Join the Maginhawa family"
    >
      <div className={styles.pin}>
        {/* The WebGL lava-lamp mesh is gone — it sat directly behind the
            eyebrow and made it hard to read, and the roaming colour field was
            the least editorial moment on the page. */}
        <div className={styles.inner}>
          <h2 className={styles.title}>
            <span className={styles.titleSmall}>The next great service</span>
            <em className={styles.titleBig}>starts with you</em>
          </h2>

          <Link href="/join-us" className={styles.cta} data-cta-blob-target>
            <span className={styles.ctaLabel}>Join Us</span>
            <svg
              className={styles.ctaArrow}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
