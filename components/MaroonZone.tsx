import styles from "./MaroonZone.module.css";

/**
 * The page's mid-scroll MAROON ZONE — the dark ground under the About story
 * and the "Featured In" credential.
 *
 * IT CARRIES TWO CHAPTERS AGAIN. It held three once (About, the press
 * credential and the photo interlude); the interlude took its own maroon
 * with it in an earlier pass, About left for the cream in the one after
 * that, and About has now come back (see AboutIntro.tsx and Experience.tsx).
 * That return is exactly the case this wrapper was kept alive for while it
 * held a single chapter: the ground is a property of the BAND rather than of
 * the section, so a second dark chapter can be seated beside the press wall
 * without either of them having to own a background. There is one element
 * painting this colour and no seam anywhere inside it.
 *
 * `flow-root` IS LOAD-BEARING AGAIN, AND THIS IS WHY IT WAS KEPT. The note
 * below records that About's top margin used to collapse out through this
 * box and drag 400-odd pixels of cream down the screen ahead of the dark
 * ground, and that the press wall pads rather than margins so nothing
 * escaped today. About is back above the press wall, so "today" has changed:
 * the containment is doing real work again rather than standing by.
 *
 * IT IS ALSO THE TRANSITION. Leaving "Our Restaurants." used to be a
 * separate gesture — a fixed maroon panel sweeping up the viewport ahead of
 * the chapter it introduced, which meant the ground arrived on one clock
 * and the content on another. There is no panel now. This zone's own
 * maroon is opaque and it sits above the restaurant chapter in the stacking
 * order, so the thing climbing over the grid is simply the About chapter
 * itself — one object, one clock, and nothing that exists purely to cover
 * something else. The chapter above it used to be HELD still underneath
 * (ChapterPin, now deleted); it scrolls away normally, so this zone simply
 * arrives on top of it.
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
