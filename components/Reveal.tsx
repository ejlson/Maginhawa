"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";

type RevealProps = {
  children: React.ReactNode;
  /** stagger delay in seconds (30–80ms between siblings feels right) */
  delay?: number;
  /** initial vertical offset in px — defaults to 28 (the shared home rise) */
  y?: number;
  className?: string;
  /* "h1" joined this union when /contact's wordmark became the page's
     heading rather than a second-level one — see Contact.tsx. The list is
     explicit rather than `keyof JSX.IntrinsicElements` on purpose: a
     Reveal is a block that fades in, and the handful of elements that is
     ever legitimately true for is worth stating. */
  as?: "div" | "span" | "li" | "p" | "h1" | "h2" | "section";
  /** if false, reveal replays every time the element re-enters */
  once?: boolean;
  /**
   * Corner radius in px. When set, the element reveals by WIPING — a
   * clip-path inset opening upward with this radius — instead of rising and
   * de-blurring. Pass the radius of whatever the picture should rhyme with;
   * About's frames pass 28, the venue card's radius, so the chapter reads as
   * cut from the same stock as the grid above it.
   *
   * The two entrances are deliberately EXCLUSIVE rather than additive. A
   * picture that rises, de-blurs AND wipes at once is three ideas competing
   * over 800ms, and the wipe is the one that carries meaning here — the
   * others just make it late.
   */
  clip?: number;
};

/**
 * Scroll-triggered reveal — the editorial "settles into view" feel.
 * Follows Emil's principles: strong ease-out curve, animate transform +
 * opacity only, honour reduced motion. A whisper of blur bridges the
 * fade so the two states never look like separate objects overlapping.
 */
export default function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
  as = "div",
  once = true,
  clip,
}: RevealProps) {
  const shouldReduce = useReducedMotion();

  /* THE WIPE. `inset(100% 0 0 0)` is a box clipped to nothing from the top
     edge down, opening to `inset(0 0 0 0)` — the picture is uncovered from
     the bottom up, travelling in the same direction the page is scrolling.

     THE RADIUS RESOLVES TO SQUARE, and that is the whole idea rather than a
     compromise. It starts at the radius passed in (About passes 28, the
     venue card's) and animates to 0, so the picture arrives wearing the
     corner of the grid the reader has just left and settles into its own
     square one. A rhyme that resolves, not a borrowed shape kept.

     It also has to be this way round. These frames are DELIBERATELY square
     — see the note in AboutIntro.module.css — so holding 28px at the end
     would quietly round two pictures the corners were explicitly taken off.

     BOTH KEYFRAMES MUST NAME `round`, even the 0 one. A clip-path only
     interpolates against another clip-path of the same shape function and
     arity: `inset(100% 0 0 0 round 28px)` → `inset(0% 0 0 0)` does not
     animate at all, it cuts on the first frame. It fails silently and looks
     like the transition simply did not fire.

     No opacity on the wipe. Fading a clipped box softens the revealed edge,
     which reads as a dissolve; a hard edge travelling reads as a cut. */
  const wipe: Variants = {
    hidden: { clipPath: `inset(100% 0 0 0 round ${clip}px)` },
    shown: {
      clipPath: "inset(0% 0 0 0 round 0px)",
      transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1], delay },
    },
  };

  const variants: Variants = shouldReduce
    ? {
        hidden: { opacity: 0 },
        shown: {
          opacity: 1,
          transition: { duration: 0.4, ease: "easeOut", delay },
        },
      }
    : clip !== undefined
      ? wipe
      : {
        hidden: { opacity: 0, y, filter: "blur(8px)" },
        shown: {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          transition: {
            // the rise settles on a gentle spring — smooth with a whisper of
            // bounce (the Apple/Emil feel); opacity + blur ride a clean
            // ease-out so the fade and de-blur never overshoot
            y: { type: "spring", stiffness: 150, damping: 19, mass: 1, delay },
            opacity: { duration: 0.7, ease: [0.23, 1, 0.32, 1], delay },
            filter: { duration: 0.8, ease: [0.23, 1, 0.32, 1], delay },
          },
        },
      };

  const Component = motion[as];
  return (
    <Component
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="shown"
      viewport={{ once, margin: "0px 0px -16% 0px" }}
      /* ⚠️ THE MARK THAT KEEPS THIS CONTENT FROM VANISHING WITHOUT JAVASCRIPT.
         `initial="hidden"` is written into the SERVER-RENDERED HTML as inline
         style — `opacity:0;filter:blur(8px);transform:translateY(28px)`, or a
         clip-path on the wipe — and `whileInView` is what removes it. No
         script, no observer, no removal: the markup is in the document,
         readable by a crawler, and invisible to a person.

         The counter-rule lives in the <noscript> block in app/layout.tsx and
         keys off this attribute alone, which is why it is a VALUE and not a
         bare flag: "rise" and "wipe" hide themselves with different
         properties, and a blanket reset of all four would take a hover zoom
         or a layout transform with it somewhere down the line.

         Anything else on the site that hides itself for an entrance can join
         by adding this attribute — components/Nav.tsx and the card
         photography in components/BlogIndex.tsx already have. */
      data-entrance={clip !== undefined ? "wipe" : "rise"}
    >
      {children}
    </Component>
  );
}
