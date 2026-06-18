"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import styles from "./Nav.module.css";

type Theme = "blend" | "light" | "dark";

// latest section theme under the navbar, so the menu can match it on open
let latestTheme: Theme = "blend";
export const getNavTheme = (): Theme => latestTheme;

export default function Nav({
  started,
  menuOpen,
  onMenuToggle,
}: {
  started: boolean;
  menuOpen: boolean;
  onMenuToggle: () => void;
}) {
  // Per request: scrolling DOWN reveals the navbar, scrolling UP hides it.
  const [hidden, setHidden] = useState(false);
  // Navbar adopts the theme of the section currently behind it.
  const [theme, setTheme] = useState<Theme>("blend");

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
      else if (Math.abs(y - last) > 6) setHidden(y < last); // up => hide
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

  return (
    <motion.nav
      className={`${styles.nav} ${styles[activeTheme]}`}
      initial={{ opacity: 0, y: -24 }}
      animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: -24 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <a className={styles.logo} href="#top" aria-label="Maginhawa">
        <img
          className={styles.logoImg}
          src="/logo/maginhawa.png"
          alt="Maginhawa"
        />
      </a>

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
    </motion.nav>
  );
}
