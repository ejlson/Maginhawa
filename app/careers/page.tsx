import type { Metadata } from "next";
import JoinUs from "@/components/careers/JoinUs";
import { JOBS, jobTypes, type EmploymentType } from "@/lib/jobs";
import { SITE_URL } from "@/lib/site";
import { ogImage, OG_W, OG_H } from "@/lib/media";
import { StructuredData } from "@/lib/StructuredData";

// One schema.org value per type, and a list only when a role is offered on
// more than one basis, so single-type postings serialise exactly as before.
// Casual -> CONTRACTOR is the existing mapping (known wrong, out of scope).
function schemaEmploymentType(types: EmploymentType[]) {
  const values = types.map((t) =>
    t === "Full-time" ? "FULL_TIME" : t === "Part-time" ? "PART_TIME" : "CONTRACTOR",
  );
  return values.length === 1 ? values[0] : values;
}

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
      employmentType: schemaEmploymentType(jobTypes(j)),
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
    "Open positions across the Maginhawa Group's restaurants in Kentish Town and Soho, London. See what each role involves and how to apply.",
  alternates: { canonical: "/careers" },
  openGraph: {
    type: "website",
    title: "Careers — Maginhawa Group",
    description:
      "Join the teams at the Maginhawa Group's restaurants in Kentish Town and Soho, London.",
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
