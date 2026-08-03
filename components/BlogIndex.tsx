"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Nav from "./Nav";
import Menu from "./Menu";
import Reveal from "./Reveal";
import Footer from "./Footer";
import DarkZone from "./DarkZone";
import styles from "./BlogIndex.module.css";
import { BLOG, type BlogEntry } from "@/lib/blog";
import { RESTAURANTS } from "@/lib/restaurants";
import { lenisRef } from "@/lib/SmoothScroll";

// page 1 = the featured latest + the next PER_PAGE posts; every following
// page shows PER_PAGE more. Unfiltered, 24 entries → 1+9 / 9 / 5.
const PER_PAGE = 9;

// the page count and the slices are derived PER FILTERED SET, not once at
// module scope — a filter that leaves 6 entries has one page, and a stale
// module-level PAGE_COUNT would offer three
const pageCountFor = (others: BlogEntry[]) =>
  Math.max(1, 1 + Math.ceil((others.length - PER_PAGE) / PER_PAGE));

const postsForPage = (others: BlogEntry[], page: number) =>
  page <= 1
    ? others.slice(0, PER_PAGE)
    : others.slice(
        PER_PAGE + (page - 2) * PER_PAGE,
        PER_PAGE + (page - 1) * PER_PAGE,
      );

/* ---- the way into the archive ----

   24 entries with no grouping is a wall, and pagination alone only lets you
   walk it in order. The filter is BY RESTAURANT, and that choice is a
   measured one rather than an obvious one.

   `category` was the first candidate and it is the wrong axis: the feed runs
   16 feature / 3 inclusion / 3 news / 2 review, so two-thirds of the archive
   sits behind one chip and the filter barely divides anything — and
   "inclusion" is a press-tracker word, not a word a reader arrives with.
   `source` is worse in the other direction: 21 distinct outlets for 24
   entries. `kind` is a true binary (4 native / 21 press) but names an
   editorial distinction the reader can't see the value of.

   Restaurant is 12 / 6 / 3 / 1 / 1 / 1 with EVERY entry carrying one, so
   nothing falls out of the set, and the labels are the group's own rooms —
   the question a reader on a restaurant group's journal actually has.

   Ordered by count, so the chips that lead are the ones that return
   something; ties fall back to the canonical order in lib/restaurants so the
   three single-entry rooms keep a stable order between themselves. The row
   reshuffles as coverage accrues, which is the point — it tracks the
   archive rather than a hand-set order that goes stale.

   Counts are ON THE CHIPS deliberately. Three rooms have exactly one entry;
   showing that up front means a reader chooses a one-card result knowingly
   instead of clicking into what looks like a broken page. */
const ALL = "all";

const ROOM_NAME = new Map(RESTAURANTS.map((r) => [r.slug, r.name]));
const ROOM_ORDER = new Map(RESTAURANTS.map((r, i) => [r.slug, i]));

// built from BLOG, not from RESTAURANTS — a slug that appears in the feed but
// not in the canonical list still gets a chip (falling back to the raw slug
// for its label) rather than silently dropping its entries out of reach
const FILTERS = (() => {
  const counts = new Map<string, number>();
  for (const entry of BLOG) {
    if (!entry.restaurant) continue;
    counts.set(entry.restaurant, (counts.get(entry.restaurant) ?? 0) + 1);
  }
  const rooms = [...counts]
    .map(([slug, count]) => ({
      slug,
      label: ROOM_NAME.get(slug) ?? slug,
      count,
    }))
    .sort(
      (a, b) =>
        b.count - a.count ||
        (ROOM_ORDER.get(a.slug) ?? 99) - (ROOM_ORDER.get(b.slug) ?? 99),
    );
  /* "All restaurants", not "All" — this string is what the closed trigger
     shows in the default state, and a lone "All 24" on the end of a rule
     doesn't say what it is the all OF. Naming the axis in the resting label
     is what lets the control go without a "Filter by" caption beside it.

     The count is the whole feed, which is not necessarily the sum of the
     rooms — an entry with no restaurant is reachable here and nowhere else. */
  return [{ slug: ALL, label: "All restaurants", count: BLOG.length }, ...rooms];
})();

