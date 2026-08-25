import type { Metadata } from "next";
import ContactPage from "@/components/contact/ContactPage";
import { SITE_URL } from "@/lib/site";
import { StructuredData } from "@/lib/StructuredData";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  "@id": `${SITE_URL}/contact#contactpage`,
  name: "Contact — Maginhawa Group",
  description:
    "Get in touch with the Maginhawa Group — restaurant enquiries, opening hours, FAQ, and how to leave a Google review.",
  url: `${SITE_URL}/contact`,
  mainEntity: { "@id": `${SITE_URL}/#organization` },
};

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with the Maginhawa Group — restaurant enquiries, opening hours, and how to reach us.",
  alternates: { canonical: "/contact" },
  openGraph: {
    type: "website",
    title: "Contact — Maginhawa Group",
    description: "Send us a note. Open across Camden, Soho, Kentish Town and Shoreditch.",
    url: "/contact",
    images: [
      {
        url: "/og/maginhawa-og.jpg",
        width: 1200,
        height: 630,
        alt: "Contact the Maginhawa Group",
      },
    ],
  },
};

export default function Page() {
  return (
    <>
      <StructuredData data={jsonLd} />
      <ContactPage />
    </>
  );
}
