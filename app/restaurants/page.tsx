import type { Metadata } from "next";
import RestaurantsShowcase from "@/components/RestaurantsShowcase";
import { RESTAURANTS } from "@/lib/restaurants";
import { SITE_URL } from "@/lib/site";
import { StructuredData } from "@/lib/StructuredData";

/* ⚠️ THIS FILE USED TO BE THREE LINES, AND EVERY ONE OF ITS GAPS WAS A
   SILENT SEO DEFECT. What was here:

       export const metadata: Metadata = {
         title: "Restaurants — Maginhawa Group",
       };

   Three things wrong with it, none of which anything in the build would
   have reported:

   1. THE TITLE SUFFIX WAS APPLIED TWICE. The root layout declares
      `title.template = "%s — Maginhawa Group"`, and a plain string in a
      child segment goes THROUGH that template. The rendered tag read
      `Restaurants — Maginhawa Group — Maginhawa Group` — verified in the
      built `out/restaurants.html`. The fix is to hand the template the
      bare word and let it add the group name, which is what it is for.

   2. NO DESCRIPTION MEANT THE HOME PAGE'S DESCRIPTION. Metadata inherits,
      so this page and `/` shipped the identical meta description — the
      "same page titles / no meta desc" pair, arrived at by inheritance
      rather than by omission.

   3. ⚠️ NO CANONICAL MEANT THIS PAGE CLAIMED TO BE THE HOME PAGE. This is
      the one that actually costs traffic. The root declares
      `alternates.canonical = "/"`, and that inherits too — so
      /restaurants shipped `<link rel="canonical" href="…/">`, telling
      every crawler that the restaurants page IS the homepage and should
      be folded into it. A page that de-indexes itself in favour of
      another page is worse off than a page with no canonical at all.

   The lesson generalises: on this site an ABSENT metadata field is not
   neutral, it is inherited. Every route needs its own canonical. */

/* The venue list as an ItemList — the page's actual content, described.
   OrganizationJsonLd already types each venue under `department` and points
   it at its own website; this record is about THIS PAGE, and says what is
   on it and in what order. The two join on the same `@id` fragments, which
   is why those are spelled the same way here as they are there. */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "@id": `${SITE_URL}/restaurants#webpage`,
  name: "Restaurants — Maginhawa Group",
  description:
    "Every restaurant in the Maginhawa Group, across London.",
  url: `${SITE_URL}/restaurants`,
  isPartOf: { "@id": `${SITE_URL}/#website` },
  about: { "@id": `${SITE_URL}/#organization` },
  mainEntity: {
    "@type": "ItemList",
    numberOfItems: RESTAURANTS.length,
    itemListElement: RESTAURANTS.map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": r.bookable ? "Restaurant" : "FoodEstablishment",
        "@id": `${SITE_URL}/restaurants#${r.slug}`,
        name: r.name,
        url: r.website ?? `${SITE_URL}/restaurants`,
      },
    })),
  },
};

export const metadata: Metadata = {
  /* BARE — the root template adds " — Maginhawa Group". See note 1 above. */
  title: "Restaurants",
  description:
    "Every restaurant in the Maginhawa Group — Belly, Café Mama & Sons, Mamasons, Bintang, Guanabana, Ramo Ramen and Hoodwood. Filipino, Filipino-Japanese and Caribbean kitchens across London.",
  alternates: { canonical: "/restaurants" },
  openGraph: {
    type: "website",
    title: "Restaurants — Maginhawa Group",
    description:
      "Filipino, Filipino-Japanese and Caribbean kitchens across London — find the room you want tonight.",
    url: "/restaurants",
    images: [
      {
        url: "/og/maginhawa-og.jpg",
        width: 1200,
        height: 630,
        alt: "Maginhawa Group restaurants in London",
      },
    ],
  },
};

export default function RestaurantsPage() {
  return (
    <>
      <StructuredData data={jsonLd} />
      <RestaurantsShowcase />
    </>
  );
}
