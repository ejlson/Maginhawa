"use client";

import { useEffect, useState } from "react";
import styles from "./Menu.module.css";
import { useRouteTransition } from "./PageTransition";
import { getNavTheme } from "./Nav";
import { lenisRef } from "@/lib/SmoothScroll";
import { CONTACT } from "@/lib/contact";

/* ── NO "HOME" ROW ──
   The old list opened with one, which is a link back to the page the
   reader is already looking at four times out of five. The wordmark in the
   bar is the home link and it survives every route; Nav.tsx closes this
   sheet when it is pressed. Five items is also what the composition was
   drawn against — a sixth eats the void the footer is pinned against. */
const ITEMS = [
  { label: "Restaurants", href: "/restaurants" },
  { label: "Blog", href: "/blog" },
  { label: "About Us", href: "/about" },
  { label: "Careers", href: "/careers" },
  { label: "Contact Us", href: "/contact" },
];

/* ── THE ENQUIRIES INBOX, NOT THE INSTAGRAM ──
   This slot held "Follow / Instagram" at the user's instruction and now
   holds the group's address. Read from lib/contact.ts rather than written
   out here: that file is the single source of truth the footer, the
   Contact page and the structured data all draw on, and it still carries a
   PLACEHOLDER marker — when the real inbox lands there, this sheet updates
   with it instead of quietly keeping the old one. */
const EMAIL = CONTACT.email;

export default function Menu({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  // match the sheet to the section it opens over (maroon over dark chapters)
  const [dark, setDark] = useState(false);
  const navigate = useRouteTransition();

  useEffect(() => {
    if (!open) return;
    setDark(getNavTheme() === "dark");
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* ── THE SHEET COVERS THE PAGE, SO THE PAGE MUST STOP MOVING ──
     The old panel left the page visible beside it and scrolling underneath
     was harmless. A full-bleed sheet hides the scroll entirely, so a stray
     wheel or touch moves the reader somewhere they never saw — and worse,
     it moves the section under the bar, which is what `dark` above was
     sampled from.

     LENIS OWNS THE SCROLL AND `overflow: hidden` DOES NOT STOP IT. Lenis
     keeps its own target and drives the window each frame regardless of
     what the body's overflow says; stop() is what parks it. The overflow
     lock stays as well, for the reduced-motion case where SmoothScroll
     never instantiates Lenis at all and lenisRef.current is null.

     Every stop() is paired with a start() in the same cleanup. */
  useEffect(() => {
    if (!open) return;
    const lenis = lenisRef.current;
    lenis?.stop();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      lenis?.start();
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // route links run through the page-transition curtain; the sheet closes
  // first either way so it is never the thing the curtain lifts on
  const onItemClick = (e: React.MouseEvent, href: string) => {
    onClose();
    if (href.startsWith("/")) {
      e.preventDefault();
      navigate(href);
    }
  };

  return (
    <aside
      className={`${styles.sheet} ${dark ? styles.dark : ""}`}
      data-open={open ? "true" : "false"}
      /* The closed sheet is hidden by opacity and visibility, and
         `visibility: hidden` already drops it from the tab order — but only
         once the 400ms fade-out delay has elapsed. `inert` removes it from
         the tab order and the a11y tree immediately, and covers the frames
         in between. Carried over from the old panel, which needed it for
         the same reason. */
      inert={!open}
      aria-label="Site menu"
    >
      <nav className={styles.list}>
        <ul>
          {ITEMS.map((it, i) => (
            <li key={it.label}>
              <a
                className={styles.item}
                href={it.href}
                style={{ "--i": i } as React.CSSProperties}
                onClick={(e) => onItemClick(e, it.href)}
              >
                {it.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className={styles.foot}>
        <a
          className={styles.action}
          href="/restaurants"
          onClick={(e) => onItemClick(e, "/restaurants")}
        >
          View all our restaurants
        </a>

        <span className={styles.rule} aria-hidden />

        <div className={styles.legal}>
          {/* SAME NOTICE THE FOOTER PRINTS, YEAR AND ALL — see the comment
              on .bottomRow in Footer.tsx. This read `new Date().getFullYear()`
              under suppressHydrationWarning, which is the static-export
              hydration bug held at arm's length rather than fixed: the
              exported HTML carries the build's year and the browser hydrates
              with the current one. A year is optional in a UK copyright
              notice, so the overlay claims no date either, and the two places
              a reader meets the notice now say the same thing. */}
          <span className={styles.dim}>&copy; Maginhawa Group</span>

          {EMAIL && (
            <a className={styles.mail} href={`mailto:${EMAIL}`}>
              {EMAIL}
            </a>
          )}
        </div>
      </div>
    </aside>
  );
}
