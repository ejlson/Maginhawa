"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import styles from "./Menu.module.css";
import Placeholder from "./Placeholder";
import { useRouteTransition } from "./PageTransition";
import { getNavTheme } from "./Nav";

const ITEMS = [
  { label: "Home", href: "/" },
  { label: "Restaurants", href: "/restaurants" },
  { label: "Blog", href: "/blog" },
  { label: "About Us", href: "/about" },
  { label: "Careers", href: "/careers" },
  { label: "Contact Us", href: "/contact" },
];

export default function Menu({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [active, setActive] = useState(0);
  // match the panel to the section it opens over (dark over hero/maroon)
  const [dark, setDark] = useState(false);
  const navigate = useRouteTransition();

  useEffect(() => {
    if (!open) return;
    // cream over light + video/hero sections; red only over the maroon section
    setDark(getNavTheme() === "dark");
  }, [open]);

  // route links (e.g. "/restaurants") run through the page-transition curtain;
  // in-page hashes (#about-us) keep their default anchor behaviour
  const onItemClick = (e: React.MouseEvent, href: string) => {
    onClose();
    if (href.startsWith("/")) {
      e.preventDefault();
      navigate(href);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      {/* dim the page behind the menu */}
      <motion.div
        className={styles.backdrop}
        initial={false}
        animate={{ opacity: open ? 1 : 0 }}
        transition={{ duration: 0.4 }}
        style={{ pointerEvents: open ? "auto" : "none" }}
        onClick={onClose}
        aria-hidden
      />

      <motion.aside
        className={`${styles.panel} ${dark ? styles.dark : ""}`}
        initial={false}
        animate={{ x: open ? "0%" : "118%", opacity: open ? 1 : 0 }}
        transition={{ duration: 0.55, ease: [0.76, 0, 0.24, 1] }}
        style={{ pointerEvents: open ? "auto" : "none" }}
        /* The closed panel is parked off-screen by a transform, which does
           NOT take it out of the tab order — its six links stayed reachable
           on every route, sending the focus ring off the right edge for six
           presses. `inert` removes it from the tab order and the a11y tree
           together, so no separate aria-hidden: inert already implies it, and
           the pair (focusable + aria-hidden) was the worst of both — links a
           screen reader announces as nothing. */
        inert={!open}
      >
        <nav className={styles.list}>
          {ITEMS.map((it, i) => (
            <a
              key={it.label}
              href={it.href}
              className={`${styles.item} ${active === i ? styles.itemActive : ""}`}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={(e) => onItemClick(e, it.href)}
            >
              {it.label}
            </a>
          ))}
        </nav>

        <span className={styles.divider} aria-hidden />

        <div className={styles.thumb}>
          <motion.div
            key={active}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <Placeholder ratio="3 / 4" label={ITEMS[active].label} />
          </motion.div>
        </div>
      </motion.aside>
    </>
  );
}
