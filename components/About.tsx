"use client";

import { useEffect, useState } from "react";
import Nav from "./Nav";
import Menu from "./Menu";
import Footer from "./Footer";
import DarkZone from "./DarkZone";
import Reveal from "./Reveal";
import RevealText from "./RevealText";
import Parallax from "./Parallax";
import MagneticButton from "./MagneticButton";
import { useRouteTransition } from "./PageTransition";
import styles from "./About.module.css";
import { FEATURED_OUTLETS, PRESS } from "@/lib/press";
import { getRestaurant } from "@/lib/restaurants";

// Recognition order — outlets listed in FEATURED_OUTLETS rank first (in that
// order); anything not on the recognised list slides to the end.
const OUTLET_PRIORITY = new Map(FEATURED_OUTLETS.map((o, i) => [o.name, i]));
const priorityOf = (name: string) => OUTLET_PRIORITY.get(name) ?? Infinity;

// ---- Story timeline ----
// Years are chronological; each is a single beat in the group's history. The
// year sticks to the viewport while its body & photograph scroll past, so each
// chapter reads as a deliberate scroll moment.
const STORY: {
  year: string;
  title: string;
  body: string;
  image: string;
  imageAlt: string;
}[] = [
  {
    year: "1987",
    title: "Bintang opens in Camden",
    body:
      "Chef Omar's parents open the original family restaurant on Kentish Town Road — a Filipino kitchen with a fusion accent that becomes a neighbourhood fixture.",
    image: "/images/bintang.jpg",
    imageAlt: "Bintang's dining room in Camden",
  },
  {
    year: "2007",
    title: "Guanabana arrives",
    body:
      "A halal-certified Caribbean and Latin American kitchen joins the family in Kentish Town. The Sunday Island Roast becomes a neighbourhood ritual.",
    image: "/images/guanabana.jpg",
    imageAlt: "Guanabana, Kentish Town",
  },
  {
    year: "2017",
    title: "Mamasons",
    body:
      "London's first Filipino ice-cream parlour brings 'dirty ice cream' from Manila's street stalls to Camden, Soho and Shoreditch.",
    image: "/images/cafemama.jpg",
    imageAlt: "Mamasons-era street counter",
  },
  {
    year: "2018",
    title: "Ramo Ramen",
    body:
      "The world's first Filipino-Japanese ramen joint opens on Kentish Town Road; a second site follows in Soho in 2021.",
    image: "/images/ramo.jpg",
    imageAlt: "Ramo Ramen dining room",
  },
  {
    year: "2022",
    title: "Café Mama & Sons",
    body:
      "A Filipino-Japanese café and bakery brings hand-crafted sandos and the award-winning Longanisa Breakfast Burger to the morning crowd.",
    image: "/images/cafemama.jpg",
    imageAlt: "Café Mama & Sons storefront",
  },
  {
    year: "2024",
    title: "Hoodwood",
    body:
      "A Caribbean takeaway opens with the Jacket Exchange — trade a winter coat, take a free jerk jacket potato.",
    image: "/images/hoowood.jpg",
    imageAlt: "Hoodwood, Kentish Town",
  },
  {
    year: "2025",
    title: "Belly",
    body:
      "A modern Filipino bistro opens in Kentish Town — Chef Omar's most personal kitchen, reading Filipino flavour through a French lens.",
    image: "/images/belly.jpg",
    imageAlt: "Belly dining room, Kentish Town",
  },
  {
    year: "2026",
    title: "Belly enters the Michelin Guide",
    body:
      "Belly is added to the Michelin Guide for Greater London — recognising thirty-eight years of Filipino kitchens in London.",
    image: "/images/belly.jpg",
    imageAlt: "Belly added to the Michelin Guide",
  },
];

// ---- press coverage table ----
// Group consecutive entries by outlet so the outlet name shows once per cluster
// — same editorial pattern as a printed "Awards & Recognition" page where one
// award title covers several entries beneath it.
type CoverageRow = {
  outlet: string;
  feature: string;
  restaurants: string[];
  date: string;
  url: string;
};
// Date in PRESS is "dd.mm.yy" — extract the year as "20yy", "" when missing.
const yearFromDate = (d: string) =>
  /\.(\d{2})$/.test(d) ? `20${d.slice(-2)}` : "";