/* THE SKELETON IS THE PICTURE BOX, AND ONLY THE PICTURE BOX.

   A full card skeleton — grey bars standing in for the outlet, the headline
   and the excerpt — would be a lie here: all 24 entries ship in the bundle,
   so the type is laid out on the first frame and there is never a moment
   where it isn't known. Replacing readable text with a shimmer would make
   the page slower to read in order to look busier.

   The photographs are the part that genuinely isn't there yet. They are raw
   <img> (not next/image — see the comments on the card), and a filter or a
   page change swaps all ten at once, so the grid would otherwise flash ten
   flat --placeholder rectangles and fill them in raggedly.

   Keyed by SRC rather than by a boolean: `loaded` is derived from comparing
   the src that finished against the src being asked for now, so changing
   room or page puts the skeleton back with no reset effect to sequence, and
   a card whose image is already in cache never shows one. */
function CardMedia({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className: string;
}) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const loaded = loadedSrc === src;

  /* a cached image can complete BEFORE React attaches onLoad, and the event
     never fires for it — so ask the element directly on mount and on every
     src change. Without this the shimmer sticks forever on a second visit. */
  useEffect(() => {
    const el = imgRef.current;
    if (el?.complete && el.naturalWidth > 0) setLoadedSrc(src);
  }, [src]);

  return (
    <div className={`${className} ${loaded ? "" : styles.mediaLoading}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        onLoad={() => setLoadedSrc(src)}
        // a broken file must still retire the skeleton, or the card shimmers
        // for as long as the page is open
        onError={() => setLoadedSrc(src)}
        style={{ opacity: loaded ? 1 : 0 }}
      />
    </div>
  );
}

function Chevron() {
  return (
    <svg
      className={styles.chevron}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

/* The filter, as a menu rather than a row of chips — it rides the far right
   of the "Earlier Entries" rule, so the control that decides what the list
   contains sits on the list's own header line instead of taking a band of
   its own above the lede.

   A menu, not a <select>: the native popup is drawn by the OS and would be
   the one piece of chrome on the site that doesn't share its type or ink.
   The cost is that open/close, dismissal and keyboard walking have to be
   built, which is what the two effects below are. */
function RoomFilter({
  room,
  onSelect,
}: {
  room: string;
  onSelect: (slug: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const active = FILTERS.find((f) => f.slug === room) ?? FILTERS[0];

  // dismissal: a press anywhere else, or Escape. Escape hands focus back to
  // the trigger — closing a menu should never drop the keyboard at the top
  // of the document.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      btnRef.current?.focus();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // open ONTO the current choice rather than onto the top of the list, so
  // the keyboard starts where the reader already is
  useEffect(() => {
    if (!open) return;
    const el = menuRef.current?.querySelector<HTMLButtonElement>(
      "[data-opt][aria-checked='true']",
    );
    (el ?? menuRef.current?.querySelector<HTMLButtonElement>("[data-opt]"))?.focus();
  }, [open]);

  const onMenuKey = (e: React.KeyboardEvent) => {
    const opts = [
      ...(menuRef.current?.querySelectorAll<HTMLButtonElement>("[data-opt]") ??
        []),
    ];
    if (!opts.length) return;
    const i = opts.indexOf(document.activeElement as HTMLButtonElement);
    const to =
      e.key === "ArrowDown"
        ? (i + 1) % opts.length
        : e.key === "ArrowUp"
          ? (i - 1 + opts.length) % opts.length
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? opts.length - 1
              : -1;
    if (to < 0) return;
    e.preventDefault();
    opts[to].focus();
  };

  const choose = (slug: string) => {
    setOpen(false);
    btnRef.current?.focus();
    onSelect(slug);
  };

  return (
    <div className={styles.filter} ref={wrapRef}>
      <button
        ref={btnRef}
        type="button"
        className={styles.filterTrigger}
        aria-haspopup="menu"
        aria-expanded={open}
        // the visible text is "Belly 12", which reads as an unexplained
        // number to a screen reader, and says nothing about what it controls
        aria-label={`Filter by restaurant — showing ${active.label}, ${
          active.count
        } ${active.count === 1 ? "entry" : "entries"}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{active.label}</span>
        <span className={styles.filterCount}>{active.count}</span>
        <Chevron />
      </button>

      {open && (
        <div
          ref={menuRef}
          className={styles.filterMenu}
          role="menu"
          aria-label="Filter entries by restaurant"
          onKeyDown={onMenuKey}
          // the menu can outgrow a short viewport; Lenis owns the page
          // scroll and would swallow the wheel over it without this
          data-lenis-prevent
        >
          {FILTERS.map((f) => (
            <button
              key={f.slug}
              type="button"
              data-opt
              role="menuitemradio"
              aria-checked={f.slug === room}
              className={`${styles.filterOption} ${
                f.slug === room ? styles.filterOptionActive : ""
              }`}
              onClick={() => choose(f.slug)}
            >
              <span>{f.label}</span>
              <span className={styles.filterCount}>{f.count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
  const dividerRef = useRef<HTMLDivElement>(null);

  /* the URL is the single source of truth for BOTH the filter and the page —
     links stay shareable. Invalid values clamp to the valid range.

     ORDER MATTERS HERE: the filter is read first because it decides how many
     pages exist, and the page is clamped against THAT count. Reading them the
     other way round would clamp against the unfiltered archive and let
     /blog?restaurant=hoodwood&page=3 render an empty grid. */
  const rawRoom = searchParams.get("restaurant") ?? ALL;
  const room = FILTERS.some((f) => f.slug === rawRoom) ? rawRoom : ALL;

  const filtered =
    room === ALL ? BLOG : BLOG.filter((b) => b.restaurant === room);
  // the newest of THIS set leads it — filtering to one room and still seeing
  // another room's story as the lede would read as the filter not working
  const featured = filtered[0];
  const others = filtered.slice(1);
  const pageCount = pageCountFor(others);

  const raw = Number(searchParams.get("page") ?? "1");
  const page = Number.isFinite(raw)
    ? Math.min(Math.max(Math.trunc(raw), 1), pageCount)
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

  /* flags a URL change as user-initiated so the scroll effect below runs —
     deep links (/blog?page=2) and back/forward shouldn't force a jump. It
     carries WHICH control was used, because the two want different landings:
     paginating should put the reader at the top of the new cards, but
     changing the filter should keep the menu on screen so the new choice is
     readable next to its result. Landing a filter change on the list would
     scroll the header line the reader just used off the top of the
     viewport. */
  const navIntentRef = useRef<null | "page" | "filter">(null);

  // entrance reveal is a first-mount-only affair — pagination re-renders
  // swap the card content in place without replaying the animation
  const revealedOnceRef = useRef(false);
  useEffect(() => {
    revealedOnceRef.current = true;
  }, []);

  /* one place that builds the URL, so the filter and the page can never
     disagree about what the address means. Both are omitted at their default
     ("all", page 1), which keeps the canonical /blog clean and stops the
     archive accumulating ?restaurant=all&page=1 in shared links. */
  const hrefFor = (slug: string, p: number) => {
    const q = new URLSearchParams();
    if (slug !== ALL) q.set("restaurant", slug);
    if (p > 1) q.set("page", String(p));
    const query = q.toString();
    return query ? `/blog?${query}` : "/blog";
  };

  const goTo = (n: number) => {
    const next = Math.min(Math.max(n, 1), pageCount);
    if (next === page) return;
    navIntentRef.current = "page";
    // push (not replace) — each page gets its own history entry, so the
    // browser back button steps back through pagination before leaving /blog
    router.push(hrefFor(room, next), { scroll: false });
  };

  /* THE FILTER RESETS THE PAGE, and that is the whole reason this is one
     helper rather than a second router.push written inline. Page 3 of the
     unfiltered archive is a valid address; page 3 of Hoodwood's three
     entries is not. Carrying the page across a filter change would strand
     the reader on a page that no longer exists — the clamp above would pull
     them back to the last valid page, so the click would look like it had
     silently jumped them somewhere they didn't ask to go. Dropping `page`
     entirely means every filter change starts at the top of its own set. */
  const goToRoom = (slug: string) => {
    if (slug === room) return;
    navIntentRef.current = "filter";
    router.push(hrefFor(slug, 1), { scroll: false });
  };

  // bring the reader back to the top of the list *after* the new page's DOM
  // has committed, so the jump lands against final layout (scrolling inside
  // goTo measured the old DOM and fought the re-render mid-glide)
  useEffect(() => {
    const intent = navIntentRef.current;
    if (!intent) return;
    navIntentRef.current = null;
    // double rAF — on pages ≠ 1 the featured lede + divider unmount, so wait
    // two frames for that commit to paint AND the document to reflow before
    // measuring; a same-tick measure still resolves against stale layout.
    // A filter change moves even more (the whole set is replaced), so it
    // needs the same two frames at least as much.
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        // a filter change lands on the header line, so the menu the reader
        // just used stays on screen next to its result; paginating lands on
        // the cards themselves
        const el = intent === "filter" ? dividerRef.current : listRef.current;
        if (!el) return;

        /* A GLIDE, NOT A CUT. This used to be `immediate: true`, which put
           the reader at the top of the list on the next frame — the page
           they had been reading was simply gone, with nothing to say the
           list had been replaced rather than the whole route.

           Travelling the distance instead is what makes the two ends read as
           one page: the pagination sits at the FOOT of the list, so the
           journey passes back over the cards, which by then are the new set
           wearing their skeletons (see CardMedia — a new page means new
           slugs, so every card remounts unloaded). The photographs fill in
           during the glide, and the reader arrives at a list that has
           already finished assembling itself.

           Expo-out, matching the site's cubic-bezier(0.22, 1, 0.36, 1): most
           of the distance is covered early, then it settles. A linear scroll
           of ~2000px reads as being dragged. */
        const reduce = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;

        if (lenisRef.current) {
          // re-sync Lenis's cached dimensions with the reflowed document
          // before targeting, or the scroll lands against stale geometry
          lenisRef.current.resize();
          lenisRef.current.scrollTo(el, {
            offset: -110,
            // an animated scroll across the length of the list is exactly
            // the motion a vestibular reader asked not to be shown — they
            // still get taken to the top, just without the journey
            immediate: reduce,
            duration: 1.1,
            easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          });
        } else {
          window.scrollTo({
            top: el.getBoundingClientRect().top + window.scrollY - 110,
            behavior: reduce ? "auto" : "smooth",
          });
        }
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [page, room]);

  const posts = postsForPage(others, page);
  const activeLabel = FILTERS.find((f) => f.slug === room)?.label ?? "All";

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
          {page === 1 && featured && (
            <Reveal>
              <a
                className={styles.featured}
                href={featured.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <CardMedia
                  className={styles.featuredMedia}
                  src={featured.image}
                  alt={featured.title}
                />
                <div className={styles.featuredBody}>
                  <span className={styles.featuredTag}>
                    Latest · {featured.dateLabel} · {featured.source}
                  </span>
                  <h2 className={styles.featuredTitle}>{featured.title}</h2>
                  <p className={styles.featuredExcerpt}>{featured.excerpt}</p>
                  <span className={styles.featuredLink}>
                    Read the story <span aria-hidden>→</span>
                  </span>
                </div>
              </a>
            </Reveal>
          )}

          {/* The list's header line — the rule between the latest story and
              the older entries, and the filter's home on its right end.

              IT RENDERS IN EVERY STATE, which the plain rule did not: it used
              to be page-1-only, but the control lives on it now, and a filter
              that disappears on page 2 — or on the three rooms that hold a
              single entry, where the grid below is empty — would be a trap
              with no way back to the rest of the archive.

              The WORDS are what's conditional instead. "Earlier Entries" is a
              caption for the cards under it, so it goes when there are none;
              the rule and the menu stay, and the row reads as a bare hairline
              with a control on it. aria-hidden sits on the label alone — on
              the row it would have taken the menu with it. */}
          <div ref={dividerRef} className={styles.divider}>
            {posts.length > 0 && (
              <span className={styles.dividerLabel} aria-hidden>
                Earlier Entries
              </span>
            )}
            <span className={styles.dividerRule} aria-hidden />
            <RoomFilter room={room} onSelect={goToRoom} />
          </div>

          {/* the list is replaced without the focus or the viewport moving
              much, so announce the new size — otherwise choosing a room is
              silent to anyone not watching the grid */}
          <p className="sr-only" role="status">
            {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
            {room === ALL ? "" : ` for ${activeLabel}`}
          </p>

          {/* the whole list unmounts rather than rendering an empty <ul> —
              the grid carries its own vertical padding, so an empty one
              leaves an unexplained band of air under a single-entry room */}
          {posts.length > 0 && (
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
                    <CardMedia
                      className={styles.cardMedia}
                      src={item.image}
                      alt={item.title}
                    />
                    {/* THE OUTLET LEADS, the date follows. Both were already
                        here, in the other order — and on a page where every
                        entry links OUT to someone else's publication, the
                        masthead is the credential and the thing a reader
                        scans for. "Forbes" earns attention; "11 Feb 2026"
                        does not. The date keeps its place in the line, just
                        not the front of it. */}
                    <div className={styles.cardMeta}>
                      <span className={styles.cardSource}>{item.source}</span>
                      <span className={styles.cardSep} aria-hidden />
                      <span>{item.dateLabel}</span>
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
          )}

          {/* numbered pagination — 01 02 03, active in saffron. Hidden when
              the filtered set is one page: a lone "01" between two arrows
              that can never fire is furniture, not a control. */}
          {pageCount > 1 && (
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
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
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
              disabled={page >= pageCount}
              aria-label="Next page"
            >
              <Arrow dir="right" />
            </button>
          </nav>
          )}
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
