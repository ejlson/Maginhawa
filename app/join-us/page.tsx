import type { Metadata } from "next";
import JoinUs from "@/components/JoinUs";
import { JOBS } from "@/lib/jobs";

const SITE_URL = "https://maginhawa.group";

// Schema.org ItemList of open JobPostings — Google can lift this into the
// careers job search panel and AI search summaries.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  "@id": `${SITE_URL}/join-us#openings`,
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
      url: `${SITE_URL}/join-us#${j.id}`,
    },
  })),
};

export const metadata: Metadata = {
  title: "Join Us",
  description:
    "Open positions across the Maginhawa Group — kitchens, front of house, bar and the small Camden HQ behind the restaurants.",
  alternates: { canonical: "/join-us" },
  openGraph: {
    type: "website",
    title: "Join Us — Maginhawa Group",
    description:
      "Hiring across seven restaurants and a small Camden HQ — kitchens, front of house, bar, and the team behind the scenes.",
    url: "/join-us",
    images: [
      {
        url: "/images/cafemama.jpg",
        width: 1200,
        height: 630,
        alt: "Join the Maginhawa Group team",
      },
    ],
  },
};

export default function JoinUsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <JoinUs />
    </>
  );
}
