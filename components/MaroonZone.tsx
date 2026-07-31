import styles from "./MaroonZone.module.css";

/**
 * The page's mid-scroll MAROON ZONE — one continuous dark ground under the
 * About story, the As Seen In credential and the photo interlude, so the
 * three read as a single chapter band. The zone simply ENDS after the
 * interlude; the cream journal below carries its own ground.
 *
 * IT IS ALSO THE TRANSITION. Leaving "Our Restaurants." used to be a
 * separate gesture — a fixed maroon panel sweeping up the viewport ahead of
 * the chapter it introduced, which meant the ground arrived on one clock
 * and the content on another. There is no panel now. This zone's own
 * maroon is opaque and it sits above the restaurant chapter in the stacking
 * order, so the thing climbing over the grid is simply the About chapter
 * itself — one object, one clock, and nothing that exists purely to cover
 * something else. ChapterPin holds the grid still underneath it.
 *
 * No client hooks left here at all — it is a plain server component now.
 */
export default function MaroonZone({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={styles.zone}>{children}</div>;
}
