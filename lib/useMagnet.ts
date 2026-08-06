"use client";

import { useEffect, useRef, useState } from "react";
import { useMotionValue, useReducedMotion, useSpring } from "framer-motion";

/* ═══════════════════ THE MAGNET ═══════════════════════════════════════
   A control that drifts toward the pointer as it approaches and springs
   home when it leaves.

   THIS WAS INLINE IN components/Reservations.tsx AND IS NOW SHARED. The
   Blog chapter's archive link wanted the same behaviour, and the physics
   below is ~90 lines with three tuned constants and a per-frame budget
   argued from a measured regression — the kind of thing that must not
   exist twice. Reservations' MagneticCta calls this now; nothing about
   its numbers or its listeners changed in the move.

   ── THE HOST MUST NEVER BE TRANSFORMED ──
   `hostRef` goes on a wrapper whose border box stays the control's REST
   rectangle however far the control has drifted. Measuring the moving
   element instead makes the magnet its own input and it walks away from
   the pointer. The spring's x/y belong on a child of the host.

   ── THE THREE NUMBERS ──
   All derived from the control's own box, so the effect stays
   proportional if its type or padding ever changes.

   REACH — the activation radius as a multiple of the button's HALF-
   DIAGONAL (not a pixel constant, which would mean something different on
   every breakpoint). A ~290x47 pill has a half-diagonal of ~147, so the
   magnet wakes at ~235px from centre: roughly one button-width of
   approach, close enough that it never reaches across the column for a
   pointer that is plainly going somewhere else.

   PULL + the QUADRATIC falloff together shape the curve. Displacement is
   `PULL * offset * (1 - dist/radius)^2`: zero at the centre (there is no
   offset to follow), zero at the boundary (so nothing snaps when the
   pointer crosses in or out), peaking in between. Squaring the falloff is
   what keeps the far half of the radius quiet — with a LINEAR falloff the
   same peak forced a 15px shove while the pointer was still 200px away,
   which read as the button lunging at people walking past. On that pill
   the curve measures: 200px away -> 3px, 150 -> 15px, 100 -> 23px
   (capped), 50 -> 23px, 20 -> 13px.

   CAP — a fraction of the control's own height, half by default. At full
   pull it still overlaps its rest rect by better than 75% of its area, so
   it never separates from the space the reader saw it occupy. It binds
   only in a narrow band around dist ~78px, which is exactly where the raw
   curve would otherwise overshoot.

   ── THE THREE ARE OVERRIDABLE PER CALLER, AND THE DEFAULTS ARE THE
   RESERVATIONS PILL'S ── The blog head's archive link asked for a quieter
   magnet than the page's closing action (see its call), and the numbers
   above are the ones that button was tuned and measured on. So they stay
   as the defaults rather than being averaged into something that suits
   neither: a caller that passes nothing gets exactly the behaviour this
   file shipped with. */
const REACH = 1.6;
const PULL = 0.75;
const CAP = 0.5;
// Damping 22 against 2*sqrt(stiffness*mass) = 22.8 puts this at zeta ~= 0.96 —
// just inside critical, so the button returns home without crossing its rest
// position. Overshoot here is not merely cosmetic: the reservations band is
// data-cursor="glass", and CustomCursor resolves its mode from
// elementFromPoint every frame, so an edge swinging back across a stationary
// pointer would flip button<->zone mode repeatedly on the way to rest.
const MAGNET_SPRING = { stiffness: 260, damping: 22, mass: 0.5 };

export type MagnetOptions = {
  /** activation radius as a multiple of the control's half-diagonal */
  reach?: number;
  /** displacement as a fraction of the pointer's offset, before falloff */
  pull?: number;
  /** ceiling on the displacement, as a fraction of the control's height */
  cap?: number;
};

/**
 * Pointer-magnet physics for one control.
 *
 * Put `hostRef` on a wrapper that is NEVER transformed, and `{ x, y }` on a
 * `motion` child inside it — passing `undefined` for the style when
 * `magnetic` is false, so the computed transform stays `none` rather than
 * an identity matrix:
 *
 *   const { hostRef, magnetic, x, y } = useMagnet<HTMLSpanElement>();
 *   <span ref={hostRef} className={s.host}>
 *     <motion.span style={magnetic ? { x, y } : undefined}>…</motion.span>
 *   </span>
 */
