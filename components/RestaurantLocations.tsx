"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import styles from "./RestaurantLocations.module.css";
import ViewAllButton from "./ViewAllButton";
import VideoBackdrop from "./VideoBackdrop";
import { lenisRef } from "@/lib/SmoothScroll";

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

  // scroll-assist: when this full-height section is mostly in view and the user
  // pauses, glide it into a full view so they see the whole thing
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let t = 0;
    let cooldown = false;
    const assist = () => {
      if (cooldown) return;
      const vh = window.innerHeight;
      const top = el.getBoundingClientRect().top;
      if (Math.abs(top) < vh * 0.06) return; // already filling the screen
      if (Math.abs(top) < vh * 0.45) {
        const l = lenisRef.current;
        if (l) l.scrollTo(el, { duration: 0.7 });
        else el.scrollIntoView({ behavior: "smooth", block: "start" });
        cooldown = true;
        window.setTimeout(() => {
          cooldown = false;
        }, 1200);
      }
    };
    const onScroll = () => {
      clearTimeout(t);
      t = window.setTimeout(assist, 150);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(t);
    };
  }, []);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // a centre curtain opens as the section scrolls in
  const clipPath = useTransform(
    scrollYProgress,
    [0.05, 0.42],
    ["inset(48% 0% 48% 0%)", "inset(0% 0% 0% 0%)"]
  );

  return (
    <section ref={ref} className={styles.section}>
      <motion.div
        className={styles.reveal}
        style={{ clipPath, WebkitClipPath: clipPath }}
      >
        <div className={styles.bg}>
          <VideoBackdrop src={CLIPS[clip]} className={styles.locVideo} />
        </div>
        <div className={styles.locScrim} aria-hidden />
      </motion.div>

      <div className={styles.cta}>
        <ViewAllButton />
      </div>
    </section>
  );
}
