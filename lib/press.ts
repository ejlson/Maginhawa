// Press coverage, distilled from the Maginhawa Group Coverage Tracker.
// Used by the home page "As Featured In" strip, by per-restaurant detail
// pages, and as the basis for Schema.org NewsArticle / Review references.
// Keep ordering loosely chronological (newest first) within each restaurant.

export type PressMention = {
  outlet: string;
  feature: string;
  quote?: string;
  date: string; // dd.mm.yy as in the source tracker
  url: string;
  restaurants: string[]; // slugs
  // Optional bespoke hover image for the Awards & Recognition rows on the
  // About page. When absent, the row falls back to its first credited
  // restaurant's canonical photo (see About.tsx, which also skips
  // known-missing placeholder paths so a broken image can never render).
  image?: string;
};

// Outlets shown in the "As Seen In" wall on the home page. These are the
// recognisable mastheads — each shouts credibility on its own.
// `logo` points at the real SVG marks in `/public/press-logo/`.
//
// ── `scale` IS MEASURED, NOT CHOSEN. Read this before touching a number. ──
//
// THE PROBLEM IT SOLVES. PressWall gives every masthead the same SEAT and
// fills it with `height: 100%`, which equalises the BOXES. It does not
// equalise the INK. Every file in /public/press-logo is a Figma export of a
// raster PNG wrapped in `<svg><rect fill=pattern>`, and each was cropped by
// a different hand: timeout.svg is a 3840x2160 frame with a small wordmark
// floating in the middle of it, metro.svg a 1516x842 frame likewise, while
// hypebeast.svg is trimmed hard to the letterforms. On one seat height those
// three draw ink 47.7%, 42.3% and 100% of the box. That is the whole of "the
// logos look different sizes", and it is why hand-guessed multipliers never
// converged — The Independent ran an effective 2.16x and still read as one
// of the smallest marks in the row.
//
// THE METHOD. Each SVG is drawn into a canvas in Chrome at a 600px box
// height and every pixel classified as ink or ground (opaque enough to
// occlude AND, premultiplied onto paper, darker than 229/255); `inkRatio`
// below is the height of the resulting bounding box over the box height.
// Rendered ink = seatHeight x inkRatio, so `scale = 1 / inkRatio` puts every
// mark's ink on the same height. scripts/probe-press-ink.mjs re-measures it;
// scripts/probe-press-lane.mjs measures what actually reaches the screen.
//
// THE RULE FOR STACKED LOCKUPS. Two marks are two lines of type, not one:
// The Guardian ("The" over "Guardian") and Country & Townhouse ("COUNTRY &
// TOWN" over "HOUSE"). Matching their TOTAL ink to the row would set their
// letters at 56% and 73% of everyone else's; matching their DOMINANT LINE
// would stand the lockup 1.8x and 1.4x taller than every neighbour. Neither
// is right, so they take the geometric mean of the two rules —
// `scale = 1 / sqrt(total x dominant)` — and end up a little taller than the
// row with letters a little smaller, which is how a stacked masthead sits on
// a press wall. Measured dominant lines: Guardian 0.561 (the "Guardian" line
// alone, sampled in the columns where "The" is not), HOUSE 0.727.
//
// BBC GOOD FOOD IS NOT ONE OF THEM, though it looks like it. Measured, the
// "BBC" badge tops out at row 111 of 900 and so does the "d/f" ascender of
// "goodfood" — the badge sits beside the ascenders, not above them, and the
// mark's ink extent is one line's ascender-to-descender. It takes the plain
// rule.
//
//   outlet                inkRatio  rule                    scale
//   The Sunday Times        0.902   1/r                     1.109
//   Michelin Guide          1.000   1/r, +15% (see below)   1.150
//   The Guardian            1.000   1/sqrt(1.000 x 0.561)   1.335
//   The Independent         0.695   1/r                     1.439
//   BBC Good Food           0.782   1/r                     1.279
//   Time Out                0.477   1/r                     2.098
//   Forbes                  0.922   1/r                     1.085
//   Evening Standard        0.953   1/r                     1.049
//   The Week                0.627   1/r                     1.596
//   Metro                   0.423   1/r                     2.362
//   Country & Townhouse     1.000   1/sqrt(1.000 x 0.727)   1.173
//   The Infatuation         1.000   1/r                     1.000
//   Hypebeast               1.000   1/r                     1.000
//   That's Up               0.680   1/r                     1.471
//
// THE ONE JUDGEMENT CALL, stated so it is not mistaken for a measurement.
// Michelin is the only mark here that is not type: a solid rosette on a
// 0.91:1 box, so at equal ink height it is a ~26x24px dot standing next to a
// 223px-wide "THE TIMES". Equal height is not equal presence for a lone
// symbol, and it read as the smallest thing in the lane at 1.000. It carries
// +15%. Everything else in the column above is arithmetic.
//
// TWO THINGS THIS CANNOT FIX, both measured, neither a reason to re-guess a
// number. (1) The Times' royal crest is taller than its own capitals, so
// with the lockup on the common height the letters of "THE TIMES" run at
// 77% of the row's — the crest is part of the mark and it is what makes the
// lockup tall. (2) metro.svg's ink sits 6.6% of its box ABOVE that box's
// centre, and the lane centres BOXES, so Metro floats ~4px high; correcting
// that needs the asset re-cropped, not a multiplier.
export const FEATURED_OUTLETS: {
  name: string;
  tier?: "headline";
  logo?: string;
  scale?: number;
}[] = [
  { name: "The Sunday Times", tier: "headline", logo: "/press-logo/thesundaytimes.svg", scale: 1.109 },
  { name: "Michelin Guide", tier: "headline", logo: "/press-logo/michelin.svg", scale: 1.15 },
  { name: "The Guardian", logo: "/press-logo/theguardian.svg", scale: 1.335 },
  { name: "The Independent", logo: "/press-logo/theindependent.svg", scale: 1.439 },
  { name: "BBC Good Food", logo: "/press-logo/bbcgoodfood.svg", scale: 1.279 },
  { name: "Time Out", logo: "/press-logo/timeout.svg", scale: 2.098 },
  { name: "Forbes", logo: "/press-logo/forbes.svg", scale: 1.085 },
  { name: "Evening Standard", logo: "/press-logo/eveningstandard.svg", scale: 1.049 },
  { name: "The Week", logo: "/press-logo/theweek.svg", scale: 1.596 },
  { name: "Metro", logo: "/press-logo/metro.svg", scale: 2.362 },
  { name: "Country & Townhouse", logo: "/press-logo/country-townhouse.svg", scale: 1.173 },
  { name: "The Infatuation", logo: "/press-logo/infatuation.svg", scale: 1 },
  { name: "Hypebeast", logo: "/press-logo/hypebeast.svg", scale: 1 },
  { name: "That's Up", logo: "/press-logo/thatsup.svg", scale: 1.471 },
];

