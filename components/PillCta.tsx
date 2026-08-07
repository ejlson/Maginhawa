"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import styles from "./PillCta.module.css";
import { useMagnet } from "@/lib/useMagnet";

/* ═══════════════════ THE HOUSE ACTION ═══════════════════════════════════
   A pill and a disc that close on each other as the pointer arrives, with
   the whole control drifting toward it.

   THE GEOMETRY IS IN PillCta.module.css and the note there is the one to
   read: what the SVG goo filter was, why it read as a blob at rest and as
   two pinched cells on hover, and why the merge is now an exact clip
   instead of a blurred threshold.

   ── WHY IT IS A COMPONENT ──
   The page asks for this control in three places and used to answer with
   three different buttons: the journal's archive link (this shape), About's
   "Read our story" (a sans pill with a drop shadow that lifted 2px on
   hover) and the closing frame's "Choose a restaurant" (a saffron pill with
   a long arrow beside it, no disc). They are one object now. A reader who
   has learned what this control does in the journal head knows what the
   other two do before reading them, which is the whole argument.

   ── THE THREE-ELEMENT NESTING IS LOAD-BEARING, not decoration ──
     .host    NEVER transformed — its border box is the control's REST
              rect, which is what the magnet's offset math measures from.
              Measuring the moving element instead makes the magnet its own
              input and it walks away from the pointer.
     .magnet  carries the spring transform.
     .cta     the <Link>. Rides inside the transform, so the hit area and
              the focus ring travel with the glyphs and the control is
              pressable at rest and at full pull alike. ═══ */

/* A QUIETER MAGNET THAN lib/useMagnet.ts's DEFAULTS, and it is the default
   here. Those defaults are the closing pill's as it was originally tuned —
   a button that is the last frame of the page and the only thing on its
   screen. This control now also shares a head with a display sentence it
   must not appear to be tugging at, so it is tuned for the tighter case:
   halving the pull and drawing the radius in from 1.6 half-diagonals to
   1.25 takes the peak displacement from ~14px to ~6px. Plainly alive under
   the pointer, not enough to read as the type moving.

   The looser numbers are still reachable per call site (`magnet` below) —
   nothing passes them today, because a control that behaves differently in
   three places is the thing this component exists to end. */
const MAGNET = { reach: 1.25, pull: 0.38, cap: 0.3 } as const;

type Props = {
  href: string;
  /** the label, in the control's own caps — "Read More", not "read more" */
  children: React.ReactNode;
  /** Only when the visible label is not the whole story. The journal head's
      pill reads "Read More" and means "read all the stories", which is a
      thing a screen reader has no picture to infer from. */
  "aria-label"?: string;
  /** the SEAT — grid area, margin, alignment. Owned by the chapter, never
      by this file; see the warning at the top of the stylesheet. */
  className?: string;
  /** "accent" is for the one instance standing on a photograph rather than
      on the cream page. */
  tone?: "default" | "accent" | "cream" | "saffron";
  /** the closing frame's pill is the page's last action and wants to be
   *  read from across a full-bleed film — see `.large` in the stylesheet */
  size?: "default" | "large";
  magnet?: { reach?: number; pull?: number; cap?: number };
};

export default function PillCta({
  href,
  children,
  "aria-label": ariaLabel,
  className,
  tone = "default",
  size = "default",
  magnet: magnetOpts = MAGNET,
}: Props) {
  const { hostRef, magnetic, x, y } = useMagnet<HTMLSpanElement>(magnetOpts);

  return (
    <span
      ref={hostRef}
      className={[styles.host, className].filter(Boolean).join(" ")}
    >
      {/* no style prop at all when the magnet is off, so the computed
          transform stays `none` rather than an identity matrix */}
      <motion.span
        className={styles.magnet}
        style={magnetic ? { x, y } : undefined}
      >
        <Link
          href={href}
          className={[styles.cta, tone === "accent" && styles.accent, tone === "cream" && styles.cream, tone === "saffron" && styles.saffron, size === "large" && styles.large]
            .filter(Boolean)
            .join(" ")}
          aria-label={ariaLabel}
        >
          {/* the pill body — decoration standing in for the control's
              background, and clipped back to the label at rest */}
          <span className={styles.body} aria-hidden />
          <span className={styles.label}>{children}</span>
          <span className={styles.disc}>
            <svg
              className={styles.arrow}
              viewBox="0 0 24 10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M3 5 H17" />
              <path d="M13 1 L17 5 L13 9" />
            </svg>
          </span>
        </Link>
      </motion.span>
    </span>
  );
}
