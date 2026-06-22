import type { Metadata } from "next";
import BlogIndex from "@/components/BlogIndex";

export const metadata: Metadata = {
  title: "Journal",
  description:
    "Stories, openings, reviews and recognitions from the Maginhawa Group — written from our own kitchens and from the publications who've eaten with us.",
  alternates: { canonical: "/blog" },
  openGraph: {
    type: "website",
    title: "Journal — Maginhawa Group",
    description:
      "Stories, reviews and recognitions from the Maginhawa Group of London restaurants.",
    url: "/blog",
    images: [{ url: "/images/belly.jpg", width: 1200, height: 630, alt: "Maginhawa Group journal" }],
  },
};

export default function BlogPage() {
  return <BlogIndex />;
}