// Standout pull-quotes for the headline strip (rotates beneath the logos).
export const HIGHLIGHT_QUOTES: { quote: string; source: string; restaurant?: string }[] = [
  {
    quote: "Filipino soul with bistro swagger.",
    source: "The Arcadia",
    restaurant: "belly",
  },
  {
    quote: "Among the five best new London restaurants of 2025.",
    source: "Time Out",
    restaurant: "belly",
  },
  {
    quote: "Added to the Michelin Guide.",
    source: "Ham & High",
    restaurant: "belly",
  },
  {
    quote: "Among London's best bakeries.",
    source: "BBC Good Food",
    restaurant: "cafemama",
  },
  {
    quote: "A French bistro serving Filipino flavour bombs.",
    source: "London on The Inside",
    restaurant: "belly",
  },
  {
    quote: "Named among London's eleven best pies.",
    source: "City AM",
    restaurant: "hoodwood",
  },
];

// The home page "In the Press" INDEX — stacked hairline rows like a
// magazine's citations page: outlet, year, one-line quote, link. A curated
// cut of PRESS (the strongest, most recognisable citations), ordered for
// rhythm rather than strict chronology. Years marked with a trailing "?"
// in the tracker are best guesses pending confirmation.
export const PRESS_INDEX: {
  outlet: string;
  year: string;
  quote: string;
  url: string;
}[] = [
  {
    outlet: "The Times",
    year: "2025",
    quote: "Giles Coren reviews Belly — Filipino flavour through a French bistro lens.",
    url: "https://www.thetimes.com/life-style/food-drink/article/giles-coren-belly-restaurant-review-rvt2qpzs2",
  },
  {
    outlet: "Michelin Guide",
    year: "2026",
    quote: "Belly, added to the Michelin Guide for Greater London.",
    url: "https://guide.michelin.com/tw/en/greater-london/london/restaurant/belly",
  },
  {
    outlet: "Time Out",
    year: "2025",
    quote: "Among the five best new London restaurants of 2025.",
    url: "https://www.timeout.com/london/news/the-5-best-new-london-restaurants-that-opened-in-2025-121825",
  },
  {
    outlet: "BBC Good Food",
    year: "2025",
    quote: "Café Mama & Sons, named among London's best bakeries.",
    url: "https://www.bbcgoodfood.com/travel/best-bakeries-in-london",
  },
  {
    outlet: "London on The Inside",
    year: "2025",
    quote: "A French bistro serving Filipino flavour bombs.",
    url: "https://londontheinside.com/belly-review-the-french-bistro-serving-filipino-flavour-bombs/",
  },
  {
    outlet: "The Week",
    year: "2025",
    quote: "Listed among the best restaurants in London.",
    url: "https://theweek.com/culture-life/food-drink/the-best-restaurants-in-london",
  },
  {
    outlet: "City AM",
    year: "2026",
    quote: "Hoodwood — among London's eleven best pies.",
    url: "https://www.cityam.com/the-11-best-pies-in-london-to-eat-during-british-pie-week/",
  },
  {
    outlet: "Forbes",
    year: "2026",
    quote: "Where to eat and drink in London this Valentine's Day.",
    url: "https://www.forbes.com/sites/rachel-dube/2026/02/11/left-it-late-where-to-eat-and-drink-in-london-for-valentines-day-2026/",
  },
];

