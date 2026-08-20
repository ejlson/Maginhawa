"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Image from "next/image";
import Nav from "./Nav";
import Menu from "./Menu";
import Reveal from "./Reveal";
import PillCta from "./PillCta";
import Footer from "./Footer";
import DarkZone from "./DarkZone";
import styles from "./BlogIndex.module.css";
import { BLOG, entryLinkProps, type BlogEntry } from "@/lib/blog";
import { RESTAURANTS, getRestaurant } from "@/lib/restaurants";
import { lenisRef } from "@/lib/SmoothScroll";
import { asset } from "@/lib/media";

/* page 1 = the featured latest + the next PER_PAGE posts; every following
   page shows PER_PAGE more. Unfiltered, 24 entries → 1+8 / 8 / 7.

   EIGHT, BECAUSE THE GRID IS FOUR-UP — at the user's instruction, two full
   rows and no orphan. It was 9, which is the one count a four-column grid
   cannot fill: every page ended in a lone card with three columns of cream
   beside it, and the pagination under it read as sitting on a broken row.
   ⚠️ THIS NUMBER AND .grid's COLUMN COUNT ARE A PAIR. If the grid ever goes
   back to three-up, this has to become a multiple of three (or the orphan
   returns); the two live in different files, so neither can check the
   other. */
const PER_PAGE = 8;

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

/* Built from the FEED, not from RESTAURANTS — a slug that appears in the
   feed but not in the canonical list still gets a chip (falling back to the
   raw slug for its label) rather than silently dropping its entries out of
   reach.

   ⚠️ IT IS A FUNCTION OF THE FEED AND NOT A MODULE CONSTANT, which it was
   until our own posts joined it. The feed is no longer knowable at module
   scope: content/posts/*.mdx is read at build time on the server and arrives
   here as a prop (see the note on BlogIndex at the foot of this file), so a
   chip list computed from the imported BLOG would count the press and miss
   every post we wrote. */
function buildFilters(entries: BlogEntry[]) {
  const counts = new Map<string, number>();
  for (const entry of entries) {
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
  return [
    { slug: ALL, label: "All restaurants", count: entries.length },
    ...rooms,
  ];
}

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
  children,
}: {
  src: string;
  alt: string;
  className: string;
  /* the corner furniture that rides ON the photograph — today the venue's
     mark. It is a child of the media box rather than a sibling so it clips
     to the same radius and travels with the box's own zoom-free frame; the
     zoom is on the <img> alone. */
  children?: React.ReactNode;
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
        // the CDN URL; `src` itself stays raw because the loaded-state
        // latch above compares against it
        src={asset(src)}
        alt={alt}
        onLoad={() => setLoadedSrc(src)}
        // a broken file must still retire the skeleton, or the card shimmers
        // for as long as the page is open
        onError={() => setLoadedSrc(src)}
        style={{ opacity: loaded ? 1 : 0 }}
        /* `loaded` can only ever become true from an event handler, so with
           no JavaScript every photograph on the archive stays at opacity 0
           and the grid is twenty-five shimmering grey rectangles. The
           <noscript> block in app/layout.tsx restores them; the bare
           attribute (no "rise"/"wipe" value) resets opacity ONLY, which
           leaves the hover zoom on this same element alone. */
        data-entrance=""
      />
      {children}
    </div>
  );
}

/* THE VENUE'S MARK ON A STORY'S PHOTOGRAPH — the one thing that makes a
   journal card belong to this group rather than to any magazine.

   It is the same object the venue cards carry (VenueCard.module.css's
   `.cardLogo` / `.cardCrown::before`): a cream mask over a radial wash off
   the photograph's top-left corner, so it takes the palette rather than
   whatever ink the source PNG happens to have, and it has a ground to sit
   on. The wash is what buys the contrast — a bare cream mark on a bright
   photograph measures ~1.16:1, i.e. it is not there.

   THE DATA WAS ALREADY HERE. Every entry in lib/blog.ts carries a
   `restaurant` slug — it is what the room filter is built from — and every
   restaurant carries a `logo`. The card simply never asked for it, so a
   reader could not tell whose story they were looking at.

   `role="img"` + the venue's name, for the reason VenueCard states: the
   mark is a logotype a reader recognises, and the accessible name is the
   string a screen reader needs. Entries with no restaurant (or a slug with
   no mark on file) render nothing rather than a gap. */
