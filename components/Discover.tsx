"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./Discover.module.css";
import MenuOverlay from "./MenuOverlay";
import { getRestaurant } from "@/lib/restaurants";
import { lenisRef } from "@/lib/SmoothScroll";

// Local presentation copy for the grid — richer blurbs than the canonical
// lib/restaurants.ts entries, which stay the source of truth for routing,
// bookability and structured data.
type DiscoverItem = {
  slug: string;
  name: string;
  tag: string;
  location: string;
  image: string | null;
  logo: string | null;
  blurb: string;
  // secondary credential mark (e.g. Michelin Guide for Belly)
  badge?: string;
  badgeLabel?: string;
  // menu overlay pages + small-caps subtitle (e.g. "February 2026")
  menuPages?: string[];
  menuLabel?: string;
  bookingUrl?: string;
};

const ITEMS: DiscoverItem[] = [
  {
    slug: "bintang",
    name: "Bintang",
    tag: "Filipino Fusion Restaurant",
    location: "93 Kentish Town Rd, London NW1 8NY",
    image: "/images/bintang.jpg",
    logo: "/logo/bintang.png",
    menuPages: [
      "/menu/bintang/bintang_menu-1.png",
      "/menu/bintang/bintang_menu-2.png",
    ],
    menuLabel: "February 2026",
    blurb: "A Kentish Town staple since 1987 — Chef Omar's family kitchen, blending Malay, Indonesian, Japanese, Vietnamese and Filipino cooking.",
    bookingUrl: "https://www.opentable.co.uk/booking/restref/availability?lang=en-GB&correlationId=6b35518d-aef1-43a2-8dcc-ad4ef5dc8053&restRef=324126&otSource=Restaurant%20website",
  },
  {
    slug: "guanabana",
    name: "Guanabana",
    tag: "Caribbean Cuisine",
    location: "85 Kentish Town Rd, London NW1 8NY",
    image: "/images/guanabana.jpg",
    logo: "/logo/guanabana.png",
    blurb: "Kentish Town's Caribbean and Latin American room, best known for its oak-smoked Island Roast — since 2007.",
    bookingUrl: "https://www.opentable.co.uk/guanabana-reservations-london?restref=79453&lang=en-GB&ot_source=Restaurant%20website",
  },
  {
    slug: "mamasons",
    name: "Mamasons",
    tag: "London's First Filipino Ice Cream Parlor",
    location: "91 Kentish Town Rd · 32 Newport China Town",
    image: null,
    logo: "/logo/mamasons.png",
    blurb:
      "London's first Filipino ice cream parlour — Manila-style dirty ice cream, scooped fresh across two sites.",
  },
  {
    slug: "ramo",
    name: "Ramo Ramen",
    tag: "Filipino-Japanese Ramen",
    location: "28 Brewer St, Soho, London W1F 0SR",
    image: "/images/ramo.jpg",
    logo: "/logo/ramo.png",
    menuPages: [
      "/menu/ramo/lunch-1.png",
      "/menu/ramo/alacarte.png",
      "/menu/ramo/groupset.png",
      "/menu/ramo/drinks-1.png",
      "/menu/ramo/drinks-2.png",
    ],
    menuLabel: "February 2026",
    blurb: "The world's first Filipino-Japanese ramen joint — Originally from Kentish Town, since 2018, with our current location in Soho.",
    bookingUrl: "https://www.sevenrooms.com/reservations/ramosoho/",
  },
  {
    slug: "hoodwood",
    name: "Hoodwood",
    tag: "Caribbean Takeaway",
    location: "81 Kentish Town Rd, London NW1 8NY",
    image: "/images/hoowood.jpg",
    logo: "/logo/hoodwood.png",
    blurb:
      "Oak-smoked jerk plates and handmade patties, fire-kissed over an open flame — Caribbean takeaway, done honestly.",
  },
  {
    slug: "cafemama",
    name: "Café Mama & Sons",
    tag: "Filipino x Japanese Café",
    location: "83 Kentish Town Rd, London NW1 8NY",
    image: "/images/cafemama.jpg",
    logo: "/logo/cafemama.png",
    menuPages: [
      "/menu/cafemama/page-1.png",
      "/menu/cafemama/page-2.png",
      "/menu/cafemama/page-3.png",
      "/menu/cafemama/page-4.png",
    ],
    menuLabel: "February 2026",
    blurb:
      "Hand-crafted sandos, all-day pandesal breakfasts, homemade baked treats, and quality coffee — your daily escape from the ordinary.",
  },
  {
    slug: "belly",
    name: "Belly",
    tag: "Modern Filipino Bistro",
    location: "157 Kentish Town Rd, London NW1 8PD",
    image: "/images/belly.jpg",
    logo: "/logo/belly.png",
    menuPages: [
      "/menu/belly/food.png",
      "/menu/belly/drinks-1.png",
    ],
    menuLabel: "February 2026",
    // Belly is the group's Michelin Guide listing — the mark renders as part
    // of the centered brand group so it stays visible at rest AND expanded.
    badge: "/logo/michelin-2026-round.png",
    badgeLabel: "Michelin Selected Restaurant 2026",
    blurb: "A modern Filipino bistro drawing on French technique.",
    bookingUrl: "https://booking.resdiary.com/widget/Standard/BELLYBISTRO/65884",
  },
  {
    // Coming-soon placeholder — no photography or mark yet, so the tile
    // renders a typographic wordmark on a maroon field instead.
    slug: "bunso",
    name: "Bunso",
    tag: "The Youngest of the Family",
    location: "1a Hawley Rd, London NW1 8RP",
    image: null,
    logo: "/images/bunso.png",
    blurb:
      "Bunso — 'the youngest' — is the newest member of the Maginhawa family. Full details, menu and location coming soon.",
  },
];

