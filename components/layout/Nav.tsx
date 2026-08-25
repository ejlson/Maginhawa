"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import styles from "./Nav.module.css";
import { lenisRef } from "@/lib/SmoothScroll";

/* ── THE NAV PUBLISHES WHERE ITS LINKS BEGIN ──
   The hero's caption column is seated on the same x as the first nav link
   at the user's instruction, and that x is not derivable in CSS: the link
   row is right-ranged on the page margin and its width is whatever five
   words happen to measure, so the left edge moves with the CONTENT of the
   nav rather than with the viewport.

   So it is measured once per layout and written to the root as
   `--nav-links-left`. Hero.module.css reads it; nothing else does.

   ⚠️ IT COUPLES THE HERO TO THE NAV'S CONTENT. Add a sixth link and the
   hero's caption moves left with it. That is the alignment working rather
   than breaking — but it is worth knowing before anyone edits the nav and
   wonders why the home page shifted.

   A ResizeObserver on the row rather than a window resize listener: the row
   also changes width when a font finishes loading, which no resize event
   reports. */
import { useRouteTransition } from "./PageTransition";

type Theme = "blend" | "light" | "dark";

// latest section theme under the navbar, so the menu can match it on open
let latestTheme: Theme = "blend";
export const getNavTheme = (): Theme => latestTheme;

const LINKS = [
  { label: "Restaurants", href: "/restaurants" },
  { label: "Blog", href: "/blog" },
  { label: "About Us", href: "/about" },
  { label: "Careers", href: "/careers" },
  { label: "Contact Us", href: "/contact" },
];

function useLinksLeft() {
  const ref = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const write = () => {
      const first = el.firstElementChild as HTMLElement | null;
      if (!first) return;
      document.documentElement.style.setProperty(
        "--nav-links-left",
        `${Math.round(first.getBoundingClientRect().left)}px`,
      );
    };
    write();
    const ro = new ResizeObserver(write);
    ro.observe(el);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, []);
  return ref;
}

