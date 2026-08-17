import type { Metadata } from "next";
import About from "@/components/About";
import { SITE_URL } from "@/lib/site";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  "@id": `${SITE_URL}/about#aboutpage`,
  name: "About — Maginhawa Group",
  description:
    "The story of Maginhawa Group — a London family of restaurants from a 1987 Camden kitchen to seven dining rooms today, led by Chef Omar.",
  url: `${SITE_URL}/about`,
  mainEntity: { "@id": `${SITE_URL}/#organization` },
};

export const metadata: Metadata = {
  title: "About",
  description:
    "The story of Maginhawa Group — a London family of restaurants from Camden to Kentish Town. Filipino, Filipino-Japanese and Caribbean kitchens led by Chef Omar.",
  alternates: { canonical: "/about" },
  openGraph: {
    type: "website",
    title: "About — Maginhawa Group",
    description:
      "A London family of restaurants — from a 1987 Camden kitchen to seven dining rooms today.",
    url: "/about",
    images: [
      {
        url: "/images/bintang.jpg",
        width: 1200,
        height: 630,
        alt: "Maginhawa Group origin story",
      },
    ],
  },
};

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <About />
    </>
  );
}
