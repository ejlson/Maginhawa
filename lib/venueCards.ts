/* WHAT A VENUE CARD PRINTS — the record behind <VenueCard>, for every
   surface that renders one.
 *
 * ── WHY THIS FILE EXISTS ──
 * The card is now on two grids (the home Discover grid and /restaurants),
 * and a card that is one design has to be one record. What it prints that
 * lib/restaurants.ts does NOT carry is small and specific:
 *
 *   · the ADDRESS as three printable lines. The canonical record has
 *     `addresses[]` for the four bookable venues only, and it is a postal
 *     address rather than a typographic one — three lines that must not
 *     wrap, one of which is the venue's name.
 *   · HOURS. Nowhere canonical, and see the warning below.
 *   · the MICHELIN sticker, which belongs to the card's top-right corner
 *     and to nothing else in the codebase.
 *   · an `object-position` FOCAL for the two photographs whose subject is
 *     not in the middle of the frame.
 *   · a price for the venues the canonical record has none for.
 *
 * Everything else — name, photograph, mark, menu pages, bookability, the
 * one action — is READ from lib/restaurants.ts through venueCards(), not
 * restated here. That is the pattern the canonical file's own `addresses`
 * note sets: two spellings of one fact are two facts that will disagree.
 *
 * THIS IS THE ONLY COPY. components/Discover.tsx used to declare its own
 * `ITEMS` array with these same eight records in it — it could not be
 * touched while this file was written, because another process was
 * rewriting it. That is done: Discover now reads venueCards() and keeps
 * only the five fields nothing but the homepage prints (tag, est, the
 * one-line location, blurb and the hover clip), joined onto these records
 * by slug. Both grids read this file, so a fact changed here changes both.
 *
 * ⚠️ `hours` IS AN INVENTED PLACEHOLDER. Every venue carries "12–11" and
 * no venue's real opening times are on file anywhere in this repo. It is
 * printed because the card's stat pair was designed around two facts, and
 * it is the first thing the narrow-card layout drops (see the
 * `@container` block in VenueCard.module.css) precisely because it is the
 * datum we are least sure of. Get the real hours and this comment goes;
 * ship a "Today: 12–11" anywhere and it becomes a lie about live data.
 */
import { RESTAURANTS, getRestaurant, type Restaurant } from "./restaurants";

/** the three lines the card's block prints, top to bottom */
export type VenueAddress = {
  /** unused by the card today — line 1 is the venue's NAME. Kept because
   *  it is the neighbourhood the expansion and the venue page print, and
   *  because deriving it back out of `road` is a parse. */
  area: string;
  road: string;
  city: string;
};

export type VenueCardItem = {
  slug: string;
  name: string;
  /** null = no photograph on file; the card paints a maroon field, which
   *  is not an exception to the design but the picture that venue has */
  image: string | null;
  /** `object-position` for a photograph whose subject is off-centre */
  focal?: string;
  logo: string | null;
  /** what the room IS, in four or five words — "Caribbean Takeaway",
   *  "London's First Filipino Ice Cream Parlor". Taken straight from the
   *  canonical record's `tagline`; the card prints it under the name, which
   *  is the line that tells eight venues apart. NOT derived from `cuisine`
   *  ("Filipino · Fusion") — that is a filter facet, written to be sorted
   *  rather than read. */
  tagline?: string;
  address: VenueAddress;
  // priceRange?: string;
  hours?: string;
  /** secondary credential mark — the Michelin sticker, top-right */
  badge?: string;
  badgeLabel?: string;
  menuPages?: string[];
  /** the logo's intrinsic aspect (PNG w/h) and the fraction of its box the
   *  LETTERFORMS occupy — see LOGO_OPTICS below. Both are consumed as CSS
   *  custom properties by the card's crown. */
  logoAspect?: number;
  logoInkRatio?: number;
  /** the DRAWN artwork's bounding box as a fraction of the PNG, width and
   *  height — i.e. what is left once the transparent padding is taken off.
   *  Only <Spines> reads these; see the block over LOGO_INK below for what
   *  they fix and why the card does not need them. */
  logoInkW?: number;
  logoInkH?: number;
};

