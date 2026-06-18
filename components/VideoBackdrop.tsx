"use client";

import { useEffect, useState } from "react";

/**
 * Full-bleed video that crossfades when `src` changes. Only two <video>
 * elements ever exist (current + outgoing), so large clips aren't all loaded
 * at once. The element is styled by the passed `className`.
 */
export default function VideoBackdrop({
  src,
  className,
  duration = 1,
}: {
  src: string;
  className?: string;
  duration?: number;
}) {
  const [st, setSt] = useState({ a: src, b: "", showA: true });

  useEffect(() => {
    setSt((prev) => {
      const current = prev.showA ? prev.a : prev.b;
      if (current === src) return prev;
      // load the incoming clip into the hidden layer, then flip
      return prev.showA
        ? { ...prev, b: src, showA: false }
        : { ...prev, a: src, showA: true };
    });
  }, [src]);

  const layer = (s: string, show: boolean) =>
    s ? (
      <video
        key={s}
        src={s}
        className={className}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        style={{ opacity: show ? 1 : 0, transition: `opacity ${duration}s ease` }}
      />
    ) : null;

  return (
    <>
      {layer(st.a, st.showA)}
      {layer(st.b, !st.showA)}
    </>
  );
}
