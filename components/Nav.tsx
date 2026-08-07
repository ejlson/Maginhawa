"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import styles from "./Nav.module.css";

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

  useEffect(() => {
    let last = window.scrollY;
    const sampleTheme = () => {
      // read the section sitting just below the navbar
      const el = document.elementFromPoint(24, 56);
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

  // While the menu is open the bar sits on the cream overlay → light theme.
  const activeTheme: Theme = menuOpen ? "light" : theme;
  /* ⚠️ AND THE MENU IS NOT THE HERO. `onHero` is sampled from what sits
     under the bar, which is still the film when the overlay is open — but
     the reader is looking at a cream sheet with no wordmark on it, so the
     one reason to stand the logo down is gone and the bar should be named
     again. Same override the theme takes, one line above. */
  const hideLogo = onHero && !menuOpen;
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
    if (pathname === "/") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      navigate("/");
    }
  };

  return (
    <motion.nav
      className={`${styles.nav} ${styles[activeTheme]}`}
      initial={{ opacity: 0, y: -24 }}
      animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: -24 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
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
        <motion.span
          animate={menuOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        />
        <motion.span
          animate={menuOpen ? { opacity: 0 } : { opacity: 1 }}
          transition={{ duration: 0.2 }}
        />
        <motion.span
          animate={menuOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        />
      </button>

      <span
        className={styles.rule}
        aria-hidden
        style={{ opacity: scrolled ? 0.35 : 0 }}
      />
    </motion.nav>
  );
}
