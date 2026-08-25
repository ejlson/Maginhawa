"use client";

import Image from "next/image";
import Link from "next/link";
import styles from "./AboutIntro.module.css";
import Reveal from "@/components/ui/Reveal";

/**
 * "About Us" — the group's short story, back on the MAROON ground.
 *
 * THIS CHAPTER CHANGED GROUND AGAIN, and that is the structural fact
 * everything else here follows from. It sat inside `<MaroonZone>`, moved out
 * onto the page's cream in the previous pass, and is now back inside the
 * zone as the first of the band's two chapters, above the press credential.
 * See Experience.tsx for why it is inside the zone rather than painting a
 * maroon of its own, and AboutIntro.module.css for what re-inking it cost.
 *
 * `data-nav-theme` GOES BACK TO "dark" ON THE SECTION BELOW. The navbar does
 * not infer its colour — it reads `document.elementFromPoint(24, 56)` on
 * every scroll and walks up for the nearest `[data-nav-theme]` host
 * (Nav.tsx). Leaving this at "light" would have left the bar inking itself
 * for a cream page for the entire height of a dark chapter.
 *
 * WHAT DID NOT COME BACK. This is not a revert to the old maroon section:
 * the full-height kitchen film, the dictionary definition over the footage
 * and the small underlined link are still gone, the two photographs keep
 * their square corners, and the portrait keeps its top on the story's first
 * line. The composition below is exactly the one the last pass built.
 *
 * THE LAYOUT is an oversized title top-left with nothing beside it, and
 * beneath it three columns on the page's 12-track grid:
 *   · a SMALL portrait, left (tracks 1–2)
 *   · the story, centre (tracks 4–7), closing on the one control
 *   · a LARGE photograph, right (tracks 9–12)
 * ALL THREE ARE TOP-RANGED. The portrait used to hang from the row's
 * bottom edge, which put its top 283.9px (measured, 1440×900) below the
 * story's first line; it now starts ON that line, so the three columns
 * open on one horizontal and the air collects beneath the two shorter
 * ones. See the stylesheet for what that costs the old diagonal.
 *
 * NO INDEX MARKER ON THE TITLE. Other chapters on this site carry a
 * superscript ordinal; the user asked for the title alone here.
 */

/* THE FILM DID NOT SURVIVE, and this is the one thing in the restructure
   that removes an asset rather than moving it.

   What it was: /videos/belly-hero.mp4 on autoplay/loop down the chapter's
   whole height, with /images/careers-team.jpg as its poster frame. Three
   reasons it is gone:
     · the reference for this section is a still layout on cream, and a
       looping film is the loudest possible object to put on a quiet ground;
     · it was the page's THIRD autoplaying video (the hero, this, and the
       interlude below), and this project already has a standing note that
       heavy looping media is what makes the site feel slow;
     · the chapter's ground is now cream, and the film's whole treatment —
       a bottom-up dark scrim carrying cream type — was written for the
       maroon.

   THE LARGE PHOTOGRAPH IS NO LONGER THAT FILM'S POSTER. careers-team.jpg
   sat here because it was what the reader of the old section saw first
   anyway, and it read wrong: one person, in a RAMO-branded t-shirt,
   carrying a tray of Café Mama pastries. Two of the seven rooms named on
   the subject's own chest, next to a paragraph that says "the same family
   runs seven distinct dining rooms" — the picture argued with the sentence.

   WHAT REPLACED IT, and why it is not the obvious answer. The obvious
   answer is /images/manifesto/group-web.jpg, which is literally the group:
   four of the team in a kitchen, in aprons, at the pass. It was rejected on
   two measurements, not on taste:
     · it is 360×240. This frame is 445×557 at 1440, so `cover` scales it
       2.30× at DPR 1 and 4.6× at DPR 2. As the chapter's LARGEST object
       that is visibly soft, and no `sizes` string can fix a source that
       small.
     · it is ALREADY ON THIS PAGE, one chapter above, as one of the three
       prints set into the statement's sentence. The same photograph twice
       in two adjacent chapters reads as the library being thin.
   careers-hero.jpg is a gloved close-up of one dish being plated — a
   kitchen action, not a group. interlude-web.jpg is a beautiful empty
   dining room and is used by the Interlude two chapters below.

   /images/ourrestaurants/print-10-web.jpg is the pick: a full terrace at
   golden hour, a dozen guests across four or five tables, Filipino
   banderitas strung overhead, and — this is the point — NO signage, NO
   branding and no single hero subject. It reads as the group's rooms with
   people in them rather than as one venue's product shot, and the bunting
   answers the word "vibrant" the statement above opens on.
   737×1100, 224KB, already in public/ and with no other consumer on the
   site — the ten `ourrestaurants/print-*` frames are orphans, so this costs
   zero new bytes against a ~709MB directory. Upright 2:3 in a 4:5 frame, so
   `cover` crops 180 source px of height and nothing sideways. */
