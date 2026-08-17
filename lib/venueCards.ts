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
    hours: "12–11",
  },
  guanabana: {
    address: {
      area: "Kentish Town",
      road: "85 Kentish Town Rd",
      city: "London NW1 8NY",
    },
    hours: "12–11",
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
    hours: "12–11",
    // priceRange: "£",
    /* the shopfront is 4032x6048 (2:3); `cover` scales it to the card's
       width and crops the height, and the MAMASONS fascia sits high in
       the frame. 40% opens the window above the default centre so the
       fascia survives the crop on a square card as it does on a tall one. */
    focal: "50% 40%",
  },
  ramo: {
    address: { area: "Soho", road: "28 Brewer St", city: "London W1F 0SR" },
    hours: "12–11",
  },
  hoodwood: {
    address: {
      area: "Kentish Town",
      road: "81 Kentish Town Rd",
      city: "London NW1 8NY",
    },
    hours: "12–11",
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
    hours: "12–11",
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
    /* NO hours AND NO priceRange — it has not opened, so its block prints
       the address alone and the stats do not render at all. That is the
       card being uniform, not failing: a venue with neither datum gives
       the whole measure to its address.

       image: null — the canonical record points at
       /images/bunso-placeholder.jpg, WHICH DOES NOT EXIST in public/.
       Rather than ship a 404 into a next/image, the card takes the maroon
       field it has always had here. */
    image: "/images/bunso.jpg",
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
  };
}

/** every venue, in the canonical order the grids present them in */
export const venueCards = (): VenueCardItem[] =>
  RESTAURANTS.map((r) => venueCard(r.slug)).filter(
    (v): v is VenueCardItem => v !== null,
  );
