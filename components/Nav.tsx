"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import styles from "./Nav.module.css";
import { useRouteTransition } from "./PageTransition";

type Theme = "blend" | "light" | "dark";

// latest section theme under the navbar, so the menu can match it on open
let latestTheme: Theme = "blend";
export const getNavTheme = (): Theme => latestTheme;

const LINKS = [
  { label: "Restaurants", href: "/restaurants" },
  { label: "Blog", href: "/blog" },
  { label: "About Us", href: "/about" },
  { label: "Careers", href: "/join-us" },
  { label: "Contact Us", href: "/contact" },
];

export default function Nav({
  started,
  menuOpen,
  onMenuToggle,
}: {
  started: boolean;
  menuOpen: boolean;
  onMenuToggle: () => void;
}) {
  // Scrolling DOWN hides the navbar; scrolling UP reveals it.
  const [hidden, setHidden] = useState(false);
  // Navbar adopts the theme of the section currently behind it.
  const [theme, setTheme] = useState<Theme>("blend");
  // hairline divider fades in once the page has scrolled past the hero edge
  const [scrolled, setScrolled] = useState(false);
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
        className={styles.logo}
        href="/"
        onClick={onLogoClick}
        aria-label="Maginhawa — home"
      >
        <img
          className={styles.logoImg}
          src="/logo/maginhawa.png"
          alt="Maginhawa"
        />
      </a>

      <ul className={styles.links}>
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
