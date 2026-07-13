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
  addresses?: { street: string; locality: string; postcode: string }[];
  image: string;
  logo: string;
  url?: string;
  bookable: boolean;
  priceRange?: string;
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

// const ITEMS: DiscoverItem[] = [
//   {
//     slug: "bintang",
//     name: "Bintang",
//     tag: "Filipino Fusion Restaurant",
//     location: "93 Kentish Town Rd, London NW1 8NY",
//     image: "/images/bintang.jpg",
//     logo: "/logo/bintang.png",
//     menuPages: [
//       "/menu/bintang/bintang_menu-1.png",
//       "/menu/bintang/bintang_menu-2.png",
//     ],
//     menuLabel: "February 2026",
//     blurb:
//       "A Camden staple since 1987 — Chef Omar's family kitchen, blending Malay, Indonesian, Japanese, Vietnamese and Filipino cooking.",
//   },
//   {
//     slug: "belly",
//     name: "Belly",
//     tag: "Modern Filipino Bistro",
//     location: "157 Kentish Town Rd, London NW1 8PD",
//     image: "/images/belly.jpg",
//     logo: "/logo/belly.png",
//     menuPages: [
//       "/menu/belly/food.png",
//       "/menu/belly/drinks-1.png",
//     ],
//     menuLabel: "February 2026",
//     // Belly is the group's Michelin Guide listing — the mark renders as part
//     // of the centered brand group so it stays visible at rest AND expanded.
//     badge: "/logo/michelin-2026-round.png",
//     badgeLabel: "Michelin Selected Restaurant 2026",
//     blurb: "A modern Filipino bistro drawing on French technique.",
//   },
//   {
//     slug: "mamasons",
//     name: "Mamasons",
//     tag: "London's First Filipino Ice Cream Parlor",
//     location: "91 Kentish Town Rd · 32 Newport China Town",
//     image: null,
//     logo: "/logo/mamasons.png",
//     blurb:
//       "London's first Filipino ice cream parlour — Manila-style dirty ice cream, scooped fresh across two sites.",
//   },
//   {
//     slug: "cafemama",
//     name: "Café Mama & Sons",
//     tag: "Filipino x Japanese Café",
//     location: "83 Kentish Town Rd, London NW1 8NY",
//     image: "/images/cafemama.jpg",
//     logo: "/logo/cafemama.png",
//     menuPages: [
//       "/menu/cafemama/page-1.png",
//       "/menu/cafemama/page-2.png",
//       "/menu/cafemama/page-3.png",
//       "/menu/cafemama/page-4.png",
//     ],
//     menuLabel: "February 2026",
//     blurb:
//       "Hand-crafted sandos, all-day pandesal breakfasts, homemade baked treats, and quality coffee — your daily escape from the ordinary.",
//   },
//   {
//     slug: "guanabana",
//     name: "Guanabana",
//     tag: "Caribbean Cuisine",
//     location: "85 Kentish Town Rd, London NW1 8NY",
//     image: "/images/guanabana.jpg",
//     logo: "/logo/guanabana.png",
//     blurb:
//       "Kentish Town's Caribbean and Latin American room, best known for its oak-smoked Island Roast — since 2007.",
//   },
//   {
//     slug: "ramo",
//     name: "Ramo Ramen",
//     tag: "Filipino-Japanese Ramen",
//     location: "28 Brewer St, Soho, London W1F 0SR",
//     image: "/images/ramo.jpg",
//     logo: "/logo/ramo.png",
//     menuPages: [
//       "/menu/ramo/lunch-1.png",
//       "/menu/ramo/alacarte.png",
//       "/menu/ramo/groupset.png",
//       "/menu/ramo/drinks-1.png",
//       "/menu/ramo/drinks-2.png",
//     ],
//     menuLabel: "February 2026",
//     blurb:
//       "The world's first Filipino-Japanese ramen joint — Originally from Kentish Town, since 2018, with our current location in Soho.",
//   },
//   {
//     slug: "hoodwood",
//     name: "Hoodwood",
//     tag: "Caribbean Takeaway",
//     location: "81 Kentish Town Rd, London NW1 8NY",
//     image: "/images/hoowood.jpg",
//     logo: "/logo/hoodwood.png",
//     blurb:
//       "Oak-smoked jerk plates and handmade patties, fire-kissed over an open flame — Caribbean takeaway, done honestly.",
//   },
//   {
//     // Coming-soon placeholder — no photography or mark yet, so the tile
//     // renders a typographic wordmark on a maroon field instead.
//     slug: "bunso",
//     name: "Bunso",
//     tag: "The Youngest of the Family",
//     location: "1a Hawley Rd, London NW1 8RP",
//     image: null,
//     logo: "/images/bunso.png",
//     blurb:
//       "Bunso — 'the youngest' — is the newest member of the Maginhawa family. Full details, menu and location coming soon.",
//   },
// ];

