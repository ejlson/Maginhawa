"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import styles from "./Loader.module.css";
import type { HeroInsets } from "./types";

// Letters laid out as two groups (split at centre) that slide apart in stage 1.
const LETTERS = [
  { ch: "M", side: "left" as const },
  { ch: "G", side: "left" as const },
  { ch: "N", side: "center" as const },
  { ch: "H", side: "right" as const },
  { ch: "W", side: "right" as const },
];
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const SMOOTH = [0.62, 0, 0.2, 1] as const;
const FLIP_TICK = 46; // base ms per alphabet step (varied per letter)
const MIN_TIME = 2600; // minimum loading time on screen (ms)
const MIN_TIME_REPEAT = 150; // tiny floor on repeat visits / reduced motion
const SETTLE_CAP = 2400; // max wait after ready for the slowest flap to land
const HARD_CAP = 8000; // never hang longer than this waiting on assets
// Absolute backstop for the whole intro. Must exceed the longest *legitimate*
// completion (assets force-ready at HARD_CAP → up to SETTLE_CAP to stage 1 →
// ~2s reveal → ~0.5s hand-off ≈ 13s) so it only ever fires if the normal
// exits stalled — never cutting the full-path reveal short.
const SAFETY_CAP = 15000;
const FADE_MS = 550; // cream cross-fade on repeat-visit / reduced-motion path
const SEEN_KEY = "mgnhw:introSeen";

type Vp = { w: number; h: number };
type Rect = { x: number; y: number; w: number; h: number; r: number };

/**
 * Build a `clip-path: path(evenodd, …)` value describing a full-viewport
 * rectangle with a rounded-rect hole punched out of it. The outer subpath is
 * the viewport; the inner subpath is the rounded hole, and the `evenodd` rule
 * makes the inner rect a hole. Every call emits the EXACT same command sequence
 * and arc count regardless of geometry, so Framer Motion can interpolate
 * cleanly between keyframes (including the degenerate w=0/h=0 start point).
 */
function holePath(vp: Vp, rect: Rect): string {
  const { w: W, h: H } = vp;
  const { x, y, w, h } = rect;
  // clamp the radius so it never exceeds half the smaller side (incl. w/h = 0)
  const r = Math.max(0, Math.min(rect.r, Math.min(w, h) / 2));
  const x2 = x + w;
  const y2 = y + h;
  // Outer rectangle + inner rounded rect. The inner path always uses 4 arcs; at
  // r=0 they collapse to a sharp rect but the command structure is unchanged.
  const d =
    `M0,0 H${W} V${H} H0 Z ` +
    `M${x + r},${y} ` +
    `H${x2 - r} ` +
    `A${r},${r} 0 0 0 ${x2},${y + r} ` +
    `V${y2 - r} ` +
    `A${r},${r} 0 0 0 ${x2 - r},${y2} ` +
    `H${x + r} ` +
    `A${r},${r} 0 0 0 ${x},${y2 - r} ` +
    `V${y + r} ` +
    `A${r},${r} 0 0 0 ${x + r},${y} ` +
    `Z`;
  return `path(evenodd, "${d}")`;
}

/**
 * One split-flap cell. While loading it cycles the whole alphabet on a loop;
 * once `settle` is true it stops the next time it reaches its target letter,
 * so the word locks in with a staggered cascade.
 */
