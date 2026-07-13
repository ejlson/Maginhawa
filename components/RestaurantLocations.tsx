"use client";

import {
  cubicBezier,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "framer-motion";
import { Fragment, useEffect, useRef, useState } from "react";
import styles from "./RestaurantLocations.module.css";
import ViewAllButton from "./ViewAllButton";
import VideoBackdrop from "./VideoBackdrop";
import { RESTAURANTS } from "@/lib/restaurants";

// a few restaurant clips cycle behind the View-All button
const CLIPS = [
  "/videos/bintang.mp4",
  "/videos/cafemama.mp4",
  "/videos/ramo.mp4",
  "/videos/mamasons.mp4",
];

export default function RestaurantLocations() {
  const ref = useRef<HTMLElement>(null);
  const [clip, setClip] = useState(0);

  useEffect(() => {
    const id = window.setInterval(
      () => setClip((c) => (c + 1) % CLIPS.length),
      7000
    );
    return () => window.clearInterval(id);
  }, []);

  // Scrollytelling: the section is intentionally taller than the viewport,
  // and the video sits inside a sticky viewport-height wrapper. Three-act
  // arc, asymmetric: the video OPENS as a small horizontal card centred
  // on the CREAM page (under the hiring ticker), EXPANDS to full screen
  // as the user scrolls the pin, holds the scene, then SETTLES to the
  // page container's width — matching the dark section's content — as it
  // hands off into Contact.
  //
  // Pin range [start start → end end]: 0 at pin, 1 when the sticky releases.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  // two independent phases (entry and exit rest states differ, so one
  // expand value can't describe both): --grow takes the card to full
  // bleed over the first 40%; --settle brings full bleed down to the
  // container plate from 62%, running nearly to the release so the plate
  // never sits frozen and then lurches when normal scrolling resumes.
  // Both phases are eased (strong in-out) so the growth starts gently
  // and lands gently instead of tracking the scroll linearly.
  const phaseEase = cubicBezier(0.65, 0, 0.35, 1);
  const grow = useTransform(scrollYProgress, [0.05, 0.42], [0, 1], {
    ease: phaseEase,
  });
  const settle = useTransform(scrollYProgress, [0.62, 0.95], [0, 1], {
    ease: phaseEase,
  });
  // the maroon backdrop switches on WHILE the video is still full-bleed
  // (0.5–0.6, fully hidden behind the footage), so the instant the shrink
  // starts the surround is already dark — no visible colour transition
  const dark = useTransform(scrollYProgress, [0.5, 0.6], [0, 1]);
  // Parallax: as the user scrolls through the pin range, the footage
  // drifts upward inside its frame. Combined with the `scale(1.2)` on
  // `.bg` in CSS, this gives ±10% of vertical travel without exposing the
  // edges of the video. Depth without moving the pinned card itself.
  const parallax = useTransform(scrollYProgress, [0, 1], [-8, 8]);

  // Push the current phase values straight onto the element via
  // setProperty — writing a MotionValue into React's style prop as a CSS
  // custom property is fragile (types + prop-name diffing), so this
  // guarantees the CSS calc() picks up every frame.
  useMotionValueEvent(grow, "change", (v) => {
    ref.current?.style.setProperty("--grow", String(v));
    // hover affordances only exist while the card is at rest
    if (ref.current)
      ref.current.dataset.state = v < 0.02 ? "card" : "grown";
  });
  useMotionValueEvent(settle, "change", (v) => {
    ref.current?.style.setProperty("--settle", String(v));
  });
  useMotionValueEvent(dark, "change", (v) => {
    ref.current?.style.setProperty("--dark", String(v));
  });
  useMotionValueEvent(parallax, "change", (v) => {
    ref.current?.style.setProperty("--parallax-y", `${v}%`);
  });

  return (
    <section
      ref={ref}
      className={styles.section}
      id="locations"
      data-nav-theme="blend"
      data-state="card"
    >
      {/* sticky viewport-height wrapper — pins to the top of the viewport
          while the section scrolls past, so the video reads as one held
          "scene" that only starts shrinking once the user has committed */}
      <div className={styles.stage}>
        {/* shadow echo — clip-path can't cast a shadow, so this element
            tracks the card's rect beneath the reveal and carries the soft
            lift for the opening card state */}
        <div className={styles.cardShadow} aria-hidden />

        <div className={styles.reveal}>
          <div className={styles.bg}>
            {/* dedicated hover-zoom layer — parallax lives on .bg, the
                crossfade's inline transitions live on the videos, and the
                editorial lean-in lives here, so none of them fight */}
            <div className={styles.zoom}>
              <VideoBackdrop src={CLIPS[clip]} className={styles.locVideo} />
            </div>
          </div>
          <div className={styles.locScrim} aria-hidden />

          {/* restaurant wordmarks riding the top and bottom edges INSIDE
              the video — inverted-difference treatment (the home hero
              wordmark's effect), drifting in opposite directions and
              fading out as the video grows. Inside .reveal so the card's
              clip and stacking context contain both the marquee and its
              blend. */}
          <div
            className={`${styles.logoRow} ${styles.logoRowTop}`}
            aria-hidden
          >
            <div className={styles.logoTrack}>
              {["a", "b"].map((half) => (
                <span className={styles.logoSeq} key={half}>
                  {RESTAURANTS.map((r) => (
                    <Fragment key={r.slug}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.logo} alt="" draggable={false} />
                    </Fragment>
                  ))}
                </span>
              ))}
            </div>
          </div>
          <div
            className={`${styles.logoRow} ${styles.logoRowBottom}`}
            aria-hidden
          >
            <div className={`${styles.logoTrack} ${styles.logoTrackReverse}`}>
              {["a", "b"].map((half) => (
                <span className={styles.logoSeq} key={half}>
                  {RESTAURANTS.map((r) => (
                    <Fragment key={r.slug}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.logo} alt="" draggable={false} />
                    </Fragment>
                  ))}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.cta}>
          <ViewAllButton />
        </div>
      </div>
    </section>
  );
}
