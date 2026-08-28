// Schema.org / JSON-LD blocks. These are the structured signals that let
// Google build rich snippets and that LLM-based search (ChatGPT search,
// Perplexity, Google AI Overviews, Bing) ingest reliably. Inject via
// <script type="application/ld+json"> in a Server Component.

import { RESTAURANTS } from "./restaurants";
import { PRESS } from "./press";
import { SOCIALS } from "./contact";

import { SITE_URL } from "./site";
import { StructuredData } from "./StructuredData";

/* `sameAs` is how a crawler joins this record to the group's profiles
   elsewhere — it is the claim "the Maginhawa Group here and the Maginhawa
   Group on LinkedIn are one organisation", and it is what lets Google and
   the LLM-based engines above resolve the brand rather than guess at it.

   It is DERIVED from the footer's SOCIALS rather than listed again here.
   The two drifted before: the footer gained profiles and this array kept
   claiming Instagram alone. Adding a row to SOCIALS now feeds both.

   `url: null` rows are dropped. A `sameAs` entry is an assertion of
   identity, so an unconfirmed or guessed URL is worse here than in the
   footer — there it renders as plain text, here it would tell a crawler
   the group owns a page it does not. */
const orgSameAs = [
  ...SOCIALS.map((s) => s.url).filter((url): url is string => url !== null),
  // Profiles the footer does not carry — TripAdvisor, Google Business —
  // belong here directly as they go live.
];

export function OrganizationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: "Maginhawa Group",
    url: SITE_URL,
    logo: `${SITE_URL}/logo/maginhawa.png`,
    description:
      "Maginhawa Group is a London-based collective of Filipino, Filipino-Japanese, and Caribbean restaurants — including Belly (Michelin Guide), Café Mama & Sons, Mamasons, Bintang, Guanabana, Ramo Ramen and Hoodwood.",
    foundingLocation: { "@type": "Place", name: "London, United Kingdom" },
    areaServed: { "@type": "City", name: "London" },
    sameAs: orgSameAs,
    /* ---- THE DEPARTMENTS POINT AT THE VENUES' OWN SITES ----
       They used to point at `${SITE_URL}/restaurants/<slug>`, and those
       pages are gone (see `public/_redirects`). A `url` that 308s to an
       index is a worse signal than no page at all: the crawler is told
       "this restaurant lives here", follows it, and lands on a grid of
       eight.

       So `url` is now the venue's OWN website, which is the canonical page
       for that restaurant on the web and always was. The `@id` stays on
       this site — it is an identifier, not a destination, and it is what
       the group's own pages join their records on — but it is now a
       fragment of the surviving /restaurants index rather than of a URL
       that no longer resolves. A venue with no site of its own keeps the
       index as its url, which is the truest page there is for it. */
    department: RESTAURANTS.map((r) => ({
      "@type": r.bookable ? "Restaurant" : "FoodEstablishment",
      "@id": `${SITE_URL}/restaurants#${r.slug}`,
      name: r.name,
      url: r.website ?? `${SITE_URL}/restaurants`,
    })),
  };
  return <StructuredData data={data} />;
}

export function WebSiteJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: "Maginhawa Group",
    inLanguage: "en-GB",
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
  return <StructuredData data={data} />;
}

/* `RestaurantJsonLd` STOOD HERE AND IS GONE WITH ITS ONLY CALLER, the
   per-venue detail route (app/restaurants/[slug]). It emitted a full
   Restaurant record — press mentions as `subjectOf`, address, cuisine — for
   a page that no longer exists, and structured data describing a missing
   page is worse than none: it is a claim a crawler can check and find
   false.

   WHAT SURVIVES OF IT is the `department` list in OrganizationJsonLd above,
   which still names every venue, still types the bookable ones as
   Restaurant, and now points each at the site that does have a page for it.
   The press mentions survive in `ArticleJsonLd`/PRESS on the journal.

   Restoring a per-venue record means restoring a per-venue PAGE first —
   the record's `url` is the whole point of it. */

export function GroupPressJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${SITE_URL}/#press`,
    name: "Press & Coverage — Maginhawa Group",
    description:
      "Editorial coverage of Maginhawa Group restaurants across UK national and London media.",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: PRESS.slice(0, 20).map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "NewsArticle",
          headline: p.feature,
          publisher: { "@type": "Organization", name: p.outlet },
          url: p.url,
        },
      })),
    },
  };
  return <StructuredData data={data} />;
}
