import type { Metadata } from "next";
import About from "@/components/about/About";
import { SITE_URL } from "@/lib/site";
import { ogImage, OG_W, OG_H } from "@/lib/media";
import { StructuredData } from "@/lib/StructuredData";

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
        /* CROPPED TO THE DECLARATION, not merely pointed at. This read
           `/images/bintang.jpg` with these same numbers under it — a
           1614x2421 portrait described to every platform as a 1.91:1
           landscape. See ogImage() in lib/media.ts. */
        url: ogImage("/images/bintang.jpg"),
        width: OG_W,
        height: OG_H,
        alt: "Maginhawa Group origin story",
      },
    ],
  },
};

export default function AboutPage() {
  return (
    <>
      <StructuredData data={jsonLd} />
      <About />
    </>
  );
}
