"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
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

// ---- timeline data ----
// Years are chronological; each is a single beat in the group's history.
const TIMELINE: { year: string; title: string; body: string }[] = [
  {
    year: "1987",
    title: "Bintang opens in Camden",
    body: "Chef Omar's parents open the original family restaurant on Kentish Town Road — a Filipino kitchen with a fusion accent.",
  },
  {
    year: "2007",
    title: "Guanabana arrives",
    body: "A halal-certified Caribbean and Latin American kitchen joins the family in Kentish Town. The Sunday Island Roast becomes a neighbourhood ritual.",
  },
  {
    year: "2017",
    title: "Mamasons",
    body: "London's first Filipino ice-cream parlour brings 'dirty ice cream' from Manila's street stalls to Camden, Soho and Shoreditch.",
  },
  {
    year: "2018",
    title: "Ramo Ramen",
    body: "The world's first Filipino-Japanese ramen joint opens on Kentish Town Road; a second site follows in Soho in 2021.",
  },
  {
    year: "2022",
    title: "Café Mama & Sons",
    body: "A Filipino-Japanese café and bakery brings hand-crafted sandos and the award-winning Longanisa Breakfast Burger to the morning crowd.",
  },
  {
    year: "2024",
    title: "Hoodwood",
    body: "A Caribbean takeaway opens with the Jacket Exchange — trade a winter coat, take a free jerk jacket potato.",
  },
  {
    year: "2025",
    title: "Belly",
    body: "A modern Filipino bistro opens in Kentish Town — Chef Omar's most personal kitchen, reading Filipino flavour through a French lens.",
  },
  {
    year: "2026",
    title: "Belly in the Michelin Guide",
    body: "Belly is added to the Michelin Guide for Greater London — recognising thirty-eight years of Filipino kitchens in London.",
  },
];

const STATS: { n: number; label: string; suffix?: string }[] = [
  { n: 7, label: "Restaurants" },
  { n: 4, label: "Cuisines" },
  { n: 1, label: "Michelin Guide" },
  { n: 38, label: "Years" },
];

