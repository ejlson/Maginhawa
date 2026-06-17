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
const EASE = [0.83, 0, 0.17, 1] as const;
const SMOOTH = [0.62, 0, 0.2, 1] as const;
const FLIP_TICK = 46; // base ms per alphabet step (varied per letter)
const MIN_TIME = 2600; // minimum loading time on screen (ms)
const SETTLE_CAP = 2400; // max wait after ready for the slowest flap to land
const HARD_CAP = 8000; // never hang longer than this waiting on assets

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
        initial={{ rotateX: reduce ? 0 : -78, opacity: reduce ? 1 : 0.4 }}
        animate={{ rotateX: 0, opacity: 1 }}
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
 *  stage 1 — "MGN" slides left, "HW" slides right while a rounded window opens
 *            in the seam and grows to fill the screen, revealing the video.
 *  stage 2 — hand off to the page (onDone).
 */
export default function Loader({
  insets,
  onDone,
}: {
  insets: HeroInsets;
  onDone: () => void;
}) {
  const [stage, setStage] = useState(0);
  const [vp, setVp] = useState<{ w: number; h: number } | null>(null);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(0);

  useEffect(() => {
    setVp({ w: window.innerWidth, h: window.innerHeight });
  }, []);

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

    const minT = setTimeout(() => {
      minDone = true;
      finish();
    }, MIN_TIME);

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
  }, []);

  // start the split once every flap has locked in (or a safety cap elapses)
  useEffect(() => {
    if (!ready) return;
    const allLocked = locked >= LETTERS.length;
    const t = setTimeout(() => setStage(1), allLocked ? 380 : SETTLE_CAP);
    return () => clearTimeout(t);
  }, [ready, locked]);

  // after the window has grown, hand control back to the page
  useEffect(() => {
    if (stage !== 2) return;
    const t = setTimeout(onDone, 540);
    return () => clearTimeout(t);
  }, [stage, onDone]);

  if (!vp)
    return (
      <div
        className={styles.overlay}
        style={{ background: "var(--cream)" }}
        aria-hidden
      />
    );

  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // start as a zero-size point at centre; the window grows out of the seam.
  const start = { top: vp.h / 2, bottom: vp.h / 2, left: vp.w / 2, right: vp.w / 2 };
  const end = {
    top: insets.top,
    bottom: insets.bottom,
    left: insets.side,
    right: insets.side,
  };
  // groups slide further than the video's half-width (0.5) using the SAME
  // easing as the window, so the letters always stay clear of the video edge
  const split = vp.w * 0.72;

  const lockInc = () => setLocked((n) => n + 1);

  // the small rectangle the N becomes before it grows to full screen
  const rectHalfW = 92;
  const rectHalfH = 52;
  const winRect = {
    top: vp.h / 2 - rectHalfH,
    bottom: vp.h / 2 - rectHalfH,
    left: vp.w / 2 - rectHalfW,
    right: vp.w / 2 - rectHalfW,
  };
  // window timeline: hold a point while the N rotates → form the small
  // rectangle as the N squishes → expand to full screen
  const WIN_TIMES = [0, 0.24, 0.44, 1];

  const flip = (gi: number, ch: string) => (
    <FlipLetter
      key={gi}
      final={ch}
      settle={ready}
      startDelay={gi * 55}
      reduce={reduce}
      onLock={lockInc}
    />
  );

  return (
    <div className={styles.overlay} aria-hidden>
      <motion.div
        className={styles.window}
        initial={{ ...start, borderRadius: 16 }}
        animate={
          stage >= 1
            ? {
                top: [start.top, start.top, winRect.top, end.top],
                bottom: [start.bottom, start.bottom, winRect.bottom, end.bottom],
                left: [start.left, start.left, winRect.left, end.left],
                right: [start.right, start.right, winRect.right, end.right],
                borderRadius: [16, 16, 16, insets.radius],
              }
            : { ...start, borderRadius: 16 }
        }
        transition={
          stage >= 1
            ? { duration: 2.0, times: WIN_TIMES, ease: SMOOTH }
            : { duration: 0.4, ease: SMOOTH }
        }
        onAnimationComplete={() => stage === 1 && setStage(2)}
      />

      <div className={styles.letters}>
        {/* M G — slide left */}
        <motion.span
          className={styles.group}
          initial={{ x: 0, opacity: 1 }}
          animate={stage === 0 ? { x: 0, opacity: 1 } : { x: -split, opacity: 0 }}
          transition={
            stage === 0
              ? { duration: 0.4, ease: SMOOTH }
              : {
                  x: { duration: 1.0, ease: SMOOTH },
                  opacity: { duration: 0.5, delay: 0.4, ease: "easeIn" as const },
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
                  opacity: { duration: 0.35, delay: 0.55, ease: "easeIn" as const },
                }
          }
        >
          {flip(2, "N")}
        </motion.span>

        {/* H W — slide right */}
        <motion.span
          className={styles.group}
          initial={{ x: 0, opacity: 1 }}
          animate={stage === 0 ? { x: 0, opacity: 1 } : { x: split, opacity: 0 }}
          transition={
            stage === 0
              ? { duration: 0.4, ease: SMOOTH }
              : {
                  x: { duration: 1.0, ease: SMOOTH },
                  opacity: { duration: 0.5, delay: 0.4, ease: "easeIn" as const },
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
        <div className={styles.bar} style={{ width: `${progress}%` }} />
        <span className={styles.count}>{Math.round(progress)}</span>
      </motion.div>
    </div>
  );
}
