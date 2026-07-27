import styles from "./PressStrip.module.css";

// SVG press marks from /public/press-logo/. `preserveColor` items opt out
// of the monochrome treatment so brand-critical marks (Michelin's red
// credential) read as themselves. `sizeBoost` widens a single mark by a
// factor — used for The Independent whose "i" wordmark is very compact
// and disappears in the strip at the default cell size.
const PRESS: {
  name: string;
  logo: string;
  preserveColor?: boolean;
  sizeBoost?: number;
}[] = [
  { name: "BBC Good Food", logo: "/press-logo/bbcgoodfood.svg" },
  { name: "Country & Town House", logo: "/press-logo/country-townhouse.svg" },
  { name: "Evening Standard", logo: "/press-logo/eveningstandard.svg" },
  { name: "Forbes", logo: "/press-logo/forbes.svg" },
  { name: "Hypebeast", logo: "/press-logo/hypebeast.svg" },
  { name: "The Infatuation", logo: "/press-logo/infatuation.svg" },
  { name: "Metro", logo: "/press-logo/metro.svg" },
  {
    name: "Michelin Guide",
    logo: "/logo/michelin-2026-selection.png",
    preserveColor: true,
  },
  { name: "Thatsup", logo: "/press-logo/thatsup.svg" },
  { name: "The Guardian", logo: "/press-logo/theguardian.svg" },
  {
    name: "The Independent",
    logo: "/press-logo/theindependent.svg",
    sizeBoost: 1.6,
    preserveColor: true,
  },
  { name: "The Sunday Times", logo: "/press-logo/thesundaytimes.svg" },
  { name: "The Week", logo: "/press-logo/theweek.svg" },
  { name: "Time Out", logo: "/press-logo/timeout.svg" },
];

/**
 * STATIC "As Featured In" masthead row. Sits between the Discover gallery and
 * the About Us statement — a quiet credential wall before the group's own
 * story. Deliberately still: scrolling logo tickers read as ad-tech, while
 * stillness says "this is simply true". The marks wrap into as many rows as
 * they need, generously spaced.
 *
 * All marks except Michelin are grayscaled and multiply-blended so their
 * colours normalise to a uniform dark tone against the cream page.
 */
export default function PressStrip() {
  return (
    <section
      className={styles.section}
      aria-label="As featured in"
      data-nav-theme="light"
    >
      <span className={styles.label}>As Featured In</span>
      <ul className={styles.list}>
        {PRESS.map((p) => (
          <li
            key={p.name}
            className={styles.item}
            style={
              p.sizeBoost
                ? ({ "--size-boost": p.sizeBoost } as React.CSSProperties)
                : undefined
            }
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={styles.logo}
              data-preserve-color={p.preserveColor ? "" : undefined}
              src={p.logo}
              alt={p.name}
              loading="lazy"
              draggable={false}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
