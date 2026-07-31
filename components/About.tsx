"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import Nav from "./Nav";
import Menu from "./Menu";
import Footer from "./Footer";
import DarkZone from "./DarkZone";
import Reveal from "./Reveal";
import styles from "./About.module.css";
import { FEATURED_OUTLETS, PRESS } from "@/lib/press";
import { getRestaurant } from "@/lib/restaurants";

const OUTLET_PRIORITY = new Map(FEATURED_OUTLETS.map((o, i) => [o.name, i]));
const priorityOf = (name: string) => OUTLET_PRIORITY.get(name) ?? Infinity;

// Each chapter carries a `layout` so the cards read as a varied editorial
// sequence rather than a repeated template:
//   "wide"      — full-width panoramic image over the text (bookend moments)
//   "portrait"  — text left, tall image right
//   "landscape" — image left, text right (the classic spread)
// `place` feeds the meta line; `slug` links the chapter to its restaurant.
const STORY: {
  year: string;
  title: string;
  body: string;
  image: string;
  imageAlt: string;
  place: string;
  slug?: string;
  layout: "wide" | "portrait" | "landscape";
  /* no photography yet — render the wordmark on a maroon field instead
     (the Discover tile's coming-soon treatment) */
  wordmark?: boolean;
}[] = [
  {
    year: "1987",
    title: "Bintang opens in Camden",
    body: "Chef Omar's parents open the original family restaurant on Kentish Town Road — a Filipino kitchen with a fusion accent that becomes a neighbourhood fixture.",
    image: "/images/bintang.jpg",
    imageAlt: "Bintang's dining room in Camden",
    place: "Camden",
    slug: "bintang",
    layout: "wide",
  },
  {
    year: "2007",
    title: "Guanabana arrives",
    body: "A halal-certified Caribbean and Latin American kitchen joins the family in Kentish Town. The Sunday Island Roast becomes a neighbourhood ritual.",
    image: "/images/guanabana.jpg",
    imageAlt: "Guanabana, Kentish Town",
    place: "Kentish Town",
    slug: "guanabana",
    layout: "portrait",
  },
  {
    year: "2017",
    title: "Mamasons",
    body: "London's first Filipino ice-cream parlour brings dirty ice cream from Manila's street stalls to Camden, Soho and Shoreditch.",
    image: "/images/cafemama.jpg",
    imageAlt: "Mamasons-era street counter",
    place: "Camden · Soho",
    slug: "mamasons",
    layout: "landscape",
  },
  {
    year: "2018",
    title: "Ramo Ramen",
    body: "The world's first Filipino-Japanese ramen joint opens on Kentish Town Road; a second site follows in Soho in 2021.",
    image: "/images/ramo.jpg",
    imageAlt: "Ramo Ramen dining room",
    place: "Kentish Town",
    slug: "ramo",
    layout: "portrait",
  },
  {
    year: "2019",
    title: "Hoodwood",
    body: "A Caribbean takeaway opens with the Jacket Exchange — trade a winter coat, take a free jerk jacket potato.",
    image: "/images/hoowood.jpg",
    imageAlt: "Hoodwood, Kentish Town",
    place: "Kentish Town",
    slug: "hoodwood",
    layout: "landscape",
  },
  {
    year: "2025",
    title: "Café Mama & Sons",
    body: "A Filipino-Japanese café and bakery brings hand-crafted sandos and the award-winning Longanisa Breakfast Burger to the morning crowd.",
    image: "/images/cafemama.jpg",
    imageAlt: "Café Mama & Sons storefront",
    place: "Kentish Town",
    slug: "cafemama",
    layout: "portrait",
  },
  {
    year: "2025",
    title: "Belly",
    body: "A modern Filipino bistro opens in Kentish Town — Chef Omar's most personal kitchen, reading Filipino flavour through a French lens.",
    image: "/images/belly.jpg",
    imageAlt: "Belly dining room, Kentish Town",
    place: "Kentish Town",
    slug: "belly",
    layout: "landscape",
  },
  {
    year: "2026",
    title: "Belly enters the Michelin Guide",
    body: "Belly is added to the Michelin Guide for Greater London — recognising thirty-eight years of Filipino kitchens in London.",
    image: "/images/belly.jpg",
    imageAlt: "Belly added to the Michelin Guide",
    place: "Kentish Town",
    slug: "belly",
    layout: "portrait",
  },
  {
    year: "2026",
    title: "Bunso — coming soon",
    body: "The youngest of the family: a Filipino-Japanese kissaten and listening jazz bar, opening in London in 2026.",
    image: "/images/bunso.png",
    imageAlt: "Bunso wordmark",
    place: "London",
    slug: "bunso",
    layout: "wide",
    wordmark: true,
  },
];

