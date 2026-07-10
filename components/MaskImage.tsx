"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import Parallax from "./Parallax";
import styles from "./MaskImage.module.css";

/**
 * Photograph with a mask-reveal entrance — clipped shut at the bottom edge,
 * it wipes open (clip-path inset) once scrolled into view, then keeps a
 * gentle internal parallax drift via the site's Parallax frame. One-shot
 * IntersectionObserver, same pattern as the Discover grid entrance.
 * Reduced motion: a plain opacity fade.
 */
export default function MaskImage({
  src,
  alt,
  width,
  height,
  ratio,
  fill = false,
  sizes,
  className,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** aspect ratio of the visible frame, e.g. "4 / 5" */
  ratio?: string;
  /** fill the layout parent's height (e.g. a stretched grid cell) instead
   *  of fixing an aspect ratio — overrides `ratio` */
  fill?: boolean;
  sizes?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let done = false;
    let timer = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) show();
      },
      { threshold: 0.1 },
    );
    const show = () => {
      if (done) return;
      done = true;
      setShown(true);
      observer.disconnect();
      window.clearTimeout(timer);
    };
    observer.observe(el);
    // failsafe — a masked photo must never stay invisible: if the observer
    // doesn't fire (broken IO, odd embeds, instant anchor jumps), force the
    // reveal shortly after mount
    timer = window.setTimeout(show, 1500);
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`${styles.mask} ${shown ? styles.maskIn : ""} ${
        fill ? styles.fill : ""
      } ${className ?? ""}`}
    >
      <Parallax inset speed={0.14} ratio={ratio} fill={fill}>
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          className={styles.img}
        />
      </Parallax>
    </div>
  );
}
