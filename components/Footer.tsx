"use client";

import styles from "./Footer.module.css";
import Reveal from "./Reveal";
import { useRouteTransition } from "./PageTransition";
import { RESTAURANTS } from "@/lib/restaurants";

// every label carries a real destination; internal routes go through the
// page-transition curtain (the Nav/Menu convention), externals open in a
// new tab
type FootLink = { label: string; href: string };

const LEFT: { h: string; items: FootLink[] }[] = [
  {
    h: "Home",
    items: [
      { label: "Restaurants", href: "/restaurants" },
      { label: "About Us", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "Careers", href: "/join-us" },
      { label: "Contact Us", href: "/contact" },
    ],
  },
  {
    // the restaurant detail pages — with the Visit buttons pointing at the
    // restaurants' own sites, these are the internal entry points
    h: "Restaurants",
    items: RESTAURANTS.map((r) => ({
      label: r.name,
      href: `/restaurants/${r.slug}`,
    })),
  },
  {
    h: "Blog",
    items: [
      { label: "Latest Post", href: "/blog" },
      { label: "Archives", href: "/blog" },
    ],
  },
  {
    h: "About Us",
    items: [
      { label: "Meet the Owner", href: "/about" },
      { label: "Our Story", href: "/about" },
      { label: "Awards & Recognition", href: "/about" },
    ],
  },
  {
    h: "Careers",
    items: [
      { label: "Open Roles", href: "/join-us" },
      { label: "Apply", href: "/join-us" },
    ],
  },
];

// Instagram is the group's one live profile (see lib/jsonld.tsx); the other
// networks route to the contact page until real profiles exist
const CONTACT: FootLink[] = [
  { label: "Email", href: "/contact" },
  { label: "Instagram", href: "https://www.instagram.com/maginhawagroup/" },
  { label: "LinkedIn", href: "/contact" },
  { label: "X", href: "/contact" },
  { label: "Facebook", href: "/contact" },
];

// internal links keep a real href (works without JS) but upgrade the click
// to the curtain transition; externals are plain new-tab anchors
function FootLinkA({ link }: { link: FootLink }) {
  const navigate = useRouteTransition();
  if (!link.href.startsWith("/")) {
    return (
      <a href={link.href} target="_blank" rel="noopener noreferrer">
        {link.label}
      </a>
    );
  }
  return (
    <a
      href={link.href}
      onClick={(e) => {
        e.preventDefault();
        navigate(link.href);
      }}
    >
      {link.label}
    </a>
  );
}

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.cols}>
        <div className={styles.leftCols}>
          {LEFT.map((c) => (
            <div key={c.h} className={styles.col}>
              <h4>{c.h}</h4>
              <ul>
                {c.items.map((i) => (
                  <li key={i.label}>
                    <FootLinkA link={i} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className={`${styles.col} ${styles.contactCol}`}>
          <h4>Contact Us</h4>
          <ul>
            {CONTACT.map((i) => (
              <li key={i.label}>
                <FootLinkA link={i} />
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className={styles.spacer} />

      <Reveal className={styles.wordmarkReveal} y={36}>
        <svg
          className={styles.wordmark}
          viewBox="0 0 100 37"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Maginhawa"
        >
          <text
            className={styles.wline}
            x="0"
            y="18"
            fontSize="25"
            textLength="100"
            lengthAdjust="spacing"
          >
            MAGIN
          </text>
          <text
            className={styles.wline}
            x="0"
            y="36"
            fontSize="25"
            textLength="100"
            lengthAdjust="spacing"
          >
            HAWA
          </text>
        </svg>
      </Reveal>

      <div className={styles.bottomRow}>
        <span>© 2026 Maginhawa Group</span>
        <div>
          <span>By </span>
          <span className={styles.developer}>(EJ)</span>
        </div>
        {/* <span>By (EJ)</span> */}
      </div>
    </footer>
  );
}
