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
      if (Math.abs(top) < vh * 0.03) return; // already filling the screen
      // engage from much further out so it almost always pulls into full view
      if (Math.abs(top) < vh * 0.7) {
        const l = lenisRef.current;
        if (l) l.scrollTo(el, { duration: 0.6 });
        else el.scrollIntoView({ behavior: "smooth", block: "start" });
        cooldown = true;
        window.setTimeout(() => {
          cooldown = false;
        }, 600);
      }
    };
    const onScroll = () => {
      clearTimeout(t);
      t = window.setTimeout(assist, 110);
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
