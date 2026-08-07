/* HERO LAB — A THROWAWAY ROUTE, NOT PART OF THE SITE.
 *
 * Two directions on the SAME clip, one after the other, so the comparison is
 * about the design rather than about the footage:
 *
 *   A  the shipped hero + grain + a corner ramp. The cheap fix: it answers
 *      the measured legibility problem (cream at L 0.831 against a worst
 *      ground of L 0.341 = 2.25:1, under the 3:1 large-text floor) without
 *      touching the layout.
 *   B  the plate. An inset rounded frame on the page's own 12px measure, the
 *      wordmark set giant along the bottom and cropped by the frame, the
 *      identifying sentence demoted to small type at its right, one action.
 *
 * WHAT THIS ROUTE DOES NOT DO, so neither variant is judged on it: the real
 * hero carries a scroll parallax, a two-clip hard-cut cycle, reduced-motion
 * handling and a focus-visible pass. None of that is here. Whichever
 * direction wins gets rebuilt in components/Hero.tsx against all of it, and
 * this folder is deleted.
 *
 * Excluded from the nav and the sitemap; it is only reachable by URL.
 */
import styles from "./lab.module.css";

export const metadata = { robots: { index: false, follow: false } };

// the site hero's own first clip, so the frame is the one being argued about
const CLIP = "/videos/belly-hero.mp4";

function Film() {
  return (
    <div className={styles.film}>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        className={styles.video}
        src={CLIP}
        autoPlay
        muted
        loop
        playsInline
      />
      <div className={styles.grain} aria-hidden />
    </div>
  );
}

function Arrow() {
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

export default function HeroLab() {
  return (
    <main className={styles.page}>
      {/* ---------------- A ---------------- */}
      <p className={styles.tag}>
        A — shipped hero + grain + corner ramp
        <span className={styles.tagNote}>
          same layout, same type; only the film is treated
        </span>
      </p>
      <section className={styles.a}>
        <Film />
        <div className={styles.aRamp} aria-hidden />
        <div className={styles.aLockup}>
          <h1 className={styles.aLede}>
            <span className={styles.aClause}>Filipino at heart.</span>
            <span className={styles.aClause}>
              Seven London kitchens, pan-Asian and Caribbean.
            </span>
            <span className={styles.aClause}>Since 1987.</span>
          </h1>
          <div className={styles.bActions}>
            <a className={styles.bPill} href="/restaurants">
              Find a restaurant
            </a>
            <a className={styles.bLink} href="/restaurants">
              Book a table
            </a>
          </div>
        </div>
      </section>

      {/* ---------------- B ---------------- */}
      <p className={styles.tag}>
        B — the plate
        <span className={styles.tagNote}>
          wordmark set to the frame; the sentence becomes its caption
        </span>
      </p>
      <section className={styles.b}>
        <div className={styles.bPlate}>
          <Film />
          <div className={styles.bRamp} aria-hidden />
          <div />
          <div className={styles.bFoot}>
            {/* the wordmark IS the h1 here — it is the page's name and the
                word the Manifesto three chapters down translates */}
            <h1 className={styles.bMark}>Maginhawa</h1>
            <div className={styles.bCopy}>
              <p className={styles.bSentence}>
                Filipino at heart. Seven London kitchens, pan-Asian and
                Caribbean, run by the same family since 1987 — each room with
                its own menu, its own regulars and its own way of doing things.
              </p>
              <div className={styles.bActions}>
                <a className={styles.bPill} href="/restaurants">
                  Book a table
                </a>
                <span className={styles.bDisc}>
                  <Arrow />
                </span>
                <a className={styles.bLink} href="/restaurants">
                  Find a restaurant
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