/* ══════════ THE LOGO OPTICS — MEASURED, NOT CHOSEN ══════════════════════
   Read this before touching a number.

   THE PROBLEM THESE SOLVE. The crown masks each venue's PNG into a slot and
   fits it by height. Fitting the WHOLE LOCKUP to one flat slot equalises
   the bounding box, which is not what a reader sees: it equalises the
   crest, the strapline and the rule box along with the name. Measured at
   the flat 30px slot the grid shipped with, the actual letterforms came out

       bintang 11.7  cafemama 12.1  guanabana 12.8  mamasons 13.0
       ramo 17.3     hoodwood 17.6  belly 21.0      bunso 30.0

   — a 2.6x spread, and Bintang's script was near-illegible on its dark
   photograph. The grid read as two weight classes: single-line wordmarks
   at full size, multi-element lockups shrunk to fit their own furniture.

   HOW THEY ARE DERIVED. `logoInkRatio` is the height of what the eye reads
   as THE NAME, over the PNG's full height, measured off the alpha channel
   (the same channel the CSS mask uses). Sizing the slot as
   `cap / logoInkRatio` then puts every venue's letterforms at the same
   height and lets the lockup take whatever room its subordinate matter
   needs — which is why Bintang's slot is ~2.5x Bunso's and that is correct
   rather than a bug.

   WHAT COUNTS AS SUBORDINATE, per mark, because this is the judgement half:
     bintang    the tiger crest above the script is ornament — the NAME is
                the script (104 of 267px).
     guanabana  the rule box is a frame; the NAME is the text inside it
                (101 of 236px).
     mamasons   "Dirty Ice Cream" and its two rules are a strapline; the
                NAME is the MAMASONS caps (104 of 240px).
     ramo       the (R) and the brush swash overshoot the letters; the NAME
                is the RAMO caps (149 of 259px).
     cafemama   "& SONS" IS part of the name, set in a script that rides
                taller than the CAFE MAMA caps. Neither extreme is right:
                the caps alone (68px) over-weights the mark until it
                overflows the narrow card, and the full ink extent (103px)
                under-weights it against HOODWOOD. 85px is the midpoint and
                it is a judgement, not a measurement — the one number here
                that is.
     hoodwood / belly / bunso   single-line wordmarks; the name is the mark.

   ⚠️ THE ASPECT IS THE PNG'S, INCLUDING ITS TRANSPARENT PADDING, because
   that is what `mask-size` scales. The padding varies enormously across
   this set (Bunso has none at all, Bintang has ~14% vertically), which is
   exactly why the box cannot be the unit of measure.

   ⚠️ RE-MEASURE IF AN ASSET IS RE-EXPORTED. A re-crop changes both numbers
   silently — nothing errors, the mark just renders at the wrong size. */
const LOGO_OPTICS: Record<string, { aspect: number; inkRatio: number }> = {
  bintang: { aspect: 453 / 267, inkRatio: 104 / 267 },
  guanabana: { aspect: 900 / 236, inkRatio: 101 / 236 },
  mamasons: { aspect: 900 / 240, inkRatio: 104 / 240 },
  ramo: { aspect: 810 / 259, inkRatio: 149 / 259 },
  hoodwood: { aspect: 900 / 170, inkRatio: 100 / 170 },
  cafemama: { aspect: 900 / 169, inkRatio: 85 / 169 },
  belly: { aspect: 900 / 224, inkRatio: 157 / 224 },
  bunso: { aspect: 670 / 141, inkRatio: 141 / 141 },
};

