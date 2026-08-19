"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useInView, useReducedMotion, type Variants } from "framer-motion";
import styles from "./Footer.module.css";
import { useRouteTransition } from "./PageTransition";
import { CONTACT, SOCIALS } from "@/lib/contact";
import { lenisRef } from "@/lib/SmoothScroll";

const EASE = [0.22, 1, 0.36, 1] as const;

/* THE WORDMARK'S ENTRANCE. The letters rise out from behind their own
   baseline: the mask is the entrance, and the travel is only what makes them
   decelerate into it. Two layers, because one property cannot say both
   things — one clips to nothing at its bottom edge and opens upward, so the
   glyphs are uncovered from the baseline up instead of fading on in place;
   the svg inside it starts low and comes home.

   THE TRAVEL IS DELIBERATELY SHORTER THAN THE MASK — 30%, not 100%. A rise
   that matches the mask exactly is a rigid curtain: the letters sit still
   while a window slides off them. Undershooting it lets the type move
   against the opening edge, and that differential is the part that reads as
   weight settling rather than a panel being uncovered.

   A full second, slower than anything else on the page, and once only. This
   is the terminal element — the reader has arrived, and nothing follows it
   that a replay could belong to. */
const WORDMARK_MASK: Variants = {
  hidden: { clipPath: "inset(100% 0% 0% 0%)" },
  shown: {
    clipPath: "inset(0% 0% 0% 0%)",
    transition: { duration: 1, ease: EASE },
  },
};

const WORDMARK_RISE: Variants = {
  hidden: { y: "30%" },
  shown: { y: "0%", transition: { duration: 1, ease: EASE } },
};

/* Reduced motion keeps the arrival and drops every pixel of travel — and
   notably drops the MASK too, not just the rise. A clip opening is still an
   edge crossing the screen; only the fade is honestly motionless. */
const WORDMARK_FADE: Variants = {
  hidden: { opacity: 0 },
  shown: { opacity: 1, transition: { duration: 0.5, ease: EASE } },
};

// every label carries a real destination; internal routes go through the
// page-transition curtain (the Nav/Menu convention), externals open in a
// new tab
type FootLink = { label: string; href: string };

// Trimmed to a single wayfinding column. The footer used to carry five
// columns — one per section plus a full restaurant index — which duplicated
// the nav and the menu overlay for no benefit and made the block tall enough
// to need a viewport of its own.
const EXPLORE: FootLink[] = [
  { label: "Restaurants", href: "/restaurants" },
  { label: "About Us", href: "/about" },
  { label: "Blog", href: "/blog" },
  { label: "Careers", href: "/careers" },
  { label: "Contact Us", href: "/contact" },
];

// real destinations only — mailto/tel hand off to the OS. The phone row is
// dropped entirely while CONTACT.phone is null rather than rendered as dead
// text: a contact column is a list of ways to reach someone, and a line that
// reaches nobody is worse than a shorter list.
const CONTACT_LINKS: FootLink[] = [
  { label: CONTACT.email, href: `mailto:${CONTACT.email}` },
  ...(CONTACT.phone
    ? [
        {
          label: CONTACT.phone,
          href: `tel:${CONTACT.phone.replace(/\s/g, "")}`,
        },
      ]
    : []),
];

// internal links keep a real href (works without JS) but upgrade the click
// to the curtain transition; externals are plain new-tab anchors
function FootLinkA({ link }: { link: FootLink }) {
  const navigate = useRouteTransition();
  // mailto: / tel: hand off to the OS — opening them in a new tab leaves a
  // blank window behind, so they get a plain anchor with no target
  if (/^(mailto|tel):/.test(link.href)) {
    return <a href={link.href}>{link.label}</a>;
  }
  if (!link.href.startsWith("/")) {
    return (
      <a href={link.href} target="_blank" rel="noopener noreferrer">
        {link.label}
      </a>
    );
  }
  return (
    <a
      href={link.href}
      onClick={(e) => {
        e.preventDefault();
        navigate(link.href);
      }}
    >
      {link.label}
    </a>
  );
}

