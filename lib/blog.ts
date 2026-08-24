// Blog feed for Maginhawa Group — the CURATED half of it.
//
//  · "post"   entries are our own writing. They are NOT listed here: they
//              live as markdown files in content/posts/ and are folded into
//              this feed by lib/posts.ts at build time. See that file.
//  · "native" entries are stories about the group published on a venue's
//              own site or channel — Bintang's blog, a creator's TikTok.
//              ⚠️ The name is older than the meaning: these still link OUT.
//              What makes one "native" is authorship, not the hostname.
//  · "press"  entries are external coverage drawn from the group's press
//              tracker.
//
// Sorted newest first.

export type BlogEntry = {
  slug: string;
  title: string;
  date: string; // ISO yyyy-mm-dd for reliable sorting
  dateLabel: string; // pretty label rendered in the UI
  excerpt: string;
  source: string; // outlet / author of the piece
  url: string; // external link to the article
  image: string; // path under /public
  restaurant?: string; // restaurant slug, where applicable
  category: "feature" | "review" | "news" | "inclusion";
  kind: "post" | "native" | "press";
};

/* ── WHERE A CARD LEADS DECIDES HOW IT OPENS ──
   Every entry in THIS file carries an absolute URL to somebody else's site,
   so every card that renders one has always been an
   `<a target="_blank" rel="noopener noreferrer">`. Our own posts arrive in
   the same feed carrying a ROOT-RELATIVE path (`/blog/<slug>`), and sending
   a reader to our own page in a new tab would be a small lie about where
   they are going — it is the same site, and the browser's back button is
   the thing they will reach for.

   ⚠️ `rel` IS NOT DECORATION ON A `target="_blank"`. Without it the opened
   page gets a handle on this one through `window.opener`. The two belong
   together, which is the second reason they are handed out as a pair rather
   than typed at each of the three call sites.

   Kept here rather than in a component because BOTH card surfaces need it —
   components/Blog.tsx on the home page, components/BlogIndex.tsx on /blog —
   and two copies of one predicate is how the two surfaces start disagreeing
   about what an internal link is. */
export const entryLinkProps = (entry: BlogEntry) =>
  /^https?:\/\//.test(entry.url)
    ? ({ target: "_blank", rel: "noopener noreferrer" } as const)
    : {};

/* ═══ THE HEADLINE A CARD PRINTS — the outlet, then the story ═══
   "Forbes: last-minute Valentine's guide picks Café Mama & Sons". On a feed
   where every entry links OUT, the masthead is the credential: "Forbes"
   earns attention and "11 Feb 2026" does not, so the outlet leads the
   headline and the date goes on the photograph.

   ⚠️ THE PREFIX IS CONDITIONAL, and that is the whole function. Most of
   these titles ALREADY open with their outlet — "The Observer: Filipino
   baked goods…", "Forbes' last-minute Valentine's guide…". Prefixing
   unconditionally would print the outlet twice on every one of them. Only
   a handful actually need it, which is exactly the ratio that makes an
   unguarded version look fine in one card and wrong in four.

   The test is a case-insensitive PREFIX match rather than an exact one so
   that a possessive ("Forbes'") still counts as the outlet having led.

   Kept here rather than in a component for the reason entryLinkProps is —
   both card surfaces set this string now: the home page's strip and /blog's
   archive grid. */
export function headline(entry: BlogEntry) {
  const t = entry.title.trim();
  const s = entry.source.trim();
  return t.toLowerCase().startsWith(s.toLowerCase()) ? t : `${s}: ${t}`;
}

