"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Nav from "./Nav";
import Menu from "./Menu";
import Reveal from "./Reveal";
import Footer from "./Footer";
import DarkZone from "./DarkZone";
import styles from "./BlogIndex.module.css";
import { BLOG } from "@/lib/blog";
import { lenisRef } from "@/lib/SmoothScroll";

// page 1 = the featured latest + the next PER_PAGE posts; every following
// page shows PER_PAGE more. 24 entries → 1+9 / 9 / 5.
const PER_PAGE = 9;
const FEATURED = BLOG[0];
const OTHERS = BLOG.slice(1);
const PAGE_COUNT = Math.max(1, 1 + Math.ceil((OTHERS.length - PER_PAGE) / PER_PAGE));

const postsForPage = (page: number) =>
  page <= 1
    ? OTHERS.slice(0, PER_PAGE)
    : OTHERS.slice(
        PER_PAGE + (page - 2) * PER_PAGE,
        PER_PAGE + (page - 1) * PER_PAGE,
      );

function Arrow({ dir }: { dir: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={dir === "left" ? { transform: "scaleX(-1)" } : undefined}
    >
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}

function BlogIndexInner() {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const listRef = useRef<HTMLDivElement>(null);

  // the URL is the single source of truth for the page — links stay
  // shareable. Invalid values clamp to the valid range.
  const raw = Number(searchParams.get("page") ?? "1");
  const page = Number.isFinite(raw)
    ? Math.min(Math.max(Math.trunc(raw), 1), PAGE_COUNT)
    : 1;

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

  // flags a page change as user-initiated (clicking the pagination) so the
  // scroll-to-list effect below runs — deep links (/blog?page=2) and
  // back/forward shouldn't force a jump
  const userNavRef = useRef(false);

  // entrance reveal is a first-mount-only affair — pagination re-renders
  // swap the card content in place without replaying the animation
  const revealedOnceRef = useRef(false);
  useEffect(() => {
    revealedOnceRef.current = true;
  }, []);

  const goTo = (n: number) => {
    const next = Math.min(Math.max(n, 1), PAGE_COUNT);
    if (next === page) return;
    userNavRef.current = true;
    // push (not replace) — each page gets its own history entry, so the
    // browser back button steps back through pagination before leaving /blog
    router.push(next === 1 ? "/blog" : `/blog?page=${next}`, {
      scroll: false,
    });
  };

  // bring the reader back to the top of the list *after* the new page's DOM
  // has committed, so the jump lands against final layout (scrolling inside
  // goTo measured the old DOM and fought the re-render mid-glide)
  useEffect(() => {
    if (!userNavRef.current) return;
    userNavRef.current = false;
    // double rAF — on pages ≠ 1 the featured lede + divider unmount, so wait
    // two frames for that commit to paint AND the document to reflow before
    // measuring; a same-tick measure still resolves against stale layout
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const el = listRef.current;
        if (!el) return;
        if (lenisRef.current) {
          // re-sync Lenis's cached dimensions with the reflowed document
          // before targeting, or the jump lands against stale geometry
          lenisRef.current.resize();
          lenisRef.current.scrollTo(el, { offset: -110, immediate: true });
        } else {
          window.scrollTo({
            top: el.getBoundingClientRect().top + window.scrollY - 110,
          });
        }
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [page]);

  const posts = postsForPage(page);

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
          {/* NO EYEBROW. "The Blog" used to sit above the title as a
              saffron-dot chapter mark, the same device Discover and
              AboutIntro carry. It is gone site-wide, and here the removal is
              free: unlike the About page's Awards section — which had only
              the eyebrow, so its eyebrow had to be PROMOTED to a real
              heading — this header already owns an <h1>, and the sentence in
              it says what the page is. Promoting "The Blog" would have left
              two headings naming the same thing, and the accessible outline
              (h1 → h2 featured → h3 cards) is already correct without it. */}
          <header className={styles.head}>
            <Reveal>
              <h1 className={styles.title}>
                Stories, openings, and ideas shaping the Maginhawa Group.
              </h1>
            </Reveal>
          </header>

          {/* compact featured lede — page 1 only */}
          {page === 1 && FEATURED && (
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

          {/* rule between the latest story and the older entries */}
          {page === 1 && (
            <div className={styles.divider} aria-hidden>
              <span>Earlier Entries</span>
            </div>
          )}

          <div ref={listRef}>
            <ul
              className={styles.grid}
              style={{ listStyle: "none" }}
              aria-label="Blog entries"
            >
              {posts.map((item, i) => {
                const card = (
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
                );
                // staggered reveal for the very first mount only; once the
                // page is up, paginated cards render plain and in place
                return revealedOnceRef.current ? (
                  <li key={item.slug}>{card}</li>
                ) : (
                  <Reveal key={item.slug} as="li" delay={(i % 6) * 0.06}>
                    {card}
                  </Reveal>
                );
              })}
            </ul>
          </div>

          {/* numbered pagination — 01 02 03, active in saffron */}
          <nav className={styles.pagination} aria-label="Blog pages">
            <button
              type="button"
              className={styles.pageArrow}
              onClick={() => goTo(page - 1)}
              disabled={page <= 1}
              aria-label="Previous page"
            >
              <Arrow dir="left" />
            </button>

            <div className={styles.pageNumbers}>
              {Array.from({ length: PAGE_COUNT }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`${styles.pageNum} ${
                    n === page ? styles.pageNumActive : ""
                  }`}
                  onClick={() => goTo(n)}
                  aria-label={`Page ${n}`}
                  aria-current={n === page ? "page" : undefined}
                >
                  {String(n).padStart(2, "0")}
                </button>
              ))}
            </div>

            <button
              type="button"
              className={styles.pageArrow}
              onClick={() => goTo(page + 1)}
              disabled={page >= PAGE_COUNT}
              aria-label="Next page"
            >
              <Arrow dir="right" />
            </button>
          </nav>
        </div>

        <DarkZone>
          <Footer />
        </DarkZone>
      </main>
    </>
  );
}

// useSearchParams needs a Suspense boundary for static prerendering
export default function BlogIndex() {
  return (
    <Suspense fallback={null}>
      <BlogIndexInner />
    </Suspense>
  );
}
