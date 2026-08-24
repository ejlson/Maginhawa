"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useTransform,
  type Variants,
} from "framer-motion";
import styles from "./Footer.module.css";
import PillCta from "./PillCta";
import { useRouteTransition } from "./PageTransition";
import { CONTACT, SOCIALS } from "@/lib/contact";
import { JUMP, lenisRef } from "@/lib/SmoothScroll";

const EASE = [0.22, 1, 0.36, 1] as const;

/* ══════════ THE CLOSE ARRIVES, IT NO LONGER JUST APPEARS ══════════

   The footer's top band — the mark, the line under it and the invitation —
   had no entrance of any kind. Only the wordmark at the very bottom did.
   That is what made the end of the home page its flattest stretch:
   measured at 1440×900 with the stepped probe, the band scrollY
   6200 → 6400 scored a mean motion energy of 1.7 against a page mean near
   300, and the pixel probe independently found the same 360px as the only
   flat run on the page. The film above had finished resolving and nothing
   below it had anything to do.

   ⚠️ IT IS SCRUBBED RATHER THAN TRIGGERED, AGAINST THIS SITE'S USUAL RULE
   that a lockup shorter than a screen should be timed. The reason is the
   geometry of the last screen and it is specific: the document's maximum
   scroll IS the footer's own top edge, so the band travels from the foot of
   the window to a third of the way up it and THE PAGE THEN STOPS. A timed
   reveal fired on the crossing would still be running when the reader hits
   the bottom of the document and the scroll refuses to go further — the
   animation finishing against a wall the reader can feel. Tied to the
   scroll, it is simply complete when the page is.

   THE SLOTS, and they overlap so the band reads as one object settling
   rather than three separate arrivals:
       mark + line   [0.06, 0.52]
       invitation    [0.20, 0.70]
       the pill      [0.34, 0.88]
   measured on the band's own approach — its top edge from the foot of the
   window (0) to 28% of the way up it (1), which at 1440×900 is scrollY
   5814 → 6462 and covers the whole of the flat run.

   THE FADE CLEARS AT 55% OF EACH SLOT, the same split the reading column
   uses (AboutSplit's READ_INK) and for the same reason: legible early, then
   still moving. On a dark ground it matters more — cream type at half
   opacity on maroon is not half-read, it is unread. */
const CLOSE_OFFSET: ["start end", "start 0.28"] = ["start end", "start 0.28"];
const CLOSE_MARK: [number, number] = [0.06, 0.52];
const CLOSE_INVITE: [number, number] = [0.2, 0.7];
const CLOSE_CTA: [number, number] = [0.34, 0.88];
const CLOSE_INK = 0.55;
/* 24px, the page's rise — AboutSplit's READ_RISE and Reveal.tsx's 28 are
   the two the site already runs; this band sits between two of them. */
const CLOSE_RISE = 24;
const closeInk = (slot: [number, number]): [number, number] => [
  slot[0],
  slot[0] + (slot[1] - slot[0]) * CLOSE_INK,
];

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

   A second and a quarter, slower than anything else on the page, and once
   only (it was a flat second until the pass that slowed the site — Reveal's
   wipe is 1.15s now, and this has to stay the longest to keep the claim in
   this sentence true). This
   is the terminal element — the reader has arrived, and nothing follows it
   that a replay could belong to. */
const WORDMARK_MASK: Variants = {
  hidden: { clipPath: "inset(100% 0% 0% 0%)" },
  shown: {
    clipPath: "inset(0% 0% 0% 0%)",
    transition: { duration: 1.25, ease: EASE },
  },
};

const WORDMARK_RISE: Variants = {
  hidden: { y: "30%" },
  shown: { y: "0%", transition: { duration: 1.25, ease: EASE } },
};

/* Reduced motion keeps the arrival and drops every pixel of travel — and
   notably drops the MASK too, not just the rise. A clip opening is still an
   edge crossing the screen; only the fade is honestly motionless. */
