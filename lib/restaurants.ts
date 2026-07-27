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
  // The restaurant's own public website — the Visit actions open this in a
  // new tab; the internal detail pages stay reachable via the footer.
  website?: string;
  bookable: boolean;
  bookingUrl?: string;
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

export const RESTAURANTS: Restaurant[] = [
  {
    slug: "bintang",
    name: "Bintang",
    tagline: "Filipino Fusion Restaurant",
    cuisine: "Filipino · Fusion",
    description:
      "A Kentish Town mainstay pairing Filipino classics with a fusion kitchen — long-standing favourite of the Maginhawa family.",
    location: "Kentish Town, London",
    image: "/images/bintang.jpg",
    logo: "/logo/bintang.png",
    website: "https://www.bintangrestaurant.co.uk/",
    menuPages: [
      "/menu/bintang/bintang_menu-1.png",
      "/menu/bintang/bintang_menu-2.png",
    ],
    menuLabel: "February 2026",
    bookable: true,
    priceRange: "££",
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
    image: "/images/guanabana.jpg",
    logo: "/logo/guanabana.png",
    website: "https://www.guanabanarestaurant.com/",
    bookable: true,
    priceRange: "££",
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
    image: "/images/mamasons-placeholder.jpg",
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
    image: "/images/ramo.jpg",
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
    priceRange: "££",
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
    image: "/images/belly.jpg",
    logo: "/logo/belly.png",
    website: "https://www.bellylondon.com/",
    menuPages: [
      "/menu/belly/food.png",
      "/menu/belly/drinks-1.png",
    ],
    menuLabel: "February 2026",
    bookable: true,
    bookingUrl: "https://booking.resdiary.com/widget/Standard/BELLYBISTRO/65884",
    priceRange: "££",
  },
  {
    slug: "bunso",
    name: "Bunso",
    tagline: "The Youngest of the Family",
    cuisine: "Filipino",
    description:
      "Bunso — 'the youngest' — is the newest member of the Maginhawa family. Full details, menu and location coming soon.",
    location: "Kentish Town, London",
    image: "/images/bunso-placeholder.jpg",
    logo: "/logo/bunso.png",
    website: "https://www.bybunso.com/",
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
