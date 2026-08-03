"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import styles from "./Interlude.module.css";

// the site's shared enter curve
const EASE = [0.22, 1, 0.36, 1] as const;

/* THIS BAND OWNS ITS PICTURE. It used to be `BLOG[0].image` — the leading
   story's own cover, so the band and the first card in the reel below showed
   the same photograph and the journal "arrived already introduced".

   That coupling is gone twice over. The home strip is no longer the top of
   the feed (it is a chosen eight, by slug — see HOME_SLUGS in Blog.tsx), so
   `BLOG[0]` had stopped being the card underneath it; and this photograph is
   now chosen for this band rather than inherited. Borrowing an image across
   components on the strength of an index is exactly how a change to the blog
   feed silently repaints an unrelated section, which is what would have
   happened here.

   The source is 5656x3771 / 21MB and this paints full-bleed behind a veil;
   2400px is generous for that at 1.1MB. */
const INTERLUDE_IMAGE = "/images/interlude-web.jpg";

/**
 * The photography interlude — a full-screen photograph in a maroon frame
 * with ONE centred cream display line over it.
 *
 * It is PINNED: it sticks to the top of the window and the journal below
 * scrolls up over it, so leaving this beat is the cream sheet arriving
 * rather than the picture sliding away. The pin is plain `position: sticky`
 * held inside `.pinScope` (globals.css), which is the wrapper that outlives
 * it — no scroll listener, no measured runway, nothing to keep in sync.
 *
 * IT NO LONGER FLIES. The photograph used to shrink out of this band and
 * land as the first card in the reel, scrubbed on a spring: a portalled
 * copy, two live rects measured every frame, a landing seat published by
 * Blog and corrected for that section's own entrance transform, and a
 * retirement test that had to live in the frame loop because a resting
 * spring stops emitting. All of it existed to disguise ONE cut. The pin
 * makes the same cut by simply letting the next chapter cover this one,
 * which is the grammar the page already speaks at the restaurant → About
 * change (see ChapterPin), so the two chapter changes now sound alike.
 */
export default function Interlude() {
  const reduce = useReducedMotion();

  return (
    <section className={styles.section} data-nav-theme="dark">
      <div className={styles.media}>
        <Image
          className={styles.img}
          src={INTERLUDE_IMAGE}
          alt="A dining room laid up for service — linen-topped tables and bentwood chairs beside a window onto the street"
          fill
          sizes="100vw"
        />
        {/* soft maroon veil so the overlaid line reads on the busy picture */}
        <div className={styles.veil} aria-hidden />
      </div>

      <div className={styles.lineWrap}>
        <motion.h2
          className={styles.line}
          initial={
            reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(26px)" }
          }
          whileInView={{ opacity: 1, transform: "translateY(0px)" }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.9, ease: EASE }}
        >
          One family, seven kitchens.
        </motion.h2>
      </div>
    </section>
  );
}