/* ══════════ WHERE THE ARTWORK ACTUALLY STARTS ══════════════════════════
   The DRAWN bounding box of each PNG, as a fraction of the file — width
   and height — measured off the alpha channel at a threshold of 12/255.
   Everything outside it is transparent padding.

   WHAT THIS IS FOR, and it is a different problem from LOGO_OPTICS above.
   That table equalises how BIG each name renders. This one fixes where it
   SITS. `mask-size: contain` fits the whole file, padding included, so a
   mark is pushed right and up by however much transparent margin its
   export happens to carry — and these carry very different amounts:

     bunso                             0.00% — no padding at all
     guanabana mamasons hoodwood
     cafemama belly                    3.67% left, and 13.7–19.5% bottom
     ramo                              3.70%
     bintang                           3.97%

   As a fraction that looks harmless. Rendered on the phone's band, where
   the marks are between 61 and 148px wide, it is an indent of 0 to 5.4px
   — Bunso flush against the location line beneath it, Café Mama five and
   a half pixels adrift, and every other venue somewhere in between. The
   bottom padding does the same to the gap above that line.

   <Spines> uses these to size its box to the ARTWORK rather than to the
   file, so every mark's left edge and baseline land on the same axis as
   the type under it.

   ⚠️ THE CARD DOES NOT NEED THEM and must not start using them casually.
   Its crown anchors `left top` inside a fixed-width slot and the note on
   .cardLogoMark records that the eight ink edges already land within
   1.2px of each other there — because that slot's width does not vary by
   venue, so the padding scales identically across the set. It is the
   band's per-venue sizing that turns one shared percentage into eight
   different pixel offsets.

   ⚠️ RE-MEASURE IF AN ASSET IS RE-EXPORTED, exactly as for LOGO_OPTICS. A
   re-crop changes these silently and the mark simply drifts. */
const LOGO_INK: Record<string, { w: number; h: number }> = {
  bintang: { w: 0.9183, h: 0.8614 },
  guanabana: { w: 0.9267, h: 0.7203 },
  mamasons: { w: 0.9267, h: 0.7250 },
  ramo: { w: 0.9259, h: 0.7683 },
  hoodwood: { w: 0.9267, h: 0.6118 },
  cafemama: { w: 0.9267, h: 0.6095 },
  belly: { w: 0.9267, h: 0.7054 },
  bunso: { w: 1.0, h: 1.0 },
};

/* THE CARD-ONLY EXTRAS, keyed by canonical slug. Anything the canonical
   record already answers is absent here on purpose. */
type Extras = {
  address: VenueAddress;
  hours?: string;
  /** ONLY where the canonical record has no price, or disagrees with what
   *  the card has shipped — see the note on `price` in venueCards() */
  // priceRange?: string;
  focal?: string;
  badge?: string;
  badgeLabel?: string;
  /** the canonical `image` is wrong or missing for this venue */
  image?: string | null;
};

