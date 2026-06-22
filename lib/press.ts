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
};

// Outlets shown in the "As Featured In" strip on the home page. These are the
// recognisable mastheads — each shouts credibility on its own.
export const FEATURED_OUTLETS: { name: string; tier?: "headline" }[] = [
  { name: "The Times", tier: "headline" },
  { name: "Michelin Guide", tier: "headline" },
  { name: "The Independent" },
  { name: "BBC Good Food" },
  { name: "Time Out" },
  { name: "Forbes" },
  { name: "The Observer" },
  { name: "Evening Standard" },
  { name: "The Week" },
  { name: "Metro" },
  { name: "Square Meal" },
  { name: "Olive Magazine" },
  { name: "City AM" },
  { name: "Visit London" },
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
    restaurants: ["belly"],
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
