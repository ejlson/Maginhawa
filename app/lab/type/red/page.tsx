/* THE INK LADDER — one ground, one typeface, seven reds.

   Third pass on this colour, so this route exists instead of another single
   guess: pick a row by letter rather than describing a direction and waiting
   to see whether I read it the way you meant.

   WHAT IS HELD CONSTANT: the plaster ground (#f5e9e0), the bottle-green
   accent (#2a5c4a) and the type (Literata + Familjen Grotesk). Only --ink and
   its --soft move. If two rows look different in any other respect, that is a
   bug in this page rather than a property of the colour.

   THE MOVE THIS TIME IS HUE, NOT DEPTH. The incumbent claret sits at 346°,
   which is on the pink-magenta side of red and is why it reads as wine rather
   than as maroon however dark it goes. A maroon is a brownish red, roughly
   0–12°. Row A is the incumbent, kept as the reference; every other row has
   crossed into maroon territory.

   Throwaway with /lab/type. */

import { fontVars } from "../fonts";
import lab from "../lab.module.css";
import styles from "./red.module.css";

type Ink = {
  key: string;
  letter: string;
  name: string;
  hex: string;
  hsl: string;
  lstar: string;
  ratio: string;
  note: string;
};

/* Ratios are against #f5e9e0 and are re-measured off rendered pixels by
   scripts/probe-type-lab.mjs — these strings are labels, not the source of
   truth. For scale: the pair this project deliberately softened away from was
   14.00:1, and the live site runs 9.80:1 today. Rows D and G are past that
   old ceiling, which is a real consideration rather than a disqualification. */
const INKS: Ink[] = [
  {
    key: "claret",
    letter: "A",
    name: "Claret — superseded",
    hex: "#4a1421",
    hsl: "hsl(346, 57%, 18.4%)",
    lstar: "15.8",
    ratio: "12.46:1",
    note: "What 04 used before this ladder. At 346° it is on the pink side of red, which is what made it read as wine rather than as maroon — the fault no amount of darkening fixed. Kept only as the before.",
  },
  {
    key: "light",
    letter: "B",
    name: "Maroon, light",
    hex: "#4e1c18",
    hsl: "hsl(4, 52%, 20%)",
    lstar: "18.0",
    ratio: "11.72:1",
    note: "The gentlest maroon here and the only row LIGHTER than the incumbent. Warmest of the set; closest to a leather banquette.",
  },
  {
    key: "mid",
    letter: "C",
    name: "Maroon — SHIPPED",
    hex: "#411613",
    hsl: "hsl(4, 55%, 16.5%)",
    lstar: "14.1",
    ratio: "13.06:1",
    note: "The middle of the ladder, and the one that shipped — this is --maroon in globals.css. Reads unambiguously maroon without going near-black, holds its hue against the clay ground, and stays under the 14.00:1 this project had already moved away from once.",
  },
  {
    key: "deep",
    letter: "D",
    name: "Maroon, deep",
    hex: "#34100e",
    hsl: "hsl(4, 58%, 13%)",
    lstar: "10.0",
    ratio: "14.36:1",
    note: "Past the 14.00:1 this project softened away from. Still legibly red rather than brown-black, but this is the depth where that starts to be in question.",
  },
  {
    key: "brown",
    letter: "E",
    name: "Maroon, browner",
    hex: "#3c1d15",
    hsl: "hsl(12, 48%, 16%)",
    lstar: "14.9",
    ratio: "12.78:1",
    note: "Twelve degrees toward orange and four points less saturated. The most earth-coloured option — closer to chocolate or tamarind than to wine.",
  },
  {
    key: "red",
    letter: "F",
    name: "Maroon, redder",
    hex: "#3d0f0f",
    hsl: "hsl(0, 60%, 15%)",
    lstar: "11.7",
    ratio: "13.83:1",
    note: "True red at 0°, no lean either way. The most classical maroon and the most neutral of the seven.",
  },
  {
    key: "black",
    letter: "G",
    name: "Near-black maroon",
    hex: "#290c0a",
    hsl: "hsl(4, 62%, 10%)",
    lstar: "6.8",
    ratio: "15.30:1",
    note: "The floor. At L* 6.8 most readers will call this black with a warm cast rather than maroon — included so the end of the ladder is visible, not as a recommendation.",
  },
];

export default function InkLadder() {
  return (
    <main className={`${lab.lab} ${styles.sheet} ${fontVars}`} data-palette="plaster" data-type="literata">
      <header className={styles.head}>
        <span className={styles.word}>MAGINHAWA</span>
        <div>
          <h1 className={styles.title}>The ink, A to G</h1>
          <p className={styles.sub}>
            Ground <code>#f5e9e0</code> and accent <code>#2a5c4a</code> fixed, Literata throughout. Row A is the
            claret 04 uses today; B–G are maroons. The pair this project softened away from was 14.00:1 — D and G
            are past it.
          </p>
        </div>
      </header>

      {INKS.map((ink) => (
        <section
          key={ink.key}
          className={styles.row}
          data-ink-row={ink.key}
          /* the one place this lab sets colour from markup rather than from a
             stylesheet block, because the whole page IS the variable — seven
             named blocks would be seven copies of the same three rules */
          style={
            {
              "--ink": ink.hex,
              /* one soft for every maroon row, tuned to hue 4. B–G span 0–12°
                 and at 30% saturation that spread is invisible in secondary
                 copy; in production each ink would carry its own. A keeps the
                 soft it already has. */
              "--soft": ink.key === "claret" ? "#6f3d45" : "#774440",
            } as React.CSSProperties
          }
        >
          <div className={styles.meta}>
            <div className={styles.swatchRow}>
              <span className={styles.letter}>{ink.letter}</span>
              <span className={styles.swatch} aria-hidden />
            </div>
            <h2 className={styles.name}>{ink.name}</h2>
            <p className={styles.figures}>
              <code>{ink.hex}</code>
              <br />
              {ink.hsl}
              <br />
              L* {ink.lstar} · {ink.ratio}
            </p>
            <p className={styles.note}>{ink.note}</p>
          </div>

          <div className={styles.spec}>
            <h3 className={styles.heading}>
              Our collection of <em>restaurants</em>
            </h3>
            <p className={styles.standfirst}>
              Explore our family of restaurants and stores, where tradition is served with a modern twist.
            </p>
            <p className={styles.para}>
              Maginhawa began in 1987 with one room, one family and a menu written the night before. The word is
              Tagalog for comfortable, and it is a promise about the room before it is a promise about the food.
            </p>
            <div className={styles.actions}>
              <button className={styles.primary}>Explore our restaurants</button>
              <button className={styles.secondary}>Book a table</button>
            </div>
          </div>
        </section>
      ))}
    </main>
  );
}