export function useMagnet<T extends HTMLElement = HTMLElement>({
  reach = REACH,
  pull = PULL,
  cap = CAP,
}: MagnetOptions = {}) {
  const reduce = useReducedMotion();
  const hostRef = useRef<T>(null);
  // false until an effect proves otherwise: SSR has no matchMedia, and a
  // static control is the correct thing to render for touch and for reduced
  // motion, so the safe default is also the fallback.
  const [magnetic, setMagnetic] = useState(false);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, MAGNET_SPRING);
  const y = useSpring(my, MAGNET_SPRING);

  useEffect(() => {
    if (reduce) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches)
      return;
    setMagnetic(true);

    /* ONE pass per animation frame, every read before every write.

       CustomCursor.tsx:86-102 records what the other shape of this costs: a
       handler that measured on every pointer event burned ~47% of frames over
       32ms while scrolling, because a trackpad emits pointermove at ~120Hz
       and Lenis's lerp of 0.032 turns one wheel notch into seconds of scroll
       events. So the listeners below do nothing but store two numbers and ask
       for a frame; the single getBoundingClientRect lives inside the frame,
       and even there it is skipped unless something has actually invalidated
       the cached rect. */
    const pointer = { x: 0, y: 0 };
    let rect: DOMRect | null = null;
    let stale = true;
    let raf = 0;
    // the last value written, so a pointer resting outside the radius stops
    // touching the MotionValues entirely instead of re-setting 0 at 120Hz
    let px = 0;
    let py = 0;

    const write = (tx: number, ty: number) => {
      // sub-tenth-pixel changes are below what the spring can render; skipping
      // them keeps a stationary pointer from waking the animation loop
      if (Math.abs(tx - px) < 0.1 && Math.abs(ty - py) < 0.1) return;
      px = tx;
      py = ty;
      mx.set(tx);
      my.set(ty);
    };

    const frame = () => {
      raf = 0;
      const host = hostRef.current;
      if (!host) return;

      // ---- reads ----
      if (stale || !rect) {
        rect = host.getBoundingClientRect();
        stale = false;
      }
      const dx = pointer.x - (rect.left + rect.width / 2);
      const dy = pointer.y - (rect.top + rect.height / 2);
      const dist = Math.hypot(dx, dy);
      const radius = (Math.hypot(rect.width, rect.height) / 2) * reach;

      // ---- writes ----
      if (dist >= radius) {
        write(0, 0);
        return;
      }
      const falloff = (1 - dist / radius) ** 2;
      let tx = dx * pull * falloff;
      let ty = dy * pull * falloff;
      const ceiling = rect.height * cap;
      const mag = Math.hypot(tx, ty);
      if (mag > ceiling) {
        tx = (tx / mag) * ceiling;
        ty = (ty / mag) * ceiling;
      }
      write(tx, ty);
    };

    const queue = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };

    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      queue();
    };
    // The pointer can leave the window mid-pull; without this the button
    // would hold that displacement until the cursor came back.
    const onLeave = () => {
      pointer.x = -1e4;
      pointer.y = -1e4;
      queue();
    };
    // Scroll and resize only INVALIDATE the rect — a boolean write, no layout.
    // A frame is requested as well, but only while the button is actually
    // displaced: that is the one state where scrolling changes the answer, and
    // it bounds the per-frame measurement to the moments the reader is on the
    // pill rather than paying for it down the whole page.
    const onShift = () => {
      stale = true;
      if (px || py) queue();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("scroll", onShift, { passive: true });
    window.addEventListener("resize", onShift);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onShift);
      window.removeEventListener("resize", onShift);
      if (raf) cancelAnimationFrame(raf);
      mx.set(0);
      my.set(0);
    };
  }, [reduce, mx, my, reach, pull, cap]);

  return { hostRef, magnetic, x, y };
}