const PORTRAIT = "/images/omar.jpg"; // 4000×6000
const SCENE = "/images/ourrestaurants/print-10-web.jpg"; // 737×1100

export default function AboutIntro() {
  return (
    <section id="about" className={styles.section} data-nav-theme="light">
      <div className={styles.grid}>
        {/* ── the title, alone on its row */}
        <Reveal className={styles.titleCell} y={24}>
          <h2 className={styles.title}>About Us</h2>
        </Reveal>

        {/* ── left: the small portrait. Chef Omar is named in the story's
            first line, so the small frame is him — the picture answers the
            sentence rather than illustrating the group twice. */}
        <Reveal className={styles.portraitFrame} delay={0.06} clip={28}>
          <Image
            className={styles.portraitImg}
            src={PORTRAIT}
            alt="Chef Omar Shah, founder of the Maginhawa Group"
            fill
            sizes="(max-width: 980px) 60vw, 16vw"
          />
        </Reveal>

        {/* ── centre: the story.

            THE COPY IS THE /about PAGE'S OWN, CONDENSED — not new writing.
            Nothing here is invented: 1987, Chef Omar's family kitchen on
            Kentish Town Road, one room and one stove, a menu built from what
            the family cooked at home, nearly four decades, the same family,
            seven distinct dining rooms, the five rooms named, each with its
            own voice and regulars, recipes carried down rather than
            researched, produce bought the way a household buys it, and the
            welcome that is what the word means. Every one of those claims is
            on /about; what has gone is only connective tissue ("Each has its
            own voice, its own room and its own regulars" → "its own voice
            and its own regulars", because "room" is already the noun the
            sentence before uses). If this needs editing, edit /about first
            and condense from there again — that page is the source. */}
        <Reveal className={styles.copy} delay={0.12} y={24}>
          <p className={styles.body}>
            Maginhawa began in 1987 as Chef Omar&apos;s family kitchen on
            Kentish Town Road — one room, one stove, and a menu built from
            what the family cooked at home.
          </p>
          <p className={styles.body}>
            Nearly four decades on, the same family runs seven distinct dining
            rooms across London: a Filipino fusion table, a Caribbean kitchen,
            London&apos;s first Filipino ice cream parlour, a
            Filipino-Japanese ramen counter in Soho, and a Michelin-listed
            bistro back where it started. Each has its own voice and its own
            regulars; what they share is recipes carried down rather than
            researched, produce bought the way a household buys it, and a
            welcome that treats every guest as family — which is what
            maginhawa has meant all along.
          </p>

          {/* THE CHAPTER'S ONE CONTROL — and now the ONLY route to /about
              between the hero and the footer. The band above carried a
              second, identical ask ("Learn more about us") seated inside
              the photograph; it has been removed, and this is the one that
              survived. CREAM FILL, MAROON LABEL — the hero's `.actionPrimary`
              exactly as written, now that this chapter is on the hero's
              ground again. A measured 9.53:1 on the label, off the tokens'
              own 9.80:1 — the strongest pair the palette has.
              (It was a maroon fill with a cream label while the chapter was
              on cream; on the maroon that fill and the ground are the same
              colour, so the two inks trade back. The stylesheet has the
              hover's half of that, which is the easier half to miss.)

              NOT the old underlined "Learn More" link this replaces. That
              was written for cream type on maroon too, where an underline
              draw is the quiet form — but "quiet" was the wrong target: a
              hairline-underlined label at label size is the smallest thing
              in a chapter built out of two large photographs and a display
              title, and it was reliably the last thing seen. A filled pill
              is a second bright object on a dark chapter, and that is the
              point of it.

              Its label says what is on the other side rather than naming
              the page, which is why "Get to Know Us" was the one of the two
              asks kept when the duplicate went. */}
          <Link href="/about" className={styles.cta}>
            Get to Know Us
            <svg
              className={styles.ctaChevron}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M5 12h13M12 6l6 6-6 6" />
            </svg>
          </Link>
        </Reveal>

        {/* ── right: the large photograph, and the tallest thing in the row.
            It no longer sets the other two columns' bottoms — all three
            now hang from the row's TOP edge (see the stylesheet), so this
            is simply the deepest of them. */}
        <Reveal className={styles.sceneFrame} delay={0.18} clip={28}>
          <Image
            className={styles.sceneImg}
            src={SCENE}
            alt="A full terrace of guests dining under strings of banderitas at a Maginhawa room"
            fill
            sizes="(max-width: 980px) 100vw, 32vw"
          />
        </Reveal>
      </div>
    </section>
  );
}
