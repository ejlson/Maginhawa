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
// Grow-out ease for the window's final expansion. SMOOTH's long flat tail was
// measured moving the hole's edge only ~75px over its last ~580ms — a thin
// cream frame shrinking imperceptibly, which read as lag rather than motion.
// This curve keeps the soft launch but lands decisively.
const EXPAND = [0.55, 0, 0.45, 1] as const;
const FLIP_TICK = 46; // base ms per alphabet step (varied per letter)
const MIN_TIME = 2600; // minimum loading time on screen (ms)
const MIN_TIME_REPEAT = 150; // tiny floor on repeat visits / reduced motion
const SETTLE_CAP = 1600; // max wait after ready for the slowest flap to land
const VIDEO_WAIT = 1000; // max ms to keep polling for the hero <video> to mount
const HARD_CAP = 8000; // never hang longer than this waiting on assets
// Absolute backstop for the whole intro. Must exceed the longest *legitimate*
// completion (assets force-ready at HARD_CAP → up to SETTLE_CAP to stage 1 →
// ~1.5s reveal → ~0.1s hand-off ≈ 12s) so it only ever fires if the normal
// exits stalled — never cutting the full-path reveal short.
const SAFETY_CAP = 15000;
const FADE_MS = 550; // cream cross-fade on repeat-visit / reduced-motion path
const SEEN_KEY = "mgnhw:introSeen";

