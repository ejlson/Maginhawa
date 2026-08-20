"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import styles from "./PillCta.module.css";
import { useMagnet } from "@/lib/useMagnet";

/* ═══════════════════ THE HOUSE ACTION ═══════════════════════════════════
   A pill and a disc that close on each other as the pointer arrives, with
   the whole control drifting toward it.

   THE GEOMETRY IS IN PillCta.module.css and the note there is the one to
   read: how the two cells travel, why the clip and the two translations are
   one equation rather than three numbers, and how the join is filleted into
   a fusing neck by #cta-fuse (GlassFilters.tsx).

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

type Common = {
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

/* ── PRESENTATIONAL: THE CONTROL'S FACE, NOT THE CONTROL ──
   /blog's featured lede is a WHOLE-CARD anchor, and an <a> inside an <a> is
   invalid — the browser closes the outer one and the card silently stops
   being one link. So this mode renders the identical geometry as spans and
   lets the card carry the href, which is exactly the trade Blog.tsx's own
   lede card already makes with its "Read More" (see the note beside it).

   IT IS aria-hidden BY CONSTRUCTION. The enclosing link is already named by
   the headline; announcing "Read the story, link" after it would offer the
   same destination twice. A presentational pill has no interactive content
   of its own, so nothing focusable is being hidden.

   THE HOVER STILL HAS TO REACH IT. `.cta:hover` never fires for a span the
   pointer only passes near, so the CARD's hover drives the close instead —
   put `data-cta-hover` on the enclosing link. See the rules at the foot of
   PillCta.module.css. */
/* ── FORM MODE: THE SAME CONTROL, AS A REAL <button> ──
   The contact form's submit is this control now, so `type` renders a
   <button> instead of a <Link>. It is a third arm of the union rather than
   a `as` prop because the three modes take mutually exclusive inputs: a
   link needs an href, a submit must NOT have one, and a presentational pill
   has neither. Spelling that as a union means passing both is a type error
   at the call site rather than a silently ignored prop.

   IT IS NOT PRESENTATIONAL. A submit button is genuinely interactive and
   genuinely focusable, so it keeps its accessible name and never takes the
   aria-hidden the presentational arm carries. */
type Props =
  | (Common & { href: string; presentational?: false; type?: never })
  | (Common & { href?: never; presentational: true; type?: never })
  | (Common & {
      href?: never;
      presentational?: false;
      type: "submit" | "button";
      /* ⚠️ ONLY THE FORM ARM TAKES THIS. A link cannot be disabled — the
         HTML attribute does nothing on an <a> — and a presentational pill
         was never interactive to begin with, so offering `disabled` on
         either would be a prop that silently does nothing. The contact
         form uses it to hold the button while a message is in flight, which
         is what stops a second press sending the enquiry twice. */
      disabled?: boolean;
    });

export default function PillCta(props: Props) {
  const {
    children,
    "aria-label": ariaLabel,
    className,
    tone = "default",
    size = "default",
    magnet: magnetOpts = MAGNET,
  } = props;
  const { hostRef, magnetic, x, y } = useMagnet<HTMLSpanElement>(magnetOpts);

  const ctaClass = [
    styles.cta,
    tone === "accent" && styles.accent,
    tone === "cream" && styles.cream,
    tone === "saffron" && styles.saffron,
    size === "large" && styles.large,
  ]
    .filter(Boolean)
    .join(" ");

  const cells = (
    <>
      {/* ── THE SHAPE LAYER — the two cells, and NOTHING ELSE ──
          Both bodies live under one alpha threshold so the join between
          them fillets into a fusing neck instead of crossing as two arcs.
          The type and the arrow are deliberately outside it: a threshold
          run over a glyph eats its thin strokes and stairs its curves.

          TWO NESTED SPANS, not one. `.cells` carries the threshold (a
          static SVG filter) and `.field` carries the blur — which has to
          be a CSS length so it can scale with --cta-h, and an SVG
          primitive's stdDeviation cannot. See the note in the
          stylesheet. */}
      <span className={styles.cells} aria-hidden>
        <span className={styles.field}>
          {/* the pill body, clipped back to the label at rest */}
          <span className={styles.body} />
          {/* the disc's fill — its arrow rides in .disc below, unfiltered */}
          <span className={styles.discCell} />
        </span>
      </span>
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
    </>
  );

  return (
    <span
      ref={hostRef}
      className={[styles.host, className].filter(Boolean).join(" ")}
      aria-hidden={props.presentational || undefined}
    >
      {/* no style prop at all when the magnet is off, so the computed
          transform stays `none` rather than an identity matrix */}
      <motion.span
        className={styles.magnet}
        style={magnetic ? { x, y } : undefined}
      >
        {props.presentational ? (
          <span className={ctaClass}>{cells}</span>
        ) : props.type ? (
          <button
            type={props.type}
            className={ctaClass}
            aria-label={ariaLabel}
            disabled={props.disabled}
            /* the pill's own hover/press choreography reads from this, and
               so does the cursor — see .cta:disabled in the stylesheet */
            data-disabled={props.disabled || undefined}
          >
            {cells}
          </button>
        ) : (
          <Link href={props.href} className={ctaClass} aria-label={ariaLabel}>
            {cells}
          </Link>
        )}
      </motion.span>
    </span>
  );
}
