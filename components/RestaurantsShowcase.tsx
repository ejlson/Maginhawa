"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import styles from "./RestaurantsShowcase.module.css";
import Nav from "./Nav";
import Menu from "./Menu";
import DarkZone from "./DarkZone";
import Footer from "./Footer";
import { useRouteTransition } from "./PageTransition";

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  );
}

// round arrow button with the home "View All" treatment: magnetic pull + a
// cream circle that radiates from the cursor on hover (arrow swaps to maroon)
function VisitArrow({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [hover, setHover] = useState(false);
  const [fill, setFill] = useState({ x: 0, y: 0, d: 0 });
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 180, damping: 14, mass: 0.3 });
  const y = useSpring(my, { stiffness: 180, damping: 14, mass: 0.3 });

  const onMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - (r.left + r.width / 2)) * 0.3);
    my.set((e.clientY - (r.top + r.height / 2)) * 0.3);
  };
  const onEnter = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const cx = e.clientX - r.left;
    const cy = e.clientY - r.top;
    const d =
      2 *
      Math.max(
        Math.hypot(cx, cy),
        Math.hypot(r.width - cx, cy),
        Math.hypot(cx, r.height - cy),
        Math.hypot(r.width - cx, r.height - cy)
      );
    setFill({ x: cx, y: cy, d });
    setHover(true);
  };
  const onLeave = () => {
    mx.set(0);
    my.set(0);
    setHover(false);
  };

  return (
    <motion.div className={styles.magnet} style={{ x, y }}>
      <button
        ref={ref}
        type="button"
        className={`${styles.cta} ${hover ? styles.isHover : ""}`}
        onMouseEnter={onEnter}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        onClick={onClick}
        aria-label={label}
      >
        <span
          className={styles.ctaFill}
          style={{ left: fill.x, top: fill.y, width: fill.d, height: fill.d }}
          aria-hidden
        />
        <span className={styles.ctaArrow} aria-hidden>
          <ArrowIcon />
        </span>
      </button>
    </motion.div>
  );
}

// NOTE: one video ships today (hero-draft3). Drop a per-restaurant clip in
// /public/videos and point `video` at it — the background crossfades on its own.
const RESTAURANTS = [
  {
    name: "Bintang",
    tag: "Filipino Fusion Restaurant",
    location: "Camden, London",
    video: "/videos/hero-draft3.mp4",
  },
  {
    name: "Belly",
    tag: "Modern Filipino Bistro",
    location: "Camden, London",
    video: "/videos/hero-draft3.mp4",
  },
  {
    name: "Mamasons",
    tag: "Filipino Ice Cream Parlour",
    location: "Camden · Soho, London",
    video: "/videos/hero-draft3.mp4",
  },
  {
    name: "Café Mama & Sons",
    tag: "Filipino x Japanese Café",
    location: "London",
    video: "/videos/hero-draft3.mp4",
  },
  {
    name: "Guanabana",
    tag: "Caribbean Cuisine",
    location: "Kentish Town, London",
    video: "/videos/hero-draft3.mp4",
  },
  {
    name: "Ramo Ramen",
    tag: "Filipino-Japanese Ramen",
    location: "Kentish Town · Soho",
    video: "/videos/hero-draft3.mp4",
  },
  {
    name: "Hoodwood",
    tag: "Caribbean Takeaway",
    location: "London",
    video: "/videos/hero-draft3.mp4",
  },
];

const N = RESTAURANTS.length;
// dedupe so identical clips share a single decoder
const VIDEOS = Array.from(new Set(RESTAURANTS.map((r) => r.video)));

// many stacked copies → an endless loop. We don't touch scrollTop mid-scroll
// (that kills inertia and feels janky); instead we silently re-centre on the
// middle copy once scrolling settles. The jump is a whole-copy multiple, so the
// content is pixel-identical and the move is invisible.
const COPIES = 11;
const MID = Math.floor(COPIES / 2);
const LOOP = Array.from({ length: COPIES * N }, (_, k) => ({
  ...RESTAURANTS[k % N],
  realIndex: k % N,
  gpos: k,
}));

export default function RestaurantsShowcase() {
  const [active, setActive] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useRouteTransition();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const copyH = useRef(0); // pixel height of one full copy (N rows)
  const rowH = useRef(0);
  const activeRef = useRef(0);
  const raf = useRef(0);
  const settle = useRef(0);

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

  // once scrolling stops, jump by whole copies back to the middle band so we
  // never run out of list — invisible because every copy is identical
  const recenter = () => {
    const root = scrollerRef.current;
    const ch = copyH.current;
    if (!root || !ch) return;
    const mid = MID * ch;
    const k = Math.round((root.scrollTop - mid) / ch);
    if (k !== 0) root.scrollTop -= k * ch;
  };

  const onScroll = () => {
    if (!raf.current) {
      raf.current = requestAnimationFrame(() => {
        raf.current = 0;
        render();
      });
    }
    clearTimeout(settle.current);
    settle.current = window.setTimeout(recenter, 140);
  };

  // measure rows, park on the middle copy, paint the first frame
  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const measure = () => {
      rowH.current = root.querySelector("li")?.offsetHeight ?? 0;
      copyH.current = rowH.current * N;
      root.scrollTop = MID * copyH.current; // park on the middle copy
      render();
    };
    measure();
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      if (raf.current) cancelAnimationFrame(raf.current);
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
        {/* full-bleed background; the active restaurant's clip fades in */}
        <div className={styles.bg} aria-hidden>
          {VIDEOS.map((src) => (
            <video
              key={src}
              className={styles.bgVideo}
              src={src}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              data-active={item.video === src}
            />
          ))}
          <div className={styles.scrim} />
        </div>

        {/* phrase · name wheel · visit link, centred */}
        <div className={styles.stage}>
          <div className={styles.panel}>
            <span className={styles.phrase}>Visit</span>

            <div className={styles.wheel}>
              {/* a window over the centre row: bright (undarkened) video shows
                  through, the rest of the screen is dimmed around it */}
              <span className={styles.spotlight} aria-hidden />
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
                      onClick={(ev) =>
                        ev.currentTarget.scrollIntoView({
                          block: "center",
                          behavior: "smooth",
                        })
                      }
                      aria-current={active === r.realIndex}
                    >
                      {r.name}
                    </button>
                  </li>
                ))}
              </ul>
              </div>
            </div>

            <VisitArrow
              onClick={() => navigate("/")}
              label={`Visit ${item.name}`}
            />
          </div>
        </div>
      </section>

      <DarkZone>
        <Footer />
      </DarkZone>
    </main>
  );
}
