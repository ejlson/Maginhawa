"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import styles from "./RestaurantsShowcase.module.css";
import Nav from "./Nav";
import Menu from "./Menu";
import { useRouteTransition } from "./PageTransition";
import VideoBackdrop from "./VideoBackdrop";
import Placeholder from "./Placeholder";
import { SLUG_BY_NAME, getRestaurant } from "@/lib/restaurants";
import MenuOverlay from "./MenuOverlay";

// scroll-wheel view: stacked lines with the centre one highlighted
function WheelIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden>
      <line x1="3.5" y1="4" x2="12.5" y2="4" strokeWidth="1" opacity="0.55" />
      <line x1="3.5" y1="8" x2="12.5" y2="8" strokeWidth="1.6" />
      <line x1="3.5" y1="12" x2="12.5" y2="12" strokeWidth="1" opacity="0.55" />
    </svg>
  );
}

// card-list view: 2×2 grid
function GridIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden>
      <rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1" strokeWidth="1.3" />
      <rect x="9" y="2.5" width="4.5" height="4.5" rx="1" strokeWidth="1.3" />
      <rect x="2.5" y="9" width="4.5" height="4.5" rx="1" strokeWidth="1.3" />
      <rect x="9" y="9" width="4.5" height="4.5" rx="1" strokeWidth="1.3" />
    </svg>
  );
}

function Chevron({ up }: { up?: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={up ? undefined : { transform: "rotate(180deg)" }}
    >
      <path d="M4 10l4-4 4 4" />
    </svg>
  );
}

// NOTE: one video ships today (hero-draft3). Drop a per-restaurant clip in
// /public/videos and point `video` at it — the background crossfades on its own.
const RESTAURANTS = [
  {
    name: "Bintang",
    tag: "Filipino Fusion Restaurant",
    location: "Camden, London",
    video: "/videos/bintang.mp4",
    // clip decodes a half-turn off → 180° lands it upright
    rotate: 180,
  },
  {
    name: "Belly",
    tag: "Modern Filipino Bistro",
    location: "Camden, London",
    video: "/videos/belly-hero.mov",
  },
  {
    name: "Mamasons",
    tag: "Filipino Ice Cream Parlour",
    location: "Camden · Soho, London",
    video: "/videos/mamasons.mp4",
  },
  {
    name: "Café Mama & Sons",
    tag: "Filipino x Japanese Café",
    location: "London",
    video: "/videos/cafemama.mp4",
  },
  {
    name: "Guanabana",
    tag: "Caribbean Cuisine",
    location: "Kentish Town, London",
    video: "/videos/guanabana.mp4",
  },
  {
    name: "Ramo Ramen",
    tag: "Filipino-Japanese Ramen",
    location: "Kentish Town · Soho",
    video: "/videos/ramo.mp4",
  },
  {
    name: "Hoodwood",
    tag: "Caribbean Takeaway",
    location: "London",
    video: "/videos/hero-draft3.mp4",
  },
  {
    // coming-soon — no photography, logo or clip yet; the card view renders
    // a typographic wordmark on a maroon field, and the wheel falls back to
    // the generic house clip
    name: "Bunso",
    tag: "The Youngest of the Family",
    location: "London",
    video: "/videos/hero-draft3.mp4",
  },
];

const N = RESTAURANTS.length;

// takeaway / café / ice-cream spots that don't take table bookings —
// Bunso hasn't opened yet, so no bookings there either
const NO_BOOKING = new Set(["Hoodwood", "Café Mama & Sons", "Mamasons", "Bunso"]);

// restaurant marks
const LOGOS: Record<string, string> = {
  Bintang: "/logo/bintang.png",
  Belly: "/logo/belly.png",
  Mamasons: "/logo/mamasons.png",
  "Café Mama & Sons": "/logo/cafemama.png",
  Guanabana: "/logo/guanabana.png",
  "Ramo Ramen": "/logo/ramo.png",
  Hoodwood: "/logo/hoodwood.png",
};

// card photography (Mamasons has none → placeholder)
const PHOTOS: Record<string, string> = {
  Bintang: "/images/bintang.jpg",
  Belly: "/images/belly.jpg",
  "Café Mama & Sons": "/images/cafemama.jpg",
  Guanabana: "/images/guanabana.jpg",
  "Ramo Ramen": "/images/ramo.jpg",
  Hoodwood: "/images/hoowood.jpg",
};

