/* THE INTERLUDE → BLOG HANDOFF.
 *
 * The full-bleed "One family, seven kitchens." photograph does not simply
 * scroll away: it shrinks and travels into the journal reel's first card, so
 * the statement literally becomes the first entry. That is a shared-element
 * transition between two sections that are neither parent and child nor even
 * siblings under the same wrapper — Interlude lives inside MaroonZone, Blog
 * sits outside it — so they need a channel that is not the React tree.
 *
 * It is deliberately tiny and deliberately NOT context: everything that
 * changes per frame (the flight progress, the reel's entrance) travels as a
 * MotionValue write, never as state, so neither section re-renders while the
 * photograph is in the air. Only two booleans ever reach React — "a morph is
 * mounted" and "the photograph is airborne" — and each flips twice a visit.
 *
 * Interlude is the driver; Blog is the landing site. If no Interlude ever
 * registers (another page, or reduced motion), Blog falls back to its own
 * viewport-triggered entrance and nothing here is used.
 */

export type BlogLanding = {
  /** the first card's plate rect, corrected for the reel's own entrance
      transform — i.e. where the card WILL be, not where it currently is */
  seat: () => DOMRect | null;
  /** a morph is mounted and will drive the reel's entrance */
  onMorph: (active: boolean) => void;
  /** the photograph is in the air — the card holds its cover back */
  onFlying: (flying: boolean) => void;
  /** flight progress, straight into a MotionValue (no render) */
  push: (v: number) => void;
};

let landing: BlogLanding | null = null;
let morphActive = false;

/** Blog announces itself as the landing site. */
export function registerLanding(next: BlogLanding) {
  landing = next;
  // the interlude may have mounted first — tell the newcomer where we are
  next.onMorph(morphActive);
  return () => {
    if (landing === next) landing = null;
  };
}

/** Interlude announces (or withdraws) the morph. */
export function setMorphActive(active: boolean) {
  morphActive = active;
  landing?.onMorph(active);
}

export function setFlying(flying: boolean) {
  landing?.onFlying(flying);
}

export function pushProgress(v: number) {
  landing?.push(v);
}

export function landingSeat() {
  return landing?.seat() ?? null;
}
