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
  "belly-hero.mov",
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

  // Scrollytelling: the section is intentionally taller than the viewport,
  // and the video sits inside a sticky viewport-height wrapper. Two-act
  // arc: the video OPENS edge-to-edge straight off the Blog (that's also
  // the pre-hydration paint), holds the scene while the pin scrolls, then
  // SETTLES to the page container's width — matching the dark section's
  // content — as it hands off into Contact.
  //
  // Pin range [start start → end end]: 0 at pin, 1 when the sticky releases.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  // --settle 0→1 brings full bleed down to the container plate, running
  // nearly to the release so the plate never sits frozen and then lurches
  // when normal scrolling resumes. Eased (strong in-out) so the shrink
  // starts gently and lands gently instead of tracking the scroll linearly.
  const phaseEase = cubicBezier(0.65, 0, 0.35, 1);
  const settle = useTransform(scrollYProgress, [0.45, 0.92], [0, 1], {
    ease: phaseEase,
  });
  // the maroon backdrop switches on WHILE the video is still full-bleed
  // (0.28–0.42, fully hidden behind the footage), so the instant the
  // shrink starts the surround is already dark — no visible colour
  // transition
  const dark = useTransform(scrollYProgress, [0.28, 0.42], [0, 1]);
  // Parallax on the APPROACH only: as the section scrolls into view the
  // footage drifts upward inside its frame, and the drift completes the
  // moment the video reaches full view (section top hits the viewport
  // top — where the pin takes over). Combined with the `scale(1.2)` on
  // `.bg` in CSS, the -10% start never exposes the video's edges.
  const { scrollYProgress: approach } = useScroll({
    target: ref,
    offset: ["start end", "start start"],
  });
  const parallax = useTransform(approach, [0, 1], [-10, 0]);

  // Push the current phase values straight onto the element via
  // setProperty — writing a MotionValue into React's style prop as a CSS
  // custom property is fragile (types + prop-name diffing), so this
  // guarantees the CSS calc() picks up every frame.
  useMotionValueEvent(settle, "change", (v) => {
    ref.current?.style.setProperty("--settle", String(v));
  });
  useMotionValueEvent(dark, "change", (v) => {
    ref.current?.style.setProperty("--dark", String(v));
  });
  useMotionValueEvent(parallax, "change", (v) => {
    ref.current?.style.setProperty("--parallax-y", `${v}%`);
  });
  // the approach also drives the entry corners: the film arrives as a
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
      {/* sticky viewport-height wrapper — pins to the top of the viewport
          while the section scrolls past, so the video reads as one held
          "scene" that only starts shrinking once the user has committed */}
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