// many stacked copies → an endless loop. We don't touch scrollTop mid-scroll
// (that kills inertia and feels janky); instead we silently re-centre on the
// middle copy once scrolling settles. The jump is a whole-copy multiple, so the
// content is pixel-identical and the move is invisible.
const COPIES = 11;
const MID = Math.floor(COPIES / 2);

// wheel feel — lower = slower. SENS scales raw wheel delta; EASE is the
// fraction of the remaining distance covered each frame.
const WHEEL_SENS = 0.22;
const WHEEL_EASE = 0.06;
const LOOP = Array.from({ length: COPIES * N }, (_, k) => ({
  ...RESTAURANTS[k % N],
  realIndex: k % N,
  gpos: k,
}));

export default function RestaurantsShowcase() {
  const [active, setActive] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [view, setView] = useState<"wheel" | "cards">("wheel");
  // slug of the restaurant whose menu modal is currently open (or null)
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const navigate = useRouteTransition();

  // helper: open the menu overlay for a given display name, but only if the
  // restaurant actually has menu pages set in lib/restaurants.ts
  const openMenuFor = (name: string) => {
    const slug = SLUG_BY_NAME[name];
    const r = slug ? getRestaurant(slug) : undefined;
    if (slug && r?.menuPages && r.menuPages.length > 0) setMenuFor(slug);
  };
  const hasMenu = (name: string) => {
    const slug = SLUG_BY_NAME[name];
    const r = slug ? getRestaurant(slug) : undefined;
    return !!(r?.menuPages && r.menuPages.length > 0);
  };
  const menuRestaurant = menuFor ? getRestaurant(menuFor) : undefined;
  const scrollerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const copyH = useRef(0); // pixel height of one full copy (N rows)
  const rowH = useRef(0);
  const activeRef = useRef(0);
  const raf = useRef(0);
  const settle = useRef(0);
  const targetTop = useRef(0); // where the eased wheel scroll is heading
  const wheelRaf = useRef(0);

  // this route is all dark — paint the page (and overscroll) maroon so no
  // cream/white ever shows, and release the global loader scroll lock
  useEffect(() => {
    const html = document.documentElement;
    const prevHtml = html.style.backgroundColor;
    const prevBody = document.body.style.backgroundColor;
    html.style.backgroundColor = "#2f0000";
    document.body.style.backgroundColor = "#2f0000";
    document.body.classList.remove("is-loading");
    return () => {
      html.style.backgroundColor = prevHtml;
      document.body.style.backgroundColor = prevBody;
    };
  }, []);

  // continuously fade/scale each name by its pixel distance from the centre
  // line — smoother than stepping per index — and pick the nearest as active
  const render = () => {
    const root = scrollerRef.current;
    if (!root) return;

    const center = root.scrollTop + root.clientHeight / 2;
    const unit = rowH.current || 1;
    let best = Infinity;
    let bestReal = 0;

    for (const el of itemRefs.current) {
      if (!el) continue;
      const c = el.offsetTop + el.offsetHeight / 2;
      const dist = Math.abs(center - c) / unit;
      el.style.opacity = String(Math.max(0.12, 1 - dist * 0.32));
      el.style.transform = `scale(${Math.max(0.78, 1 - dist * 0.1)})`;
      if (dist < best) {
        best = dist;
        bestReal = Number(el.dataset.real);
      }
    }

    if (bestReal !== activeRef.current) {
      activeRef.current = bestReal;
      setActive(bestReal);
    }
  };

  // ease scrollTop toward the wheel target, a fraction per frame, keeping both
  // inside the middle copy (whole-copy jumps are invisible — every copy matches)
  const stepWheel = () => {
    const root = scrollerRef.current;
    if (!root) {
      wheelRaf.current = 0;
      return;
    }
    const cur = root.scrollTop;
    const diff = targetTop.current - cur;
    if (Math.abs(diff) < 0.5) {
      root.scrollTop = targetTop.current;
      render();
      wheelRaf.current = 0;
      return;
    }
    root.scrollTop = cur + diff * WHEEL_EASE;
    const ch = copyH.current;
    if (ch) {
      const k = Math.round((root.scrollTop - MID * ch) / ch);
      if (k !== 0) {
        root.scrollTop -= k * ch;
        targetTop.current -= k * ch;
      }
    }
    render();
    wheelRaf.current = requestAnimationFrame(stepWheel);
  };

  const startWheel = () => {
    if (!wheelRaf.current) wheelRaf.current = requestAnimationFrame(stepWheel);
  };

  // snap the target to the nearest name's centre (and recentre the copy)
  const settleNow = () => {
    const root = scrollerRef.current;
    const ch = copyH.current;
    if (!root || !ch) return;
    const k = Math.round((root.scrollTop - MID * ch) / ch);
    if (k !== 0) {
      root.scrollTop -= k * ch;
      targetTop.current -= k * ch;
    }
    const center = root.scrollTop + root.clientHeight / 2;
    let best = Infinity;
    let bestTop = targetTop.current;
    for (const el of itemRefs.current) {
      if (!el) continue;
      const c = el.offsetTop + el.offsetHeight / 2;
      const d = Math.abs(center - c);
      if (d < best) {
        best = d;
        bestTop = c - root.clientHeight / 2;
      }
    }
    targetTop.current = bestTop;
    startWheel();
  };

  const scheduleSettle = () => {
    clearTimeout(settle.current);
    settle.current = window.setTimeout(settleNow, 130);
  };

  // scroll to a clicked name through the same eased motion
  const selectEl = (el: HTMLElement) => {
    const root = scrollerRef.current;
    if (!root) return;
    targetTop.current = el.offsetTop + el.offsetHeight / 2 - root.clientHeight / 2;
    startWheel();
  };

  // step one restaurant up/down (settle snaps to the nearest)
  const step = (dir: number) => {
    const root = scrollerRef.current;
    if (!root || !rowH.current) return;
    targetTop.current = root.scrollTop + dir * rowH.current;
    startWheel();
  };

  // native scroll (touch) → repaint + settle
  const onScroll = () => {
    if (!raf.current) {
      raf.current = requestAnimationFrame(() => {
        raf.current = 0;
        render();
      });
    }
    scheduleSettle();
  };

  // intercept the wheel so we control the (slower) scroll speed ourselves
  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      targetTop.current += e.deltaY * WHEEL_SENS;
      startWheel();
      scheduleSettle();
    };
    root.addEventListener("wheel", onWheel, { passive: false });
    return () => root.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // measure rows, park on the middle copy, paint the first frame
  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const measure = () => {
      rowH.current = root.querySelector("li")?.offsetHeight ?? 0;
      copyH.current = rowH.current * N;
      root.scrollTop = MID * copyH.current; // park on the middle copy
      targetTop.current = root.scrollTop;
      render();
    };
    measure();
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      if (raf.current) cancelAnimationFrame(raf.current);
      if (wheelRaf.current) cancelAnimationFrame(wheelRaf.current);
      clearTimeout(settle.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const item = RESTAURANTS[active];

  return (
    <main className={styles.page}>
      <Nav
        started
        menuOpen={menuOpen}
        onMenuToggle={() => setMenuOpen((o) => !o)}
      />
      <Menu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <section className={styles.hero} data-nav-theme="blend">
        {/* full-bleed background; the active restaurant's clip crossfades in */}
        <div className={styles.bg} aria-hidden>
          <VideoBackdrop
            src={item.video}
            rotate={item.rotate ?? 0}
            className={styles.bgVideo}
          />
          <div className={styles.scrim} />
        </div>

        {/* phrase · name wheel · visit link, centred */}
        <div className={styles.stage} data-hidden={view !== "wheel"}>
          <div className={styles.panel}>
            <div className={styles.wheel}>
              <button
                type="button"
                className={styles.step}
                onClick={() => step(-1)}
                aria-label="Previous restaurant"
              >
                <Chevron up />
              </button>

              <div className={styles.scrollWrap}>
                {/* selection window over the centre row */}
                <span className={styles.selBand} aria-hidden />
                <div
                  ref={scrollerRef}
                  className={styles.scroller}
                  onScroll={onScroll}
                >
                  <ul className={styles.list}>
                    {LOOP.map((r) => (
                      <li key={r.gpos} className={styles.row}>
                        <button
                          type="button"
                          data-real={r.realIndex}
                          ref={(el) => {
                            itemRefs.current[r.gpos] = el;
                          }}
                          className={`${styles.name} ${active === r.realIndex ? styles.nameActive : ""}`}
                          onClick={(ev) => selectEl(ev.currentTarget)}
                          aria-current={active === r.realIndex}
                        >
                          {r.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <button
                type="button"
                className={styles.step}
                onClick={() => step(1)}
                aria-label="Next restaurant"
              >
                <Chevron />
              </button>
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                className={`${styles.actBtn} ${styles.actBtnSolid}`}
                onClick={() => {
                  const slug = SLUG_BY_NAME[item.name];
                  if (slug) navigate(`/restaurants/${slug}`);
                }}
              >
                <span className={styles.actLabel}>Visit {item.name}</span>
                <span aria-hidden>→</span>
              </button>
              {!NO_BOOKING.has(item.name) && (
                <button
                  type="button"
                  className={styles.actBtn}
                  onClick={() => navigate("/")}
                >
                  Book a Table
                </button>
              )}
              <button
                type="button"
                className={styles.actBtn}
                onClick={() => openMenuFor(item.name)}
                disabled={!hasMenu(item.name)}
                aria-label={`View ${item.name} menu`}
              >
                Menu
              </button>
            </div>
          </div>
        </div>

        {/* card-list view — photo grid on a clean cream surface */}
        <div className={styles.cards} data-hidden={view !== "cards"}>
          <div className={styles.cardsGrid}>
            {RESTAURANTS.map((r) => (
              <article key={r.name} className={styles.card}>
                <span className={styles.cardImg}>
                  {PHOTOS[r.name] ? (
                    <img src={PHOTOS[r.name]} alt={r.name} />
                  ) : r.name === "Bunso" ? (
                    // coming-soon card — a typographic cream wordmark on a
                    // maroon field stands in for the photography
                    <span className={styles.cardField} aria-hidden>
                      Bunso
                    </span>
                  ) : (
                    <Placeholder ratio="auto" label={r.name} />
                  )}
                </span>
                <div className={styles.cardOverlay}>
                  {LOGOS[r.name] ? (
                    <img
                      className={`${styles.cardMark} ${
                        r.name === "Bintang" ? styles.cardMarkLg : ""
                      }`}
                      src={LOGOS[r.name]}
                      alt={r.name}
                    />
                  ) : r.name !== "Bunso" ? (
                    // Bunso's field wordmark already names the card
                    <span className={styles.cardName}>{r.name}</span>
                  ) : null}
                  <span className={styles.cardLoc}>{r.location}</span>
                  <div className={styles.cardActions}>
                    {/* Bunso has no menu yet — skip even the disabled stub */}
                    {r.name !== "Bunso" && (
                      <button
                        type="button"
                        className={styles.cardBtn}
                        onClick={() => openMenuFor(r.name)}
                        disabled={!hasMenu(r.name)}
                        aria-label={`View ${r.name} menu`}
                      >
                        Menu
                      </button>
                    )}
                    {!NO_BOOKING.has(r.name) && (
                      <button
                        type="button"
                        className={styles.cardBtn}
                        onClick={() => navigate("/")}
                      >
                        Book a Table
                      </button>
                    )}
                    <button
                      type="button"
                      className={`${styles.cardBtn} ${styles.cardBtnSolid}`}
                      onClick={() => {
                        const slug = SLUG_BY_NAME[r.name];
                        if (slug) navigate(`/restaurants/${slug}`);
                      }}
                    >
                      Visit
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* view switch, bottom-left */}
        <div className={styles.viewToggle} role="group" aria-label="View">
          <motion.span
            className={styles.toggleThumb}
            animate={{ x: view === "cards" ? 38 : 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            aria-hidden
          />
          <button
            type="button"
            data-active={view === "wheel"}
            onClick={() => setView("wheel")}
            aria-label="Wheel view"
            aria-pressed={view === "wheel"}
          >
            <WheelIcon />
          </button>
          <button
            type="button"
            data-active={view === "cards"}
            onClick={() => setView("cards")}
            aria-label="Card view"
            aria-pressed={view === "cards"}
          >
            <GridIcon />
          </button>
        </div>
      </section>

      <MenuOverlay
        open={!!menuFor && !!menuRestaurant?.menuPages?.length}
        onClose={() => setMenuFor(null)}
        pages={menuRestaurant?.menuPages ?? []}
        restaurantName={menuRestaurant?.name ?? ""}
        subtitle={menuRestaurant?.menuLabel}
      />
    </main>
  );
}
