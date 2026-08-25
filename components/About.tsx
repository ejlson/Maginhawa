"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import Image, { getImageProps } from "next/image";
import {
  cubicBezier,
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import Nav from "./Nav";
import Menu from "./Menu";
import Footer from "./Footer";
import DarkZone from "./DarkZone";
import Reveal from "./Reveal";
import styles from "./About.module.css";
/* the native-cursor opt-out that has to travel with every
   data-cursor="default" — see .optOut in that file */
import cursor from "./CustomCursor.module.css";
import { FEATURED_OUTLETS, PRESS } from "@/lib/press";
import { getRestaurant } from "@/lib/restaurants";
import { asset } from "@/lib/media";

const OUTLET_PRIORITY = new Map(FEATURED_OUTLETS.map((o, i) => [o.name, i]));
const priorityOf = (name: string) => OUTLET_PRIORITY.get(name) ?? Infinity;

/* The nine chapters of the group's story, oldest first. The timeline renders
   each chapter's INDEX ENTRY — the year on the spine, the photograph in its
   seat, the title as the link out — while `body` and `place` ride along as
   the chapter's full record. The archive treatment deliberately does not
   print prose (see TimelineItem); the fields stay because they are the story,
   not because anything currently spends them.

   `slug` links the chapter to its restaurant. Geometry lives in SEATS below,
   dealt by position rather than derived from anything in here. */
const CHAPTERS: {
  year: string;
  title: string;
  body: string;
  image: string;
  imageAlt: string;
  /* object-position for the frame, when a centred crop would cut the
     subject. The chapter frames are 4/3 with a 128% vertical overscan for
     the parallax, so a 16/9 photograph keeps only its middle ~59% of width —
     enough to slice anything living near an edge. Omit for a centred crop. */
  focus?: string;
  place: string;
  slug?: string;
}[] = [
  {
    year: "1987",
    title: "Bintang opens in Camden",
    body: "Chef Omar's parents open the original family restaurant on Kentish Town Road - a Filipino kitchen with a fusion accent that becomes a neighbourhood fixture.",
    image: "/images/bintang.jpg",
    imageAlt: "Bintang's dining room in Camden",
    place: "Camden",
    slug: "bintang",
  },
  {
    year: "2007",
    title: "Guanabana arrives",
    body: "A halal-certified Caribbean and Latin American kitchen joins the family in Kentish Town. The Sunday Island Roast becomes a neighbourhood ritual.",
    image: "/images/guanabana.jpg",
    imageAlt: "Guanabana, Kentish Town",
    place: "Kentish Town",
    slug: "guanabana",
  },
  {
    year: "2017",
    title: "Mamasons",
    body: "London's first Filipino ice-cream parlour brings dirty ice cream from Manila's street stalls to Camden, Soho and Shoreditch.",
    image: "/images/cafemama.jpg",
    imageAlt: "Mamasons-era street counter",
    place: "Camden · Soho",
    slug: "mamasons",
  },
  {
    year: "2018",
    title: "Ramo Ramen",
    body: "The world's first Filipino-Japanese ramen joint opens on Kentish Town Road; a second site follows in Soho in 2021.",
    image: "/images/ramo.jpg",
    imageAlt: "Ramo Ramen dining room",
    place: "Kentish Town",
    slug: "ramo",
  },
  {
    year: "2025",
    title: "Hoodwood",
    body: "A Caribbean takeaway opens with the Jacket Exchange — trade a winter coat, take a free jerk jacket potato.",
    image: "/images/hoowood.jpg",
    imageAlt: "Hoodwood, Kentish Town",
    place: "Kentish Town",
    slug: "hoodwood",
  },
  {
    year: "2025",
    title: "Café Mama & Sons",
    body: "A Filipino-Japanese café and bakery brings hand-crafted sandos and the award-winning Longanisa Breakfast Burger to the morning crowd.",
    image: "/images/cafemama.jpg",
    imageAlt: "Café Mama & Sons storefront",
    place: "Kentish Town",
    slug: "cafemama",
  },
  {
    year: "2025",
    title: "Belly",
    body: "A modern Filipino bistro opens in Kentish Town — Chef Omar's most personal kitchen, reading Filipino flavour through a French lens.",
    image: "/images/belly.jpg",
    imageAlt: "Belly dining room, Kentish Town",
    place: "Kentish Town",
    slug: "belly",
  },
  {
    year: "2026",
    title: "Belly enters the Michelin Guide",
    body: "Belly is added to the Michelin Guide for Greater London — recognising thirty-eight years of Filipino kitchens in London.",
    image: "/images/belly.jpg",
    imageAlt: "Belly added to the Michelin Guide",
    place: "Kentish Town",
    slug: "belly",
  },
  {
    year: "2026",
    title: "Bunso",
    body: "The youngest of the family: a Filipino-Japanese kissaten and listening jazz bar, opening in London in 2026.",
    /* ⚠️ `-shopfront`, AND THE SUFFIX IS LOAD-BEARING — this row read
       /images/bunso.png, the 670x141 wordmark, and rendered as the
       coming-soon maroon field instead of a picture. The photograph cannot
       be called /images/bunso.jpg: Cloudinary public ids drop the extension,
       so the JPG and the PNG would both resolve to `maginhawa/images/bunso`.
       See the same note in lib/venueCards.ts, which is where this asset was
       already live. */
    image: "/images/bunso-shopfront.jpg",
    imageAlt: "Bunso shopfront, Hawley Road",
    /* 71%, AND IT IS MEASURED. The sign on the facade runs from 67.5% to 82%
       of the source width; a centred crop shows 20.7%-79.3% and cut it to
       "BUNS". 71% slides the window to 29.4%-88%, which holds the whole
       wordmark with air after it. Re-measure if the photograph is replaced. */
    focus: "71% 50%",
    place: "London",
    slug: "bunso",
  },
];

/* ---------------------------------------------------------------------------
   THE SCATTER IS DEALT BY POSITION, NOT RANDOMISED.

   The retired deck seated nine photographs on a centred spine with per-card
   spans, offsets and crops. The chapters are ordinary rows now — one frame,
   one column of copy, ranged to the margin they belong to — and the only thing
   dealt is how far each pair is pushed IN from that margin.

   Math.random() would compose the page differently on every load, which is not
   a design; it is noise that looks composed once. A literal is identical on
   the server and in the browser by definition, and a chapter can be re-ordered
   without silently re-dealing the layout under it. (The retired SEATS table
   made the same argument and it still holds.)

   WHAT THE NUMBERS SAY, printed because a table is only composed if somebody
   has checked what it reads as:

     side    L   R   L   R   L   R   L   R   L
     inset   0  96 212  24 132 268  56 160  96
     shape   L   P   L   P   L   P   L   P   L

   · no two neighbours share an inset
   · never monotonic for more than two steps, so it never reads as a ramp
   · 0 opens the sequence, so chapter one still lands hard on the margin and
     the scatter has something to be measured against
   · 268 is the deepest, against the 420px available before a pair would cross
     the centre line — so even that row keeps its side
   · the shapes alternate landscape/portrait, which is what stops six files
     serving nine chapters from reading as one repeated rectangle

   THE ALTERNATION DOES NOT VARY, only the amplitude. Breaking both at once
   stops reading as a scatter and starts reading as a fault. */
const INSETS = [0, 96, 212, 24, 132, 268, 56, 160, 96];
const SHAPES: ("land" | "port")[] = [
  "land", "port", "land", "port", "land", "port", "land", "port", "land",
];

/** one row per chapter, zipped with the deal above */
const STORY = CHAPTERS.map((chapter, index) => ({
  ...chapter,
  index,
  inset: INSETS[index] ?? 0,
  shape: SHAPES[index] ?? "land",
  side: index % 2 === 0 ? ("l" as const) : ("r" as const),
}));

/* NO DATE. lib/press.ts carries 24 entries and 23 of them have `date: "—"`,
   so the column this row used to reserve was blank on all but one line —
   a fixed 48-72px track and its gutter held open across the whole table to
   print a single "2025". A reserved empty track is worse than no track: it
   reads as data that failed to load. The column is removed rather than
   hidden, so nothing is left paying grid for it; if the dates ever arrive it
   comes back with them. */
type CoverageRow = {
  outlet: string;
  feature: string;
  restaurants: string[];
  url: string;
};

// missing-photograph guard — this `image` path is a placeholder that does not
// exist under /public. A timeline chapter resolving to it renders the maroon
// coming-soon field rather than a broken <img>.
//
// Mamasons has come off this list: lib/restaurants.ts pointed at
// `/images/mamasons-placeholder.jpg`, which was never added, so the grid tile
// on /restaurants was blank and this guard was quietly covering for it on
// /about. It now uses the same photograph Discover shows on the home page, so
// there is a real file behind it and nothing to suppress.
//
// ⚠️ NOTHING RESOLVES TO THIS PATH TODAY, and the guard is kept anyway. It
// read as Bunso's — Bunso had no picture, so its timeline chapter fell back to
// the coming-soon field. It has the shopfront now, so the set matches no
// record. What it still does is catch the NEXT placeholder: CHAPTERS and
// lib/restaurants.ts are both hand-edited, and a chapter naming a file that is
// not in public/ should not render a broken <img>. Add the path here.
const MISSING_IMAGES = new Set(["/images/bunso-placeholder.jpg"]);

/* The restaurants that actually have press, most-covered first, as names.
 *
 * DERIVED, NOT TYPED, because the sentence it feeds says a number and a list
 * and both have to stay true: four of the seven kitchens have no coverage at
 * all today, and the first write-up for any of them must put it in the line
 * rather than leave the line quietly wrong. See .coverageCount. */
const COVERED_RESTAURANTS: string[] = (() => {
  const n = new Map<string, number>();
  for (const p of PRESS)
    for (const slug of p.restaurants) n.set(slug, (n.get(slug) ?? 0) + 1);
  return [...n.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([slug]) => getRestaurant(slug)?.name ?? slug);
})();

const COVERAGE_GROUPS: { outlet: string; entries: CoverageRow[] }[] = (() => {
  const byOutlet = new Map<string, CoverageRow[]>();

  for (const p of PRESS) {
    const row: CoverageRow = {
      outlet: p.outlet,
      feature: p.feature,
      restaurants: p.restaurants.map((s) => getRestaurant(s)?.name ?? s),
      url: p.url,
    };

    if (!byOutlet.has(p.outlet)) byOutlet.set(p.outlet, []);
    byOutlet.get(p.outlet)!.push(row);
  }

  return [...byOutlet.entries()]
    .map(([outlet, entries]) => ({ outlet, entries }))
    .sort((a, b) => priorityOf(a.outlet) - priorityOf(b.outlet));
})();

/* ---------------------------------------------------------------------------
   A DISPLAY LINE FITTED TO ITS COLUMN.

   "OUR STORY" spans the measure edge to edge. Doing that in CSS means a
   font-size and a letter-spacing that are correct at exactly one width, so it
   is measured instead: the face is scaled until the words nearly fill the
   column, then whatever is left over is divided between the letters.

   THREE THINGS IT HAS TO SURVIVE, and all three have bitten this codebase
   before:
     · THE SERVER. No measuring on the server — it renders at the CSS size and
       the effect corrects it after mount, so the markup is identical either
       way and the line is readable with no JS at all.
     · THE FACE ARRIVING. Contralto comes in over the two-hop Adobe stylesheet
       (app/layout.tsx), so a cold cache measures the FALLBACK's metrics and
       latches a wrong size. Same trap, and the same fix, as Discover's
       fitTitle and JoinUs's seam geometry.
     · A RESIZE. The column width is the whole input, so it re-fits on resize.

   THE TEXT IS MEASURED, NOT THE BOX. scrollWidth on a block is at least its
   own content-box width, so measuring the <h2> reports the column width
   whatever the type is doing and the whole pass silently becomes a no-op. The
   inner span is inline-block: its offsetWidth IS the text.
   --------------------------------------------------------------------------- */
function FitLine({ className, text }: { className?: string; text: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const reduce = useReducedMotion();

  /* THE LETTERS ARRIVE ONE AT A TIME, and the latch is a class rather than
     state: the effect below already owns this node, and re-rendering nine
     children to flip one boolean is work for nothing. `once` — the line does
     not re-play every time it is scrolled past, which at this scale would be
     the most distracting thing on the page. */
  useEffect(() => {
    const el = ref.current;
    if (!el || reduce) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.dataset.lit = "";
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduce]);

  useLayoutEffect(() => {
    const el = ref.current;
    const inner = el?.firstElementChild as HTMLElement | null;
    if (!el || !inner) return;

    const fit = () => {
      const target = (el.parentElement as HTMLElement | null)?.clientWidth ?? 0;
      if (!target) return;
      el.style.marginRight = "0px";
      el.style.letterSpacing = "0px";
      el.style.fontSize = "100px";
      const natural = inner.offsetWidth;
      if (!natural) return;
      /* leave ~4.5% of the measure for the tracking to spend — sizing alone
         can never land exact, tracking alone blows the word apart */
      el.style.fontSize = `${(100 * (target / natural) * 0.955).toFixed(2)}px`;
      const gaps = Math.max(1, text.trim().length - 1);
      const ls = (target - inner.offsetWidth) / gaps;
      el.style.letterSpacing = `${ls.toFixed(3)}px`;
      /* tracking is applied after the FINAL glyph too, so the line would sit
         one gap proud of the right edge; the negative margin takes it back */
      el.style.marginRight = `${(-ls).toFixed(3)}px`;
    };

    fit();
    document.fonts?.ready.then(fit).catch(() => {});
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [text]);

  /* SPLIT AFTER THE MEASUREMENT IS SAFE, and it has to be: the effect above
     reads `inner.offsetWidth`, and inline-block characters box each glyph
     separately. Kerning pairs are lost by that — which costs nothing here,
     because the fitted tracking has already overridden the pair table. The
     transforms below never touch layout, so the fit stays exact once made. */
  return (
    <h2 ref={ref} className={className} data-reduce={reduce ? "" : undefined}>
      <span>
        {Array.from(text).map((ch, i) =>
          ch === " " ? (
            <span key={i} className={styles.fitSpace}>
              {"\u00a0"}
            </span>
          ) : (
            <span
              key={i}
              className={styles.fitChar}
              style={{ "--i": i } as CSSProperties}
            >
              {ch}
            </span>
          ),
        )}
      </span>
    </h2>
  );
}

/* ---------------------------------------------------------------------------
   ONE CHAPTER — its own component, and that is forced rather than stylistic:
   each row owns a useScroll, which is a hook and so cannot live inside the
   parent's .map. Nothing in here reports upward.

   THE DRIFT IS TWO LAYERS OFF ONE PROGRESS, which is why it reads as depth
   rather than as a moving picture:
     · the FRAME travels 56px against the scroll across the row's pass, so the
       photograph and its own caption separate as the row crosses the window —
       the text holds the layout, the picture does not.
     · the PICTURE travels inside the frame on top of that. It is 128% of the
       frame's height, so there is 28% of slack, 14% either side; ±10% spends
       it and keeps 4% in hand, so an edge can never appear however the row is
       sized.
   Both are transforms, so nine drifting rows cost no reflow, and both come off
   the same MotionValue so they cannot separate by a frame.

   HEADROOM HAS TO EXCEED AMPLITUDE. The frames climb up to 56px against the
   scroll; the chapter list carries 88px above it for exactly that reason (see
   .chapters), or chapter one sits on the standfirst at the top of its pass.
   --------------------------------------------------------------------------- */
function ChapterRow({ chapter }: { chapter: (typeof STORY)[number] }) {
  const ref = useRef<HTMLLIElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  /* 0.5 is the row at the window's centre; the row's pass maps to -1 .. 1 */
  const figY = useTransform(scrollYProgress, [0, 1], [56, -56]);
  const imgY = useTransform(scrollYProgress, [0, 1], ["-10%", "10%"]);

  const missing = MISSING_IMAGES.has(chapter.image);

  return (
    <li
      ref={ref}
      className={`${styles.chapter} ${
        chapter.side === "l" ? styles.chapterL : styles.chapterR
      }`}
      style={{ "--inset": `${chapter.inset}px` } as CSSProperties}
    >
      <motion.div
        className={`${styles.chapterFig} ${
          chapter.shape === "port" ? styles.figPort : styles.figLand
        }`}
        style={reduce ? undefined : { y: figY }}
      >
        {missing ? (
          /* no photograph on file — the name on a maroon field, which is the
             coming-soon treatment the Discover tile already uses.

             ⚠️ THE `wordmark` OPT-IN THAT ALSO REACHED HERE IS GONE. Bunso
             was its only caller and it now has a shopfront, so the flag was
             a branch no row could take. MISSING_IMAGES is the one way in. */
          <span className={styles.chapterMark} aria-hidden>
            {chapter.title}
          </span>
        ) : (
          <motion.div
            className={styles.chapterImg}
            style={
              {
                ...(reduce ? {} : { y: imgY }),
                ...(chapter.focus ? { "--focus": chapter.focus } : {}),
              } as CSSProperties
            }
          >
            <Image
              src={chapter.image}
              alt={chapter.imageAlt}
              width={600}
              height={720}
            />
          </motion.div>
        )}
      </motion.div>

      <div className={styles.chapterText}>
        <Reveal>
          <p className={styles.chapterYear}>{chapter.year}</p>
          <h3 className={styles.chapterTitle}>{chapter.title}</h3>
        </Reveal>
        <Reveal delay={0.08}>
          <p className={styles.chapterBody}>{chapter.body}</p>
          <p className={styles.chapterPlace}>{chapter.place}</p>
        </Reveal>
      </div>
    </li>
  );
}

export default function About() {
  const [menuOpen, setMenuOpen] = useState(false);

  /* ---- the film, and the three sections that sit on it ----
     The <video> is a sticky 100svh backdrop; the story head, the nine chapter
     rows and the founder's block all scroll over the same frame, and the
     Awards sheet finally covers it. One photograph under three subjects is
     what removes the seams between them — there are none to hide, only space
     to separate them with.

     WHAT WENT. A 320svh runway with a sticky stage in it, "About Us" parting
     into two words, the film growing in the hole they opened, a nineteen-word
     scrubbed statement and a nine-card deck seated on a spine. All of it was a
     pure function of scroll and all of it was reversible, which was the good
     part — but the page took two and a bit screens to answer its own question
     and the deck's geometry was a table nobody could edit safely. The hero
     lands complete on cream now and the chapters are rows. */
  const reduceMotion = useReducedMotion();

  /* THE FILM STARTS WITH THE PAGE. It used to wait for the reader's first
     scroll, which was right while the first screen was two words of maroon
     type on cream. The first screen is cream again — but the film is the
     ground for everything under it and a poster held under moving type reads
     as a stall, so it plays from mount. Reduced motion never fetches it: the
     poster is a complete backdrop on its own. */
  const videoRef = useRef<HTMLVideoElement>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    /* BOTH FILMS, ONE RULE. The hero's portrait clip was carrying `autoPlay`
       in the markup, which no preference can reach — it played under
       prefers-reduced-motion while the backdrop behind it correctly did not,
       which is the one combination worse than either alone. Neither element
       autoplays from markup now; both start here, and neither is fetched at
       all when the preference is set. */
    const els = [videoRef.current, heroVideoRef.current].filter(
      (v): v is HTMLVideoElement => !!v,
    );
    for (const v of els) {
      if (reduceMotion) {
        v.pause();
        continue;
      }
      v.preload = "auto";
      /* rejects when the browser declines to start — a poster is already on
         screen in both cases, so there is nothing to recover */
      void v.play().catch(() => {});
    }
  }, [reduceMotion]);

  useEffect(() => {
    const html = document.documentElement;
    const prevHtml = html.style.backgroundColor;
    const prevBody = document.body.style.backgroundColor;

    html.style.backgroundColor = "";
    document.body.style.backgroundColor = "";
    document.body.classList.remove("is-loading");

    return () => {
      html.style.backgroundColor = prevHtml;
      document.body.style.backgroundColor = prevBody;
    };
  }, []);

  return (
    <>
      <Nav
        started
        menuOpen={menuOpen}
        onMenuToggle={() => setMenuOpen((o) => !o)}
      />
      <Menu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main id="main-content" className={styles.page} data-nav-theme="light">
        {/* ═══════════════ 01 · THE CREAM HERO ═══════════════
             SIZED BY ITS CONTENTS, not by the viewport. The retired opening
             held one screen and then spent two more assembling itself; this
             is nav, headline and the answer beside it, and then the film
             starts. The whole line is Contralto caps — "Who is" used to be
             the UI face, and the question is one utterance.

             "IS" FOLLOWS "WHO", at the user's instruction. It ranged right
             against MAGINHAWA's far edge for a version — `width: max-content`
             makes the heading exactly as wide as its widest line, which IS
             "Maginhawa", so justifying line one across it was free — and the
             two words read as two words. Closed up, line one is a phrase. */}
        <section className={styles.opening} aria-label="About Maginhawa Group">
          <div className="container">
            <div className={styles.openGrid}>
              <h1 className={styles.openTitle}>
                {/* TWO ELEMENTS, ONE PHRASE. "Who" and "is" stay separate
                    spans because the line is a baseline flex row — see
                    .openLineIs — which is also what lets the gap between them
                    be declared rather than typed. It is a word-space today;
                    it was the width of the heading until the user asked for
                    the two words to sit together. */}
                <span className={`${styles.openLine} ${styles.openLineIs}`}>
                  <span className={styles.openWho}>Who</span>
                  <span className={styles.openIs}>is</span>
                </span>
                <span className={styles.openLine}>Maginhawa</span>
                {/* THE MARK CLOSES THE QUESTION, at the user's instruction —
                    it rode the name for a version, which put it in the middle
                    of the lockup with a line still to come after it. On the
                    last line it reads as the thing that answers the question
                    mark rather than as an object parked beside the name.

                    ⚠️ IT STILL SITS ON THE CAPITALS' OWN BASELINE, which is
                    why this line carries .openLineMark and the name above no
                    longer does — the class is the baseline flex row, not a
                    property of the word it used to follow.

                    ⚠️ AND IT STILL COSTS NO WIDTH, which is what keeps the
                    move free. .openLogo's end margin cancels its width and
                    its start margin exactly (see About.module.css), so
                    `width: max-content` on the heading goes on measuring
                    MAGINHAWA — the longest line — and "is" on line one goes
                    on ranging to that same edge. Moving the mark to the
                    SHORTEST line would otherwise have been the one place
                    that could change the heading's measure. */}
                <span className={`${styles.openLine} ${styles.openLineMark}`}>
                  <span>Group?</span>
                  <span className={styles.openLogo} aria-hidden>
                    <Image
                      src="/logo/maginhawa.png"
                      alt=""
                      width={256}
                      height={256}
                    />
                  </span>
                </span>
              </h1>

              {/* THE ASIDE STRETCHES THE ROW. Its film's top sits on the
                  headline's top and its last line of prose closes with the
                  foot of "Group?" — which means the frame cannot also hold a
                  fixed aspect: its height is whatever the headline leaves. It
                  is a portrait crop of a portrait source, so `cover` keeps it
                  honest at every width. */}
              <div className={styles.openAside}>
                <div className={styles.openMedia}>
                  <video
                    ref={heroVideoRef}
                    className={styles.openMediaVideo}
                    src={asset("/videos/about-big.mp4")}
                    poster={asset("/images/omar.jpg")}
                    muted
                    loop
                    playsInline
                    preload="none"
                    aria-hidden
                  />
                </div>
                <div className={styles.openCopy}>
                <Reveal>
                  <p className={styles.openLede}>
                    A London family of restaurants, from a Camden kitchen in
                    1987 to seven distinct dining rooms today. Filipino,
                    Filipino-Japanese and Caribbean kitchens, a bakery and an
                    ice-cream counter, all still run by the same family.
                  </p>
                </Reveal>
                <Reveal delay={0.06}>
                  <p className={styles.openTag}>
                    Made with heritage,{" "}
                    <em className={styles.emItalic}>served with heart</em>.
                  </p>
                </Reveal>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════ 02 · THE FILM, AND WHAT SITS ON IT ═══════════════
             The video pins as a sticky backdrop and the story head, the nine
             chapters and the founder all scroll over the same frame. The
             constant scrim keeps cream type legible at every one of those
             positions. NB: .videoContent must not create a stacking context. */}
        <div
          className={styles.videoScope}
          data-nav-theme="blend"
          data-cursor="glass"
        >
          <div className={styles.videoBackdrop} aria-hidden>
            {/* A PLAIN FRAME. It used to carry x, scale and opacity off the
                opening's scrub — the picture grew out of the hole the title's
                two words opened. With the hero on cream there is nothing to
                grow: no inline transform, and no compositor layer held under
                the whole first half of the page. */}
            <div className={styles.filmFrame}>
              <video
                ref={videoRef}
                className={styles.heroVideo}
                src={asset("/videos/belly-hero.mp4")}
                poster={asset("/images/belly.jpg")}
                muted
                loop
                playsInline
                preload="none"
              />
              <div className={styles.videoScrim} />
            </div>
          </div>

          <div className={styles.videoContent}>
            <div className="container">
              <div className={styles.storyHead}>
                {/* A DATELINE, NOT A SECOND TITLE. The display line already
                    names the section, so an eyebrow repeating it would be the
                    same word twice at two sizes. The span is the one fact
                    neither the title nor the standfirst states as a figure —
                    and it is the marker the reference set hangs over its own
                    full-bleed frames. */}
                <Reveal>
                  <p className={styles.storyDateline}>
                    Est. Camden &middot; 1987 &mdash; 2026
                  </p>
                </Reveal>
                <FitLine className={styles.storyTitle} text="Our Story" />
                <Reveal delay={0.08}>
                  <p className={styles.storyStandfirst}>
                    Thirty-eight years of Filipino kitchens in London, in nine
                    openings. From a Camden dining room in 1987 to a place in
                    the Michelin Guide in 2026 &mdash; the same family, the same
                    welcome, set each time in a different kitchen.
                  </p>
                </Reveal>
              </div>

              <ol className={styles.chapters}>
                {STORY.map((chapter) => (
                  <ChapterRow key={chapter.title} chapter={chapter} />
                ))}
              </ol>

              {/* ---- The founder ----
                   Portrait centred and UNFILTERED. The grayscale this block
                   used to wear was a house treatment applied to the one
                   photograph on the page that is a person, and it made him
                   read as archive rather than as the man currently running the
                   kitchens. Two columns beneath at 34ch, narrower than the
                   measure around them so they read as a caption block. */}
              <section className={styles.owner} aria-labelledby="owner-name">
                <Reveal>
                  <p className={styles.ownerEyebrow}>The Owner</p>
                </Reveal>
                <Reveal delay={0.06} className={styles.ownerPortrait}>
                  <Image
                    src="/images/omar.jpg"
                    alt="Omar Shah, founder of the Maginhawa Group"
                    width={464}
                    height={576}
                  />
                </Reveal>
                <Reveal delay={0.12}>
                  <h2 className={styles.ownerName} id="owner-name">
                    Omar Shah
                  </h2>
                  <p className={styles.ownerRole}>
                    Founder &middot; Executive Chef
                  </p>
                </Reveal>
                <div className={styles.ownerCols}>
                  <Reveal delay={0.18}>
                    <p>
                      Omar grew up in his parents&rsquo; Camden dining room and
                      took the stove in his twenties. There was never a plan to
                      build a group &mdash; only a kitchen to keep open, and
                      then another one when the first got too small.
                    </p>
                  </Reveal>
                  <Reveal delay={0.24}>
                    <p>
                      Thirty-eight years and nine openings later he still writes
                      every menu in the group. Belly, the most personal of them,
                      was added to the Michelin Guide for Greater London in
                      2026.
                    </p>
                  </Reveal>
                </div>
              </section>
            </div>

            {/* IT OWNS ITS CURSOR, for the same reason the deck does and
                with a worse symptom. This sheet is inside the pinned video's
                data-cursor="glass" scope, so the glass disc was live over it —
                and a lens refracting a FLAT CREAM FIELD refracts nothing,
                while the disc's ring is itself cream. The disc was there and
                invisible, and globals.css hides the native cursor under
                [data-cursor="glass"] *, so the reader had no pointer at all
                over the whole Awards table. See resolve() in CustomCursor.tsx
                and the cursor rule in CustomCursor.module.css. */}
            <section
              className={`${styles.coverage} ${cursor.optOut}`}
              data-nav-theme="light"
              data-cursor="default"
            >
              <div className="container">
                {/* A REAL HEADING, AND IT IS THE SECOND HALF OF THE OUTLINE FIX.

                  This was a styled <span> with a saffron dot in front of it,
                  set at label size — so, like "Our Story" above it, the title
                  of a whole section existed only as decoration. Checked
                  first: there was no heading underneath it to collide with,
                  unlike /contact's FAQ, which turned out to carry a real <h2>
                  all along.

                  THE DOT AND THE EYEBROW SIZE GO WITH IT. An eyebrow is a
                  label ABOVE a title; with nothing under it, it was a title
                  pretending to be a label, and the dot was the only thing
                  giving it any presence. */}
                <div className={styles.coverageHead}>
                  <h2 className={styles.coverageTitle}>
                    Awards &amp; Recognition
                  </h2>

                  {/* THE COUNT, AND IT IS DELIBERATELY NOT A BOAST. Of the 24
                    entries in lib/press.ts, Belly carries 15, Café Mama &
                    Sons 8 and Hoodwood 3 — Bintang, Guanabana, Ramo and
                    Mamasons have none at all. "The group has been widely
                    covered" would therefore be false about four of the seven
                    kitchens, so the line names the three it is true of and
                    says the number out loud. Three facts, no adjectives.

                    Rendered from the data rather than typed, so a new press
                    entry cannot leave the sentence lying. */}
                  <p className={styles.coverageCount}>
                    {PRESS.length} write-ups to date, for{" "}
                    {COVERED_RESTAURANTS.join(", ").replace(
                      /,([^,]*)$/,
                      " and$1",
                    )}
                    .
                  </p>
                </div>

                <ol className={styles.coverageList}>
                  {COVERAGE_GROUPS.map((group) => (
                    <li key={group.outlet}>
                      <div className={styles.coverageGroup}>
                        <div className={styles.coverageOutlet}>
                          {group.outlet}
                        </div>

                        <div className={styles.coverageEntries}>
                          {group.entries.map((row, ri) => (
                            <a
                              key={ri}
                              href={row.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles.coverageRow}
                            >
                              <span className={styles.coverageRestaurant}>
                                {row.restaurants.map((r, i) => (
                                  <span
                                    key={i}
                                    className={styles.coverageRestaurantLine}
                                  >
                                    {r}
                                  </span>
                                ))}
                              </span>

                              <span className={styles.coverageFeature}>
                                {row.feature}
                              </span>

                              <span
                                className={styles.coverageArrow}
                                aria-hidden
                              >
                                <svg
                                  viewBox="0 0 24 10"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M0 5 H18" />
                                  <path d="M14 1 L18 5 L14 9" />
                                </svg>
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </section>
          </div>
        </div>

        <DarkZone>
          <Footer />
        </DarkZone>
      </main>
    </>
  );
}