const COVERAGE_GROUPS: { outlet: string; entries: CoverageRow[] }[] = (() => {
  const byOutlet = new Map<string, CoverageRow[]>();
  for (const p of PRESS) {
    const row: CoverageRow = {
      outlet: p.outlet,
      feature: p.feature,
      restaurants: p.restaurants.map((s) => getRestaurant(s)?.name ?? s),
      date: yearFromDate(p.date),
      url: p.url,
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
  const navigate = useRouteTransition();

  // release any dark backdrop / loader state another route may have set
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

      <main className={styles.page} data-nav-theme="light">
        <div className="container">
          {/* ---- Hero: MAGINHAWA stretched to image width, thin image in
                the middle, GROUP at bottom-right (same character height as
                MAGINHAWA) with intro copy at bottom-left ---- */}
          <section className={styles.hero} aria-label="Maginhawa Group">
            <h1 className={styles.srOnly}>Maginhawa Group</h1>
            <div className={styles.heroLineTop} aria-hidden>
              MAGINHAWA
            </div>
            <Reveal className={styles.heroImage}>
              <Parallax inset speed={0.18} className={styles.heroImageFrame}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/belly.jpg"
                  alt="Inside Belly, Kentish Town"
                />
              </Parallax>
            </Reveal>
            <div className={styles.heroBottomRow}>
              <Reveal className={styles.heroAside} delay={0.1}>
                <p className={styles.heroLede}>
                  A London family of restaurants — from a Camden kitchen in
                  1987 to seven dining rooms today. Food that feels like
                  home, wherever home is for you.
                </p>
              </Reveal>
              <div className={styles.heroLineBottom} aria-hidden>
                GROUP
              </div>
            </div>
          </section>

          {/* ---- Chef Omar ---- */}
          <section className={styles.chef}>
            <div className={styles.chefGrid}>
              <Reveal className={styles.chefImage}>
                <Parallax inset ratio="3 / 4" speed={0.14}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/cafemama.jpg" alt="Chef Omar" />
                </Parallax>
              </Reveal>
              <div className={styles.chefText}>
                <Reveal as="span" className={styles.eyebrow}>
                  (The Chef)
                </Reveal>
                <Reveal>
                  <h2 className={styles.chefName}>Chef Omar</h2>
                </Reveal>
                <Reveal delay={0.1}>
                  <p className={styles.body}>
                    Chef Omar grew up in his parents&apos; Camden kitchen,
                    learning to cook the way most Filipino kids do — at the
                    elbow of someone older, tasting as you go. He took the
                    helm of Bintang in his twenties, then turned one
                    restaurant into a family.
                  </p>
                </Reveal>
                <Reveal delay={0.2}>
                  <p className={styles.body}>
                    Filipino-Japanese ramen at Ramo. Caribbean Sunday roasts
                    at Guanabana. Dirty ice cream at Mamasons. French-trained
                    Filipino bistro plates at Belly — added to the Michelin
                    Guide in 2026.
                  </p>
                </Reveal>
              </div>
            </div>
          </section>

          {/* ---- Story timeline: scrollable, massive split-year numerals ---- */}
          <section className={styles.story}>
            <ol className={styles.storyList}>
              {STORY.map((s) => {
                const prefix = s.year.slice(0, 2);
                const suffix = s.year.slice(2);
                return (
                  <li className={styles.storyItem} key={s.year}>
                    <div className={styles.storyYearWrap}>
                      <div className={styles.storyYear}>
                        <span className={styles.yearLine}>{prefix}</span>
                        <span className={styles.yearLine}>{suffix}</span>
                      </div>
                    </div>
                    <div className={styles.storyContent}>
                      <Reveal>
                        <h3 className={styles.storyTitle}>{s.title}</h3>
                      </Reveal>
                      <Reveal delay={0.06}>
                        <p className={styles.storyBody}>{s.body}</p>
                      </Reveal>
                      <Reveal delay={0.12} className={styles.storyImageFrame}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={s.image}
                          alt={s.imageAlt}
                          className={styles.storyImage}
                        />
                      </Reveal>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* ---- Awards & Recognition ---- */}
          <section className={styles.coverage}>
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
                              <span key={i} className={styles.coverageRestaurantLine}>
                                {r}
                              </span>
                            ))}
                          </span>
                          <span className={styles.coverageFeature}>
                            {row.feature}
                          </span>
                          <span className={styles.coverageDate}>{row.date}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                </Reveal>
              ))}
            </ol>
          </section>

          {/* ---- Closing CTA ---- */}
          <section className={styles.closing}>
            <Reveal>
              <h2 className={styles.closingTitle}>Come find us.</h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className={styles.closingBody}>
                Seven dining rooms across Camden, Soho, Kentish Town and
                Shoreditch. The kitchen&apos;s always on.
              </p>
            </Reveal>
            <Reveal delay={0.2}>
              <div className={styles.closingCta}>
                <MagneticButton
                  label="Explore Restaurants"
                  theme="light"
                  onClick={() => navigate("/restaurants")}
                />
              </div>
            </Reveal>
          </section>
        </div>

        <DarkZone>
          <Footer />
        </DarkZone>
      </main>
    </>
  );
}