export default function Nav({
  started,
  menuOpen,
  onMenuToggle,
}: {
  started: boolean;
  menuOpen: boolean;
  onMenuToggle: () => void;
}) {
  const linksRef = useLinksLeft();
  // the bar measures itself so the theme probe can sample just under it
  const barRef = useRef<HTMLElement>(null);
  // Scrolling DOWN hides the navbar; scrolling UP reveals it.
  const [hidden, setHidden] = useState(false);
  // Navbar adopts the theme of the section currently behind it.
  const [theme, setTheme] = useState<Theme>("blend");
  // hairline divider fades in once the page has scrolled past the hero edge
  const [scrolled, setScrolled] = useState(false);
  /* ── THE BAR'S WORDMARK STANDS DOWN OVER THE HERO ──
     at the user's instruction, and the hero is why: it sets MAGINHAWA at
     ~160px across the bottom of the frame, so the 20px copy in the bar is
     the same word twice on one screen — the smaller one reading as a label
     for the larger. Everywhere else the bar is the only place the group is
     named and it comes back.
     Sampled from the same elementFromPoint probe the theme uses, by the
     hero's own id rather than by its theme: `blend` is also the closing
     film's theme, and the wordmark is wanted there. */
  const [onHero, setOnHero] = useState(true);
  const navigate = useRouteTransition();
  const pathname = usePathname();

  /* ── THE PROBE MUST NOT SAMPLE THE SHEET ──
     A ref rather than the prop because the listener below is installed once
     with `[]` deps and would close over a stale `menuOpen` forever.

     THE BUG THIS FIXES, because it is not obvious from the guard: the open
     sheet is `position: fixed; inset: 0`, so it covers the probe point. Any
     scroll or resize event while it is up — and a phone fires `resize`
     every time the URL bar slides — made `elementFromPoint` return the
     SHEET, which carries no `data-nav-theme`, so the theme collapsed to the
     `"blend"` default mid-session. The bar then re-inked itself for a cream
     sheet while the sheet stayed maroon, and the wordmark and disc went
     maroon-on-maroon: invisible until you closed it again.

     Freezing the sample also keeps Nav and Menu in lockstep. Menu snapshots
     `getNavTheme()` once when it opens; this guarantees the value it
     snapshotted is still the value `sheetDark` is derived from here. */
  const menuOpenRef = useRef(menuOpen);
  menuOpenRef.current = menuOpen;

  useEffect(() => {
    let last = window.scrollY;
    const sampleTheme = () => {
      // the sheet is over the probe point and is not a section — hold the
      // theme that was live when it opened
      if (menuOpenRef.current) return;
      /* ── SAMPLE BELOW THE BAR, AND MEASURE WHERE THAT IS ──
         This read `elementFromPoint(24, 56)` — a constant chosen when the
         bar was shorter than 56px. It is not any more: the wordmark is
         `clamp(19px, 2.3vh, 26px)` plus `--space-xs-y` of padding, which
         measures 59px at 375×812. So the probe was landing on the NAVBAR
         ITSELF, `closest("[data-nav-theme]")` returned null, and every
         sample on a phone fell through to the `"blend"` default — which is
         why the bar never went dark over the maroon chapters and why the
         menu sheet never picked up its maroon ground.

         `offsetHeight` rather than `getBoundingClientRect().bottom`: the
         bar is translated by up to -24px as it hides and reveals, and a
         sample point that moves with that animation would flicker themes
         mid-transition. offsetHeight is the layout box, which the
         transform does not touch, and the bar is `position: fixed; top: 0`
         so its untransformed bottom edge IS its height. */
      const y = (barRef.current?.offsetHeight ?? 56) + 4;
      const el = document.elementFromPoint(24, y);
      const host = el?.closest<HTMLElement>("[data-nav-theme]");
      const t = (host?.dataset.navTheme as Theme) || "blend";
      latestTheme = t;
      setTheme(t);
      setOnHero(host?.id === "top");
    };
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 80) setHidden(false);
      // scroll DOWN (y > last) hides the navbar; scroll UP (y < last) reveals it
      else if (Math.abs(y - last) > 6) setHidden(y > last);
      setScrolled(y > 80);
      sampleTheme();
      last = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // While the menu is open the bar sits on a painted sheet, not on the page.
  const activeTheme: Theme = menuOpen ? "light" : theme;
  /* ── AND THE SHEET'S GROUND DECIDES THE BAR'S INK ──
     Menu.tsx paints itself maroon over the dark chapters and cream
     everywhere else, sampling `getNavTheme()` — which is this component's
     own `theme`, published through the module-level `latestTheme`. Reading
     it here rather than passing it down keeps ONE decision: if these two
     ever disagree the disc ends up the same colour as the sheet behind it.

     Safe to read live rather than snapshot on open: Menu locks the scroll
     (Lenis stop() + overflow) while it is up, so nothing can move a new
     section under the bar and flip `theme` mid-sheet. */
  const sheetDark = theme === "dark";
  /* ⚠️ AND THE MENU IS NOT THE HERO. `onHero` is sampled from what sits
     under the bar, which is still the film when the overlay is open — but
     the reader is looking at a cream sheet with no wordmark on it, so the
     one reason to stand the logo down is gone and the bar should be named
     again. Same override the theme takes, one line above. */
  const hideLogo = onHero && !menuOpen;
  /* ── AND THE CREAM BAR IS THE HERO'S TOO, at the user's instruction ──
     `blend` is the theme every FILM section carries, not the home hero's
     private one: the /restaurants hero, the closing invitation at #book and
     About's pinned video all set it. So the cream-on-a-scrim treatment
     written for the opening frame appeared on all four. It is keyed on
     PLACE now, and `onHero` — already sampled one line up for the wordmark
     — is that place. Everywhere else `blend` is the difference blend it
     always was.

     No `&& !menuOpen` here: `activeTheme` is forced to `light` while the
     overlay is open, so a hero bar cannot survive the menu opening. */
  const heroFilm = activeTheme === "blend" && onHero;
  const show = started && (menuOpen || !hidden);

  // route links use the page-transition curtain; in-page hashes scroll natively
  const onLinkClick = (e: React.MouseEvent, href: string) => {
    if (href.startsWith("/")) {
      e.preventDefault();
      navigate(href);
    }
  };

  // logo: scroll to top when already home, otherwise route through the curtain
  const onLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    /* THE WORDMARK IS THE SHEET'S HOME ROW. Menu.tsx dropped its "Home"
       item — it was a link to the page the reader was already on four
       times out of five — so this is the only way back, and it has to
       dismiss the sheet it is sitting on top of. */
    if (menuOpen) onMenuToggle();

    if (pathname !== "/") {
      navigate("/");
      return;
    }

    /* Menu parks Lenis while it is open and releases it in a cleanup that
       runs after this commit, so a scroll issued now would be swallowed by
       a still-stopped instance. Release it here too — start() is
       idempotent — and drive the scroll THROUGH Lenis, because a raw
       window.scrollTo is pulled straight back to Lenis's own target on the
       next frame. The fallback is for reduced motion, where SmoothScroll
       never instantiates Lenis at all. */
    const lenis = lenisRef.current;
    if (lenis) {
      lenis.start();
      lenis.scrollTo(0);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <motion.nav
      ref={barRef}
      className={[
        styles.nav,
        styles[activeTheme],
        heroFilm && styles.heroFilm,
        menuOpen && styles.sheetOpen,
        menuOpen && sheetDark && styles.sheetDark,
      ]
        .filter(Boolean)
        .join(" ")}
      initial={{ opacity: 0, y: -24 }}
      animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: -24 }}
      transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
      /* the bar drops in, which means it is written into the server HTML as
         opacity 0 and stays there if no script runs — i.e. a reader without
         JavaScript would have no navigation at all. The <noscript> block in
         app/layout.tsx keys off this; see the long note in Reveal.tsx. */
      data-entrance="rise"
    >
      <a
        className={[styles.logo, hideLogo && styles.logoStood]
          .filter(Boolean)
          .join(" ")}
        href="/"
        onClick={onLogoClick}
        aria-label="Maginhawa — home"
        aria-hidden={hideLogo}
        tabIndex={hideLogo ? -1 : undefined}
        /* `hideLogo` is `onHero && !menuOpen`, and `onHero` starts TRUE — the
           hero owns the wordmark until you scroll past it. With no script
           nothing ever sets it false, so `.logoStood` (opacity 0, visibility
           hidden) stands on every route and the site loses its name from the
           one piece of chrome that survives them all. On the home page this
           does mean the bar's wordmark and the hero's are both visible at
           once, which is a far smaller price. */
        data-entrance=""
      >
        {/* THE WORDMARK, SET RATHER THAN DRAWN. This was the line-art mark
            (/logo/maginhawa.png, still in public/ and unused). The name now
            lives here because the hero no longer sets it edge-to-edge, and a
            group with seven rooms should be named in the one piece of chrome
            that survives every route.

            Live text, not an image: it inherits `currentColor` so the bar's
            difference blend keeps it legible on cream, maroon and film alike
            — which the PNG needed a filter: invert(1) to fake. */}
        <span className={styles.logoWord}>Maginhawa</span>
      </a>

      <ul ref={linksRef} className={styles.links}>
        {LINKS.map((l) => (
          <li key={l.label}>
            <a
              className={styles.link}
              href={l.href}
              onClick={(e) => onLinkClick(e, l.href)}
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className={styles.burger}
        onClick={onMenuToggle}
        aria-label={menuOpen ? "Close menu" : "Open menu"}
        aria-expanded={menuOpen}
      >
        {/* ±5 is one bar height plus one gap (1 + 4), the distance each
            outer hairline travels to meet the middle one — see the gap
            note in Nav.module.css. The middle bar fades on the way rather
            than after it, so the three are never visible as a cross with a
            line through it. */}
        <span className={styles.glyph} aria-hidden>
          <motion.span
            animate={menuOpen ? { rotate: 45, y: 5 } : { rotate: 0, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.span
            animate={menuOpen ? { opacity: 0 } : { opacity: 1 }}
            transition={{ duration: 0.2 }}
          />
          <motion.span
            animate={menuOpen ? { rotate: -45, y: -5 } : { rotate: 0, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          />
        </span>
      </button>

      <span
        className={styles.rule}
        aria-hidden
        style={{ opacity: scrolled ? 0.35 : 0 }}
      />
    </motion.nav>
  );
}