type CoverageRow = {
  outlet: string;
  feature: string;
  restaurants: string[];
  date: string;
  url: string;
  // resolved hover-image path (bespoke press override, else the first
  // credited restaurant's photo) — absent when only a missing placeholder
  // would resolve, so the row simply skips the hover treatment
  image?: string;
};

// hover-image guard — these restaurant `image` paths are placeholders that
// don't exist under /public yet (Mamasons, Bunso). Rows resolving to them
// get no hover image at all rather than a broken <img>.
const MISSING_IMAGES = new Set([
  "/images/mamasons-placeholder.jpg",
  "/images/bunso-placeholder.jpg",
]);

const yearFromDate = (d: string) =>
  /\.(\d{2})$/.test(d) ? `20${d.slice(-2)}` : "";

const COVERAGE_GROUPS: { outlet: string; entries: CoverageRow[] }[] = (() => {
  const byOutlet = new Map<string, CoverageRow[]>();

  for (const p of PRESS) {
    // bespoke press image first, else the first credited restaurant's
    // canonical photo — dropped entirely when only a known-missing
    // placeholder would resolve
    const image = p.image ?? getRestaurant(p.restaurants[0])?.image;

    const row: CoverageRow = {
      outlet: p.outlet,
      feature: p.feature,
      restaurants: p.restaurants.map((s) => getRestaurant(s)?.name ?? s),
      date: yearFromDate(p.date),
      url: p.url,
      image: image && !MISSING_IMAGES.has(image) ? image : undefined,
    };

    if (!byOutlet.has(p.outlet)) byOutlet.set(p.outlet, []);
    byOutlet.get(p.outlet)!.push(row);
  }

  return [...byOutlet.entries()]
    .map(([outlet, entries]) => ({ outlet, entries }))
    .sort((a, b) => priorityOf(a.outlet) - priorityOf(b.outlet));
})();