function VenueMark({ slug }: { slug?: string }) {
  const venue = slug ? getRestaurant(slug) : undefined;
  if (!venue?.logo) return null;
  return (
    <span className={styles.cardMark} role="img" aria-label={venue.name}>
      <span
        className={styles.cardMarkInk}
        style={{ "--ov-logo-url": `url(${asset(venue.logo)})` } as React.CSSProperties}
      />
    </span>
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
  filters,
  room,
  onSelect,
}: {
  /* the chip list is computed from the feed by its owner and passed in —
     it stopped being a module constant when our own posts joined the
     journal, see buildFilters above */
  filters: ReturnType<typeof buildFilters>;
  room: string;
  onSelect: (slug: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const active = filters.find((f) => f.slug === room) ?? filters[0];

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
          {filters.map((f) => (
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

/* ═══ THE ADDRESS BAR, READ AS A STORE ═══
 *
 * This replaces `useSearchParams()`, and the reason is not preference.
 *
 * ── ⚠️ WHAT useSearchParams DID TO THIS PAGE ──
 * Reading it during render forces the route into a Suspense boundary, and
 * under `output: "export"` that boundary is emitted as a STREAMED chunk:
 * out/blog.html carried `<!--$?--><template id="B:0">` where the archive
 * should be, and the entire page — nav, lede, all 25 entries — sat at the
 * foot of the file inside `<div hidden id="S:0">`, waiting for React's inline
 * script to move it into place. The words were in the file and the page was
 * blank without JavaScript. A `force-static` export on the route fixed the
 * *fallback* problem (a null fallback meant no cards at all) and not this
 * one — the markup was still parked in a hidden div — so it is gone again;
 * app/blog/page.tsx now needs no configuration.
 *
 * Reading the query from a store instead means nothing suspends, the archive
 * renders inline, and the HTML that leaves the build is the page.
 *
 * ── THE THREE FUNCTIONS ──
 * `getServerSnapshot` returns "" so the prerender — and the first render in
 * the browser, which must match it — is the DEFAULT view: all restaurants,
 * page 1. That is the only state a static file can hold, because Cloudflare
 * serves the same out/blog.html for every query string. React then re-renders
 * from the client snapshot BEFORE PAINT, which is what useSyncExternalStore
 * is for and what a useEffect could not do without a visible frame of the
 * wrong list.
 *
 * `subscribe` listens for the back button. Forward navigation notifies by
 * hand — see `navigate` below.
 *
 * ⚠️ THE URL IS STILL THE SOURCE OF TRUTH. Every value the page renders is
 * derived from `location.search` on every render after the first; nothing
 * here caches a filter or a page number in React state. Links stay shareable
 * and the back button still walks the pagination. */
const queryListeners = new Set<() => void>();

function subscribeQuery(onChange: () => void) {
  queryListeners.add(onChange);
  window.addEventListener("popstate", onChange);
  return () => {
    queryListeners.delete(onChange);
    window.removeEventListener("popstate", onChange);
  };
}

/* ⚠️ `history.pushState` RATHER THAN `router.push`, AND THE STORE IS WHY.
   router.push runs inside a transition, so the address bar updates when that
   transition commits — after this function has returned, which means there is
   no moment at which it is correct to tell the store to re-read. Next 15
   supports the native History API for exactly this case (changing the query
   on the route you are already on, with no re-fetch), and it is synchronous:
   push, then notify, and the render that follows sees the new URL. */
function navigate(href: string) {
  window.history.pushState(null, "", href);
  queryListeners.forEach((l) => l());
}

function BlogIndexInner({ entries }: { entries: BlogEntry[] }) {
  const [menuOpen, setMenuOpen] = useState(false);
  /* the chips depend only on the feed, and the feed does not change while
     the page is open — so this is computed once rather than on every
     filter click and every pagination render */
  const FILTERS = useMemo(() => buildFilters(entries), [entries]);
  const listRef = useRef<HTMLDivElement>(null);
  const dividerRef = useRef<HTMLDivElement>(null);

  /* the query, re-read on every render after the first — see the store above
     for why it is not useSearchParams */
  const search = useSyncExternalStore(
    subscribeQuery,
    () => window.location.search,
    () => "",
  );
  const searchParams = useMemo(() => new URLSearchParams(search), [search]);

  /* the URL is the single source of truth for BOTH the filter and the page —
     links stay shareable. Invalid values clamp to the valid range.

     ORDER MATTERS HERE: the filter is read first because it decides how many
     pages exist, and the page is clamped against THAT count. Reading them the
     other way round would clamp against the unfiltered archive and let
     /blog?restaurant=hoodwood&page=3 render an empty grid. */
  const rawRoom = searchParams.get("restaurant") ?? ALL;
  const room = FILTERS.some((f) => f.slug === rawRoom) ? rawRoom : ALL;

  const filtered =
    room === ALL ? entries : entries.filter((b) => b.restaurant === room);
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

  /* THE GRID DOES NOT ANIMATE IN, at the user's instruction. It used to
     stagger its cards on the first mount — a Reveal per <li> with a
     `(i % 6) * 0.06` delay, and a ref that latched after that mount so
     paginating never replayed it.

     The whole apparatus is gone rather than disabled: with the cards now
     bare photographs and type (see the entry markup below) there is no
     object arriving, and eight plates fading up in sequence read as the
     page still loading. The head and the featured lede keep their Reveals —
     those are one element each, not a field. */

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
    navigate(hrefFor(room, next));
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
    navigate(hrefFor(slug, 1));
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

           Expo-out, matching the site's var(--ease-entrance): most
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

  /* THE LEDE IS PAGE ONE'S ALONE, and everything below keys off this one
     flag rather than re-deriving `page === 1 && featured` three times — the
     head's rule and the list's header line both change shape when it is
     absent, and they must never disagree about whether it is there. */
  const showLede = page === 1 && Boolean(featured);

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
          {/* ═══ THE CHAPTER HEAD — the same three-part lockup Discover
              opens with: the group's mark set into a standing label, the
              display sentence under it, then a full-width hairline that
              closes the head and opens the entries.

              WHAT IT REPLACES: a bare <h1> sitting alone on the page
              margin. The comment that used to live here argued the eyebrow
              was better gone — "this header already owns an <h1>, and the
              sentence in it says what the page is" — and that reasoning was
              about a SAFFRON-DOT eyebrow, a device since retired site-wide.
              This is not that device. It is Discover's label row, the
              chapter grammar the home page settled on, and the journal was
              the last chapter still opening without it.

              THE LABEL IS A <p>, NOT A PROMOTED HEADING, and that is the
              one place this deliberately parts from Discover. Discover's
              label IS its <h2> because a section's name is its heading;
              /blog is a PAGE, its <h1> is the sentence that names it (and
              the string the OG description echoes), and adding a second
              heading that said "Blog" would put two headings on one idea.
              The outline stays h1 → h2 featured → h3 cards, exactly as the
              retired comment wanted.

              THE MARK IS DECORATIVE, hence alt="". The word beside it
              already says what it is. 1024×1024 is the file's real size —
              maginhawa.png is a SQUARE mark, not a horizontal lockup, and
              declaring it as one would reserve a 5.33:1 box for a 1:1
              picture (see the same note in Discover.tsx).

              "BLOG", NOT "JOURNAL". The nav, the footer and the menu all
              say Blog and so does the home chapter; the page's <title> and
              OG tags say Journal. The visible label follows the four
              surfaces a reader navigates by. The metadata mismatch is real
              and is left alone here — it is a copy decision, not a layout
              one. ═══ */}
          <header className={styles.head}>
            <Reveal>
              <p className={styles.chapterLabel}>
                {/* `sizes` — see the fuller note in Discover.tsx. 2.6em
                    here too, so the same 48px ceiling. */}
                <Image
                  className={styles.labelMark}
                  src="/logo/maginhawa.png"
                  alt=""
                  width={1024}
                  height={1024}
                  sizes="48px"
                  aria-hidden
                />
                Blog
              </p>
            </Reveal>
            <Reveal delay={0.06}>
              <h1 className={styles.title}>
                Stories, openings, and ideas shaping the Maginhawa Group.
              </h1>
            </Reveal>
            {/* THE HEAD'S RULE ONLY EXISTS WHEN SOMETHING SEPARATES IT FROM
                THE LIST'S RULE — i.e. on page one, where the featured lede
                sits between them.

                THE BUG IT FIXES: from page two on, the lede unmounts and
                these two hairlines land ~30px apart with nothing but air
                between them. The reader sees the head underlined twice, and
                a doubled rule reads as a rendering fault rather than as
                structure — it was the "two lines" reported on the next
                page. Neither rule is wrong on its own; there is simply only
                one boundary there to draw.

                THE LIST'S RULE IS THE SURVIVOR, not this one, because it
                carries the label and the filter. Keeping this one instead
                would mean dropping the control that is a reader's only way
                back out of a filtered set. .dividerLead below then takes
                over this rule's own margin, so the surviving hairline lands
                where the eye already expects a line. */}
            {showLede && <span className={styles.headRule} aria-hidden />}
          </header>

          {/* compact featured lede — page 1 only */}
          {showLede && featured && (
            <Reveal>
              <a
                className={styles.featured}
                href={featured.url}
                {...entryLinkProps(featured)}
                /* drives the pill's close from the whole card — see the
                   presentational note in PillCta.tsx */
                data-cta-hover
              >
                <CardMedia
                  className={styles.featuredMedia}
                  src={featured.image}
                  alt={featured.title}
                >
                  <VenueMark slug={featured.restaurant} />
                </CardMedia>
                <div className={styles.featuredBody}>
                  <span className={styles.featuredTag}>
                    Latest · {featured.dateLabel} · {featured.source}
                  </span>
                  <h2 className={styles.featuredTitle}>{featured.title}</h2>
                  <p className={styles.featuredExcerpt}>{featured.excerpt}</p>
                  {/* THE HOUSE ACTION, at the user's instruction — the same
                      PillCta the home page's journal head presses ("Read
                      More"), rather than the outlined chip this used to
                      share with the grid cards below. It renders
                      presentationally because the whole lede is the anchor;
                      PillCta.tsx explains that mode and `data-cta-hover`
                      above hands it the card's hover. */}
                  <PillCta presentational className={styles.featuredCta}>
                    Read the story
                  </PillCta>
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
          <div
            ref={dividerRef}
            className={`${styles.divider} ${
              showLede ? "" : styles.dividerLead
            }`}
          >
            {posts.length > 0 && (
              <span className={styles.dividerLabel} aria-hidden>
                Earlier Entries
              </span>
            )}
            <span className={styles.dividerRule} aria-hidden />
            <RoomFilter filters={FILTERS} room={room} onSelect={goToRoom} />
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
              {/* ═══ THE ENTRY, AS THE USER'S REFERENCE DRAWS IT ═══
                  A tall photograph, the headline under it, a hairline, the
                  standfirst, and a plain "Read article →". No card.

                  WHAT IT REPLACES: the object this grid carried until now —
                  a cream panel with a 12px mat, a four-stop shadow and a
                  1% lift, cut from the venue card's material so the two
                  grids would read as one system. That argument was about
                  the RESTAURANTS grid; this is the JOURNAL, and the
                  reference is unambiguous that an entry here is a printed
                  plate with type set under it, not a pressable tile.

                  WHAT THE BOX WAS DOING, and who does it now: the panel's
                  edge was what separated one entry from the next. With it
                  gone the row gap and the column gap carry that on their
                  own, which is why both grew — see .grid.

                  THERE IS NO "PREVIEW." LEAD-IN, at the user's
                  instruction. The reference bolds a category word at the
                  head of the standfirst; the outlet and the date keep
                  their own line under the rule instead, because on a page
                  where every entry links OUT the masthead is the
                  credential and it cannot be the one thing dropped. ═══ */}
              {posts.map((item) => (
                <li key={item.slug}>
                  <a
                    className={styles.card}
                    href={item.url}
                    {...entryLinkProps(item)}
                  >
                    <CardMedia
                      className={styles.cardMedia}
                      src={item.image}
                      alt={item.title}
                    >
                      <VenueMark slug={item.restaurant} />
                    </CardMedia>
                    <div className={styles.cardBody}>
                      <h3 className={styles.cardTitle}>{item.title}</h3>
                      {/* the reference's rule, and it is a real element for
                          the reason .divider's is: it has to sit BETWEEN two
                          things, which a ::after on the body cannot do */}
                      <span className={styles.cardRule} aria-hidden />
                      {/* THE OUTLET LEADS, the date follows. "Forbes" earns
                          attention; "11 Feb 2026" does not. */}
                      <div className={styles.cardMeta}>
                        <span className={styles.cardSource}>{item.source}</span>
                        <span className={styles.cardSep} aria-hidden />
                        <span>{item.dateLabel}</span>
                      </div>
                      <p className={styles.cardExcerpt}>{item.excerpt}</p>
                      {/* A <span>, never a nested anchor: the whole card is
                          the link. The pill it used to be now belongs to the
                          lede alone, which is what keeps the top story and
                          the archive from reading as equals. */}
                      <span className={styles.cardBtn}>
                        Read article
                        <span className={styles.cardBtnArrow} aria-hidden>
                          →
                        </span>
                      </span>
                    </div>
                  </a>
                </li>
              ))}
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

/* ── THE FEED ARRIVES AS A PROP, FROM app/blog/page.tsx ──
   This is a client component and the posts it now lists are read off the
   filesystem (content/posts/*.md), which only a server component can do. So
   the route reads them, merges them with BLOG and hands the result down — see
   the architecture note at the top of lib/posts.ts.

   ⚠️ THE DEFAULT IS NOT DEAD CODE. A route that forgets to pass the feed
   renders the press-only archive rather than an empty page: the failure mode
   is "our own posts are missing", which is visible, rather than "/blog is
   blank", which looks like an outage.

   ⚠️ THERE IS NO <Suspense> HERE ANY MORE, AND THAT IS THE POINT. It was
   required while this read useSearchParams, and it was what put the whole
   archive into a streamed `<div hidden>` in the exported HTML — see the store
   at the top of this file. Nothing suspends now, so the page renders inline
   and the file that reaches the reader is the page. */
export default function BlogIndex({
  entries = BLOG,
}: {
  entries?: BlogEntry[];
}) {
  return <BlogIndexInner entries={entries} />;
}
