/* THE LAB'S FONT LOADERS, IN ONE PLACE.

   Two routes need these — /lab/type (full panels) and /lab/type/plaster (the
   specimen sheet) — and next/font loaders must be called at module scope. Two
   copies would mean two sets of CSS variables with different generated
   suffixes, so a face could resolve on one route and silently fall back on
   the other while both stylesheets looked identical. One module, one set.

   NONE OF THESE DISPLAY FACES IS A DIDONE, and that is the constraint the
   whole list is picked under. Contralto — the wordmark, the one fixed point —
   is a high-contrast Didone with vertical stress and hairline thins. A
   display face built the same way competes with it instead of setting it off,
   which is the fault in the live Gilda Display pairing: the logo stops being
   the most distinctive typographic thing on the page. Every face below is
   deliberately some OTHER construction — humanist, grotesque, slab, wedge.

   Throwaway with the routes it serves. */

import {
  Bricolage_Grotesque,
  Instrument_Sans,
  Archivo,
  Host_Grotesk,
  Young_Serif,
  Schibsted_Grotesk,
  EB_Garamond,
  Figtree,
  Literata,
  Familjen_Grotesk,
  Newsreader,
  Public_Sans,
  Zilla_Slab,
  Epilogue,
  Syne,
  Petrona,
  Onest,
} from "next/font/google";

/* EVERY OPTION IS SPELLED OUT, and the repetition is required rather than
   sloppy. next/font is compiled by an SWC loader that reads these calls
   STATICALLY, before any JavaScript runs — it never evaluates the module. So
   the options object has to be a literal with literal values. Hoisting the
   two repeated ones into `const subsets = ["latin"]` and passing them as
   shorthand fails the whole route with `Unexpected key`, naming the first
   call rather than the constant, which is a confusing way to learn that these
   are not ordinary function arguments. */

/* ---- display faces ---- */
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], display: "swap", axes: ["opsz"], variable: "--lab-d1-display" });
const archivo = Archivo({ subsets: ["latin"], display: "swap", axes: ["wdth"], variable: "--lab-d2-display" });
const young = Young_Serif({ subsets: ["latin"], display: "swap", weight: "400", variable: "--lab-d3-display" });
const garamond = EB_Garamond({ subsets: ["latin"], display: "swap", variable: "--lab-d4-display" });
const literata = Literata({ subsets: ["latin"], display: "swap", axes: ["opsz"], variable: "--lab-d5-display" });
const newsreader = Newsreader({ subsets: ["latin"], display: "swap", axes: ["opsz"], variable: "--lab-d6-display" });
/* the only static face in the set — Zilla Slab ships no variable axis, so the
   weights it is allowed to use have to be named up front */
const zilla = Zilla_Slab({ subsets: ["latin"], display: "swap", weight: ["400", "500", "600"], variable: "--lab-d7-display" });
const syne = Syne({ subsets: ["latin"], display: "swap", variable: "--lab-d8-display" });
const petrona = Petrona({ subsets: ["latin"], display: "swap", variable: "--lab-d9-display" });

/* ---- text faces ---- */
const instrument = Instrument_Sans({ subsets: ["latin"], display: "swap", variable: "--lab-t1-text" });
const host = Host_Grotesk({ subsets: ["latin"], display: "swap", variable: "--lab-t2-text" });
const schibsted = Schibsted_Grotesk({ subsets: ["latin"], display: "swap", variable: "--lab-t3-text" });
const figtree = Figtree({ subsets: ["latin"], display: "swap", variable: "--lab-t4-text" });
const familjen = Familjen_Grotesk({ subsets: ["latin"], display: "swap", variable: "--lab-t5-text" });
const publicSans = Public_Sans({ subsets: ["latin"], display: "swap", variable: "--lab-t6-text" });
const epilogue = Epilogue({ subsets: ["latin"], display: "swap", variable: "--lab-t7-text" });
const onest = Onest({ subsets: ["latin"], display: "swap", variable: "--lab-t8-text" });

export const fontVars = [
  bricolage, archivo, young, garamond, literata, newsreader, zilla, syne, petrona,
  instrument, host, schibsted, figtree, familjen, publicSans, epilogue, onest,
]
  .map((f) => f.variable)
  .join(" ");

/* The `note` is the one-line argument for the pairing — what it is FOR, not
   what it looks like. It is the column the specimen sheet reads. */
export const TYPES = {
  bricolage: {
    display: "Bricolage Grotesque",
    text: "Instrument Sans",
    note: "Soft contemporary grotesque with a real optical-size axis. The friendliest of the set; reads current rather than heritage.",
  },
  archivo: {
    display: "Archivo",
    text: "Host Grotesk",
    note: "Newspaper roots, set heavy and tight on a hard corner. The most editorial and the least soft — a front page, not a wine list.",
  },
  /* text face unchanged from panel 03's pairing — this system already exists
     and had simply never been shown on the plaster ground */
  young: {
    display: "Young Serif",
    text: "Schibsted Grotesk",
    note: "Chunky wedge serifs, low contrast, faintly rustic. The most food-coded face here — it looks like a menu board rather than a masthead.",
  },
  garamond: {
    display: "EB Garamond",
    text: "Figtree",
    note: "Old-style humanist, calligraphic, gentle. Heritage and bookish — also the most-used serif in the world, which cuts both ways.",
  },
  literata: {
    display: "Literata",
    text: "Familjen Grotesk",
    note: "Squarer serifs and a heavier colour than Garamond, with an optical-size axis. Modern editorial that still holds a warm ground.",
  },
  newsreader: {
    display: "Newsreader",
    text: "Public Sans",
    note: "Drawn for on-screen news: higher contrast than Literata, more traditional, an optical axis that opens the letterforms at size.",
  },
  zilla: {
    display: "Zilla Slab",
    text: "Epilogue",
    note: "A true slab — the one construction nothing else here covers. Blunt, confident, a little industrial; the least precious option.",
  },
  syne: {
    display: "Syne",
    text: "Figtree",
    note: "Wide, eccentric, contemporary-art adjacent. The boldest thing in the set and the biggest risk against a brief asking for credibility over gimmick.",
  },
  petrona: {
    display: "Petrona",
    text: "Onest",
    note: "A narrow low-contrast serif with slightly awkward, characterful curves. Sets tighter than the others, so headlines run shorter.",
  },
} as const;

export type TypeKey = keyof typeof TYPES;

/* the order the specimen sheet walks, grouped by construction rather than by
   when each was added — sans first, then the serifs from gentlest to bluntest,
   so the sheet reads as a spectrum instead of a changelog */
export const PLASTER_ORDER: TypeKey[] = [
  "bricolage",
  "archivo",
  "syne",
  "garamond",
  "petrona",
  "newsreader",
  "literata",
  "young",
  "zilla",
];