// ── Stage-1 reveal timeline (ms from stage-1 start) ─────────────────────────
//   0‥450   the centre N collapses into a wide bar; MG and HW slide out and
//           are fully faded by ~350ms, before either group can touch a
//           screen edge.
// 320‥460   the hole opens from 0×0 to the N's bar, finishing a beat after
//           the N lands on the same box. It stays inside the N's shrinking
//           footprint the whole way, so film only peeks through the glyph's
//           own counters.
// 460‥640   HANDOVER: hole and N are the same box. The N holds FULL opacity
//           until 550 — that stretch of legible congruence is the beat the
//           whole reveal is built around — then cross-fades out over the
//           window's own edge, gone by 630, BEFORE the window grows.
// 640‥1450  the window grows to the hero insets on EXPAND.
const REVEAL_MS = 1450;
const T_HOLE_OPEN = 320;
const T_HOLE_SEED = 460;
const T_HOLE_GROW = 640;
const N_COLLAPSE_S = 0.45; // the N's side of the same clock: collapse 0‥450
// Cross-fade 550‥630. The fade is deliberately LATE and FAST: late so the
// letter sits legible on its own window for ≥100ms of the hold (measured, the
// boxes are congruent from ~425), fast and finished a beat before growth
// starts at 640 — a residual diagonal stroke lying over an EXPANDING image
// read as a scratch across the film, where the same stroke dissolving over
// the held window reads as the letter becoming it.
const N_FADE_DELAY_S = 0.55;
const N_FADE_S = 0.08;
// The bar the N collapses into, as multiples of the glyph's measured painted
// box. ⚠️ ONE SOURCE OF TRUTH: the hole's seed rect is derived from these SAME
// two numbers times the SAME measurement (see the reveal block in render), so
// the letter's final footprint and the window's first keyframe cannot drift
// apart — which is exactly how the old hardcoded 92/52 window ended up 40px
// away from the letter it was meant to replace.
// SQUISH_X is 2.8 rather than the 2.0 it launched at: at ×2.0 the seed window
// was 85px wide — 3% of the viewport, and the zooms showed it as a flat
// colour swatch, because an 85px crop of the establishing frame has no
// readable content. ×2.8 opens the beat on a ~119px crop, near the ~130px
// where the film starts reading as a picture, while the mid-collapse N stays
// well clear of the departing groups (its half-width peaks at ~59px; the
// groups' inner edges are >170px out by then).
const SQUISH_X = 2.8;
const SQUISH_Y = 0.45;
// Seed half-size used ONLY if the glyph measurement fails (old browser, no
// TextMetrics box fields) — the reveal still runs, just without the perfect
// letter/window congruence.
const FALLBACK_HALF_W = 92;
const FALLBACK_HALF_H = 52;
// The window is full-bleed the instant the reveal completes (insets are all
// zero), so there is no residual cream to cross-fade — this is only a paint
// buffer before the overlay unmounts, not a hold.
const HANDOFF_MS = 100;
// ── Where the film is when the window opens ──
// ⚠️ COUPLED TO THIS EXACT CUT OF belly-hero.mp4 — recut or re-encode the
// clip and this number is silently wrong, in a way nobody will connect back
// here. The clip is a fast montage (15 cuts in 21.4s, mean shot 1.07s) and
// the reveal needs ~1.13s of UNCUT film (window-open at 320ms to full bleed
// at 1450ms); only one shot that long has subject matter in the centre band
// the small window actually shows. That shot runs ct 6.00‥7.56 — seeking to
// 5.84 puts the hold on flame in a pan (ct 6.30‥6.48, unmistakable even at
// 119×28) and lands full bleed on a lit pan of seafood being ladled, with
// the next cut 145ms clear of the unmount.
// NOT 0: the opening shot is fine footage full-frame but EMPTY across the
// dead-centre band (band sd 2.5‥9.4 vs 3.55+ for a picture) — the old
// naked-slab read was a framing coincidence, not bad footage.
// NOT 6.00, even though it is an exact IDR keyframe with near-identical
// content: that shot's out-cut falls at t+1535, INSIDE the overlay-unmount
// window (t+1543‥1576) — a cut on the handoff frame reads as a glitch,
// exactly where the handoff has just been made clean. The keyframe saves
// ~8ms of decode and does not buy back that collision. Do not "simplify"
// this to the round number.
// STANDING REQUIREMENT if the film ever changes: one continuous shot of
// ≥~1.4s with subject matter in the middle third of the frame, placed at
// the HEAD of the clip — then this constant returns to 0 and the coupling
// disappears entirely.
const HERO_SEEK_S = 5.84;

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
  // Sweep flag 1 on a clockwise subpath = CONVEX corner arcs — ordinary
  // rounded corners (sweep 0 bulged them inward).
  const d =
    `M0,0 H${W} V${H} H0 Z ` +
    `M${x + r},${y} ` +
    `H${x2 - r} ` +
    `A${r},${r} 0 0 1 ${x2},${y + r} ` +
    `V${y2 - r} ` +
    `A${r},${r} 0 0 1 ${x2 - r},${y2} ` +
    `H${x + r} ` +
    `A${r},${r} 0 0 1 ${x},${y2 - r} ` +
    `V${y + r} ` +
    `A${r},${r} 0 0 1 ${x + r},${y} ` +
    `Z`;
  return `path(evenodd, "${d}")`;
}

type NSeed = { cx: number; cy: number; w: number; h: number };

/**
 * Measure the centre N's REAL painted geometry so the reveal's seed window can
 * be cut from the letter itself. getBoundingClientRect on the cell reports the
 * LINE box — line-height air included, ~19px taller than the glyph — so the
 * painted extents come from canvas TextMetrics using the cell's own computed
 * font. The returned cx/cy are the centre the collapsed ink WILL have after
 * the squish (see the projection note in the body), so the hole can be seeded
 * on it directly. Returns null on any failure so the caller can fall back to
 * fixed constants — the reveal itself must never be able to break on a
 * measurement.
 */
