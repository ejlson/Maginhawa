"use client";

import {
  cubicBezier,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";
import styles from "./RestaurantLocations.module.css";
import ViewAllButton from "./ViewAllButton";
import VideoBackdrop from "./VideoBackdrop";

// a few restaurant clips cycle behind the View-All button
const CLIPS = [
  "/videos/cafemama.mp4",
  // "/videos/ramo.mp4",
  "/videos/belly-hero.mov",
  "/videos/mamasons.mov",
  "/videos/bintang.mov",
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

  // Scroll choreography — the section itself is a plain 100svh block
  // that scrolls past 1:1 the whole way (no pin — scroll is never
  // held). Three scrubs, all riding normal continuous scrolling: entry
  // seal on the approach, a full-traversal parallax on the footage, and
  // the exit-driven settle on the departure.
  //
  // The APPROACH drives the entry corners only (--enter below): the
  // film arrives as a rounded plate and seals into full bleed exactly
  // at full view (section top hits the viewport top).
  const { scrollYProgress: approach } = useScroll({
    target: ref,
    offset: ["start end", "start start"],
  });

  // PARALLAX across the FULL TRAVERSAL: the footage drifts inside its
  // overflow-hidden frame for the section's entire trip through the
  // viewport — scrub-linked, so it runs in reverse the moment the user
  // scrolls back up (classic parallax depth). [start end → end start]
  // spans from the section's top entering at the viewport's bottom edge
  // to its bottom leaving at the top; the ±8% sweep stays safely inside
  // the `scale(1.2)` oversize on `.bg` even combined with the settle
  // inset, so the video's edges never show.
  const { scrollYProgress: traverse } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const parallax = useTransform(traverse, [0, 1], [-8, 8]);

  // SETTLE on the DEPARTURE: the shrink the old scrollytelling pin used
  // to hold the screen for now plays as the section leaves the
  // viewport. Exit range [end end → end start]: 0 while the section's
  // bottom still sits at the viewport bottom (fully in view), 1 once it
  // has scrolled fully off. Because the section is exactly 100svh, the
  // shrink happens while the block translates up — the inset math is
  // section-relative (unchanged), so the plate stays centred in the
  // section as it departs.
  const { scrollYProgress: exit } = useScroll({
    target: ref,
    offset: ["end end", "end start"],
  });
  // --settle 0→1 brings full bleed down to the container plate over the
  // first ~40% of the departure, so the plate forms while the section
  // is still mostly on screen and then simply rides off. Eased (strong
  // in-out) so the shrink starts gently and lands gently instead of
  // tracking the scroll linearly.
  const settle = useTransform(exit, [0.02, 0.38], [0, 1], {
    ease: cubicBezier(0.65, 0, 0.35, 1),
  });
  // the maroon ground switches on at the very top of the departure
  // (0–0.03, still hidden behind the full-bleed footage), so the shrink
  // only ever reveals a finished maroon surround — never a cream→maroon
  // fade in progress
  const dark = useTransform(exit, [0, 0.03], [0, 1]);

  // Push the current phase values straight onto the element via
  // setProperty — writing a MotionValue into React's style prop as a CSS
  // custom property is fragile (types + prop-name diffing), so this
  // guarantees the CSS calc() picks up every frame.
  useMotionValueEvent(parallax, "change", (v) => {
    ref.current?.style.setProperty("--parallax-y", `${v}%`);
  });
  useMotionValueEvent(settle, "change", (v) => {
    ref.current?.style.setProperty("--settle", String(v));
  });
  useMotionValueEvent(dark, "change", (v) => {
    ref.current?.style.setProperty("--dark", String(v));
  });
  // the approach's sole job: the entry corners — the film arrives as a
  // rounded plate and seals into full bleed exactly at full view
  useMotionValueEvent(approach, "change", (v) => {
    ref.current?.style.setProperty("--enter", String(v));
  });

  return (
    <section
      ref={ref}
      className={styles.section}
      id="locations"
      data-nav-theme="blend"
      data-cursor="glass"
    >
      {/* viewport-height stage — fills the section exactly; the video
          scrolls past as one full-bleed scene (no pinning) and settles
          into the container plate on its way out */}
      <div className={styles.stage}>
        <div className={styles.reveal}>
          <div className={styles.bg}>
            <VideoBackdrop src={CLIPS[clip]} className={styles.locVideo} />
          </div>
          <div className={styles.locScrim} aria-hidden />
        </div>

        <div className={styles.cta}>
          <ViewAllButton />
        </div>
      </div>
    </section>
  );
}
