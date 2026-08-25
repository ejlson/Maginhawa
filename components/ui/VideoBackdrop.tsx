"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { asset } from "@/lib/media";

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


/* ── PLAY ONLY WHAT IS ON SCREEN ────────────────────────────────────────
   MEASURED (scripts/probe-video-census.mjs): with no gate, the home page ran
   TWO concurrent 1080p decodes while the reader was still looking at the
   hero. The second was Reservations — the last band on the page, far below
   the fold — whose backdrop is `autoPlay loop`, laid out at 2304×1620 after
   `.bg`'s scale(1.2), decoding and compositing a larger-than-viewport surface
   that nobody could see. It competed with the hero's own decode for the whole
   visit.

   That is exactly the kind of load an idle test rig absorbs and a real
   machine does not: video decode does not show up in main-thread
   instrumentation, so every rAF-based probe called the page smooth while the
   hero was sharing a GPU with an invisible film.

   A 200px rootMargin starts the clip just before its band arrives, so the
   reader never meets a still frame — the section's own entrance animation is
   longer than the ~2 frames a paused <video> needs to resume. `playsInline`
   + `muted` mean resuming needs no gesture; the play() promise is swallowed
   because a pause() landing mid-play rejects it, which is not an error. */
/* ── AND ONLY FETCH WHAT IS APPROACHING ────────────────────────────────
   THE GATE ABOVE STOPS THE DECODE AND NOT THE DOWNLOAD, and on a phone the
   download is the larger bill. `preload="auto"` fetches the WHOLE file the
   moment the element mounts, so Reservations — the last band on a 9,400px
   page — pulled 7.4MB down the wire while the reader was still on the hero.
   Measured on a 390px walk of the home page: 21.5MB of video out of 24MB
   total, all of it requested inside the first 1.1 seconds.

   150% OF THE VIEWPORT, WHERE PLAYBACK GETS 200px, and the two numbers are
   different jobs rather than a pair that drifted. Playback needs the clip
   running by the time its band arrives, which is ~2 frames of work. Fetching
   several megabytes is not — at 844px tall this starts it 1,266px out, which
   is a couple of seconds of ordinary scrolling, so the film is buffered
   before the 200px gate ever asks it to play.

   ⚠️ THE PLAY GATE PROMOTES `preload` TOO, and the warm gate checks before
   it calls `load()`. Two observers on one element deliver their callbacks
   independently, so on a backdrop that is already on screen at mount both
   fire in the same batch in an order nothing guarantees — and `load()` on an
   element that has just been told to play resets it to zero. The guard is
   what makes the race harmless rather than a one-frame black frame. */
const WARM_MARGIN = "150% 0px";

function useVisiblePlayback() {
  const io = useRef<IntersectionObserver | null>(null);
  const warm = useRef<IntersectionObserver | null>(null);

  /* ⚠️ LAZILY, INSIDE THE REF CALLBACK — NOT IN AN EFFECT.
     Ref callbacks fire during commit, effects fire after it, so an observer
     built in useEffect does not exist yet on the frame the ref runs and every
     observe() call is silently dropped. Built that way first; the census probe
     showed the offscreen clip still decoding and the gate doing nothing at
     all, which is precisely how this mistake presents — no error, no warning,
     just no effect. */
  const observer = () => {
    if (!io.current && typeof IntersectionObserver !== "undefined") {
      io.current = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            const v = e.target as HTMLVideoElement;
            if (e.isIntersecting) {
              // the warm gate below normally got here first; this is the
              // backdrop that mounts already on screen
              if (v.preload !== "auto") v.preload = "auto";
              void v.play().catch(() => {});
            } else if (!v.paused) v.pause();
          }
        },
        { rootMargin: "200px 0px" },
      );
    }
    return io.current;
  };

  const warmer = () => {
    if (!warm.current && typeof IntersectionObserver !== "undefined") {
      warm.current = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (!e.isIntersecting) continue;
            const v = e.target as HTMLVideoElement;
            // once per element: the fetch is not a state to be maintained
            warm.current?.unobserve(v);
            if (v.preload === "auto") continue;
            v.preload = "auto";
            v.load();
          }
        },
        { rootMargin: WARM_MARGIN },
      );
    }
    return warm.current;
  };

  useEffect(
    () => () => {
      io.current?.disconnect();
      warm.current?.disconnect();
    },
    [],
  );

  return useCallback((el: HTMLVideoElement | null) => {
    if (!el) return;
    const o = observer();
    // no IntersectionObserver (ancient browser): fall back to the old
    // behaviour rather than a backdrop that never starts — and that includes
    // the eager fetch, since nothing else would ever start it
    if (!o) {
      el.preload = "auto";
      void el.play().catch(() => {});
      return;
    }
    o.observe(el);
    warmer()?.observe(el);
    // React 19 calls this when the element detaches — the crossfade swaps
    // layers constantly, so an unobserved corpse would leak an entry per swap.
    return () => {
      o.unobserve(el);
      warm.current?.unobserve(el);
    };
  }, []);
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
  const watch = useVisiblePlayback();
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

  /* `key` AND THE CROSSFADE BOOKKEEPING STAY ON THE RAW PATH; only the
     `src` attribute is resolved. The path is the clip's IDENTITY — it is
     what the effect above compares to decide whether anything changed, and
     what React remounts on — and running it through `asset()` first would
     make both depend on a CDN configuration that can differ between
     environments. See the banner in lib/media.ts. */
  const layer = (c: Clip, show: boolean) =>
    c.src ? (
      <video
        key={c.src}
        ref={watch}
        src={asset(c.src)}
        className={className}
        /* NO autoplay attribute, deliberately — useVisiblePlayback owns
           playback and the two cannot both own it. With the attribute present
           the gate pauses an offscreen clip at load and the browser's own
           autoplay logic starts it again a beat later, once enough data has
           arrived. Measured: the offscreen clip went on decoding with the gate
           installed and apparently working, and a `play` event fired with no
           JS anywhere in its stack. */
        muted
        loop
        playsInline
        /* NOT `auto` — see WARM_MARGIN. The clip is fetched by the warm gate
           as its band comes within a viewport and a half, not at mount. */
        preload="none"
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
