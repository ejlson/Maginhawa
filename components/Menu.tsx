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
  { label: "Blog", href: "#blog" },
  { label: "About Us", href: "#about-us" },
  { label: "Join Us", href: "#join-us" },
  { label: "Contact Us", href: "#contact-us" },
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
    const t = getNavTheme();
    setDark(t === "dark" || t === "blend");
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
        aria-hidden={!open}
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
