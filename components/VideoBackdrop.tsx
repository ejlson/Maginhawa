"use client";

import { useEffect, useState } from "react";

type Clip = { src: string; rotate: number };

// Re-orient a clip whose footage was shot/encoded rotated.
//  • a ±90° quarter-turn needs its box swapped (viewport tall × wide) so it
//    still fills the screen after the rotation
//  • a 180° turn keeps the box orientation — just spin it in place
function clipStyle(c: Clip, show: boolean, duration: number): React.CSSProperties {
  const base: React.CSSProperties = {
    opacity: show ? 1 : 0,
    transition: `opacity ${duration}s ease`,
  };
  if (!c.rotate) return base;

  const norm = ((c.rotate % 360) + 360) % 360; // 0 | 90 | 180 | 270
  if (norm === 180) {
    return { ...base, transform: "rotate(180deg)" };
  }
  return {
    ...base,
    width: "100vh",
    height: "100vw",
    left: "50%",
    top: "50%",
    right: "auto",
    bottom: "auto",
    transform: `translate(-50%, -50%) rotate(${c.rotate}deg)`,
  };
}

/**
 * Full-bleed video that crossfades when `src` changes. Only two <video>
 * elements ever exist (current + outgoing), so large clips aren't all loaded
 * at once. `rotate` (deg) is tracked per clip so a crossfade never rotates the
 * outgoing clip by the incoming one's angle.
 */
export default function VideoBackdrop({
  src,
  rotate = 0,
  className,
  duration = 1,
}: {
  src: string;
  rotate?: number;
  className?: string;
  duration?: number;
}) {
  const [st, setSt] = useState({
    a: { src, rotate } as Clip,
    b: { src: "", rotate: 0 } as Clip,
    showA: true,
  });

  useEffect(() => {
    setSt((prev) => {
      const current = prev.showA ? prev.a : prev.b;
      if (current.src === src) return prev;
      const next: Clip = { src, rotate };
      return prev.showA
        ? { ...prev, b: next, showA: false }
        : { ...prev, a: next, showA: true };
    });
  }, [src, rotate]);

  const layer = (c: Clip, show: boolean) =>
    c.src ? (
      <video
        key={c.src}
        src={c.src}
        className={className}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        style={clipStyle(c, show, duration)}
      />
    ) : null;

  return (
    <>
      {layer(st.a, st.showA)}
      {layer(st.b, !st.showA)}
    </>
  );
}
