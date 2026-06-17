"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import styles from "./Menu.module.css";
import Placeholder from "./Placeholder";

const ITEMS = [
  { label: "Home", href: "#top" },
  { label: "Restaurants", href: "#restaurants" },
  { label: "News", href: "#news" },
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      {open && <div className={styles.backdrop} onClick={onClose} />}

      <motion.aside
        className={styles.panel}
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
              onClick={onClose}
            >
              {it.label}
            </a>
          ))}
        </nav>

        <div className={styles.thumb}>
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <Placeholder ratio="16 / 9" label={ITEMS[active].label} />
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.aside>
    </>
  );
}
