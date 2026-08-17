// Schema.org / JSON-LD blocks. These are the structured signals that let
// Google build rich snippets and that LLM-based search (ChatGPT search,
// Perplexity, Google AI Overviews, Bing) ingest reliably. Inject via
// <script type="application/ld+json"> in a Server Component.

import type { Restaurant } from "./restaurants";
import { RESTAURANTS } from "./restaurants";
import { PRESS, pressForRestaurant } from "./press";

const SITE_URL = "https://maginhawa.group"; // update if the production origin differs

const orgSameAs = [
  "https://www.instagram.com/maginhawagroup/",
  // add Facebook, LinkedIn, TripAdvisor profiles as they go live
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
    department: RESTAURANTS.map((r) => ({
      "@type": r.bookable ? "Restaurant" : "FoodEstablishment",
      "@id": `${SITE_URL}/restaurants/${r.slug}#restaurant`,
      name: r.name,
      url: `${SITE_URL}/restaurants/${r.slug}`,
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
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
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function RestaurantJsonLd({ restaurant }: { restaurant: Restaurant }) {
  const mentions = pressForRestaurant(restaurant.slug);
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": restaurant.bookable ? "Restaurant" : "FoodEstablishment",
    "@id": `${SITE_URL}/restaurants/${restaurant.slug}#restaurant`,
    name: restaurant.name,
    url: `${SITE_URL}/restaurants/${restaurant.slug}`,
    image: `${SITE_URL}${restaurant.image}`,
    logo: `${SITE_URL}${restaurant.logo}`,
    description: restaurant.description,
    servesCuisine: restaurant.cuisine,
    parentOrganization: { "@id": `${SITE_URL}/#organization` },
    address: {
      "@type": "PostalAddress",
      addressLocality: restaurant.location.split(",")[0].trim(),
      addressCountry: "GB",
    },
    areaServed: { "@type": "City", name: "London" },
    acceptsReservations: restaurant.bookable,
  };
  /* Schema.org's `priceRange` was emitted here from `Restaurant.priceRange`
     and is gone with the field. It is an OPTIONAL property on Restaurant —
     omitting it is valid structured data, not an incomplete record — and
     Google treats it as a rich-result enhancement rather than a
     requirement, so nothing here becomes ineligible. Search may stop
     showing a price band for these venues; that is the intended effect of
     no longer publishing one. */
  if (mentions.length) {
    data.subjectOf = mentions.map((p) => ({
      "@type": "NewsArticle",
      headline: p.feature,
      publisher: { "@type": "Organization", name: p.outlet },
      url: p.url,
    }));
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// Surfaces aggregated press as a "Collection" — useful for the home page
// where the entire group is being presented.
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
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