// scroll-triggered count-up — animates 0 → `to` once the element is in view.
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    let start = 0;
    const duration = 1500;
    const step = (t: number) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // cubic ease-out
      setN(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, to]);

  return (
    <span ref={ref}>
      {n}
      {suffix && <span className={styles.statSuffix}>{suffix}</span>}
    </span>
  );
}

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
          <a
            className={styles.back}
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigate("/");
            }}
          >
            ← Home
          </a>

          {/* ---- Hero ---- */}
          <section className={styles.hero}>
            <Reveal as="span" className={styles.eyebrow}>
              (About)
            </Reveal>
            <h1 className={styles.heroTitle}>
              <RevealText
                text="A London family of restaurants — from a Camden kitchen in 1987 to seven dining rooms today."
                stagger={0.02}
              />
            </h1>
            <Reveal delay={0.3}>
              <p className={styles.heroLede}>
                Seven kitchens, four cuisines, one idea — food that feels like
                home, wherever home is for you.
              </p>
            </Reveal>
          </section>
        </div>

        {/* ---- "Maginhawa" word section ---- */}
        <section className={styles.wordSection}>
          <div className="container">
            <Reveal>
              <h2 className={styles.bigWord}>
                <RevealText text="Maginhawa" stagger={0.06} />
              </h2>
            </Reveal>
            <Reveal delay={0.5}>
              <p className={styles.bigWordMeta}>
                <span className={styles.partOfSpeech}>Tagalog</span>
                <span>ease · comfort · well-being</span>
              </p>
            </Reveal>
            <Reveal delay={0.6}>
              <p className={styles.bigWordBody}>
                It&apos;s what we want every plate, every room, and every visit
                to feel like.
              </p>
            </Reveal>
          </div>
        </section>

        <div className="container">
          {/* ---- Origin ---- */}
          <section className={styles.origin}>
            <div className={styles.originGrid}>
              <div className={styles.originText}>
                <Reveal as="span" className={styles.eyebrow}>
                  (The Origin)
                </Reveal>
                <Reveal>
                  <h2 className={styles.sectionTitle}>
                    It started in a Camden family kitchen.
                  </h2>
                </Reveal>
                <Reveal delay={0.1}>
                  <p className={styles.body}>
                    In 1987, Chef Omar&apos;s parents opened Bintang — a
                    Filipino kitchen on Kentish Town Road, in the heart of
                    Camden. For decades it fed a single neighbourhood, threading
                    Malaysian, Indonesian, Japanese, Vietnamese and Filipino
                    flavours into one menu.
                  </p>
                </Reveal>
                <Reveal delay={0.2}>
                  <p className={styles.body}>
                    Today, Bintang is still serving the same room — the original
                    chapter in a story that&apos;s now grown across the city.
                  </p>
                </Reveal>
              </div>
              <Reveal delay={0.15} className={styles.originImage}>
                <Parallax inset ratio="4 / 5" speed={0.16}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/bintang.jpg" alt="Bintang in Camden" />
                </Parallax>
              </Reveal>
            </div>
          </section>
        </div>

        {/* ---- Stats ---- */}
        <section className={styles.stats}>
          <div className="container">
            <Reveal>
              <ul className={styles.statsGrid}>
                {STATS.map((s) => (
                  <li key={s.label} className={styles.statItem}>
                    <span className={styles.statNum}>
                      <Counter to={s.n} suffix={s.suffix} />
                    </span>
                    <span className={styles.statLabel}>{s.label}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        <div className="container">
          {/* ---- Chef ---- */}
          <section className={styles.chef}>
            <div className={styles.chefGrid}>
              <Reveal className={styles.chefImage}>
                <Parallax inset ratio="3 / 4" speed={0.14}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/cafemama.jpg" alt="Chef Omar in the kitchen" />
                </Parallax>
              </Reveal>
              <div className={styles.chefText}>
                <Reveal as="span" className={styles.eyebrow}>
                  (The Chef)
                </Reveal>
                <Reveal>
                  <h2 className={styles.sectionTitle}>Chef Omar.</h2>
                </Reveal>
                <Reveal delay={0.1}>
                  <p className={styles.body}>
                    Chef Omar grew up in his parents&apos; Camden kitchen,
                    learning to cook the way most Filipino kids do — at the
                    elbow of someone older, tasting as you go. He took the helm
                    of Bintang in his twenties, then turned one restaurant into
                    a family.
                  </p>
                </Reveal>
                <Reveal delay={0.2}>
                  <p className={styles.body}>
                    Filipino-Japanese ramen at Ramo. Caribbean Sunday roasts at
                    Guanabana. Dirty ice cream at Mamasons. French-trained
                    Filipino bistro plates at Belly — added to the Michelin
                    Guide in 2026.
                  </p>
                </Reveal>
                <Reveal delay={0.3}>
                  <blockquote className={styles.chefQuote}>
                    &ldquo;We&apos;re not chasing one tradition. We&apos;re
                    cooking from where we&apos;re from — and where we landed.&rdquo;
                  </blockquote>
                </Reveal>
              </div>
            </div>
          </section>

          {/* ---- Timeline ---- */}
          <section className={styles.timeline}>
            <div className={styles.timelineHead}>
              <div>
                <Reveal as="span" className={styles.eyebrow}>
                  (The Journey)
                </Reveal>
                <Reveal>
                  <h2 className={styles.sectionTitle}>
                    Thirty-eight years, in chapters.
                  </h2>
                </Reveal>
              </div>
              <Reveal delay={0.1}>
                <p className={styles.timelineHeadAside}>
                  From a single Camden dining room in 1987 to seven kitchens
                  across the city today. Each chapter is an answer to the same
                  question — how should this food feel, here, now?
                </p>
              </Reveal>
            </div>

            <ol className={styles.timelineList}>
              {TIMELINE.map((t, i) => (
                <Reveal key={t.year} delay={(i % 4) * 0.06}>
                  <li className={styles.timelineItem}>
                    <div className={styles.timelineYear}>{t.year}</div>
                    <div className={styles.timelineBody}>
                      <h3 className={styles.timelineTitle}>{t.title}</h3>
                      <p className={styles.timelineText}>{t.body}</p>
                    </div>
                  </li>
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