// stagger pitch between tiles on scroll-in, in ms (40–60ms feels right)
const STAGGER_MS = 50;

// ---- click-expansion geometry (GSAP Flip grid→modal feel) ----
// The clicked tile's frame grows to 250% × 200% of its cell and lands
// dead-centre on the VIEWPORT (scroll is locked, so the screen centre is
// stable). Size is capped to the viewport so the card is always fully
// on-screen.
const FRAME_SCALE_X = 2.5;
const FRAME_SCALE_Y = 2;

// measured once per activation, from real rects
type ExpandGeometry = {
  // vector from the clicked cell's centre to the card's final centre, px
  dx: number;
  dy: number;
  // expanded frame size, px (capped by the viewport)
  fw: number;
  fh: number;
};

export default function Discover() {
  // which restaurant's menu overlay is open — a slug, not a boolean, so the
  // grid supports multiple menu-enabled tiles without cross-wiring
  const [openMenuSlug, setOpenMenuSlug] = useState<string | null>(null);
  const [inView, setInView] = useState(false);
  // the tile currently EXPANDED (clicked) — drives the flip-modal card,
  // computed as inline styles below
  const [active, setActive] = useState<number | null>(null);
  // the tile whose COLLAPSE animation is still running — keeps its elevated
  // z-index until the return journey finishes, so the card never ducks
  // behind the grid mid-animation
  const [closing, setClosing] = useState<number | null>(null);
  const gridRef = useRef<HTMLUListElement>(null);
  const tileRefs = useRef<(HTMLElement | null)[]>([]);
  const geomRef = useRef<ExpandGeometry | null>(null);
  const closeTimer = useRef(0);

  // one-shot entrance reveal — flips a class once the grid scrolls into
  // view; the per-tile stagger is pure CSS (transition-delay steps)
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.05, rootMargin: "0px 0px -16% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const expanding = active !== null && geomRef.current !== null;

  // scroll lock — while the backdrop dims the page, the page doesn't move.
  // Lenis is stopped for wheel/smooth scrolling and overflow:hidden covers
  // native/keyboard paths; the effect cleanup restores both on collapse,
  // unmount and route change, so scroll can never stay stuck.
  useEffect(() => {
    if (!expanding) return;
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    const prevPadRight = html.style.paddingRight;
    // compensate the vanishing scrollbar so the page doesn't jump sideways
    const scrollbar = window.innerWidth - html.clientWidth;
    if (scrollbar > 0) html.style.paddingRight = `${scrollbar}px`;
    html.style.overflow = "hidden";
    lenisRef.current?.stop();
    return () => {
      html.style.overflow = prevOverflow;
      html.style.paddingRight = prevPadRight;
      lenisRef.current?.start();
    };
  }, [expanding]);

  // clear the closing hold — called from the frame's transitionend, with a
  // timeout fallback (exit duration + margin) in case the event is swallowed
  const settleClose = useCallback(() => {
    window.clearTimeout(closeTimer.current);
    setClosing(null);
  }, []);

  // collapse — restores scroll (via the effect above), hands focus back to
  // the tile that opened the card, and holds that tile's z-index until its
  // return animation completes
  const collapse = () => {
    if (active !== null) {
      tileRefs.current[active]?.focus({ preventScroll: true });
      setClosing(active);
      window.clearTimeout(closeTimer.current);
      closeTimer.current = window.setTimeout(() => setClosing(null), 560);
    }
    setActive(null);
  };

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  // Escape closes the expanded card
  useEffect(() => {
    if (!expanding) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") collapse();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanding, active]);

  // measure the clicked cell and derive the card's landing spot: the true
  // centre of the screen. Cells (<li>) never transform, so their rects are
  // always the rest layout.
  const engage = (i: number) => {
    const ul = gridRef.current;
    const cell = ul?.children[i] as HTMLElement | undefined;
    if (!ul || !cell) return;
    const cellRect = cell.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // capped to the viewport so the centred card is always fully on-screen
    const fw = Math.min(cellRect.width * FRAME_SCALE_X, vw * 0.9);
    const fh = Math.min(cellRect.height * FRAME_SCALE_Y, vh * 0.85);

    // clicked cell centre → viewport centre, in viewport coordinates
    const cx = cellRect.left + cellRect.width / 2;
    const cy = cellRect.top + cellRect.height / 2;

    geomRef.current = { dx: vw / 2 - cx, dy: vh / 2 - cy, fw, fh };
    setActive(i);
  };

  const toggle = (i: number) => {
    if (active === i) collapse();
    else engage(i);
  };

  // inline style for the expanded frame — CSS transitions animate every
  // change, so the collapse retargets cleanly mid-flight too
  const frameStyleFor = (i: number): React.CSSProperties | undefined => {
    if (!expanding || i !== active) return undefined;
    const g = geomRef.current!;
    return {
      width: `${g.fw}px`,
      height: `${g.fh}px`,
      transform: `translate(calc(-50% + ${g.dx}px), calc(-50% + ${g.dy}px))`,
    };
  };

  const menuItem = ITEMS.find((it) => it.slug === openMenuSlug);

  return (
    <section className={styles.section} id="restaurants" data-nav-theme="light">
      <div className={styles.head}>
        <span className={styles.eyebrow}>Discover All Our Restaurants</span>
        {/* quiet counted index link — the papatom "→ Alle Leistungen (6)"
            pattern, matching the Blog head's CTA grammar */}
        <Link href="/restaurants" className={styles.headCta}>
          <span className={styles.headCtaLabel}>
            All restaurants ({ITEMS.length})
          </span>
          <svg
            className={styles.headCtaArrow}
            viewBox="0 0 32 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M0 5 H26" />
            <path d="M22 1 L26 5 L22 9" />
          </svg>
        </Link>
      </div>

      <ul
        ref={gridRef}
        className={`${styles.grid} ${inView ? styles.gridIn : ""}`}
        aria-label="Our restaurants"
      >
        {ITEMS.map((it, i) => (
          <Tile
            key={it.slug}
            item={it}
            stagger={i * STAGGER_MS}
            active={active === i}
            closing={closing === i}
            dimmed={expanding && active !== i}
            frameStyle={frameStyleFor(i)}
            onToggle={() => toggle(i)}
            onOpenMenu={() => setOpenMenuSlug(it.slug)}
            onClosed={settleClose}
            tileRef={(el) => {
              tileRefs.current[i] = el;
            }}
          />
        ))}
        {/* backdrop — darkens the whole viewport behind the expanded card;
            clicking it collapses (Escape and card-click also work) */}
        <li
          aria-hidden
          onClick={collapse}
          className={`${styles.backdrop} ${
            expanding ? styles.backdropOn : ""
          }`}
        >
          {/* pale hint fading in with the backdrop — decorative only, the
              card's ✕ button is the accessible close control */}
          <span className={styles.backdropHint}>
            Click anywhere outside to close
          </span>
        </li>
      </ul>

      <MenuOverlay
        open={!!menuItem?.menuPages?.length}
        onClose={() => setOpenMenuSlug(null)}
        pages={menuItem?.menuPages ?? []}
        restaurantName={menuItem?.name ?? ""}
        subtitle={menuItem?.menuLabel}
      />
    </section>
  );
}

function Tile({
  item,
  stagger,
  active,
  closing,
  dimmed,
  frameStyle,
  onToggle,
  onOpenMenu,
  onClosed,
  tileRef,
}: {
  item: DiscoverItem;
  stagger: number;
  active: boolean;
  closing: boolean;
  dimmed: boolean;
  frameStyle?: React.CSSProperties;
  onToggle: () => void;
  onOpenMenu: () => void;
  onClosed: () => void;
  tileRef: (el: HTMLElement | null) => void;
}) {
  const canOpenMenu = !!(item.menuPages && item.menuPages.length > 0);
  // bookability comes from the canonical data, not the local display copy
  const bookable = getRestaurant(item.slug)?.bookable ?? false;
  // Visit prefers the restaurant's own site (new tab); an entry without
  // one falls back to the internal detail page
  const website = getRestaurant(item.slug)?.website;
  // neighbourhood pill copy — the canonical location minus the ", London"
  // every entry shares ("Camden, London" → "Camden"; plain "London" stays)
  const neighbourhood = getRestaurant(item.slug)
    ?.location.replace(/,\s*London$/, "");

  return (
    <li
      className={styles.cell}
      style={{ "--stagger": `${stagger}ms` } as React.CSSProperties}
    >
      <article
        ref={tileRef}
        className={`${styles.tile} ${active ? styles.tileActive : ""} ${
          closing ? styles.tileClosing : ""
        } ${dimmed ? styles.tileDimmed : ""}`}
        role="button"
        tabIndex={0}
        aria-expanded={active}
        aria-label={`${item.name} — details`}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        {/* the expanding frame — grows to 250% × 200% of the cell and lands
            centred (the flip-modal move). Width/height here is the
            deliberate exception to transform-only: a non-uniform scale
            would distort the photo and logo. */}
        <div
          className={styles.frame}
          style={frameStyle}
          onTransitionEnd={(e) => {
            // the return journey has finished → release the z-index hold
            if (
              closing &&
              !active &&
              e.target === e.currentTarget &&
              e.propertyName === "transform"
            ) {
              onClosed();
            }
          }}
        >
          <div className={styles.clip}>
            {item.image ? (
              <Image
                className={styles.photo}
                src={item.image}
                alt=""
                fill
                sizes="(max-width: 460px) 100vw, (max-width: 700px) 50vw, (max-width: 980px) 34vw, 25vw"
              />
            ) : (
              // photo-less tiles (Mamasons, Bunso) — deep maroon field so
              // the centered cream mark / wordmark carries the tile
              <div className={styles.fallback} aria-hidden />
            )}
            {/* legibility scrim — present at rest, deepens in the expanded
                state via opacity only */}
            <div className={styles.scrim} aria-hidden />

            {/* top-right — explicit close affordance, visible only while
                the card is expanded. stopPropagation keeps the click from
                re-toggling through the tile; onToggle collapses because the
                tile is active. */}
            <button
              type="button"
              className={styles.close}
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              aria-label="Close"
              tabIndex={active ? 0 : -1}
            >
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M3 3l10 10" />
                <path d="M13 3L3 13" />
              </svg>
            </button>

            {/* center — the brand group commands the square */}
            <div className={styles.center}>
              <div className={styles.brandGroup}>
                {item.logo ? (
                  <span
                    className={styles.logo}
                    style={
                      {
                        "--ov-logo-url": `url(${item.logo})`,
                      } as React.CSSProperties
                    }
                    role="img"
                    aria-label={item.name}
                  />
                ) : (
                  <span className={styles.wordmark}>{item.name}</span>
                )}
                {item.badge ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className={styles.badge}
                    src={item.badge}
                    alt={item.badgeLabel}
                    draggable={false}
                  />
                ) : null}
              </div>
            </div>

            {/* bottom-left — location + blurb rise in from the bottom of
                the expanded card */}
            <div className={styles.revealBlock}>
              <span className={styles.location}>{item.location}</span>
              <p className={styles.blurb}>{item.blurb}</p>
            </div>

            {/* bottom-right — actions, revealed with the expanded card.
                stopPropagation keeps their clicks from collapsing it. */}
            <div className={styles.actions}>
              {canOpenMenu ? (
                <button
                  type="button"
                  className={styles.btn}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenMenu();
                  }}
                  aria-label={`View ${item.name} menu`}
                >
                  Menu
                </button>
              ) : null}
              {bookable ? (
                // <a
                //   href="#contact-us"
                //   className={`${styles.btn} ${styles.btnSolid}`}
                //   onClick={(e) => e.stopPropagation()}
                //   aria-label={`Book at ${item.name}`}
                // >
                //   Book
                // </a>
                <a
                  href={item.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${styles.btn} ${styles.btnSolid}`}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Book at ${item.name}`}
                >
                  Book
                </a>
              ) : null}
              <a
                href={website ?? `/restaurants/${item.slug}`}
                target={website ? "_blank" : undefined}
                rel={website ? "noopener noreferrer" : undefined}
                className={styles.btn}
                onClick={(e) => e.stopPropagation()}
                aria-label={`Visit ${item.name}`}
              >
                Visit
              </a>
            </div>
          </div>
        </div>
      </article>

      {/* caption BELOW the plate — the site-wide card grammar (matches the
          Blog cards): head row with the semibold name and the pills inline
          (neighbourhood + Book), then the regular one-liner underneath */}
      <div className={styles.cellCaption}>
        <span className={styles.cellHeadRow}>
          <span className={styles.cellName}>{item.name}</span>
          <span className={styles.pillRow}>
            {neighbourhood ? (
              <span className={styles.pill}>{neighbourhood}</span>
            ) : null}
            {bookable && item.bookingUrl ? (
              <a
                href={item.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.pillBook}
                aria-label={`Book at ${item.name}`}
              >
                Book
              </a>
            ) : null}
          </span>
        </span>
        <span className={styles.cellTagline}>{item.tag}</span>
      </div>
    </li>
  );
}
