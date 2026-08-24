import styles from "./PlateDate.module.css";

/**
 * ═══ THE DATE, ON THE PLATE ═══
 *
 * Bottom-right of a story's photograph, opposite the venue's mark.
 *
 * WHERE IT CAME FROM: the back half of a meta line under the headline —
 * "Forbes · 11 Feb 2026". On the plate it costs the card no height at all
 * and it balances the mark in the opposite corner, which is what let both
 * journal surfaces drop that line entirely: the outlet leads the headline
 * now (see headline() in lib/blog.ts) and the date is here.
 *
 * ⚠️ IT MUST BE A CHILD OF THE MEDIA BOX, for two reasons. It clips to the
 * plate's radius and rides the same frame the mark does; and its wash is
 * sized in `cqi`, which resolves against the nearest inline-size container —
 * the media box on both surfaces. Placed anywhere else the wash falls back
 * to the viewport and is the wrong size on every card.
 *
 * `pointer-events: none` in the stylesheet, because the whole plate is a
 * link and a date is not a second target on it.
 */
export default function PlateDate({ children }: { children: React.ReactNode }) {
  return <span className={styles.date}>{children}</span>;
}