export default function About() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeStory, setActiveStory] = useState(0);
  const storyRefs = useRef<(HTMLLIElement | null)[]>([]);

  // ---- pinned hero video ----
  // The video no longer shrinks into a frame: it pins to the viewport (a
  // sticky backdrop) while the hero type, the statement/Omar band and the
  // story timeline all scroll over it. It releases just before Awards &
  // Recognition. A constant scrim keeps the type legible throughout, so
  // no scroll-scrubbed machinery is needed — only the entrance rises.
  const reduceMotion = useReducedMotion();

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

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visible) return;

        const index = Number((visible.target as HTMLElement).dataset.index);
        if (!Number.isNaN(index)) setActiveStory(index);
      },
      {
        // centre-line detector — a story item is "active" the moment it
        // crosses the middle 10% band of the viewport, so the wheel flips
        // exactly when the reader's eye does
        threshold: 0,
        rootMargin: "-45% 0px -45% 0px",
      }
    );

    storyRefs.current.forEach((item) => {
      if (item) observer.observe(item);
    });

    return () => observer.disconnect();
  }, []);

  const activeCentury = STORY[activeStory].year.slice(0, 2);
  const centuries = Array.from(new Set(STORY.map((s) => s.year.slice(0, 2))));
  const activeCenturyIndex = centuries.indexOf(activeCentury);

  return (
    <>
      <Nav
        started
        menuOpen={menuOpen}
        onMenuToggle={() => setMenuOpen((o) => !o)}
      />
      <Menu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main className={styles.page} data-nav-theme="light">
        {/* ---- pinned video scope ----
             The hero video pins to the viewport as a sticky backdrop; the
             hero type, the statement/Omar band and the story timeline all
             scroll over it, and the Awards cream sheet finally slides up
             to cover it (layered pinning — the video releases underneath
             once hidden). The constant scrim keeps every layer of type
             legible against the footage. NB: .videoContent must not create
             a stacking context, or the difference-blend type couldn't see
             the video beneath it. */}
        <div
          className={styles.videoScope}
          data-nav-theme="blend"
          data-cursor="glass"
        >
          <div className={styles.videoBackdrop} aria-hidden>
            <video
              className={styles.heroVideo}
              src="/videos/belly-hero.mp4"
              poster="/images/belly.jpg"
              muted
              loop
              autoPlay
              playsInline
              preload="metadata"
            />
            <div className={styles.videoScrim} />
          </div>

          <div className={styles.videoContent}>
            <div className="container">
              <section className={styles.hero} aria-label="Maginhawa Group">
                <h1 className={styles.srOnly}>Maginhawa Group</h1>

                {/* small italic kicker riding the top-left of the title */}
                <div className={styles.heroKicker} aria-hidden>
                  <span className={styles.heroLineClip}>
                    <motion.span
                      className={styles.heroLineInner}
                      initial={reduceMotion ? false : { y: "120%" }}
                      animate={{ y: "0%" }}
                      transition={{
                        duration: 1,
                        ease: [0.22, 1, 0.36, 1],
                        delay: 0.05,
                      }}
                    >
                      Who is
                    </motion.span>
                  </span>
                </div>

                <div className={styles.heroLineTop} aria-hidden>
                  <span className={styles.heroLineClip}>
                    <motion.span
                      className={styles.heroLineInner}
                      initial={reduceMotion ? false : { y: "120%" }}
                      animate={{ y: "0%" }}
                      transition={{
                        duration: 1,
                        ease: [0.22, 1, 0.36, 1],
                        delay: 0.15,
                      }}
                    >
                      MAGINHAWA
                    </motion.span>
                  </span>
                </div>

                <div className={styles.heroBottomRow}>
                  <div className={styles.heroAside}>
                    {/* the lede joins the title's rise-in entrance, landing
                        last in the stagger */}
                    <p className={styles.heroLede}>
                      <span className={styles.heroLineClip}>
                        <motion.span
                          className={styles.heroLineInner}
                          initial={reduceMotion ? false : { y: "120%" }}
                          animate={{ y: "0%" }}
                          transition={{
                            duration: 1,
                            ease: [0.22, 1, 0.36, 1],
                            delay: 0.45,
                          }}
                        >
                          A London family of restaurants - from a Camden
                          kitchen in 1987 to seven distinct dining destinations today. Made with heritage and{" "}
                          <em className={styles.emItalic}>
                            served with heart
                          </em>
                          .
                        </motion.span>
                      </span>
                    </p>
                  </div>

                  <div className={styles.heroLineBottom} aria-hidden>
                    <span className={styles.heroLineClip}>
                      <motion.span
                        className={styles.heroLineInner}
                        initial={reduceMotion ? false : { y: "120%" }}
                        animate={{ y: "0%" }}
                        transition={{
                          duration: 1,
                          ease: [0.22, 1, 0.36, 1],
                          delay: 0.3,
                        }}
                      >
                        GROUP?
                      </motion.span>
                    </span>
                  </div>
                </div>
              </section>
            </div>

            {/* ---- Statement + Omar Shah band ----
                 Scrolls over the pinned video like everything else in the
                 scope — transparent now, the shared scrim carries the dark
                 field the cream type sits on. */}
            <div className={styles.band}>
          <section className={styles.statement}>
            <div className="container">
              <Reveal>
                <p className={styles.statementText}>
                  Maginhawa is Tagalog for{" "}
                  <em className={styles.emItalic}>comfortable</em> — a life of
                  ease. Comfort is the thread through{" "}
                  <em className={styles.emItalic}>every kitchen we run</em>.
                </p>
              </Reveal>
            </div>
          </section>

          <section className={styles.chef}>
            <div className="container">
              <div className={styles.chefGrid}>
                <Reveal className={styles.chefImage}>
                  <Image
                    src="/images/omarshah.jpeg"
                    alt="Omar Shah, co-founder of the Maginhawa Group"
                    width={678}
                    height={452}
                  />
                </Reveal>

                <div className={styles.chefText}>
                  <Reveal as="span" className={styles.eyebrow}>
                    Chef &amp; Founder
                  </Reveal>

                  <Reveal>
                    <h2 className={styles.chefName}>Omar Shah</h2>
                  </Reveal>

                  <Reveal delay={0.08}>
                    <p className={styles.chefQuote}>
                      One restaurant became a family.
                    </p>
                  </Reveal>
                </div>

                {/* asymmetric two-column small print under the name block */}
                <div className={styles.chefColumns}>
                  <Reveal delay={0.14}>
                    <p className={styles.chefBody}>
                      Co-founder of the Maginhawa Group and the restaurateur
                      who launched Mamasons, Omar Shah has spent his career
                      redefining Filipino cooking in London. Raised in Kentish Town, 
                      Omar's vision continues to shape the neighbourhood he calls home
                      through Mamasons and Belly - bringing Filipino flavours to new audiences,
                      with Belly now recognised in the Michelin Guide.
                    </p>
                  </Reveal>

                  <Reveal delay={0.2}>
                    <p className={styles.chefBody}>
                      From comforting classics to bold new ideas, every restaurant tells 
                      a different story. Together, they reflect the diversity of Filipino 
                      cuisine while honouring the traditions and communities that inspired them.
                    </p>
                  </Reveal>
                </div>
              </div>
            </div>
          </section>
            </div>

            <div className="container">
              <section className={styles.story}>
            <div className={styles.storyShell}>
              <aside className={styles.storyWheel} aria-hidden>
                <span className={styles.storyWheelLabel}>Our Story</span>

                <div className={styles.storyWheelStem}>
                  <span />
                </div>

                <div className={styles.storyWheelMask}>
                  <div className={styles.storyCenturyColumn}>
                    <div
                      className={styles.storyNumberTrack}
                      style={{
                        transform: `translateY(calc(${activeCenturyIndex} * var(--wheel-step) * -1))`,
                      }}
                    >
                      {centuries.map((century) => (
                        <span
                          key={century}
                          className={`${styles.storyNumber} ${
                            century === activeCentury ? styles.isActive : ""
                          }`}
                        >
                          {century}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className={styles.storySuffixColumn}>
                    <div
                      className={styles.storyNumberTrack}
                      style={{
                        transform: `translateY(calc(${activeStory} * var(--wheel-step) * -1))`,
                      }}
                    >
                      {STORY.map((story, index) => (
                        <span
                          key={`${story.year}-${story.title}`}
                          className={`${styles.storyNumber} ${
                            index === activeStory ? styles.isActive : ""
                          }`}
                        >
                          {story.year.slice(2)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className={styles.storyWheelStem}>
                  <span />
                </div>

                {/* chapter progress — docked under the wheel so it's always
                    on screen and never collides with the chapter cards */}
                <div className={styles.storyProgress}>
                  {STORY.map((story, index) => (
                    <span
                      key={`${story.year}-${story.title}`}
                      className={
                        index === activeStory ? styles.progressActive : ""
                      }
                    />
                  ))}
                </div>
              </aside>

              <ol className={styles.storyList}>
                {STORY.map((s, index) => (
                  <li
                    key={`${s.year}-${s.title}`}
                    ref={(el) => {
                      storyRefs.current[index] = el;
                    }}
                    data-index={index}
                    className={`${styles.storyItem} ${
                      index === activeStory ? styles.storyItemActive : ""
                    }`}
                  >
                    <div className={styles.storyMobileYear}>{s.year}</div>

                    <article
                      className={`${styles.storyContent} ${
                        s.layout === "wide"
                          ? styles.storyWide
                          : s.layout === "portrait"
                            ? styles.storyPortrait
                            : ""
                      }`}
                    >
                      <Reveal className={styles.storyImageFrame}>
                        <img
                          src={s.image}
                          alt={s.imageAlt}
                          className={`${styles.storyImage} ${
                            s.wordmark ? styles.storyImageWordmark : ""
                          }`}
                        />
                      </Reveal>

                      <div className={styles.storyText}>
                        <div className={styles.storyMeta}>
                          Chapter {String(index + 1).padStart(2, "0")}
                          <span className={styles.storyMetaPlace}>
                            {s.place}
                          </span>
                        </div>

                        <Reveal>
                          <h3 className={styles.storyTitle}>{s.title}</h3>
                        </Reveal>

                        <Reveal delay={0.06}>
                          <p className={styles.storyBody}>{s.body}</p>
                        </Reveal>

                        {s.slug && (
                          <Reveal delay={0.1}>
                            <Link
                              href={`/restaurants/${s.slug}`}
                              className={styles.storyLink}
                            >
                              <span>See the restaurant</span>
                              <svg
                                viewBox="0 0 24 10"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden
                              >
                                <path d="M0 5 H18" />
                                <path d="M14 1 L18 5 L14 9" />
                              </svg>
                            </Link>
                          </Reveal>
                        )}
                      </div>
                    </article>
                  </li>
                ))}
              </ol>
            </div>
          </section>
            </div>

            {/* Awards & Recognition — rises over the pinned video as an
                opaque cream sheet (layered pinning: the video stays pinned
                beneath while this section slides up to cover it, and only
                releases underneath once hidden). The content inside is
                deliberately static — the slide-over entrance is the whole
                effect, and internal drift made the title feel detached
                from its own table. */}
            <section className={styles.coverage} data-nav-theme="light">
              <div className="container">
              <div className={styles.coverageHead}>
                <Reveal as="span" className={styles.coverageEyebrow}>
                  <span className={styles.coverageDot} aria-hidden /> Awards
                  &amp; Recognition
                </Reveal>
              </div>

            <ol className={styles.coverageList}>
              {COVERAGE_GROUPS.map((group, gi) => (
                <Reveal as="li" key={group.outlet} delay={(gi % 4) * 0.04}>
                  <div className={styles.coverageGroup}>
                    <div className={styles.coverageOutlet}>{group.outlet}</div>

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

                          <span className={styles.coverageDate}>
                            {row.date}
                          </span>

                          <span className={styles.coverageArrow} aria-hidden>
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

                          {/* hover preview — always mounted, absolutely
                              positioned (see .coverageThumb) so it floats
                              between the feature text and the arrow and can
                              never reflow the row grid; decorative only */}
                          {row.image && (
                            <img
                              className={styles.coverageThumb}
                              src={row.image}
                              alt=""
                              aria-hidden
                              loading="lazy"
                              decoding="async"
                            />
                          )}
                        </a>
                      ))}
                    </div>
                  </div>
                </Reveal>
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