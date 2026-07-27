"use client";

import Link from "next/link";
import styles from "./Footer.module.css";
import { useRouteTransition } from "./PageTransition";
import { CONTACT, SOCIALS } from "@/lib/contact";
import { lenisRef } from "@/lib/SmoothScroll";

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
  { label: "Careers", href: "/join-us" },
  { label: "Contact Us", href: "/contact" },
];

// real destinations only — mailto/tel hand off to the OS
const CONTACT_LINKS: FootLink[] = [
  { label: CONTACT.email, href: `mailto:${CONTACT.email}` },
  { label: CONTACT.phone, href: `tel:${CONTACT.phone.replace(/\s/g, "")}` },
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
          <h2 className={styles.inviteTitle}>Got any questions? Contact us</h2>
          {/* One link, two visual parts — a pill and a round arrow button.
              Kept as a single <Link> rather than two, so it isn't two
              controls pointing at the same destination. */}
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

      {/* NOT a Reveal. Reveal's in-view trigger shrinks the detection box by
          16% at the bottom, and now that the footer is exactly one screen the
          wordmark always sits inside that excluded band on short viewports —
          so on mobile it never fired and the wordmark stayed at opacity 0. */}
      <div className={styles.wordmarkReveal}>
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
        <svg
          className={styles.wordmark}
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
        </svg>
      </div>

      <div className={styles.bottomRow}>
        <span>© 2026 Maginhawa Group</span>
        <div>
          <span>By </span>
          <span className={styles.developer}>(EJ)</span>
        </div>
        {/* <span>By (EJ)</span> */}
      </div>
    </footer>
  );
}
