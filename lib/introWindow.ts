/* THE INTRO WINDOW — ONE SCALAR, FIVE ELEMENTS, ONE CLOCK.
 *
 * The reveal used to be `clip-path: path()` on a single full-viewport cream
 * sheet: an aperture was punched out of the cream and widened. It looked
 * right and it was wrong twice over.
 *
 *   1. THE PICTURE NEVER MOVED. Widening an aperture over a film sitting at
 *      its natural size UNCOVERS the film; it does not zoom it. What the
 *      brief asked for — and what the reader expects when something starts
 *      small in the middle of the page — is the picture itself growing.
 *   2. `clip-path: path()` IS NOT COMPOSITOR-ACCELERATED. Measured by two
 *      independent agents: one full BeginMainFrame → UpdateLayoutTree →
 *      PrePaint → Layerize → Paint → Commit → Activate → Draw on EVERY
 *      displayed frame, 7.4‥8.2ms of paint per frame against full-viewport
 *      paint records, ~1261 RasterTasks over the grow-out, and only 8 of 97
 *      frames compositor-animated. Zero headroom — which is exactly why it
 *      measured clean on an idle rig and stuttered on a real machine.
 *
 * THE REPLACEMENT IS ONE NUMBER. `k` is the aperture's linear scale, 0 (shut)
 * to 1 (full bleed), and the aperture is a centred `k·vw × k·vh` rect. That
 * single definition collapses the whole mechanism:
 *
 *   • FOUR CREAM PANELS, each full-viewport, each anchored to one edge by
 *     transform-origin. Because the aperture is centred AND uniform, all four
 *     scale by the SAME value, (1 − k) / 2 — no per-edge arithmetic to keep in
 *     sync, and nothing but `transform` animating.
 *   • THE FILM SCALES BY k about the viewport centre, which fills that
 *     aperture exactly at every k, for free, because the aperture's aspect
 *     ratio IS the viewport's. Nothing has to be kept in agreement because
 *     nothing is computed twice.
 *
 * REJECTED, AND MEASURED, SO DO NOT RE-DERIVE IT:
 *   • An `overflow: hidden` window that scales while the film counter-scales
 *     inside it. Built and measured at 72.9% WORST ASPECT ERROR — a visibly
 *     stretched picture. The clip box has to scale NON-uniformly (it goes from
 *     a postcard to the viewport) and the film's counter-scale is a second,
 *     independent interpolation; the product of two interpolations is not the
 *     interpolation of the product, so the two disagree on every intermediate
 *     frame. Four panels never form that product.
 *   • A framer-motion `MotionValue` driven by `animate()`. framer's
 *     `animateMotionValue("", …)` passes the EMPTY STRING as the value's name,
 *     so `AcceleratedAnimation.supports` fails `acceleratedValues.has(name)`
 *     for every MotionValue whatever it holds — it is ALWAYS
 *     `MainThreadAnimation`, and rAF instrumentation cheerfully reports it as
 *     perfect. Only two paths genuinely accelerate: the `animate` PROP on a
 *     motion component (whose name really is "transform"), and raw
 *     `element.animate()`. This module uses the latter.
 *
 * WHY A MODULE SINGLETON AND NOT A PROP. The film belongs to <Hero>; the
 * clock belongs to <Loader>; they are siblings under <Experience> and neither
 * owns the other. Lifting a ref through Experience would make the hero
 * re-render on every loader state change for the whole of stage 0. More to
 * the point, THERE MUST BE EXACTLY ONE VIDEO DECODE — a second <video> in the
 * loader would double decode cost during the one second that has none to
 * spare — so the loader cannot own a film of its own and must reach the
 * hero's. A registry is the smallest thing that does that.
 */

/** The hero's zoom wrapper: the film, its ramp and its grain, as ONE object. */
let film: HTMLElement | null = null;
/** The running film animation, kept so the hand-off can release it. */
let filmAnim: Animation | null = null;

/**
 * <Hero> calls this from a ref callback. Null on unmount, which also drops any
 * animation still filling forwards — otherwise a route change mid-intro would
 * leave a detached element's animation holding a stale transform.
 */
export function registerIntroFilm(el: HTMLElement | null) {
  if (!el) releaseIntroFilm();
  film = el;
}

