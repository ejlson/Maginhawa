"use client";

import Image from "next/image";
import {
  cubicBezier,
  motion,
  useAnimationFrame,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./Interlude.module.css";
import { BLOG } from "@/lib/blog";
import {
  landingSeat,
  pushProgress,
  setFlying,
  setMorphActive,
} from "@/lib/handoff";

// the site's shared enter curve
const EASE = [0.22, 1, 0.36, 1] as const;

/* THE PHOTOGRAPH BECOMES THE FIRST JOURNAL ENTRY.
   ONE picture, deliberately: the band's photograph IS the leading story's
   cover, so the moment the flight ends and the real card takes over is not
   a cross-fade between two pictures — it is the same pixels in the same
   rectangle, and it cannot be seen.

   It was briefly two, dissolving in mid-air, and two busy photographs
   fading through each other at half a screen wide read as a double
   exposure, which is the one thing this must not look like. The fix was not
   a cleverer transition; it was that the leading story is about Belly and
   was wearing someone else's photograph. See lib/blog.ts.

   POOL[0] in Blog is BLOG[0] — keep them in step. */
const HERO_ENTRY = BLOG[0];

/* THE FLIGHT'S CLOCK.
   Progress runs from "the whole band is resting on the bottom of the screen"
   to "the band's last edge leaves the top" — one viewport of scroll, the
   reader's own hand on the speed.

   The raw progress is passed through a SPRING so the photograph has mass:
   it trails the scroll slightly on the way down and eases onto its seat
   instead of stopping wherever the wheel stopped. CRITICALLY DAMPED (ratio
   1.0) — it decelerates continuously and rests, with nothing carrying past
   the card. Bouncing a photograph off the rectangle it is landing in reads
   as rubber, not as weight. */
const FLIGHT_SPRING = {
  stiffness: 55,
  damping: 14.9,
  mass: 1,
  restDelta: 0.0004,
} as const;

// a gentle hold-then-go on top of the linear scrub, so the band does not
// start shrinking the instant the reader touches the wheel
const LIFT = cubicBezier(0.42, 0, 0.32, 1);

// the veil is there to keep the overlaid line legible; once the line has
// gone the photograph should be its own full-strength self by the time it
// reaches the cream
const VEIL_OUT = 0.42;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * The photograph in flight.
 *
 * Portalled to the body because a candidate ancestor is transformed (the
 * reel's own entrance slides the whole strip in) and a transformed ancestor
 * silently turns `position: fixed` into `position: absolute` against it.
 *
 * Both ends of the flight are measured EVERY FRAME — the band it leaves and
 * the seat it lands on are both scrolling, so interpolating between two live
 * rects means the flight is correct at any scroll position or speed. The
 * seat Blog hands back is corrected for the reel's own entrance transform,
 * so the photograph aims at where the card will be rather than chasing it.
 */
function Flyer({
  progress,
  from,
  onLand,
}: {
  progress: MotionValue<number>;
  from: React.RefObject<HTMLElement | null>;
  onLand: () => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);

  const place = () => {
    const box = boxRef.current;
    const src = from.current;
    if (!box || !src) return;
    const f = src.getBoundingClientRect();
    const t = landingSeat() ?? f;
    const v = progress.get();
    box.style.left = `${lerp(f.left, t.left, v)}px`;
    box.style.top = `${lerp(f.top, t.top, v)}px`;
    box.style.width = `${lerp(f.width, t.width, v)}px`;
    box.style.height = `${lerp(f.height, t.height, v)}px`;
    // the plate's 2px editorial cut arrives with the plate
    box.style.borderRadius = `${lerp(0, 2, clamp01(v * 2))}px`;
    if (veilRef.current) {
      veilRef.current.style.opacity = `${1 - clamp01(v / VEIL_OUT)}`;
    }
  };

  // before the first paint, not after it — the section's own copy of the
  // photograph is hidden in the same commit that mounts this one, so a
  // frame spent at the default 0×0 would flash a hole in the page
  useLayoutEffect(place);

  /* The frame loop, not the value's change event, is what ends the flight.
     A spring stops EMITTING once it rests, so a retirement test that lives
     in "change" never gets the one reading that would pass it — the flying
     copy stayed up for good, pinned over a card that was hiding its own
     cover behind it.

     And the test is a BAND around the seat, not just "past it": velocity
     touches zero at the top of the overshoot, so a plain `slow enough`
     check fired there, retired the photograph mid-bounce and then re-mounted
     it on the next frame. */
  useAnimationFrame(() => {
    place();
    const v = progress.get();
    if (Math.abs(1 - v) < 0.002 && Math.abs(progress.getVelocity()) < 0.02) {
      onLand();
    }
  });

  return createPortal(
    <div ref={boxRef} className={styles.flyer} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.flyerImg} src={HERO_ENTRY.image} alt="" />
      <div ref={veilRef} className={styles.flyerVeil} />
    </div>,
    document.body,
  );
}

/**
 * A full-bleed photography interlude between chapters — the photograph IS
 * the section, with ONE centred cream display line overlaid.
 *
 * It is also the journal's entrance. Scrolling on does not slide the picture
 * away: the frame closes down around it and carries it into the reel below,
 * where it becomes the first story's cover. The line dissolves first, then
 * the veil, so what lands on the cream is a plain photograph on a plate.
 *
 * The old slow parallax drift inside the frame is gone. It was a few percent
 * of counter-scroll, and it meant the visible crop at rest was NOT a plain
 * cover-fit of the section — so the flying copy could not start out as the
 * same pixels, and the take-off popped. One motion per element: this one now
 * flies, so it no longer drifts.
 *
 * Reduced motion renders the plain full-bleed band and never registers.
 */
export default function Interlude() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const [flying, setFlyingState] = useState(false);

  // 0 → the band is resting on the bottom of the screen
  // 1 → its bottom edge has reached the top
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["end end", "end start"],
  });
  const eased = useTransform(scrollYProgress, [0, 1], [0, 1], { ease: LIFT });
  const progress = useSpring(eased, FLIGHT_SPRING);

  // the overlaid line leaves first and on its own — the words dissolve, then
  // the picture departs from under them
  const lineOpacity = useTransform(progress, [0, 0.2], [1, 0], { clamp: true });
  const lineY = useTransform(progress, [0, 0.34], [0, -46], { clamp: true });

  useLayoutEffect(() => {
    if (reduce) return;
    setMorphActive(true);
    return () => {
      setMorphActive(false);
      setFlying(false);
    };
  }, [reduce]);

  /* TAKE-OFF and the way back. The change event only ever ARMS the flight
     (and disarms it if the reader scrolls back up above the band); the
     landing is decided in the flying copy's own frame loop, where there is
     always a current reading. */
  const setAirborne = useCallback((airborne: boolean) => {
    setFlyingState(airborne);
    // the card holds its cover back for exactly as long as the photograph
    // that belongs in it is still on its way
    setFlying(airborne);
  }, []);

  useMotionValueEvent(progress, "change", (v) => {
    pushProgress(clamp01(v));
    if (v > 0.0015) {
      if (v < 0.99) setAirborne(true);
    } else {
      setAirborne(false);
    }
  });

  return (
    <section
      ref={ref}
      className={styles.section}
      data-nav-theme="dark"
      // while the photograph is in the air the band holds its place but
      // shows nothing — maroon on the maroon zone's own maroon, so what the
      // reader sees is simply the picture leaving
      data-flying={flying || undefined}
    >
      <div className={styles.media}>
        <Image
          className={styles.img}
          src={HERO_ENTRY.image}
          alt="Diners at Belly's window table"
          fill
          sizes="100vw"
        />
      </div>

      {/* soft maroon veil so the overlaid line reads on the busy footage */}
      <div className={styles.veil} aria-hidden />

      {/* two jobs, two elements: the wrapper carries the departure (driven
          by the flight's clock), the heading inside carries its own arrival
          — one element cannot take an `animate` and a `style` on the same
          property without the animation winning */}
      <motion.div
        className={styles.lineWrap}
        style={reduce ? undefined : { opacity: lineOpacity, y: lineY }}
      >
        <motion.h2
          className={styles.line}
          initial={
            reduce
              ? { opacity: 0 }
              : { opacity: 0, transform: "translateY(26px)" }
          }
          whileInView={{ opacity: 1, transform: "translateY(0px)" }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.9, ease: EASE }}
        >
          One family, seven kitchens.
        </motion.h2>
      </motion.div>

      {flying && (
        <Flyer
          progress={progress}
          from={ref}
          onLand={() => setAirborne(false)}
        />
      )}
    </section>
  );
}
