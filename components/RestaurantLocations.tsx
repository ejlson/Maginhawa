"use client";

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
      if (Math.abs(top) < vh * 0.06) return; // already (near) full view
      // only assist once the section is clearly the dominant one on screen
      if (Math.abs(top) < vh * 0.3) {
        const l = lenisRef.current;
        // longer, eased glide for a smoother settle
        if (l) l.scrollTo(el, { duration: 1.1 });
        else el.scrollIntoView({ behavior: "smooth", block: "start" });
        cooldown = true;
        window.setTimeout(() => {
          cooldown = false;
        }, 1500);
      }
    };
    const onScroll = () => {
      clearTimeout(t);
      t = window.setTimeout(assist, 220);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(t);
    };
  }, []);

  return (
    <section ref={ref} className={styles.section}>
      <div className={styles.reveal}>
        <div className={styles.bg}>
          <VideoBackdrop src={CLIPS[clip]} className={styles.locVideo} />
        </div>
        <div className={styles.locScrim} aria-hidden />
      </div>

      <div className={styles.cta}>
        <ViewAllButton />
      </div>
    </section>
  );
}