export default function Footer() {
  const reduce = useReducedMotion();

  /* THE OBSERVER AND THE MASK CANNOT BE THE SAME ELEMENT, and finding that
     out cost a probe run that reported the entrance simply never firing.
     Chromium folds an element's own `clip-path` into the geometry it hands
     IntersectionObserver: a box wearing `inset(100% 0 0 0)` reports
     intersectionRatio 0 no matter where it sits on the screen. MEASURED —
     0.000 clipped against 0.83→0.99 for the identical box with the clip
     stripped (scripts/probe-footer-wordmark.mjs). So a mask that gates
     itself on its own visibility is a deadlock: shut because it is not seen,
     unseen because it is shut. It fails silently and looks exactly like a
     trigger that was never wired up.

     Hence the split — this ref rides the OUTER wrapper, which is never
     clipped, and the mask lives on a child. Same reason the block below is
     not a <Reveal>: Reveal's viewport box shrinks 16% at the bottom, and the
     wordmark is the last thing on a footer exactly one screen tall, so it
     lived permanently inside the excluded band and never fired on short
     viewports. This one takes the plain box with no bottom margin — by the
     time the reader can see the wordmark the scroll has bottomed out and it
     is wholly on screen, so `amount: 0.5` always resolves. */
  const markRef = useRef<HTMLDivElement>(null);
  const markIn = useInView(markRef, { once: true, amount: 0.5 });

  // Lenis owns the scroll, so window.scrollTo would fight it — go through the
  // shared instance when it exists and fall back to native smooth scrolling
  // (e.g. before hydration, or with Lenis disabled for reduced motion).
  const scrollToTop = () => {
    if (lenisRef.current) lenisRef.current.scrollTo(0);
    else window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className={styles.footer}>
      {/* TOP BAND — mark | blurb | invitation. Shares one grid with the links
          band below it, so the blurb sits over "Back to top" and the
          invitation sits over the columns. */}
      <div className={styles.top}>
        {/* The source PNG is a BLACK line drawing on transparent, so dropping
            it straight onto the maroon footer rendered it all but invisible.
            Masking with it and painting cream THROUGH the mask gives the mark
            the exact palette colour rather than a filter approximation. */}
        <Link href="/" className={styles.markLink} aria-label="Maginhawa Group — home">
          <span className={styles.mark} aria-hidden />
        </Link>

        <p className={styles.blurb}>
          Filipino at heart, pan-Asian and Caribbean by kitchen.
        </p>

        <div className={styles.invite}>
          <h2 className={styles.inviteTitle}>Got any questions? Contact us.</h2>
          {/* One pill — label and arrow share a single cream capsule; hover
              widens the pill and deepens its recess (see Footer.module.css) */}
          <Link href="/contact" className={styles.inviteCta}>
            <span className={styles.ctaMain}>Get in touch</span>
            <span className={styles.ctaArrow} aria-hidden>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h13" />
                <path d="M13 6l6 6-6 6" />
              </svg>
            </span>
          </Link>

          {/* the direct line — papatom's closing move: for a relationship
              business the most confident CTA is a bare address and number,
              in plain sight rather than buried in the link columns */}
          {/* <div className={styles.inviteDirect}>
            <a
              className={styles.directLine}
              href={`mailto:${CONTACT.email}`}
            >
              {CONTACT.email}
            </a>
            <a
              className={styles.directLine}
              href={`tel:${CONTACT.phone.replace(/\s/g, "")}`}
            >
              {CONTACT.phone}
            </a>
          </div> */}
        </div>
      </div>

      <div className={styles.rule} />

      {/* LINKS BAND — brand | back to top | the three columns */}
      <div className={styles.links}>
        <span className={styles.brandName}>Maginhawa</span>

        <button type="button" className={styles.backToTop} onClick={scrollToTop}>
          Back to top
          <svg
            className={styles.backArrow}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M12 19V6" />
            <path d="M6 11l6-6 6 6" />
          </svg>
        </button>

        <div className={styles.cols}>
          <div className={styles.col}>
            <h4>Explore</h4>
            <ul>
              {EXPLORE.map((i) => (
                <li key={i.label}>
                  <FootLinkA link={i} />
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.col}>
            <h4>Contact Us</h4>
            <ul>
              {CONTACT_LINKS.map((i) => (
                <li key={i.label}>
                  <FootLinkA link={i} />
                </li>
              ))}
              <li className={styles.hours}>{CONTACT.officeHours.days}</li>
              <li className={styles.hours}>{CONTACT.officeHours.time}</li>
            </ul>
          </div>

          <div className={styles.col}>
            <h4>Follow Us</h4>
            <ul>
              {SOCIALS.map((s) => (
                <li key={s.label}>
                  {s.url ? (
                    <a href={s.url} target="_blank" rel="noopener noreferrer">
                      {s.label}
                    </a>
                  ) : (
                    // no confirmed profile yet — rendered as plain text rather
                    // than a link to nowhere (see lib/contact.ts)
                    <span className={styles.socialPending}>{s.label}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* The wrapper is the observer's seat and nothing else — it keeps the
          full bleed width and the `margin-top: auto` that seats the line, and
          it stays unclipped so it can be seen (see markIn above). The mask is
          the child; the rise is the svg inside that. Framer propagates the
          variant NAMES down, so the svg runs off the same latch rather than
          an observer of its own. */}
      <div ref={markRef} className={styles.wordmarkReveal}>
        <motion.div
          className={styles.wordmarkMask}
          variants={reduce ? WORDMARK_FADE : WORDMARK_MASK}
          initial="hidden"
          animate={markIn ? "shown" : "hidden"}
        >
          {/* Single-line, full-bleed wordmark.
              The numbers below are measured, not guessed: in Contralto at
              font-size 25, "MAGINHAWA" sets 127.9 units wide with a bounding
              box running 27 above and 6 below the baseline.
                · font-size 19 → natural width 97.2, so textLength="100" only
                  has to open the letterfit by ~0.35 units per gap. Positive
                  (never negative) so the glyphs are never crowded together,
                  and lengthAdjust="spacing" moves the letters without
                  distorting the letterforms themselves.
                · baseline y=21 clears the 20.5-unit cap height at the top, and
                  the 4.6 units of overshoot below the baseline land inside the
                  26-unit viewBox. The old two-line box was 37 tall with the
                  second baseline at 36, so it was slicing that overshoot off. */}
          <motion.svg
            className={styles.wordmark}
            variants={reduce ? undefined : WORDMARK_RISE}
            viewBox="0 0 100 22"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="Maginhawa"
          >
            <text
              className={styles.wline}
              x="0"
              y="21"
              fontSize="19"
              textLength="100"
              lengthAdjust="spacing"
            >
              MAGINHAWA
            </text>
          </motion.svg>
        </motion.div>
      </div>

      <div className={styles.bottomRow}>
        <span>Maginhawa Group</span>
        <div>
          <span>Website designed by </span>
          <span className={styles.developer}>EJ</span>
        </div>
        {/* <span>By (EJ)</span> */}
      </div>
    </footer>
  );
}