export const PRESS: PressMention[] = [
  // ---------- Belly ----------
  {
    outlet: "The Times",
    feature: "Giles Coren review",
    quote:
      "Giles Coren reviews Belly — a Kentish Town newcomer reading Filipino flavour through a French bistro lens.",
    date: "—",
    url: "https://www.thetimes.com/life-style/food-drink/article/giles-coren-belly-restaurant-review-rvt2qpzs2",
    restaurants: ["belly"],
  },
  {
    outlet: "Michelin Guide",
    feature: "Added to the Michelin Guide",
    quote: "Belly added to the Michelin Guide — Kentish Town, London.",
    date: "—",
    url: "https://www.hamhigh.co.uk/news/25825878.kentish-town-restaurant-belly-added-michelin-guide/",
    restaurants: ["belly"],
  },
  {
    outlet: "The Independent",
    feature: "A Great British Culinary Tour",
    date: "—",
    url: "https://www.independent.co.uk/travel/travel-holiday-britain-cuisine-restaurants-b2773101.html",
    restaurants: ["belly"],
  },
  {
    outlet: "Time Out",
    feature: "The 5 Best New London Restaurants of 2025",
    quote: "Belly named among Time Out's five best new London openings of 2025.",
    date: "—",
    url: "https://www.timeout.com/london/news/the-5-best-new-london-restaurants-that-opened-in-2025-121825",
    restaurants: ["belly", "cafemama"],
  },
  {
    outlet: "Evening Standard",
    feature: "Kentish Town Area Guide",
    date: "—",
    url: "https://www.standard.co.uk/homesandproperty/where-to-live/kentish-town-area-guide-b1271538.html",
    restaurants: ["belly"],
  },
  {
    outlet: "The Observer",
    feature: "Filipino baked goods are hot cakes",
    date: "—",
    url: "https://observer.co.uk/style/food/article/filipino-baked-goods-hot-cakes-fusion-food",
    restaurants: ["belly"],
  },
  {
    outlet: "The Week",
    feature: "The best restaurants in London",
    date: "—",
    url: "https://theweek.com/culture-life/food-drink/the-best-restaurants-in-london",
    restaurants: ["belly"],
  },
  {
    outlet: "Sainsbury's Magazine",
    feature: "Taking orders: Belly",
    date: "—",
    url: "https://www.sainsburysmagazine.co.uk/lifestyle/food/taking-orders-belly-london",
    restaurants: ["belly"],
  },
  {
    outlet: "Square Meal",
    feature: "Belly — full review",
    date: "—",
    url: "https://www.squaremeal.co.uk/restaurants/belly_27399",
    restaurants: ["belly"],
  },
  {
    outlet: "Olive Magazine",
    feature: "Best new restaurants in London",
    date: "—",
    url: "https://www.olivemagazine.com/restaurants/london/best-new-restaurants-in-london/",
    restaurants: ["belly"],
  },
  {
    outlet: "London on The Inside",
    feature: "The French bistro serving Filipino flavour bombs",
    quote: "A French bistro serving Filipino flavour bombs.",
    date: "—",
    url: "https://londontheinside.com/belly-review-the-french-bistro-serving-filipino-flavour-bombs/",
    restaurants: ["belly"],
  },
  {
    outlet: "Visit London",
    feature: "Best things to do in Camden Town",
    date: "—",
    url: "https://www.visitlondon.com/things-to-do/london-areas/camden-town/things-to-do-camden-town",
    restaurants: ["belly"],
  },
  {
    outlet: "The Arcadia",
    feature: "Belly, Kentish Town — Filipino soul with bistro swagger",
    quote: "Filipino soul with bistro swagger.",
    date: "01.12.25",
    url: "https://www.thearcadiaonline.com/belly-kentish-town-filipino-soul-with-bistro-swagger/",
    restaurants: ["belly"],
  },

  // ---------- Café Mama & Sons ----------
  {
    outlet: "BBC Good Food",
    feature: "Best Bakeries in London",
    date: "—",
    url: "https://www.bbcgoodfood.com/travel/best-bakeries-in-london",
    restaurants: ["cafemama"],
  },
  {
    outlet: "Forbes",
    feature: "Where to eat and drink in London for Valentine's Day 2026",
    date: "—",
    url: "https://www.forbes.com/sites/rachel-dube/2026/02/11/left-it-late-where-to-eat-and-drink-in-london-for-valentines-day-2026/",
    restaurants: ["cafemama"],
  },
  {
    outlet: "MSN",
    feature: "Heart-shaped croissants for Valentine's Day",
    date: "—",
    url: "https://www.msn.com/en-gb/lifestyle/lifestylegeneral/london-bakery-drops-heart-shaped-croissants-for-valentine-s-day/ar-AA1VvCK0",
    restaurants: ["cafemama"],
  },
  {
    outlet: "Design My Night",
    feature: "The rise of hojicha in the UK",
    date: "—",
    url: "https://www.designmynight.com/uk/blog/the-rise-of-hojicha-uk",
    restaurants: ["cafemama"],
  },
  {
    outlet: "My London",
    feature: "Best Valentine's Day 2026 spots in London",
    date: "—",
    url: "https://www.mylondon.news/whats-on/best-valentines-day-2026-london-33370460",
    restaurants: ["cafemama"],
  },
  {
    outlet: "Secret London",
    feature: "London Marathon 2026 freebies",
    date: "—",
    url: "https://secretldn.com/2026-london-marathon-freebies/",
    restaurants: ["cafemama"],
  },

  // ---------- Hoodwood ----------
  {
    outlet: "City AM",
    feature: "The 11 best pies in London — British Pie Week",
    quote: "Named among London's eleven best pies for British Pie Week.",
    date: "—",
    url: "https://www.cityam.com/the-11-best-pies-in-london-to-eat-during-british-pie-week/",
    restaurants: ["hoodwood"],
  },
  {
    outlet: "British Baker",
    feature: "Hoodwood feature",
    date: "—",
    url: "https://bakeryinfo.co.uk/",
    restaurants: ["hoodwood"],
  },
  {
    outlet: "The Upcoming",
    feature: "Hoodwood review",
    date: "—",
    url: "https://www.theupcoming.co.uk/",
    restaurants: ["hoodwood"],
  },

  // ---------- Group ----------
  {
    outlet: "Metro",
    feature: "Valentine's Day in London",
    date: "—",
    url: "https://metro.co.uk/2026/02/05/a-london-italian-restaurant-luxurious-pasta-dishes-guaranteed-fill-just-opened-26721516/",
    restaurants: ["belly", "cafemama"],
  },
  {
    outlet: "Ham & High",
    feature: "Kentish Town restaurant Belly added to Michelin Guide",
    date: "—",
    url: "https://www.hamhigh.co.uk/news/25825878.kentish-town-restaurant-belly-added-michelin-guide/",
    restaurants: ["belly"],
  },
];

export const pressForRestaurant = (slug: string) =>
  PRESS.filter((p) => p.restaurants.includes(slug));
