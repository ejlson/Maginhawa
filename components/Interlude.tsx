"use client";

import Image from "next/image";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import styles from "./Interlude.module.css";

// the site's shared enter curve
const EASE = [0.22, 1, 0.36, 1] as const;

/* THE LAST WORD CYCLES, and the three are one idea seen three ways: the place
   the food is made, the history behind it, the character it carries. Each is
   already the site's own word for these seven — "kitchens" is this line and
   JoinUs, "rooms"/"stories" run through About and the story deck, and "voices"
   is the About intro's own "Each has its own voice". Nothing here is a synonym
   invented to fill a rotation.

   ORDER MATTERS: physical, then narrative, then identity. It reads as the
   sentence deepening rather than as a thesaurus. */
/* THIS BAND OWNS ITS PICTURE. It used to be `BLOG[0].image` — the leading
   story's own cover, so the band and the first card in the reel below showed
   the same photograph and the journal "arrived already introduced".

   That coupling is gone twice over. The home strip is no longer the top of
   the feed (it is a chosen eight, by slug — see HOME_SLUGS in Blog.tsx), so
   `BLOG[0]` had stopped being the card underneath it; and this photograph is
   now chosen for this band rather than inherited. Borrowing an image across
   components on the strength of an index is exactly how a change to the blog
   feed silently repaints an unrelated section.

   The source is 5656x3771 / 21MB and this paints full-bleed behind a veil;
   2400px is generous for that at 1.1MB. */
const INTERLUDE_IMAGE = "/images/interlude-web.jpg";

const CYCLE = ["kitchens", "stories", "voices"] as const;
const HOLD_MS = 2600;

/* A CLOCK, BUT NOT ONE THAT STARTS AT THE TOP OF THE DOCUMENT.

   The first version ran a bare setInterval, and the bug was not the interval —
   it was WHEN it began. Mounting happens at the top of the page, so by the
   time anyone had scrolled down here the line was already part-way round;
   a capture run arrived to find it showing "voices". The first impression has
   to be "kitchens", because it is the literal one the other two reframe.

   So the timer is armed by the same in-view signal the heading's own entrance
   uses, and the index is reset to 0 on the way in. Whatever the reader did on
   the way down the page, this line starts where it should and the rotation is
   the same length every time.

   `once: false` on purpose: scroll away and the interval is torn down rather
   than left running against a section nobody is looking at, and coming back
   re-arms it from "kitchens" instead of resuming mid-sentence.

   (A scroll-scrubbed version of this exists in the history and was rejected —
   it made the reader turn the word by hand, which reads as work on a line
   whose whole job is to be a breath between two chapters.) */
function CyclingWord({
  active,
  reduce,
}: {
  active: boolean;
  reduce: boolean | null;
}) {
  const [[i, was], setStep] = useState<[number, number]>([0, -1]);
  const iRef = useRef(0);

  useEffect(() => {
    if (reduce || !active) return;
    // arrive on the first word however the reader got here
    iRef.current = 0;
    setStep([0, -1]);
    const t = setInterval(() => {
      const prev = iRef.current;
      const next = (prev + 1) % CYCLE.length;
      iRef.current = next;
      setStep([next, prev]);
    }, HOLD_MS);
    return () => clearInterval(t);
  }, [active, reduce]);

  return (
    <>
      <span className="sr-only">{CYCLE[0]}</span>
      <span className={styles.swap} aria-hidden>
        {CYCLE.map((w, k) => (
          <motion.span
            key={w}
            className={styles.swapWord}
            initial={false}
            animate={
              reduce
                ? { opacity: k === 0 ? 1 : 0 }
                : {
                    /* the word being left rides up out of the window, the next
                       arrives from below, and anything not in play waits under
                       the clip */
                    y: k === i ? "0%" : k === was ? "-115%" : "115%",
                    opacity: k === i ? 1 : 0,
                  }
            }
            transition={{ duration: 1.1, ease: EASE }}
          >
            {w}
          </motion.span>
        ))}
      </span>
    </>
  );
}

export default function Interlude() {
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  /* arms the rotation — see CyclingWord. Same threshold as the heading's own
     entrance, so the words start turning as the line finishes arriving. */
  const inView = useInView(sectionRef, { amount: 0.5 });

  return (
    <section ref={sectionRef} className={styles.section} data-nav-theme="dark">
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
          transition={{ duration: 1.15, ease: EASE }}
        >
          One family, seven{" "}
          <CyclingWord active={inView} reduce={reduce} />.
        </motion.h2>
      </div>
    </section>
  );
}