function FlipLetter({
  final,
  settle,
  startDelay = 0,
  reduce = false,
  onLock,
}: {
  final: string;
  settle: boolean;
  startDelay?: number;
  reduce?: boolean;
  onLock?: () => void;
}) {
  const targetIdx = Math.max(0, ALPHABET.indexOf(final.toUpperCase()));
  const [idx, setIdx] = useState(reduce ? targetIdx : 0);
  const settleRef = useRef(settle);
  settleRef.current = settle;
  const lockedRef = useRef(false);
  const lock = () => {
    if (!lockedRef.current) {
      lockedRef.current = true;
      onLock?.();
    }
  };

  useEffect(() => {
    if (reduce) {
      setIdx(targetIdx);
      lock();
      return;
    }
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    // each flap runs at its own pace, so they desync and lock in at
    // different moments like a real split-flap board
    const baseTick = FLIP_TICK * (0.78 + Math.random() * 0.7);
    const begin = startDelay + Math.random() * 160;

    const step = () => {
      i = (i + 1) % 26;
      if (settleRef.current && i === targetIdx) {
        setIdx(targetIdx); // reached its letter -> stop
        lock();
        return;
      }
      setIdx(i);
      // a little mechanical jitter on every flip
      timer = setTimeout(step, baseTick * (0.82 + Math.random() * 0.4));
    };

    const start = setTimeout(step, begin);
    return () => {
      clearTimeout(start);
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce, targetIdx, startDelay]);

  const ch = ALPHABET[idx];
  return (
    <span className={styles.flip}>
      <motion.span
        key={ch}
        className={styles.flipInner}
        initial={{
          transform: reduce ? "rotateX(0deg)" : "rotateX(-78deg)",
          opacity: reduce ? 1 : 0.4,
        }}
        animate={{ transform: "rotateX(0deg)", opacity: 1 }}
        transition={{ duration: 0.16, ease: [0.2, 0.7, 0.3, 1] }}
      >
        {ch}
      </motion.span>
    </span>
  );
}

/**
 * Loading screen + intro:
 *  stage 0 — split-flap board scrambles while assets load; a progress bar at
 *            the bottom fills. When loading completes the letters lock to MGNHW.
 *  stage 1 — "MGN" slides left, "HW" slides right while a rounded hole opens in
 *            the seam and grows (via clip-path) to fill the screen, revealing
 *            the video behind the cream overlay.
 *  stage 2 — hand off to the page (onDone).
 *
 * On a repeat visit (or with prefers-reduced-motion) the long choreography is
 * skipped: once assets are ready the cream overlay just cross-fades away.
 */
export default function Loader({
  insets,
  onDone,
}: {
  insets: HeroInsets;
  onDone: () => void;
}) {
  const [stage, setStage] = useState(0);
  const [vp, setVp] = useState<Vp | null>(null);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(0);
  // false on both SSR and first client render so hydration matches; an effect
  // reads sessionStorage afterwards and may flip this for the short path.
  const [seen, setSeen] = useState(false);
  // resolved on the client (after mount) so we never touch window during render
  const [reduce, setReduce] = useState(false);
  const [faded, setFaded] = useState(false); // drives the short-path cross-fade
  const doneRef = useRef(false);

  const callDone = () => {
    if (!doneRef.current) {
      doneRef.current = true;
      onDone();
    }
  };

  // Fail-safe: under no circumstances may the loader permanently block the page.
  // Independent of path, asset signals, or any per-stage effect, force the
  // hand-off at SAFETY_CAP. The doneRef guard above dedupes against the normal
  // exits, so this can only ever fire if something unforeseen stalled them.
  useEffect(() => {
    const safety = setTimeout(callDone, SAFETY_CAP);
    return () => clearTimeout(safety);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setVp({ w: window.innerWidth, h: window.innerHeight });
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    // mark the intro as seen for next time; reading is wrapped for privacy mode
    try {
      if (sessionStorage.getItem(SEEN_KEY) === "1") setSeen(true);
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* sessionStorage unavailable (privacy mode / quota) — treat as first visit */
    }
  }, []);

  // reduced motion forces the short path regardless of session state
  const shortPath = reduce || seen;

  // Drive loading progress from real asset signals + a minimum display time.
  useEffect(() => {
    let cancelled = false;
    let assetsDone = false;
    let minDone = false;
    const finish = () => {
      if (assetsDone && minDone && !cancelled) {
        setProgress(100);
        setReady(true);
      }
    };

    // trickle up to ~90% so the bar always feels alive
    const trickle = setInterval(() => {
      setProgress((p) => (p < 90 ? Math.min(90, p + (p < 55 ? 3 : 1.4)) : p));
    }, 130);

    const minT = setTimeout(
      () => {
        minDone = true;
        finish();
      },
      shortPath ? MIN_TIME_REPEAT : MIN_TIME,
    );

    // wait on fonts + the hero video being playable
    let pending = 0;
    const done = () => {
      pending -= 1;
      if (pending <= 0) {
        assetsDone = true;
        finish();
      }
    };
    const cleanups: Array<() => void> = [];

    pending += 1;
    (document.fonts?.ready ?? Promise.resolve()).then(done);

    pending += 1;
    const v = document.querySelector("video");
    if (v && v.readyState >= 3) done();
    else if (v) {
      const h = () => done();
      v.addEventListener("canplay", h, { once: true });
      cleanups.push(() => v.removeEventListener("canplay", h));
    } else done();

    const cap = setTimeout(() => {
      assetsDone = true;
      minDone = true;
      finish();
    }, HARD_CAP);

    return () => {
      cancelled = true;
      clearInterval(trickle);
      clearTimeout(minT);
      clearTimeout(cap);
      cleanups.forEach((f) => f());
    };
  }, [shortPath]);

  // short path: once ready, cross-fade the cream overlay away then hand off
  useEffect(() => {
    if (!shortPath || !ready) return;
    setFaded(true);
    const t = setTimeout(callDone, FADE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shortPath, ready]);

  // full path: start the split once every flap has locked in (or a cap elapses)
  useEffect(() => {
    if (shortPath || !ready) return;
    const allLocked = locked >= LETTERS.length;
    const t = setTimeout(() => setStage(1), allLocked ? 380 : SETTLE_CAP);
    return () => clearTimeout(t);
  }, [shortPath, ready, locked]);

  // full path: after the hole has grown, hand control back to the page
  useEffect(() => {
    if (stage !== 2) return;
    const t = setTimeout(callDone, 540);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  if (!vp)
    return (
      <div
        className={styles.overlay}
        style={{ background: "var(--cream)" }}
        aria-hidden
      />
    );

  // ---- short path: just a cream overlay that cross-fades out ----------------
  if (shortPath) {
    return (
      <div className={styles.overlay} aria-hidden>
        <motion.div
          className={styles.reveal}
          initial={{ opacity: 1 }}
          animate={{ opacity: faded ? 0 : 1 }}
          transition={{ duration: FADE_MS / 1000, ease: SMOOTH }}
        />
        <motion.div
          className={styles.progress}
          animate={{ opacity: faded ? 0 : 1 }}
          transition={{ duration: 0.3 }}
        >
          <div
            className={styles.bar}
            style={{ transform: `scaleX(${progress / 100})` }}
          />
          <span className={styles.count}>{Math.round(progress)}</span>
        </motion.div>
      </div>
    );
  }

  // ---- full path: split-flap board + clip-path reveal -----------------------

  // groups slide further than the video's half-width (0.5) using the SAME
  // easing as the reveal, so the letters always stay clear of the video edge
  const split = vp.w * 0.72;

  const lockInc = () => setLocked((n) => n + 1);

  // reveal timeline: hold a centre point while the N rotates → form a small
  // rectangle as the N squishes → expand to the final hero insets. The hole
  // keyframes share identical command structure so clip-path interpolates.
  const rectHalfW = 92;
  const rectHalfH = 52;
  const holeStart: Rect = { x: vp.w / 2, y: vp.h / 2, w: 0, h: 0, r: 16 };
  const holeRect: Rect = {
    x: vp.w / 2 - rectHalfW,
    y: vp.h / 2 - rectHalfH,
    w: 2 * rectHalfW,
    h: 2 * rectHalfH,
    r: 16,
  };
  const holeEnd: Rect = {
    x: insets.side,
    y: insets.top,
    w: vp.w - 2 * insets.side,
    h: vp.h - insets.top - insets.bottom,
    r: insets.radius,
  };
  const WIN_TIMES = [0, 0.24, 0.44, 1];
  const startClip = holePath(vp, holeStart);
  const endClip = holePath(vp, holeEnd);
  const revealClip = [startClip, startClip, holePath(vp, holeRect), endClip];

  const flip = (gi: number, ch: string) => (
    <FlipLetter
      key={gi}
      final={ch}
      settle={ready}
      startDelay={gi * 55}
      reduce={false}
      onLock={lockInc}
    />
  );

  return (
    <div className={styles.overlay} aria-hidden>
      <motion.div
        className={styles.reveal}
        style={{ clipPath: startClip }}
        animate={
          // stage 0: closed; stage 1: run the keyframe array open; stage 2:
          // hold the final open hole. Once complete we pin `endClip` (not the
          // array) so the re-render to stage 2 can't replay the keyframes from
          // their start point — which caused a one-frame snap-back blip.
          stage === 1
            ? { clipPath: revealClip }
            : { clipPath: stage >= 2 ? endClip : startClip }
        }
        transition={
          stage === 1
            ? { duration: 2.0, times: WIN_TIMES, ease: SMOOTH }
            : { duration: 0.4, ease: SMOOTH }
        }
        onAnimationComplete={() => stage === 1 && setStage(2)}
      />

      <div className={styles.letters}>
        {/* M G — slide left */}
        <motion.span
          className={styles.group}
          initial={{ transform: "translateX(0px)", opacity: 1 }}
          animate={
            stage === 0
              ? { transform: "translateX(0px)", opacity: 1 }
              : { transform: `translateX(${-split}px)`, opacity: 0 }
          }
          transition={
            stage === 0
              ? { duration: 0.4, ease: SMOOTH }
              : {
                  transform: { duration: 1.0, ease: SMOOTH },
                  opacity: { duration: 0.5, delay: 0.4, ease: "easeOut" as const },
                }
          }
        >
          {flip(0, "M")}
          {flip(1, "G")}
        </motion.span>

        {/* N — stays centre, rotates 90°, squishes into a rectangle, fades */}
        <motion.span
          className={styles.center}
          style={{ transformOrigin: "center" }}
          initial={{ rotate: 0, scaleX: 1, scaleY: 1, opacity: 1 }}
          animate={
            stage === 0
              ? { rotate: 0, scaleX: 1, scaleY: 1, opacity: 1 }
              : { rotate: 90, scaleX: 1.5, scaleY: 0.12, opacity: 0 }
          }
          transition={
            stage === 0
              ? { duration: 0.4 }
              : {
                  // 1) rotate first, 2) then shrink/squish into a rectangle
                  rotate: { duration: 0.45, ease: SMOOTH },
                  scaleX: { duration: 0.4, delay: 0.45, ease: SMOOTH },
                  scaleY: { duration: 0.4, delay: 0.45, ease: SMOOTH },
                  opacity: { duration: 0.35, delay: 0.55, ease: "easeOut" as const },
                }
          }
        >
          {flip(2, "N")}
        </motion.span>

        {/* H W — slide right */}
        <motion.span
          className={styles.group}
          initial={{ transform: "translateX(0px)", opacity: 1 }}
          animate={
            stage === 0
              ? { transform: "translateX(0px)", opacity: 1 }
              : { transform: `translateX(${split}px)`, opacity: 0 }
          }
          transition={
            stage === 0
              ? { duration: 0.4, ease: SMOOTH }
              : {
                  transform: { duration: 1.0, ease: SMOOTH },
                  opacity: { duration: 0.5, delay: 0.4, ease: "easeOut" as const },
                }
          }
        >
          {flip(3, "H")}
          {flip(4, "W")}
        </motion.span>
      </div>

      <motion.div
        className={styles.progress}
        animate={{ opacity: stage >= 1 ? 0 : 1 }}
        transition={{ duration: 0.4 }}
      >
        <div
          className={styles.bar}
          style={{ transform: `scaleX(${progress / 100})` }}
        />
        <span className={styles.count}>{Math.round(progress)}</span>
      </motion.div>
    </div>
  );
}