const EXTRAS: Record<string, Extras> = {
  bintang: {
    address: {
      area: "Kentish Town",
      road: "93 Kentish Town Rd",
      city: "London NW1 8NY",
    },
    hours: "12-11",
  },
  guanabana: {
    address: {
      area: "Kentish Town",
      road: "85 Kentish Town Rd",
      city: "London NW1 8NY",
    },
    hours: "12-11",
  },
  mamasons: {
    /* THE ONE VENUE WITH TWO SITES, and the reason these are eight
       explicit triples rather than a parse of the canonical `location`.
       A three-line block holds ONE postal address. Kentish Town is the
       parlour's first and larger site, so it takes lines 2 and 3; the
       Chinatown counter closes the block with its street instead of a
       postcode, because THERE IS NO POSTCODE ON FILE for it. Guessing
       WC2H from the street name would be putting an invented postcode on
       a card. Add the real one to lib/restaurants.ts and this line
       becomes "London NW1 8NY · WC2H …" like the rest. */
    address: {
      area: "Kentish Town · Soho",
      road: "91 Kentish Town Rd",
      city: "& 32 Newport, Chinatown",
    },
    hours: "12-11",
    // priceRange: "£",
    /* the shopfront is 4032x6048 (2:3); `cover` scales it to the card's
       width and crops the height, and the MAMASONS fascia sits high in
       the frame. 40% opens the window above the default centre so the
       fascia survives the crop on a square card as it does on a tall one. */
    focal: "50% 40%",
  },
  ramo: {
    address: { area: "Soho", road: "28 Brewer St", city: "London W1F 0SR" },
    hours: "12-11",
  },
  hoodwood: {
    address: {
      area: "Kentish Town",
      road: "81 Kentish Town Rd",
      city: "London NW1 8NY",
    },
    hours: "12-11",
    // priceRange: "£",
  },
  cafemama: {
    address: {
      area: "Kentish Town",
      road: "83 Kentish Town Rd",
      city: "London NW1 8NY",
    },
    hours: "12–11",
    // priceRange: "£",
  },
  belly: {
    address: {
      area: "Kentish Town",
      road: "157 Kentish Town Rd",
      city: "London NW1 8PD",
    },
    hours: "12-11",
    /* ⚠️ THE CANONICAL RECORD SAYS `££` AND THE CARD HAS SHIPPED `£££`.
       This keeps what the signed-off card prints rather than silently
       re-pricing a Michelin-selected bistro on two pages at once. One of
       the two is wrong and it is a question for the group, not for a
       stylesheet — fix lib/restaurants.ts and delete this line. */
    // priceRange: "£££",
    badge: "/logo/michelin-2026-round.png",
    badgeLabel: "Michelin Selected Restaurant 2026",
  },
  bunso: {
    address: {
      area: "Kentish Town",
      road: "1a Hawley Rd",
      city: "London NW1 8RP",
    },
    /* NO hours — it has not opened, so its block prints the address alone
       and the stat does not render. That is the card being uniform, not
       failing: a venue with no datum gives the whole measure to its
       address. (This note also described a `priceRange` that no longer
       exists on the type, and an `image: null` pointing at a
       /images/bunso-placeholder.jpg that was never in public/ — both were
       describing a state this entry had already left.)

       ⚠️ `-shopfront`, AND THE SUFFIX IS LOAD-BEARING. This read
       /images/bunso.jpg and the card rendered a 670x141 wordmark strip
       blown up to fill it. Nothing was wrong here: Cloudinary public ids
       DROP THE EXTENSION (publicIdFor, scripts/cloudinary-upload.mjs), so
       /images/bunso.jpg and /images/bunso.png — the wordmark About.tsx
       asks for — both resolved to `maginhawa/images/bunso`, and the PNG
       was the one that got uploaded there. Bunso was the only such
       collision in public/images. Renaming the PHOTO rather than the
       wordmark is what keeps About.tsx pointing at an asset that is
       already live. */
    image: "/images/bunso-shopfront.jpg",
  },
};

/** ONE card record, canonical first and the extras only where the
 *  canonical record is silent. Returns null for a slug that is not a
 *  restaurant, so a caller cannot invent a venue by typo. */
export function venueCard(slug: string): VenueCardItem | null {
  const r: Restaurant | undefined = getRestaurant(slug);
  const x = EXTRAS[slug];
  if (!r || !x) return null;
  return {
    slug: r.slug,
    name: r.name,
    tagline: r.tagline,
    // `undefined` means "the extras have nothing to say"; `null` is a
    // deliberate "there is no photograph", and the two must not collapse
    image: x.image !== undefined ? x.image : r.image,
    focal: x.focal,
    logo: r.logo,
    address: x.address,
    // the extras win where they speak at all — see belly's note
    hours: x.hours,
    badge: x.badge,
    badgeLabel: x.badgeLabel,
    menuPages: r.menuPages,
    logoAspect: LOGO_OPTICS[r.slug]?.aspect,
    logoInkRatio: LOGO_OPTICS[r.slug]?.inkRatio,
    logoInkW: LOGO_INK[r.slug]?.w,
    logoInkH: LOGO_INK[r.slug]?.h,
  };
}

/** every venue, in the canonical order the grids present them in */
export const venueCards = (): VenueCardItem[] =>
  RESTAURANTS.map((r) => venueCard(r.slug)).filter(
    (v): v is VenueCardItem => v !== null,
  );