// Hand-picked coverage: the strongest entries from the press tracker plus
// the stories the venues published themselves. Easy to extend — add an
// object, the UI orders the feed by date.
//
// ⚠️ OUR OWN POSTS DO NOT GO HERE. They are markdown files in content/posts/
// and lib/posts.ts folds them in; adding one to this array by hand would
// give it a card with no page behind it.
export const BLOG: BlogEntry[] = [
  // ----- published by the venues themselves (still off-site links) -----
  {
    slug: "bintang-clarified-ube-colada",
    title: "London's best new cocktail: BINTANG's Clarified Ube Colada",
    date: "2023-11-11",
    dateLabel: "11 Nov 2023",
    excerpt:
      "At the heart of Bintang's cocktail menu is the Clarified Ube Colada, a signature drink that bottles the vibrant flavours and rich traditions of Filipino bartending into a single glass.",
    source: "Bintang",
    url: "https://www.bintangrestaurant.co.uk/blog/2023/9/11/londons-best-new-cocktail-bintangs-clarified-ube-colada",
    image: "/blog/DSCF2995-web.jpg",
    restaurant: "bintang",
    category: "feature",
    kind: "native",
  },
  {
    slug: "keith-lee-visits-guanabana",
    title: "Keith Lee visits Guanabana",
    date: "2025-02-01",
    dateLabel: "1 Feb 2025",
    excerpt:
      "Food critic Keith Lee dropped into Guanabana for a Sunday roast with a Caribbean twist — oak-smoked jerk chicken, sweet plantains, and a side of spicy jerk gravy.",
    source: "@keith_lee125",
    url: "https://www.tiktok.com/@keith_lee125/video/7472151494180048170",
    image: "/blog/DSCF2472-web.jpg",
    restaurant: "guanabana",
    category: "feature",
    kind: "native",
  },
  {
    slug: "cn-traveller-mamasons-halo-halo",
    title: "CN Traveller names MAMASONS' Halo Halo in London's best desserts",
    date: "2022-10-27",
    dateLabel: "27 Oct 2022",
    excerpt:
      "Mamasons' iconic Filipino halo-halo lands on CN Traveller's roundup of the eighteen desserts worth crossing London for — a glass of ube, milky shaved ice, and toppings stacked like jewellery.",
    source: "Condé Nast Traveller",
    url: "https://www.cntraveller.com/gallery/best-desserts-in-london",
    image: "/blog/DSC07739-web.jpg",
    restaurant: "mamasons",
    category: "feature",
    kind: "native",
  },

  // ----- press feed (curated from the coverage tracker) -----
  {
    slug: "olive-best-new-restaurants",
    title: "Belly named among London's best new restaurants",
    date: "2026-02-14",
    dateLabel: "14 Feb 2026",
    excerpt:
      "Olive Magazine includes Belly in its rolling round-up of the best new restaurants in London — Filipino flavour read through a French bistro lens.",
    source: "Olive Magazine",
    url: "https://www.olivemagazine.com/restaurants/london/best-new-restaurants-in-london/",
    /* a Belly story wearing a Belly photograph, derived from
       /images/belly3.jpg (6240x4160, 20MB — the blog renders through a raw
       <img>, so nothing optimises it on the way out).

       1600px LANDSCAPE, which breaks the 720x960 portrait shape the other
       post-*-web files carry, for two reasons. The source is 3:2, and the
       frames it lands in are 16/10 (the featured lede) and 16/9 (a grid
       card) — cropping a landscape photograph into a portrait derivative
       only to have `object-fit: cover` crop it back to landscape throws away
       the middle of the picture twice. And this is the NEWEST entry, so it
       is the page-1 lede at roughly 700 CSS px wide: 720px would land at
       1.03x and read soft on any retina screen, where 1600 gives 2.3x.

       (The previous file, post-olive-web.jpg, is left on disk — nothing
       points at it now.) */
    image: "/images/blog/belly3-web.jpg",
    restaurant: "belly",
    category: "feature",
    kind: "press",
  },
  {
    slug: "the-sauce-cny",
    title: "Where to spend Lunar New Year in London",
    date: "2026-02-13",
    dateLabel: "13 Feb 2026",
    excerpt:
      "The Sauce shortlists Belly's special Lunar New Year menu in its Lunar New Year dining round-up across London.",
    source: "The Sauce",
    url: "https://thesaucemag.com/chinese-new-year-london/",
    image: "/images/blog/post-cny-web.jpg",
    restaurant: "belly",
    category: "feature",
    kind: "press",
  },
  {
    slug: "forbes-valentines",
    title: "Forbes' last-minute Valentine's guide picks Café Mama & Sons",
    date: "2026-02-11",
    dateLabel: "11 Feb 2026",
    excerpt:
      "Forbes' Rachel Dube includes Café Mama & Sons in her guide to where to eat and drink in London for Valentine's Day 2026.",
    source: "Forbes",
    url: "https://www.forbes.com/sites/rachel-dube/2026/02/11/left-it-late-where-to-eat-and-drink-in-london-for-valentines-day-2026/",
    image: "/images/blog/post-forbes-web.jpg",
    restaurant: "cafemama",
    category: "feature",
    kind: "press",
  },
  {
    slug: "my-london-valentines",
    title: "MyLondon's best Valentine's spots feature Café Mama & Sons",
    date: "2026-02-09",
    dateLabel: "9 Feb 2026",
    excerpt:
      "MyLondon rounds up the city's best places to celebrate Valentine's Day 2026 — Café Mama & Sons' heart-shaped croissants make the list.",
    source: "MyLondon",
    url: "https://www.mylondon.news/whats-on/best-valentines-day-2026-london-33370460",
    image: "/images/blog/post-mylondon-web.jpg",
    restaurant: "cafemama",
    category: "feature",
    kind: "press",
  },
  {
    slug: "observer-filipino-pastries",
    title: "The Observer: Filipino baked goods are hot cakes",
    date: "2026-02-08",
    dateLabel: "8 Feb 2026",
    excerpt:
      "The Observer surveys London's surging Filipino bakery scene — and lands on the pastries coming out of Maginhawa's kitchens.",
    source: "The Observer",
    url: "https://observer.co.uk/style/food/article/filipino-baked-goods-hot-cakes-fusion-food",
    image: "/images/blog/post-observer-web.jpg",
    restaurant: "belly",
    category: "feature",
    kind: "press",
  },
  {
    slug: "ham-and-high-michelin",
    title: "Ham & High: Kentish Town's Belly added to the Michelin Guide",
    date: "2026-02-06",
    dateLabel: "6 Feb 2026",
    excerpt:
      "Belly's Michelin Guide inclusion is the talk of Kentish Town — Ham & High covers the announcement and what it means for the neighbourhood.",
    source: "Ham & High",
    url: "https://www.hamhigh.co.uk/news/25825878.kentish-town-restaurant-belly-added-michelin-guide/",
    image: "/images/blog/post-hamhigh-web.jpg",
    restaurant: "belly",
    category: "inclusion",
    kind: "press",
  },
  {
    slug: "time-out-michelin-january",
    title: "Time Out: the ten London restaurants added to the Michelin Guide",
    date: "2026-02-03",
    dateLabel: "3 Feb 2026",
    excerpt:
      "Time Out reviews Michelin's January update — Belly sits among ten London openings recognised by the guide.",
    source: "Time Out",
    url: "https://www.timeout.com/london/news/the-10-london-restaurants-that-were-added-to-the-michelin-guide-in-january-2026-020326",
    image: "/images/blog/post-timeout-web.jpg",
    restaurant: "belly",
    category: "inclusion",
    kind: "press",
  },
  {
    slug: "msn-valentine-croissants",
    title: "MSN: London bakery drops heart-shaped croissants for Valentine's",
    date: "2026-02-03",
    dateLabel: "3 Feb 2026",
    excerpt:
      "Café Mama & Sons' Valentine's special — heart-shaped Filipino-inspired croissants — picked up by MSN's lifestyle desk.",
    source: "MSN",
    url: "https://www.msn.com/en-gb/lifestyle/lifestylegeneral/london-bakery-drops-heart-shaped-croissants-for-valentine-s-day/ar-AA1VvCK0",
    image: "/images/blog/post-msn-web.jpg",
    restaurant: "cafemama",
    category: "feature",
    kind: "press",
  },
  {
    slug: "design-my-night-hojicha",
    title: "Design My Night: the rise of hojicha in the UK",
    date: "2026-01-28",
    dateLabel: "28 Jan 2026",
    excerpt:
      "Design My Night charts hojicha's rise across UK cafés — Café Mama & Sons is named as one of the spots putting the roasted green tea on London menus.",
    source: "Design My Night",
    url: "https://www.designmynight.com/uk/blog/the-rise-of-hojicha-uk",
    image: "/blog/DSCF2298-web.jpg",
    restaurant: "cafemama",
    category: "feature",
    kind: "press",
  },
  {
    slug: "the-upcoming-cny",
    title: "The Upcoming: Chinese New Year dining specials in London",
    date: "2026-01-26",
    dateLabel: "26 Jan 2026",
    excerpt:
      "The Upcoming's Lunar New Year dining guide stops by Belly for its specials, set among London's strongest CNY menus.",
    source: "The Upcoming",
    url: "https://www.theupcoming.co.uk/2026/01/26/chinese-new-year-2026-dining-specials-in-london-restaurants/",
    image: "/blog/DSCF3015-web.jpg",
    restaurant: "belly",
    category: "feature",
    kind: "press",
  },
  {
    slug: "kentishtowner-jacket-exchange",
    title: "Kentishtowner: a jacket for a jacket — Hoodwood's winter swap",
    date: "2026-01-20",
    dateLabel: "20 Jan 2026",
    excerpt:
      "Hoodwood's Jacket Exchange returns — bring in a warm coat for London's homeless, walk out with a jerk jacket potato.",
    source: "Kentishtowner",
    url: "https://www.kentishtowner.co.uk/2026/01/20/a-jacket-for-a-jacket-help-those-most-in-need-at-hoodwood-this-month/",
    image: "/blog/DSC07056-web.jpg",
    restaurant: "hoodwood",
    category: "news",
    kind: "press",
  },
  {
    slug: "secret-london-blue-monday",
    title: "Secret London: where to eat & drink for Blue Monday",
    date: "2026-01-19",
    dateLabel: "19 Jan 2026",
    excerpt:
      "Secret London's Blue Monday round-up highlights Café Mama & Sons among the city's best deals to brighten the gloomiest day of the year.",
    source: "Secret London",
    url: "https://secretldn.com/january-deals-discounts-freebies-2026/",
    image: "/blog/DSC07739-web.jpg",
    restaurant: "cafemama",
    category: "feature",
    kind: "press",
  },
  {
    slug: "london-standard-blue-monday",
    title: "The London Standard: Blue Monday's best deals",
    date: "2026-01-18",
    dateLabel: "18 Jan 2026",
    excerpt:
      "The London Standard rounds up Blue Monday's best free and discounted treats — Café Mama & Sons is named for its January generosity.",
    source: "The London Standard",
    url: "https://www.standard.co.uk/news/uk/blue-monday-best-deals-free-b1267078.html",
    image: "/blog/DSCF2296-web.jpg",
    restaurant: "cafemama",
    category: "feature",
    kind: "press",
  },
  {
    slug: "michelin-guide-belly",
    title: "Belly enters the Michelin Guide",
    date: "2026-01-14",
    dateLabel: "14 Jan 2026",
    excerpt:
      "Belly is added to the Michelin Guide for Greater London — recognising Chef Omar's Filipino-French kitchen on Kentish Town Road.",
    source: "Michelin Guide",
    url: "https://guide.michelin.com/tw/en/greater-london/london/restaurant/belly",
    image: "/blog/DSCF3035-web.jpg",
    restaurant: "belly",
    category: "inclusion",
    kind: "press",
  },
  {
    slug: "london-standard-tiktok-tripadvisor",
    title: "The Standard: how TikTok is replacing TripAdvisor",
    date: "2026-01-13",
    dateLabel: "13 Jan 2026",
    excerpt:
      "The London Standard surveys how TikTok is replacing TripAdvisor in the way Londoners pick their next restaurant — with Belly used as a case study.",
    source: "The London Standard",
    url: "https://www.standard.co.uk/going-out/restaurants/tiktok-discover-tripadvisor-b1263048.html",
    image: "/blog/DSCF2472-web.jpg",
    restaurant: "belly",
    category: "feature",
    kind: "press",
  },
  {
    slug: "shortlist-jacket-exchange",
    title: "Shortlist: free jerk jacket potatoes for your old coat",
    date: "2026-01-07",
    dateLabel: "7 Jan 2026",
    excerpt:
      "Hoodwood's Jacket Exchange picks up national press — Shortlist covers the swap: a warm coat in, a jerk jacket potato out.",
    source: "Shortlist",
    url: "https://www.shortlist.com/food-and-drink/this-london-takeaway-is-giving-out-free-jerk-jackets-if-you-bring-a-jacket",
    image: "/blog/DSC07056-web.jpg",
    restaurant: "hoodwood",
    category: "news",
    kind: "press",
  },
  {
    slug: "the-upcoming-jacket-exchange",
    title: "Hoodwood launches the Jacket Exchange in Kentish Town",
    date: "2026-01-02",
    dateLabel: "2 Jan 2026",
    excerpt:
      "The Upcoming launches the year with Hoodwood's headline news: trade your spare coat for a free serve of Caribbean comfort food.",
    source: "The Upcoming",
    url: "https://www.theupcoming.co.uk/2026/01/02/hoodwood-launches-the-jacket-exchange-in-kentish-town-swapping-warm-coats-for-caribbean-comfort-food-to-support-londons-homeless/",
    image: "/blog/DSC07722-web.jpg",
    restaurant: "hoodwood",
    category: "news",
    kind: "press",
  },
  {
    slug: "time-out-best-new",
    title: "Time Out: the five best new London restaurants of 2025",
    date: "2025-12-18",
    dateLabel: "18 Dec 2025",
    excerpt:
      "Belly and Café Mama & Sons both appear on Time Out's roundup of the five best new restaurants London opened in 2025.",
    source: "Time Out",
    url: "https://www.timeout.com/london/news/the-5-best-new-london-restaurants-that-opened-in-2025-121825",
    image: "/blog/DSCF2995-web.jpg",
    restaurant: "belly",
    category: "feature",
    kind: "press",
  },
  {
    slug: "hot-dinners-best-new",
    title: "Hot Dinners: London's best new restaurants of 2025",
    date: "2025-12-12",
    dateLabel: "12 Dec 2025",
    excerpt:
      "Hot Dinners' yearly round-up of the city's strongest new openings — Belly takes its place among the year's biggest debuts.",
    source: "Hot Dinners",
    url: "https://www.hot-dinners.com/Features/Hot-Dinners-recommends/best-new-restaurants-london-2025",
    image: "/blog/DSC07739-web.jpg",
    restaurant: "belly",
    category: "feature",
    kind: "press",
  },
  {
    slug: "square-meal-belly",
    title: "Square Meal reviews Belly",
    date: "2025-12-12",
    dateLabel: "12 Dec 2025",
    excerpt:
      "Square Meal files its full review of Belly — Chef Omar's Filipino-French bistro on Kentish Town Road.",
    source: "Square Meal",
    url: "https://www.squaremeal.co.uk/restaurants/belly_27399",
    image: "/blog/DSCF3052-web.jpg",
    restaurant: "belly",
    category: "review",
    kind: "press",
  },
  {
    slug: "the-arcadia-belly",
    title: "The Arcadia: Belly, Kentish Town — Filipino soul with bistro swagger",
    date: "2025-12-01",
    dateLabel: "1 Dec 2025",
    excerpt:
      "The Arcadia reviews Belly's first months — calling out the kitchen's Filipino soul, French bistro discipline, and the Camden-Kentish Town bridge it builds.",
    source: "The Arcadia",
    url: "https://www.thearcadiaonline.com/belly-kentish-town-filipino-soul-with-bistro-swagger/",
    image: "/blog/DSCF3015-web.jpg",
    restaurant: "belly",
    category: "review",
    kind: "press",
  },
];

// sort newest first
BLOG.sort((a, b) => (a.date < b.date ? 1 : -1));

// NOTE: the old FEATURED_BLOG / TOP_THREE / REST slices were removed — the
// blog index paginates BLOG directly and the home Blog section takes its
// own slices. Nothing else consumed them.
