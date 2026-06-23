"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import styles from "./MenuOverlay.module.css";

// Full-screen modal that displays a restaurant's menu pages as a vertically
// scrollable stack of images. Closes on Esc, on backdrop click, or via the
// close button. Locks page scroll while open and traps focus to the close
// button on first open.
export default function MenuOverlay({
  open,
  onClose,
  pages,
  restaurantName,
  subtitle,
}: {
  open: boolean;
  onClose: () => void;
  pages: string[];
  restaurantName: string;
  subtitle?: string;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    // lock background scroll while the menu is open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // focus the close button so screen-reader / keyboard users land in the modal
    requestAnimationFrame(() => closeRef.current?.focus());
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.backdrop}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={`${restaurantName} menu`}
        >
          <motion.div
            className={styles.panel}
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className={styles.head}>
              <div className={styles.headLeft}>
                <span className={styles.eyebrow}>(Menu)</span>
                <h2 className={styles.title}>{restaurantName}</h2>
                {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
              </div>
              <button
                ref={closeRef}
                type="button"
                className={styles.closeBtn}
                onClick={onClose}
                aria-label="Close menu"
              >
                <span>Close</span>
                <span aria-hidden>✕</span>
              </button>
            </header>

            <ul className={styles.scroller}>
              {pages.map((src, i) => (
                <li key={src} className={styles.pageItem}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`${restaurantName} menu — page ${i + 1} of ${pages.length}`}
                    draggable={false}
                  />
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
