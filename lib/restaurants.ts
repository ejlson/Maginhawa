// Canonical restaurant data — used for routing, structured data (Schema.org),
// metadata, and any UI that needs the source of truth. Keep this thin: the
// showcase still owns its own carousel-specific overrides.

export type Restaurant = {
  slug: string;
  name: string;
  tagline: string;
  cuisine: string;
  description: string;
  location: string;
  // The postal address in parts — `location` is the editorial shorthand
  // ("Kentish Town, London"), this is the line you could post to. Populated
  // only for the venues that take bookings, since the Reservations index is
  // the one surface that has to tell a reader where to turn up.
  addresses?: { street: string; locality: string; postcode: string }[];
  image: string;
  logo: string;
  url?: string;
  // The restaurant's own public website — the Visit actions open this in a
  // new tab; the internal detail pages stay reachable via the footer.
  website?: string;
  bookable: boolean;
  bookingUrl?: string;
  /* `priceRange` stood here and is gone at the user's instruction — the
     group does not publish a price band anywhere on the site now. It fed
     three places, all removed with it: the Price fact on the detail page,
     the `priceRange` key in the Restaurant structured data (lib/jsonld),
     and — earlier, via its own copy on VenueCardItem — the price stat on
     the venue cards. Re-adding it means re-adding all three; a field that
     only the type knows about is what left a dangling read in VenueCard
     and broke a production build. */
  // Optional Google "write a review" deep link — usually
  // https://search.google.com/local/writereview?placeid=<PLACE_ID>
  // If absent, the UI falls back to a Google Maps search for the restaurant.
  googleReviewUrl?: string;
  // Optional list of menu page images (PNG/JPG paths under /public). Powers
  // the Menu overlay in Discover / RestaurantsShowcase / RestaurantDetail.
  menuPages?: string[];
  // Optional small-caps subtitle shown above the menu pages — e.g. "February 2026"
  menuLabel?: string;
  // Marks placeholder content for a venue that hasn't opened yet — hides the
  // entry from review prompts while keeping it routable/discoverable.
  comingSoon?: boolean;
};

/* ⚠️ THIS LIST IS RESTATED BY HAND IN public/llms.txt — the plain-text
   summary assistants read (llmstxt.org). That file ships out of `public/`
   uncompiled, so it cannot import this array: it names every venue, its
   cuisine, whether it takes bookings, and the addresses of the four that
   publish one.

   ADD, RENAME OR CLOSE A VENUE HERE AND public/llms.txt IS WRONG until it is
   edited too. Nothing in the build checks it. It is a small file and the
   list is near the top of it. */