const WORDMARK_FADE: Variants = {
  hidden: { opacity: 0 },
  shown: { opacity: 1, transition: { duration: 0.65, ease: EASE } },
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

// The legal routes. Kept as their own list rather than appended to EXPLORE:
// that column is wayfinding for someone deciding where to eat, and these are
// reference documents someone goes looking for on purpose. Different job,
// different row (see .bottomRow below).
const LEGAL: FootLink[] = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
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

  /* ⚠️ GATED ON MOUNT, and this is a correctness rule rather than a
     nicety — it is the one PressWall.tsx and Blog.tsx both spell out, and
     leaving it off shipped a real fault for one revision.

     Framer server-renders a motion value at its progress-0 reading, and
     progress 0 here means `opacity: 0`. So the FIRST version of this band
     went out in the server's HTML as
     `style="opacity:0;transform:translateY(24px)"` — verified in the raw
     response — which is invisible until a scroll listener attaches. With
     JavaScript off, or on any load where hydration fails, the page's
     contact invitation and its "Get in touch" pill would simply not be
     there, silently and with nothing in the console.

     Holding the styles off until after mount makes the RESTING state the
     one that ships. The band is plain type on a plain ground with no
     offset in its stylesheet, so the no-JS reader gets it whole. */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  /* the closing band's arrival — see CLOSE_OFFSET for why it is scrubbed */
  const topRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: closing } = useScroll({
    target: topRef,
    offset: CLOSE_OFFSET,
  });
  const markOpacity = useTransform(closing, closeInk(CLOSE_MARK), [0, 1]);
  const markY = useTransform(closing, CLOSE_MARK, [CLOSE_RISE, 0]);
  const inviteOpacity = useTransform(closing, closeInk(CLOSE_INVITE), [0, 1]);
  const inviteY = useTransform(closing, CLOSE_INVITE, [CLOSE_RISE, 0]);
  const ctaOpacity = useTransform(closing, closeInk(CLOSE_CTA), [0, 1]);
  const ctaY = useTransform(closing, CLOSE_CTA, [CLOSE_RISE, 0]);
  /* ⚠️ REDUCED MOTION TAKES NONE OF IT AND GETS NO FALLBACK REVEAL EITHER.
     Withholding the styles leaves the band simply present, which is the
     correct reduced-motion answer and needs no second path — and is the
     same state the un-mounted server render ships. */
  const closeStyle = (opacity: typeof markOpacity, y: typeof markY) =>
    reduce || !mounted ? undefined : { opacity, y };

  // Lenis owns the scroll, so window.scrollTo would fight it — go through the
  // shared instance when it exists and fall back to native smooth scrolling
  // (e.g. before hydration, or with Lenis disabled for reduced motion).
  const scrollToTop = () => {
    // JUMP, not the constructor's defaults — it no longer has any, because
    // the wheel path was reading them too (see lib/SmoothScroll). Back-to-top
    // from the end of a 20,000px page is the longest journey on the site and
    // the one the eased in-out was chosen for.
    if (lenisRef.current) lenisRef.current.scrollTo(0, { ...JUMP });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className={styles.footer} data-entrance="scope">
      {/* TOP BAND — mark | blurb | invitation. Shares one grid with the links
          band below it, so the blurb sits over "Back to top" and the
          invitation sits over the columns. */}
      <div className={styles.top} ref={topRef}>
        {/* The source PNG is a BLACK line drawing on transparent, so dropping
            it straight onto the maroon footer rendered it all but invisible.
            Masking with it and painting cream THROUGH the mask gives the mark
            the exact palette colour rather than a filter approximation. */}
        {/* ⚠️ THE TRANSFORM IS ON THE <Link>, NOT ON `.mark` INSIDE IT. The
            mark is a mask painting cream through a PNG; a transform on the
            painted span is a transform on the mask's own box, and the glyph
            would travel out from under its own window. The link is the
            band's grid cell and moving it moves the whole cell. */}
        <motion.div style={closeStyle(markOpacity, markY)}>
          <Link href="/" className={styles.markLink} aria-label="Maginhawa Group — home">
            <span className={styles.mark} aria-hidden />
          </Link>
        </motion.div>

        <motion.p
          className={styles.blurb}
          style={closeStyle(markOpacity, markY)}
        >
          Filipino at heart, pan-Asian and Caribbean by kitchen.
        </motion.p>

        <div className={styles.invite}>
          <motion.h2
            className={styles.inviteTitle}
            style={closeStyle(inviteOpacity, inviteY)}
          >
            Got any questions? Contact us.
          </motion.h2>
          {/* THE HOUSE ACTION, replacing the footer's bespoke capsule.
              This was `Link.inviteCta` — its own cream pill with an inline
              arrow INSIDE the capsule and an inset-recess hover, the last
              one-off button on the home page. It now speaks the site
              grammar: PillCta, cream on the dark ground, detached disc at
              rest with the house fuse-on-hover close. The label stays
              sentence case in JSX; `.cta`'s text-transform sets the caps,
              exactly as the hero's call site does. The scroll scrub still
              drives the motion wrapper OUTSIDE PillCta's host, which is
              safe — the host is never transformed by the control
              itself. */}
          <motion.div style={closeStyle(ctaOpacity, ctaY)}>
            <PillCta href="/contact" tone="cream">
              Get in touch
            </PillCta>
          </motion.div>

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
            <h3>Explore</h3>
            <ul>
              {EXPLORE.map((i) => (
                <li key={i.label}>
                  <FootLinkA link={i} />
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.col}>
            <h3>Contact Us</h3>
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
            <h3>Follow Us</h3>
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
        {/* NO YEAR IN THE COPYRIGHT LINE, AND THAT IS DELIBERATE.
            `new Date().getFullYear()` in here is the classic static-export
            hydration bug: the HTML is generated once at build time and
            carries the build's year, then the browser hydrates with the
            CURRENT year, and on 1 January every deployed page mismatches
            until someone rebuilds. A year is optional in a UK copyright
            notice anyway — the right arises automatically — so the honest
            fix is to not claim a date this build cannot know. */}
        <span>© Maginhawa Group</span>

        {/* THE LEGAL ROW. These two routes are reachable from nowhere else
            on the site — they are deliberately absent from the nav, the
            menu overlay and the Explore column, because a privacy notice
            that competes with "Restaurants" for a reader's attention is
            mis-weighted. The footer's bottom row is where a reader looks
            for them and the only place they need to be. */}
        <nav className={styles.legal} aria-label="Legal">
          {LEGAL.map((i) => (
            <FootLinkA key={i.label} link={i} />
          ))}
        </nav>

        <div>
          <span>Website designed by </span>
          <span className={styles.developer}>EJ</span>
        </div>
      </div>
    </footer>
  );
}
