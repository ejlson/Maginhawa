import type { Metadata } from "next";
import JoinUs from "@/components/careers/JoinUs";
import { JOBS } from "@/lib/jobs";
import { SITE_URL } from "@/lib/site";
import { ogImage, OG_W, OG_H } from "@/lib/media";
import { StructuredData } from "@/lib/StructuredData";

// Schema.org ItemList of open JobPostings — Google can lift this into the
// careers job search panel and AI search summaries.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  "@id": `${SITE_URL}/careers#openings`,
  name: "Open positions — Maginhawa Group",
  numberOfItems: JOBS.length,
  itemListElement: JOBS.map((j, i) => ({
    "@type": "ListItem",
    position: i + 1,
    item: {
      "@type": "JobPosting",
      title: j.title,
      description: j.summary,
      employmentType:
        j.type === "Full-time" ? "FULL_TIME" : j.type === "Part-time" ? "PART_TIME" : "CONTRACTOR",
      hiringOrganization: {
        "@type": "Organization",
        name: "Maginhawa Group",
        sameAs: SITE_URL,
      },
      jobLocation: {
        "@type": "Place",
        address: {
          "@type": "PostalAddress",
          addressLocality: j.location.split(",")[0].trim(),
          addressCountry: "GB",
        },
      },
      url: `${SITE_URL}/careers#${j.id}`,
    },
  })),
};

export const metadata: Metadata = {
  // the route, the nav item and the page title now all say the same word
  title: "Careers",
  description:
    "Open positions across the Maginhawa Group — kitchens, front of house, bar and the small Camden HQ behind the restaurants.",
  alternates: { canonical: "/careers" },
  openGraph: {
    type: "website",
    title: "Careers — Maginhawa Group",
    description:
      "Hiring across seven restaurants and a small Camden HQ — kitchens, front of house, bar, and the team behind the scenes.",
    url: "/careers",
    images: [
      {
        /* CROPPED TO THE DECLARATION — this was a 1605x2407 portrait
           declared as a 1.91:1 landscape. See ogImage() in lib/media.ts. */
        url: ogImage("/images/cafemama.jpg"),
        width: OG_W,
        height: OG_H,
        alt: "Join the Maginhawa Group team",
      },
    ],
  },
};

export default function CareersPage() {
  return (
    <>
      <StructuredData data={jsonLd} />
      <JoinUs />
    </>
  );
}
