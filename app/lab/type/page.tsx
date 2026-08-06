/* TYPE & PALETTE LAB — A THROWAWAY ROUTE, NOT PART OF THE SITE.
   Complete font+colour systems rendered on the same real composition: the
   navbar wordmark, the hero lockup, a section heading, a venue card and a
   paragraph of body copy. Same markup every time; only the two attributes on
   the section change, which is the point — if a direction can be shown by
   swapping attributes here, adopting it is a token edit in globals.css rather
   than a rewrite.

   PALETTE AND TYPE ARE INDEPENDENT AXES. A panel names one of each, so any
   colourway can be shown in any type system without touching the other.
   That is not tidiness for its own sake: 06 and 07 exist to show two
   colourways swapped across two type systems, and if the axes were fused the
   swap would be a hand-copy of eleven tokens per panel.

   The contrast figures live on the PALETTE rather than on the direction,
   because they are a property of the colours and nothing about a typeface
   changes them. Repeating them per-direction would be four more chances to
   quote a number that no longer matches the hexes.

   THE COMPACT COMPARISON IS AT /lab/type/plaster. Nine type systems on one
   ground cannot be judged by scrolling past nine heroes; that route strips
   everything except the type and stacks them.

   DELETE BOTH ROUTES once a direction is picked, along with fonts.ts and
   scripts/probe-type-lab.mjs. They are excluded from the nav and the sitemap,
   and they load seventeen font families no other page should ever pay for. */

import Image from "next/image";
import { fontVars, TYPES, type TypeKey } from "./fonts";
import styles from "./lab.module.css";

/* the measured figures, one row per palette — see scripts/probe-type-lab.mjs,
   which reads them back off rendered pixels rather than off these strings */
const PALETTES = {
  cobalt: { name: "Cobalt & Bone", ratios: "ink 9.54:1 · soft 5.24:1 · accent 4.77:1" },
  ube: { name: "Ube & Calamansi", ratios: "ink 13.05:1 · soft 6.45:1 · accent 10.67:1" },
  paper: { name: "Paper & Ember", ratios: "ink 11.69:1 · soft 5.46:1 · accent 4.71:1" },
  /* SHIPPED — this palette and the `garamond` type system are what
     globals.css and layout.tsx now carry */
  plaster: { name: "Plaster & Maroon", ratios: "ink 13.06:1 · soft 6.56:1 · accent 6.46:1" },
  ember: { name: "Ember & Pandan", ratios: "ink 13.51:1 · soft 6.91:1 · accent 9.55:1" },
  claret: { name: "Claret & Plaster", ratios: "ink 12.49:1 · soft 6.77:1 · accent 8.52:1" },
} as const;

type Direction = {
  id: string;
  index: string;
  palette: keyof typeof PALETTES;
  type: TypeKey;
  /* the panel's own title, which is NOT always the palette's name — 06 and 07
     are the same two colourways under different type, so they say so */
  title: string;
  thesis: string;
};