export type WindowTimeline = {
  /** `k` at each keyframe, 0 (shut) → 1 (full bleed). */
  k: readonly number[];
  /** normalised offsets, same length as `k`. */
  times: readonly number[];
  /**
   * One CSS easing string per SEGMENT, so `k.length - 1` of them.
   *
   * STRINGS, NOT BEZIER TUPLES, AND THAT IS THE POINT. The expansion rides a
   * generated spring — a `linear()` function with 37 control points — which no
   * cubic-bezier can express. WAAPI accepts `linear()` and Chrome still runs
   * such an animation on the compositor, so the spring costs nothing that the
   * bezier did not. An easing string the browser REJECTS makes
   * `element.animate()` throw rather than fall back silently, which is the
   * behaviour we want: a silent fallback to `linear` would put five layers on
   * five different curves and nobody would see it in a frame counter.
   */
  ease: readonly string[];
  duration: number;
  /** the four shutter panels, in the order top, bottom, left, right. */
  shutters: readonly (HTMLElement | null)[];
  /**
   * Aperture edges at k = 1, as viewport fractions, so a hero panel that is
   * inset from the viewport still lands exactly on its own box. All four are
   * 0 while HERO_INSETS is `{0,0,0,0}`, which is also the condition under
   * which the CENTRED intermediate aperture agrees with the film's
   * centre-origin scale. Re-derive this whole file if that ever changes.
   */
  endInset: { top: number; bottom: number; side: number };
};

/**
 * THE FILM IS A HAIR BIGGER THAN THE HOLE IT FILLS.
 *
 * The panels and the film are five separate compositor animations. They are
 * given one explicit `startTime` below so they cannot drift, but they are
 * still five layers, and a single frame of disagreement at the aperture edge
 * would show a stripe of the hero panel's `--placeholder` between the cream
 * and the picture. Scaling the film by k + BLEED·(1 − k) makes it overlap the
 * hole by ~0.5% while the window is opening, which no reader can see and three
 * frames of skew cannot outrun. The (1 − k) factor is what matters: at k = 1
 * the term vanishes and the film's transform is EXACTLY identity, so the
 * hand-off to the untransformed hero has nothing to snap.
 *
 * ON THE SPRING'S OVERSHOOT the term goes NEGATIVE — k peaks at 1.0023, so the
 * film lands a ten-thousandth SMALLER than the aperture rather than larger.
 * That is harmless and it is worth stating so nobody "fixes" it: both are past
 * 1 there, so both already cover the viewport, and the shutters' own
 * (1 − k) / 2 has gone negative too, which simply flips each panel about its
 * anchored edge and parks it off-screen. No hero background can appear at the
 * peak because at the peak there is no gap left to show it through.
 */
const BLEED = 0.006;

/**
 * Start the whole window on one clock. Returns the animation that owns the
 * timeline (the top shutter) so the caller can await its `finished`, or null
 * if the elements are not mounted.
 *
 * EVERY ANIMATION IS GIVEN THE SAME EXPLICIT `startTime`. Created in one task
 * they would almost certainly share one anyway, but "almost certainly" is not
 * a guarantee, and the failure mode is the seam above.
 */
export function playIntroWindow(tl: WindowTimeline): Animation | null {
  const { k, times, ease, duration, shutters, endInset } = tl;
  const [top, bottom, left, right] = shutters;
  if (!top || !bottom || !left || !right) return null;

  // Per-keyframe `easing` in WAAPI applies to the interval STARTING at that
  // keyframe, so segment i's curve rides keyframe i and the last keyframe
  // carries none. The animation-level easing must stay linear or it composes
  // on top of these and quietly re-shapes every segment.
  const frames = (value: (kv: number, i: number) => string) =>
    k.map((kv, i) => ({
      transform: value(kv, i),
      offset: times[i],
      ...(i < ease.length ? { easing: ease[i] } : {}),
    }));

  const opts: KeyframeAnimationOptions = {
    duration,
    easing: "linear",
    fill: "forwards",
  };

  // (1 − k) / 2 everywhere except the last keyframe, which lands on the hero
  // panel's own edge. Identical while the insets are zero.
  const shut = (kv: number, i: number, edge: number) =>
    i === k.length - 1 ? edge : (1 - kv) / 2;

  const anims = [
    top.animate(frames((kv, i) => `scaleY(${shut(kv, i, endInset.top)})`), opts),
    bottom.animate(frames((kv, i) => `scaleY(${shut(kv, i, endInset.bottom)})`), opts),
    left.animate(frames((kv, i) => `scaleX(${shut(kv, i, endInset.side)})`), opts),
    right.animate(frames((kv, i) => `scaleX(${shut(kv, i, endInset.side)})`), opts),
  ];

  if (film) {
    filmAnim = film.animate(
      frames((kv) => `scale(${kv + BLEED * (1 - kv)}) translateZ(0)`),
      opts,
    );
    anims.push(filmAnim);
  }

  const t0 = document.timeline.currentTime;
  if (typeof t0 === "number") for (const a of anims) a.startTime = t0;

  return anims[0];
}

/**
 * Hand-off. The film's resting CSS transform is `scale(1) translateZ(0)`,
 * which is what the last keyframe holds, so cancelling a forwards-filling
 * animation here changes nothing on screen — it only stops the hero carrying
 * a finished animation (and a promoted layer) for the rest of the session.
 */
export function releaseIntroFilm() {
  filmAnim?.cancel();
  filmAnim = null;
  if (film) film.style.willChange = "auto";
}