function measureNSeed(el: HTMLSpanElement | null): NSeed | null {
  if (!el) return null;
  try {
    const box = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) return null;
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const m = ctx.measureText("N");
    const w = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
    const h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
    // a browser without the actualBoundingBox* fields yields NaN/0 here
    if (!Number.isFinite(w) || !Number.isFinite(h) || w < 8 || h < 8)
      return null;

    const cellCx = box.left + box.width / 2;
    const cellCy = box.top + box.height / 2;

    // ── WHERE THE COLLAPSED INK ENDS UP, exactly ──
    // The transform-origin is the CELL centre, so the squish pulls the ink's
    // centre TOWARD the cell centre by its own factor:
    //     collapsedInkC = cellC + (inkC − cellC) × squish
    // NOT the raw ink centre. ⚠️ Do not "simplify" this to inkC: the ink sits
    // 6.7px below the cell centre in this face, and seeding on the raw ink
    // centre would over-correct the measured +3.0px error (= 6.7 × SQUISH_Y)
    // into a −3.7px error the other way.
    //
    // Vertical: the baseline sits half-leading + fontAscent below the line
    // box top, and the ink spans [baseline − actualAscent, baseline +
    // actualDescent]. If the fontBoundingBox* fields are missing (older
    // engines), keep the cell centre — a ~3px seed offset is far better than
    // abandoning the whole letter-seeded path.
    let cy = cellCy;
    const fa = m.fontBoundingBoxAscent;
    const fd = m.fontBoundingBoxDescent;
    if (Number.isFinite(fa) && Number.isFinite(fd)) {
      const baselineY = box.top + (box.height - (fa + fd)) / 2 + fa;
      const inkCy =
        baselineY +
        (m.actualBoundingBoxDescent - m.actualBoundingBoxAscent) / 2;
      cy = cellCy + (inkCy - cellCy) * SQUISH_Y;
    }

    // Horizontal, by the SAME projection rather than by luck: the advance box
    // is centred in the cell (the flip cell text-aligns centre), and the ink
    // centre sits (right − left)/2 − advance/2 from the advance centre. For
    // this face's N the side bearings are symmetric so the term measures
    // 0.0px — it is derived anyway so a font swap cannot silently break it.
    const inkDx =
      (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2 - m.width / 2;
    const cx = cellCx + inkDx * SQUISH_X;

    return { cx, cy, w, h };
  } catch {
    return null;
  }
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
 *  stage 1 — "MG" slides left, "HW" slides right (both faded before they can
 *            reach a screen edge) while the centre N collapses into a wide
 *            bar; a hole (via clip-path) opens onto exactly that bar, the N
 *            cross-fades out over the window's edge, and the window grows to
 *            fill the screen, revealing the video behind the cream overlay.
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
  // the centre N's cell, measured at the moment stage 1 begins (while the
  // letter is still unscaled) so the hole's seed window comes from the
  // letter's real geometry rather than hardcoded constants
  const centerRef = useRef<HTMLSpanElement | null>(null);
  const seedRef = useRef<NSeed | null>(null);

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
    // the hero <video> may not have mounted yet when this effect runs —
    // poll a short window before concluding there is none
    const searchStart = performance.now();
    let raf = 0;
    const findVideo = () => {
      const v = document.querySelector("video");
      if (v) {
        if (v.readyState >= 3) done();
        else {
          const h = () => done();
          v.addEventListener("canplay", h, { once: true });
          cleanups.push(() => v.removeEventListener("canplay", h));
        }
        return;
      }
      if (performance.now() - searchStart < VIDEO_WAIT) {
        raf = requestAnimationFrame(findVideo);
      } else {
        done();
      }
    };
    raf = requestAnimationFrame(findVideo);
    cleanups.push(() => cancelAnimationFrame(raf));

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
    const t = setTimeout(() => {
      // capture the N's geometry now, while it is still unscaled — stage 1
      // transforms it, and a post-transform rect would measure the bar
      seedRef.current = measureNSeed(centerRef.current);
      // Aim the hero film at the one shot that can carry the whole reveal —
      // see HERO_SEEK_S's note for the cut map and why neither 0 nor the
      // 6.00 keyframe will do. 5.84 is NOT a keyframe (nearest IDR 4.68):
      // the ~29 P-frame decode costs ~8ms, measured, and it happens here,
      // BEFORE stage 1's first animated frame, without dropping readyState.
      // Buffer-guarded so a cold cache degrades to the head of the clip —
      // yesterday's behaviour — rather than a blank window on unbuffered
      // film.
      const v = document.querySelector("video");
      if (v && v.readyState >= 2) {
        let buffered = false;
        for (let i = 0; i < v.buffered.length; i++)
          if (
            v.buffered.start(i) <= HERO_SEEK_S &&
            HERO_SEEK_S < v.buffered.end(i)
          )
            buffered = true;
        try {
          v.currentTime = buffered ? HERO_SEEK_S : 0;
        } catch {
          /* seek refused — the film simply keeps its current position */
        }
      }
      setStage(1);
    }, allLocked ? 380 : SETTLE_CAP);
    return () => clearTimeout(t);
  }, [shortPath, ready, locked]);

  // Full path: after the hole has grown, hand control back to the page. The
  // insets are all zero, so the window is already full-bleed when the reveal
  // completes — there is no residual cream to cross-fade, and the old 540ms
  // hold here was half a second of a finished, frozen frame. HANDOFF_MS is
  // only a paint buffer; callDone stays idempotent via doneRef, and the
  // SAFETY_CAP failsafe above is untouched.
  useEffect(() => {
    if (stage !== 2) return;
    const t = setTimeout(callDone, HANDOFF_MS);
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
          <span className={styles.count}>
          {Math.min(100, Math.round(progress))}
        </span>
        </motion.div>
      </div>
    );
  }

  // ---- full path: split-flap board + clip-path reveal -----------------------

  // Exit travel for the two groups. The travel is deliberately SHORT and the
  // fade sits in an 80‥300ms window — late enough that the split visibly
  // READS as letters leaving, done well before the leading edge can reach a
  // screen edge (~560px of travel at 1440), so no frame ever shows a legible
  // letter sliced by the viewport. Two earlier tunings each failed one half
  // of that: a 0.72·vw slide with a 0.4s-delayed fade kept the groups ~75%
  // opaque while the edges cut them off (its comment about staying clear of
  // "the video edge" had been stale since HERO_INSETS went to all zeros),
  // and the over-correction that followed faded them to 48% within 30px of
  // travel, so they evaporated in place instead of splitting.
  const split = vp.w * 0.55;

  const lockInc = () => setLocked((n) => n + 1);

  // ── reveal timeline (see the ms table by REVEAL_MS at the top) ──
  // THE HOLE IS SEEDED FROM THE LETTER. The N collapses — no rotation: a 90°
  // turn of an N reads as a Z in either direction, so the turn is gone — into
  // a wide bar of SQUISH_X × SQUISH_Y times its measured painted box, and the
  // hole's first real keyframe is that SAME box: same measurement, same two
  // constants, congruent by construction. The window holds that box while the
  // N cross-fades out over its edge, then grows to the hero insets on EXPAND.
  // Every keyframe shares holePath's identical command structure, so
  // clip-path interpolates cleanly. (Framer emits scale in screen space —
  // with no rotation the bar's axes trivially match the hole's.)
  const seed = seedRef.current;
  const barW = seed ? seed.w * SQUISH_X : 2 * FALLBACK_HALF_W;
  const barH = seed ? seed.h * SQUISH_Y : 2 * FALLBACK_HALF_H;
  const barCx = seed ? seed.cx : vp.w / 2;
  const barCy = seed ? seed.cy : vp.h / 2;
  // SLAB CORNERS, NOT A PILL. The seed radius was 16, which holePath clamps
  // to barH/2 — a full pill at ANY bar height, so no amount of squish tuning
  // could fix it. The N's stems live at the ink box's extreme corners, which
  // is precisely the region a pill's end-arcs remove: measured, the stems
  // stood proud of the rounded ends on bare cream while the arcs cut inside
  // the letter, reading as an N drawn OVER a lozenge rather than an N that
  // became the window. A 4px corner keeps the window a slab that CONTAINS the
  // letter's own square corners. (holeStart's r still clamps to 0 at w=h=0,
  // and holeEnd keeps insets.radius.)
  const holeStart: Rect = { x: barCx, y: barCy, w: 0, h: 0, r: 4 };
  const holeSeed: Rect = {
    x: barCx - barW / 2,
    y: barCy - barH / 2,
    w: barW,
    h: barH,
    r: 4,
  };
  const holeEnd: Rect = {
    x: insets.side,
    y: insets.top,
    w: vp.w - 2 * insets.side,
    h: vp.h - insets.top - insets.bottom,
    r: insets.radius,
  };
  // closed → closed → the N's bar → hold (the letter/window handover) → full
  // bleed. The hold segment is the window of time where the letter and the
  // hole are one box; the old timing had no such segment — the hole stayed
  // sub-pixel for 683ms and then grew straight past the letter's remains.
  const WIN_TIMES = [0, T_HOLE_OPEN, T_HOLE_SEED, T_HOLE_GROW, REVEAL_MS].map(
    (t) => t / REVEAL_MS,
  );
  const startClip = holePath(vp, holeStart);
  const seedClip = holePath(vp, holeSeed);
  const endClip = holePath(vp, holeEnd);
  const revealClip = [startClip, startClip, seedClip, seedClip, endClip];
  // per-segment easing: SMOOTH into the seed, EXPAND for the grow-out (the
  // hold segments interpolate between identical clips, so theirs is moot)
  const REVEAL_EASE = [SMOOTH, SMOOTH, SMOOTH, EXPAND];

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
            ? { duration: REVEAL_MS / 1000, times: WIN_TIMES, ease: REVEAL_EASE }
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
                  // The fade is DELAYED so the split visibly reads: an
                  // undelayed easeOut had the groups at 48% opacity when they
                  // had travelled only 30px — evaporating in place, not
                  // leaving. On SMOOTH from 80‥300ms they're still ~half
                  // opacity at 200ms (144px into the travel) yet <1% before
                  // this group's leading edge crosses x=0 at ~330ms. Both
                  // halves of that are load-bearing — see the note above
                  // `split`.
                  transform: { duration: 0.7, ease: SMOOTH },
                  opacity: { duration: 0.22, delay: 0.08, ease: SMOOTH },
                }
          }
        >
          {flip(0, "M")}
          {flip(1, "G")}
        </motion.span>

        {/* N — collapses in place into a wide bar, then cross-fades out over
            the window that opens on exactly that bar. NO ROTATION: a
            90°-rotated N is a Z in either direction, and every mid-turn frame
            of the old choreography read as "MG Z HW" — the straight vertical
            collapse is the clean read. The scale factors here and the hole's
            seed rect are the same SQUISH constants × the same measurement
            (see the reveal block above), so the letter and the window cannot
            drift apart. */}
        <motion.span
          ref={centerRef}
          className={styles.center}
          style={{ transformOrigin: "center" }}
          initial={{ scaleX: 1, scaleY: 1, opacity: 1 }}
          animate={
            stage === 0
              ? { scaleX: 1, scaleY: 1, opacity: 1 }
              : { scaleX: SQUISH_X, scaleY: SQUISH_Y, opacity: 0 }
          }
          transition={
            stage === 0
              ? { duration: 0.4 }
              : {
                  // the collapse lands at 450ms, a beat before the hole
                  // finishes opening onto the same box at 460ms; the letter
                  // then sits at FULL opacity on its own window until 550ms —
                  // the legible-congruence beat — and the fast fade is done
                  // by 630ms, BEFORE the window starts growing at 640ms, so
                  // the diagonal never lies over an expanding image (see the
                  // N_FADE_* note by the constants)
                  scaleX: { duration: N_COLLAPSE_S, ease: SMOOTH },
                  scaleY: { duration: N_COLLAPSE_S, ease: SMOOTH },
                  opacity: {
                    duration: N_FADE_S,
                    delay: N_FADE_DELAY_S,
                    ease: "easeOut" as const,
                  },
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
                  // mirrors the MG group — a visible departure, gone before
                  // its edge; the rationale lives on the MG transition
                  transform: { duration: 0.7, ease: SMOOTH },
                  opacity: { duration: 0.22, delay: 0.08, ease: SMOOTH },
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
        <span className={styles.count}>
          {Math.min(100, Math.round(progress))}
        </span>
      </motion.div>
    </div>
  );
}