export const RESTAURANTS: Restaurant[] = [
  {
    slug: "belly",
    name: "Belly",
    tagline: "Modern Filipino Bistro",
    cuisine: "Filipino · Bistro",
    description:
      "A Kentish Town bistro reading Filipino flavour through a French lens — featured in the Michelin Guide and reviewed by Giles Coren in The Times.",
    location: "Kentish Town, London",
    image: "/images/belly.jpg",
    logo: "/logo/belly.png",
    menuPages: [
      "/menu/belly/food.png",
      "/menu/belly/drinks-1.png",
    ],
    menuLabel: "February 2026",
    bookable: true,
    priceRange: "££",
  },
  {
    slug: "cafemama",
    name: "Café Mama & Sons",
    tagline: "Filipino × Japanese Café",
    cuisine: "Café · Bakery",
    description:
      "A Filipino-Japanese café and bakery known for ube and matcha pastries — covered by BBC Good Food, Forbes and Time Out.",
    location: "London",
    image: "/images/cafemama.jpg",
    logo: "/logo/cafemama.png",
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
    slug: "mamasons",
    name: "Mamasons",
    tagline: "Filipino Ice Cream Parlour",
    cuisine: "Ice Cream Parlour",
    description:
      "London's original Filipino ice-cream parlour — ube, queso, dirty ice-cream rolled in pandesal.",
    location: "Camden · Soho, London",
    image: "/images/mamasons-placeholder.jpg",
    logo: "/logo/mamasons.png",
    bookable: false,
  },
  {
    slug: "bintang",
    name: "Bintang",
    tagline: "Filipino Fusion Restaurant",
    cuisine: "Filipino · Fusion",
    description:
      "A Camden mainstay pairing Filipino classics with a fusion kitchen — long-standing favourite of the Maginhawa family.",
    location: "Camden, London",
    image: "/images/bintang.jpg",
    logo: "/logo/bintang.png",
    menuPages: [
      "/menu/bintang/bintang_menu-1.png",
      "/menu/bintang/bintang_menu-2.png",
    ],
    menuLabel: "February 2026",
    bookable: true,
    priceRange: "££",
  },
  {
    slug: "guanabana",
    name: "Guanabana",
    tagline: "Caribbean Cuisine",
    cuisine: "Caribbean",
    description:
      "Kentish Town's neighbourhood Caribbean kitchen — bold, generous, and unmistakably London.",
    location: "Kentish Town, London",
    image: "/images/guanabana.jpg",
    logo: "/logo/guanabana.png",
    bookable: true,
    priceRange: "££",
  },
  {
    slug: "ramo",
    name: "Ramo Ramen",
    tagline: "Filipino-Japanese Ramen",
    cuisine: "Ramen · Filipino",
    description:
      "Filipino-Japanese ramen in Kentish Town and Soho — a tight bowl-led menu with deep, layered broths.",
    location: "Kentish Town · Soho, London",
    image: "/images/ramo.jpg",
    logo: "/logo/ramo.png",
    menuPages: [
      "/menu/ramo/lunch-1.png",
      "/menu/ramo/alacarte.png",
      "/menu/ramo/groupset.png",
      "/menu/ramo/drinks-1.png",
      "/menu/ramo/drinks-2.png",
    ],
    menuLabel: "February 2026",
    bookable: true,
    priceRange: "££",
  },
  {
    slug: "hoodwood",
    name: "Hoodwood",
    tagline: "Caribbean Takeaway",
    cuisine: "Caribbean · Takeaway",
    description:
      "Caribbean takeaway with pies named among London's best by City AM during British Pie Week.",
    location: "London",
    image: "/images/hoowood.jpg",
    logo: "/logo/hoodwood.png",
    bookable: false,
  },
  {
    slug: "bunso",
    name: "Bunso",
    tagline: "The Youngest of the Family",
    cuisine: "Filipino",
    description:
      "Bunso — 'the youngest' — is the newest member of the Maginhawa family. Full details, menu and location coming soon.",
    location: "London",
    image: "/images/bunso-placeholder.jpg",
    logo: "/logo/bunso.png",
    bookable: false,
    comingSoon: true,
  },
];

export const getRestaurant = (slug: string) =>
  RESTAURANTS.find((r) => r.slug === slug);

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