export const RESTAURANTS: Restaurant[] = [
  {
    slug: "bintang",
    name: "Bintang",
    tagline: "Filipino Fusion Restaurant",
    cuisine: "Filipino · Fusion",
    description:
      "A Kentish Town mainstay pairing Filipino classics with a fusion kitchen — long-standing favourite of the Maginhawa family.",
    location: "Kentish Town, London",
    // split from the string Discover's index already carried — derived, not
    // sourced afresh, so the two can be diffed against each other
    addresses: [
      { street: "93 Kentish Town Rd", locality: "London", postcode: "NW1 8NY" },
    ],
    image: "/images/bintang.jpg",
    logo: "/logo/bintang.png",
    website: "https://www.bintangrestaurant.co.uk/",
    menuPages: [
      "/menu/bintang/bintang_menu-1.png",
      "/menu/bintang/bintang_menu-2.png",
    ],
    menuLabel: "February 2026",
    bookable: true,
    bookingUrl: "https://www.opentable.co.uk/booking/restref/availability?lang=en-GB&correlationId=6b35518d-aef1-43a2-8dcc-ad4ef5dc8053&restRef=324126&otSource=Restaurant%20website",
  },
  {
    slug: "guanabana",
    name: "Guanabana",
    tagline: "Caribbean Cuisine",
    cuisine: "Caribbean",
    description:
      "Kentish Town's neighbourhood Caribbean kitchen — bold, generous, and unmistakably London.",
    location: "Kentish Town, London",
    addresses: [
      { street: "85 Kentish Town Rd", locality: "London", postcode: "NW1 8NY" },
    ],
    image: "/images/guanabana.jpg",
    logo: "/logo/guanabana.png",
    website: "https://www.guanabanarestaurant.com/",
    bookable: true,
    bookingUrl: "https://www.opentable.co.uk/guanabana-reservations-london?restref=79453&lang=en-GB&ot_source=Restaurant%20website",
  },
  {
    slug: "mamasons",
    name: "Mamasons",
    tagline: "Filipino Ice Cream Parlour",
    cuisine: "Ice Cream Parlour",
    description:
      "London's original Filipino ice-cream parlour — ube, queso, dirty ice-cream rolled in pandesal.",
    location: "Kentish Town · Soho, London",
    image: "/images/mamasons.jpg",
    logo: "/logo/mamasons.png",
    website: "http://dirtyicecream.co.uk/",
    bookable: false,
  },
  {
    slug: "ramo",
    name: "Ramo Ramen",
    tagline: "Filipino-Japanese Ramen",
    cuisine: "Ramen · Filipino",
    description:
      "Filipino-Japanese ramen in Soho — a tight bowl-led menu with deep, layered broths.",
    location: "Soho, London",
    addresses: [
      { street: "28 Brewer St", locality: "Soho, London", postcode: "W1F 0SR" },
    ],
    image: "/images/ramoramen.JPG",
    logo: "/logo/ramo.png",
    website: "https://www.ramoramen.com/",
    menuPages: [
      "/menu/ramo/lunch-1.png",
      "/menu/ramo/alacarte.png",
      "/menu/ramo/groupset.png",
      "/menu/ramo/drinks-1.png",
      "/menu/ramo/drinks-2.png",
    ],
    menuLabel: "February 2026",
    bookable: true,
    bookingUrl: "https://www.sevenrooms.com/reservations/ramosoho/",
  },
  {
    slug: "hoodwood",
    name: "Hoodwood",
    tagline: "Caribbean Takeaway",
    cuisine: "Caribbean · Takeaway",
    description:
      "Caribbean takeaway with pies named among London's best by City AM during British Pie Week.",
    location: "Kentish Town, London",
    image: "/images/hoowood.jpg",
    logo: "/logo/hoodwood.png",
    website: "https://www.hoodwood.co.uk/",
    bookable: false,
  },
  {
    slug: "cafemama",
    name: "Café Mama & Sons",
    tagline: "Filipino × Japanese Café",
    cuisine: "Café · Bakery",
    description:
      "A Filipino-Japanese café and bakery known for ube and matcha pastries — covered by BBC Good Food, Forbes and Time Out.",
    location: "Kentish Town, London",
    image: "/images/cafemama.jpg",
    logo: "/logo/cafemama.png",
    website: "https://www.cafemamasons.com/",
    bookable: false,
    menuPages: [
      "/menu/cafemama/page-1.png",
      "/menu/cafemama/page-2.png",
      "/menu/cafemama/page-3.png",
      "/menu/cafemama/page-4.png",
    ],
    menuLabel: "February 2026",
  },
  {
    slug: "belly",
    name: "Belly",
    tagline: "Modern Filipino Bistro",
    cuisine: "Filipino · Bistro",
    description:
      "A Kentish Town bistro reading Filipino flavour through a French lens — featured in the Michelin Guide and reviewed by Giles Coren in The Times.",
    location: "Kentish Town, London",
    addresses: [
      { street: "157 Kentish Town Rd", locality: "London", postcode: "NW1 8PD" },
    ],
    image: "/images/belly3.jpg",
    logo: "/logo/belly.png",
    website: "https://www.bellylondon.com/",
    menuPages: [
      "/menu/belly/food.png",
      "/menu/belly/drinks-1.png",
    ],
    menuLabel: "February 2026",
    bookable: true,
    bookingUrl: "https://booking.resdiary.com/widget/Standard/BELLYBISTRO/65884",
  },
  {
    slug: "bunso",
    name: "Bunso",
    tagline: "The Youngest of the Family",
    cuisine: "Filipino",
    description:
      "Bunso — 'the youngest' — is the newest member of the Maginhawa family. Full details, menu and location coming soon.",
    location: "Kentish Town, London",
    /* `-shopfront`, because Cloudinary public ids drop the extension: this
       was /images/bunso.jpg, which collided with the /images/bunso.png
       wordmark About.tsx uses and resolved to the same
       `maginhawa/images/bunso`. The PNG held the id, so every surface
       asking for the photo got a 670x141 wordmark instead. See the longer
       note on the same field in lib/venueCards.ts. */
    image: "/images/bunso-shopfront.jpg",
    logo: "/logo/bunso.png",
    website: "https://www.bybunso.com/",
    bookable: false,
    comingSoon: true,
  },
];