const DIRECTIONS: Direction[] = [
  {
    id: "cobalt",
    index: "01",
    palette: "cobalt",
    type: "bricolage",
    title: "Cobalt & Bone",
    thesis:
      "The one colour restaurants refuse to use, because of a superstition about appetite. It is also the exact complement of every warm thing on a plate, so the photography reads hotter against it than it does against cream.",
  },
  {
    id: "ube",
    index: "02",
    palette: "ube",
    type: "archivo",
    title: "Ube & Calamansi",
    thesis:
      "A dark room rather than a bright page. Aubergine is the colour of the one Filipino ingredient a London reader can already name, and a dark ground is what makes food photography luminous instead of merely present.",
  },
  {
    id: "ember",
    index: "03",
    palette: "paper",
    type: "young",
    title: "Paper & Ember",
    thesis:
      "Paper, not cream — the warmth comes from the typeface and the food, not from a tinted background. One ember accent, used about as often as a chilli appears in a dish.",
  },

  /* 04 and 05 are 01 and 02 RE-COLOURED, not new directions — same two type
     systems, same weights, same tracking. Both original colourways were cool;
     these are the warm answer to the same two layouts. */
  {
    id: "plaster",
    index: "04",
    palette: "plaster",
    type: "bricolage",
    title: "Plaster & Claret",
    thesis:
      "01 made warm, then pulled apart at both ends — a lighter cream and a darker claret, 9.88:1 opened to 12.46:1. Enough pigment in the ground to read as a wall rather than as paper, claret for the ink the way a wine list is set, and bottle green for the accent — the pairing you get on a plate long before you get it in a palette.",
  },
  {
    id: "emberdark",
    index: "05",
    palette: "ember",
    type: "archivo",
    title: "Ember & Pandan",
    thesis:
      "02 made warm, then taken down four points of lightness — the colour of a dark dining room at service rather than of a nightclub. It stops where it does because below roughly 7% the red cast drops out and the ground becomes a generic near-black. The accent moves from calamansi to pandan, the one green that reads as a leaf rather than as a highlighter.",
  },

  /* 06 and 07 are 04 and 05 with the type systems TRADED, and nothing else.
     Same five hexes per side, same weights and tracking as their donor — the
     only thing that moved is which family sets the words. Read them against
     04 and 05 rather than against each other: the question they answer is
     whether each colourway was carrying its type or being carried by it. */
  {
    id: "emberbricolage",
    index: "06",
    palette: "ember",
    type: "bricolage",
    title: "Ember & Pandan, set in 04's type",
    thesis:
      "05's colours under 01/04's face. Bricolage is softer and rounder than Archivo and it takes the 20px corner with it, so the dark room reads warmer and less like a masthead — the same aubergine-free ember, argued gently instead of loudly.",
  },
  {
    id: "plasterarchivo",
    index: "07",
    palette: "plaster",
    type: "archivo",
    title: "Plaster & Claret, set in 05's type",
    thesis:
      "04's colours under 02/05's face. Archivo set heavy and tight on a 4px corner puts a newspaper voice on the clay ground, which is the most editorial of the seven and the least soft — the claret stops feeling like a wine list and starts feeling like a front page.",
  },

  /* 08 is 04 IN DARK MODE — same type, same three hues, every value
     re-derived. It is a pair with 04 rather than an eighth direction: if 04
     is picked, this is what its dark scheme looks like. */
  {
    id: "claret",
    index: "08",
    palette: "claret",
    type: "bricolage",
    title: "Claret & Plaster — 04 in dark mode",
    thesis:
      "04 seen in a dark room. The ground takes the claret's hue, the type takes the plaster's, and the accent keeps the bottle green's — so it is the same three colours rather than three new ones. Every value moved, though: carried across untouched, 04's green reads 1.93:1 here and disappears. Lifted 37 points it reads 8.52:1, which is more headroom than the light mode's own 6.46:1.",
  },

  /* 09 and 10 are 04's EXACT colours under two serif-led systems. 04 is
     Bricolage and 07 is Archivo, both grotesques, so the plaster ground had
     never been set in a serif — which is the obvious gap given every earlier
     face this project tried was one. Neither of these is a Didone, for the
     reason in the loader block above. */
  {
    id: "plastergaramond",
    index: "09",
    palette: "plaster",
    type: "garamond",
    title: "Plaster & Claret — EB Garamond",
    thesis:
      "The heritage read. An old-style humanist with calligraphic roots and almost no stroke contrast, which is the opposite construction to Contralto's — so the wordmark reads as a different object rather than as a bigger heading. Set at 500 because Garamond's 400 is a text weight and goes weedy above about 40px. Figtree carries the prose: warm, geometric-humanist, none of Helvetica's neutrality.",
  },
  {
    id: "plasterliterata",
    index: "10",
    palette: "plaster",
    type: "literata",
    title: "Plaster & Claret — Literata",
    thesis:
      "The contemporary read, and the only other face here besides Bricolage with a real optical-size axis — it was drawn for Google Play Books, so it genuinely changes shape between caption and headline rather than scaling. Sturdier and more modern than Garamond, with squarer serifs that hold up on a warm ground. Familjen Grotesk sets the prose, Swedish and slightly narrow.",
  },

  /* 11–15 finish the sweep of the plaster ground. Same five hexes throughout;
     the only thing that changes is which family sets the words. See
     /lab/type/plaster for all nine stacked without the heroes. */
  {
    id: "plasteryoung",
    index: "11",
    palette: "plaster",
    type: "young",
    title: "Plaster & Claret — Young Serif",
    thesis:
      "The type system from 03, never yet shown on this ground. Chunky wedge serifs at almost no contrast — the most food-coded face in the set, closer to a menu board than a masthead. Note the square corner: it is the type system's own, and on a clay ground it reads more rustic than it did on paper.",
  },
  {
    id: "plasternewsreader",
    index: "12",
    palette: "plaster",
    type: "newsreader",
    title: "Plaster & Claret — Newsreader",
    thesis:
      "Higher contrast and a more conventional skeleton than Literata — the closest thing here to a traditional book serif. Its optical axis runs the opposite way to Bricolage's: it opens the letterforms and thins the hairlines as size goes up, which is what a text face has to do to avoid looking clotted at headline size.",
  },
  {
    id: "plasterzilla",
    index: "13",
    palette: "plaster",
    type: "zilla",
    title: "Plaster & Claret — Zilla Slab",
    thesis:
      "A true slab, and the one construction nothing else in the set covers: blunt serifs carrying the same weight as the stems, so there is no stroke contrast at all. The most robust option on a warm ground and the least precious. It is also the only static face here — no variable axis, so the weights are whatever fonts.ts enumerated.",
  },
  {
    id: "plastersyne",
    index: "14",
    palette: "plaster",
    type: "syne",
    title: "Plaster & Claret — Syne",
    thesis:
      "The outlier. Wide, eccentric, drawn for a contemporary art centre — the only option here that reads as a design statement before it reads as a restaurant. It is in the set because the range is worth seeing, and it argues against this brief's own line about credibility over gimmick. Pick it knowingly or not at all.",
  },
  {
    id: "plasterpetrona",
    index: "15",
    palette: "plaster",
    type: "petrona",
    title: "Plaster & Claret — Petrona",
    thesis:
      "A narrow low-contrast serif whose curves never quite resolve into elegance, which is the appeal — it has a handmade quality the polished options do not. It sets measurably tighter than everything else here, so the same heading runs shorter and the standfirst gets more room.",
  },
];

