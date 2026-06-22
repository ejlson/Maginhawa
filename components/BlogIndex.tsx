"use client";

import { useEffect, useState } from "react";
import Nav from "./Nav";
import Menu from "./Menu";
import Reveal from "./Reveal";
import Footer from "./Footer";
import DarkZone from "./DarkZone";
import { useRouteTransition } from "./PageTransition";
import styles from "./BlogIndex.module.css";
import { BLOG } from "@/lib/blog";

const FEATURED = BLOG[0];
const REST = BLOG.slice(1);

export default function BlogIndex() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useRouteTransition();

  // page is cream — release any dark backdrop another route may have set
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

          <header className={styles.head}>
            <Reveal as="span" className={styles.eyebrow}>
              (Journal)
            </Reveal>
            <Reveal>
              <h1 className={styles.title}>
                Stories from the Maginhawa kitchens.
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className={styles.lede}>
                Reviews, recognitions, openings and ideas — from our own desk
                and from the publications and tastemakers who&apos;ve had a meal
                with us.
              </p>
            </Reveal>
          </header>

          {FEATURED && (
            <Reveal>
              <a
                className={styles.featured}
                href={FEATURED.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className={styles.featuredMedia}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={FEATURED.image} alt={FEATURED.title} />
                </div>
                <div className={styles.featuredBody}>
                  <span className={styles.featuredTag}>
                    Latest · {FEATURED.dateLabel} · {FEATURED.source}
                  </span>
                  <h2 className={styles.featuredTitle}>{FEATURED.title}</h2>
                  <p className={styles.featuredExcerpt}>{FEATURED.excerpt}</p>
                  <span className={styles.featuredLink}>
                    Read the story <span aria-hidden>→</span>
                  </span>
                </div>
              </a>
            </Reveal>
          )}

          <ul
            className={styles.grid}
            style={{ listStyle: "none" }}
            aria-label="All blog entries"
          >
            {REST.map((item, i) => (
              <Reveal key={item.slug} as="li" delay={(i % 6) * 0.06}>
                <a
                  className={styles.card}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div className={styles.cardMedia}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.image} alt={item.title} />
                  </div>
                  <div className={styles.cardMeta}>
                    <span>{item.dateLabel}</span>
                    <span className={styles.cardSep} aria-hidden />
                    <span>{item.source}</span>
                  </div>
                  <h3 className={styles.cardTitle}>{item.title}</h3>
                  <p className={styles.cardExcerpt}>{item.excerpt}</p>
                  <span className={styles.cardArrow}>Read ↗</span>
                </a>
              </Reveal>
            ))}
          </ul>
        </div>

        <DarkZone>
          <Footer />
        </DarkZone>
      </main>
    </>
  );
}