export const getRestaurant = (slug: string) =>
  RESTAURANTS.find((r) => r.slug === slug);

/**
 * THE ONE THING A READER CAN DO FROM A TILE, chosen by what the venue is.
 *
 * The grid used to hand an inline pill only to the four rooms that take
 * reservations. Mamasons, Hoodwood, Café Mama and Bunso — the parlour, the
 * takeaway, the café and the new one — got a photograph and a neighbourhood
 * and nothing to press. Half the collective the group is NAMED for read as
 * lesser rooms on first scan, and the closing section reinforced it by
 * transacting only the bookable four.
 *
 * A venue whose job is walk-in does not want a Book button; it wants to tell
 * you where it is and when it is open. So the action is derived from the
 * venue rather than bolted on: every tile now carries exactly one, and which
 * one is a fact about the restaurant.
 *
 * ⚠️ `Visit` IS A HOLDING LABEL for the three walk-in venues, and it points
 * at their own sites because that is the only destination their data
 * currently supports. The intended labels are `Order` for Hoodwood and
 * `Find us` for Mamasons and Café Mama — both are blocked, and on data
 * rather than on code:
 *   — `Order` asserts that hoodwood.co.uk sells online. Nobody has checked,
 *     and a button that promises ordering and delivers a homepage is worse
 *     than one that says Visit.
 *   — `Find us` has to show a street address and today's hours. Only the
 *     four bookable venues carry `addresses`, and no venue carries hours at
 *     all (see DESIGN-PLAN.md decision 3).
 * Fill those two gaps and this function is where the labels change — once,
 * for every surface that renders a tile.
 */
export type VenueAction = {
  label: string;
  href: string;
  /** external destinations open in a new tab and get rel="noopener" */
  external: boolean;
};

export function primaryAction(r: Restaurant): VenueAction | null {
  // not open yet — say so plainly rather than inviting a visit to a door
  // that is not there. Bunso's own site is the only place with news.
  if (r.comingSoon)
    return r.website
      ? { label: "Opening soon", href: r.website, external: true }
      : null;

  if (r.bookable && r.bookingUrl)
    return { label: "Book", href: r.bookingUrl, external: true };

  if (r.website) return { label: "Visit", href: r.website, external: true };

  /* NO BOOKING HOST AND NO SITE OF THEIR OWN — AND NOW NO PAGE HERE EITHER.
     This used to fall back to `/restaurants/<slug>`, the group's own detail
     page for the venue, which carried the menu. That route is gone, so the
     honest answer is that there is no single destination for this venue and
     the tile prints no action rather than a control that goes somewhere
     approximate.

     It is not a dead branch waiting to be deleted: every venue on file today
     has a `website`, so nothing hits it, and the moment one does not, the
     failure mode should be a missing pill rather than a wrong one. The menu
     is unaffected — it is an overlay the card opens in place, not a link. */
  return null;
}


// map the showcase's display name → canonical slug, since the carousel uses
// "Café Mama & Sons" / "Ramo Ramen" etc. as keys
export const SLUG_BY_NAME: Record<string, string> = {
  Belly: "belly",
  "Café Mama & Sons": "cafemama",
  Mamasons: "mamasons",
  Bintang: "bintang",
  Guanabana: "guanabana",
  "Ramo Ramen": "ramo",
  Hoodwood: "hoodwood",
  Bunso: "bunso",
};
