"use client";

import { useCallback, useEffect, useRef } from "react";

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
/* ── WHY THIS IS A MODULE AND NOT VideoBackdrop's PRIVATE HOOK ──────────
   IT WAS PRIVATE, AND THE RULES ABOVE WERE THEREFORE ENFORCED ON EXACTLY
   THE TWO BACKDROPS THAT HAPPEN TO RENDER THROUGH VideoBackdrop. Every
   other <video> on the site rolled its own, and each one rolled a
   DIFFERENT SUBSET: About's opening aside called play() from mount with no
   pause path at all, and AboutSplit's observer promoted `preload` and then
   disconnected — a one-shot warm-up wearing a gate's clothes.

   MEASURED (1440×900, dev): about-big.mp4 was 2,915px above the fold on the
   home page and 2,900px above it on /about, DECODING in both, while
   Reservations' clip — the one element actually wired to this gate — was
   correctly paused 4,322px below. The gate was never broken. It was never
   asked. */
export const PLAY_MARGIN = "200px 0px";
export const WARM_MARGIN = "150% 0px";

/* The two rules, defined ONCE so a second call site cannot re-derive half of
   them. Everything below is plumbing that decides WHICH box is watched. */
function playGate(v: HTMLVideoElement, visible: boolean) {
  if (visible) {
    // the warm gate below normally got here first; this is the backdrop
    // that mounts already on screen
    if (v.preload !== "auto") v.preload = "auto";
    void v.play().catch(() => {});
  } else if (!v.paused) v.pause();
}

function warmGate(v: HTMLVideoElement) {
  if (v.preload === "auto") return; // see the ⚠️ above: load() would rewind it
  v.preload = "auto";
  v.load();
}

/**
 * Gate one `<video>` imperatively, for components that already own its ref.
 * Returns a teardown; call it from the effect's cleanup.
 *
 * ⚠️ `anchor` IS NOT A CONVENIENCE — IT IS THE WHOLE CORRECTNESS QUESTION.
 * An IntersectionObserver reports the ratio of the box it was handed, and a
 * `position: sticky` or `fixed` <video> is PINNED TO THE VIEWPORT: its own
 * box never leaves, so `isIntersecting` never goes false and the pause
 * branch is unreachable. Same for a clip-path'd element, which zeroes its
 * own ratio in the other direction. Where the video does not scroll away
 * under its own steam, pass the box that DOES — the section, the figure, the
 * scroll scope — and the video is merely the thing that gets paused.
 */
export function gateVideoPlayback(
  video: HTMLVideoElement,
  anchor: Element = video,
): () => void {
  // no IntersectionObserver (ancient browser): fall back to the old
  // behaviour rather than a backdrop that never starts — and that includes
  // the eager fetch, since nothing else would ever start it
  if (typeof IntersectionObserver === "undefined") {
    video.preload = "auto";
    void video.play().catch(() => {});
    return () => {};
  }

  const play = new IntersectionObserver(
    (entries) => {
      for (const e of entries) playGate(video, e.isIntersecting);
    },
    { rootMargin: PLAY_MARGIN },
  );
  const warm = new IntersectionObserver(
    (entries) => {
      // once per element: the fetch is not a state to be maintained
      if (!entries.some((e) => e.isIntersecting)) return;
      warm.disconnect();
      warmGate(video);
    },
    { rootMargin: WARM_MARGIN },
  );

  play.observe(anchor);
  warm.observe(anchor);
  return () => {
    play.disconnect();
    warm.disconnect();
  };
}

/**
 * Ref-callback form, for a component whose `<video>` elements mount and
 * unmount under it (VideoBackdrop's crossfade swaps a layer per clip). One
 * pair of observers is shared across every element it is handed.
 */
export function useVisiblePlayback() {
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
          for (const e of entries)
            playGate(e.target as HTMLVideoElement, e.isIntersecting);
        },
        { rootMargin: PLAY_MARGIN },
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
            warmGate(v);
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