export default function TypeLab() {
  return (
    <main className={`${styles.lab} ${fontVars}`}>
      {DIRECTIONS.map((d) => {
        const palette = PALETTES[d.palette];
        const type = TYPES[d.type];

        return (
          <section
            key={d.id}
            className={styles.dir}
            data-palette={d.palette}
            data-type={d.type}
            data-lab-panel={d.id}
          >
            {/* ---- the bar, so the wordmark is judged in place ---- */}
            <header className={styles.bar}>
              <span className={styles.word}>MAGINHAWA</span>
              <nav className={styles.links}>
                <span>Restaurants</span>
                <span>About us</span>
                <span>Careers</span>
              </nav>
            </header>

            {/* ---- hero: the real copy, over the real film still ---- */}
            <div className={styles.hero}>
              <Image src="/images/belly3.jpg" alt="" fill sizes="100vw" className={styles.heroImg} priority={d.index === "01"} />
              <div className={styles.heroInk} />
              <div className={styles.lockup}>
                <h1 className={styles.lede}>
                  <span>Filipino at heart.</span>
                  <span>Seven London kitchens, pan-Asian and Caribbean.</span>
                  <span>Since 1987.</span>
                </h1>
                <div className={styles.actions}>
                  <button className={styles.primary}>Explore our restaurants</button>
                  <button className={styles.secondary}>Book a table</button>
                </div>
              </div>
            </div>

            {/* ---- the section voice: eyebrow, heading with the accent word,
                    standfirst, and a paragraph long enough to judge the text
                    face at reading size ---- */}
            <div className={styles.body}>
              <div className={styles.copy}>
                <p className={styles.eyebrow}>The group</p>
                <h2 className={styles.heading}>
                  Our collection of <em>restaurants</em>
                </h2>
                <p className={styles.standfirst}>
                  Explore our family of restaurants and stores, where tradition is served with a modern twist.
                </p>
                <p className={styles.para}>
                  Maginhawa began in 1987 with one room, one family and a menu written the night before. Seven kitchens
                  later the method has not changed: cook the thing you grew up eating, cook it for people who did not,
                  and let the room do the explaining. The word is Tagalog for comfortable, and it is a promise about the
                  room before it is a promise about the food.
                </p>
                <p className={styles.spec}>
                  <span>{type.display}</span> display · <span>{type.text}</span> text · Contralto wordmark
                  <br />
                  <span className={styles.ratio}>{palette.ratios}</span>
                </p>
              </div>

              {/* ---- one venue card, the piece that carries the most decisions ---- */}
              <article className={styles.card}>
                <Image src="/images/bintang.jpg" alt="" fill sizes="480px" className={styles.cardImg} />
                <div className={styles.ramp} />
                <Image src="/logo/bintang.png" alt="Bintang" width={132} height={44} className={styles.cardLogo} />
                <div className={styles.cardFoot}>
                  <div className={styles.addr}>
                    <span className={styles.addrName}>Bintang</span>
                    <span>93 Kentish Town Road</span>
                    <span>London NW1 8NY</span>
                  </div>
                  <div className={styles.stats}>
                    <span>££</span>
                    <i />
                    <span>12–11</span>
                  </div>
                </div>
                <div className={styles.cardActions}>
                  <button className={styles.cardPrimary}>Book</button>
                  <button className={styles.cardSecondary}>Menu</button>
                </div>
              </article>
            </div>

            {/* ---- the label, last so it never reads as part of the design ---- */}
            <footer className={styles.tag}>
              <span className={styles.tagIndex}>{d.index}</span>
              <div>
                <h3 className={styles.tagName}>{d.title}</h3>
                <p className={styles.tagThesis}>{d.thesis}</p>
              </div>
            </footer>
          </section>
        );
      })}
    </main>
  );
}
