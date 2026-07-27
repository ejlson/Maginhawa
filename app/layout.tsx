import type { Metadata } from "next";
import { Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import PageTransition from "@/components/PageTransition";
import CustomCursor from "@/components/CustomCursor";
import GlassFilters from "@/components/GlassFilters";
import SmoothScroll from "@/lib/SmoothScroll";
import { OrganizationJsonLd, WebSiteJsonLd } from "@/lib/jsonld";

/* The site's single text family — a warm humanist grotesk. Variable (wght
   100–900), so one file covers every weight in use, from the 200 eyebrows to
   the 500 headings; true italics for the emphasis spots Fraunces used to
   carry. Contralto (Adobe Fonts, below) survives only at wordmark scale. */
const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-hanken",
  display: "swap",
});

const SITE_URL = "https://maginhawa.group";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Maginhawa Group — Filipino, Filipino-Japanese & Caribbean restaurants in London",
    template: "%s — Maginhawa Group",
  },
  description:
    "Maginhawa Group is a London-based family of restaurants — Belly (Michelin Guide), Café Mama & Sons, Mamasons, Bintang, Guanabana, Ramo Ramen and Hoodwood — featured in The Times, Time Out, BBC Good Food, Forbes and The Evening Standard.",
  keywords: [
    "Maginhawa Group",
    "Filipino restaurants London",
    "Belly Kentish Town",
    "Café Mama & Sons",
    "Mamasons ice cream",
    "Ramo Ramen",
    "Hoodwood",
    "Guanabana Kentish Town",
    "Bintang Camden",
    "Filipino food London",
    "Michelin Guide London",
  ],
  authors: [{ name: "Maginhawa Group" }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Maginhawa Group",
    title: "Maginhawa Group — London's Filipino, Filipino-Japanese & Caribbean restaurants",
    description:
      "A London family of restaurants featured in The Times, Time Out, BBC Good Food, Forbes and Evening Standard. Home to Belly (Michelin Guide), Café Mama & Sons, Mamasons and more.",
    url: SITE_URL,
    locale: "en_GB",
    images: [
      {
        url: "/images/belly.jpg",
        width: 1200,
        height: 630,
        alt: "Maginhawa Group restaurants in London",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Maginhawa Group — London Restaurants",
    description:
      "Belly (Michelin Guide), Café Mama & Sons, Mamasons, Bintang, Guanabana, Ramo Ramen and Hoodwood.",
    images: ["/images/belly.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  category: "Food & Drink",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GB" className={hanken.variable}>
      <head>
        <link rel="stylesheet" href="https://use.typekit.net/pev2vne.css" />
        <OrganizationJsonLd />
        <WebSiteJsonLd />
      </head>
      <body className="is-loading">
        {/* Lenis lives at the root so the smooth-scroll feel is consistent
            on every route, not just the home page. */}
        <SmoothScroll>
          <PageTransition>{children}</PageTransition>
        </SmoothScroll>
        {/* liquid-glass SVG displacement filters — referenced by every
            glass element via backdrop-filter: url(#lg-*) */}
        <GlassFilters />
        {/* glass lens cursor — lives at the root so every route's
            data-cursor="glass" zone gets it (home hero, About card,
            Locations film, the About page's pinned video) */}
        <CustomCursor />
        {/* persistent depth-of-field band at the bottom of the viewport —
            content sitting in the lower portion of the screen always reads
            slightly defocused and resolves as it scrolls upward */}
        <div className="scrollBlur" aria-hidden />
      </body>
    </html>
  );
}
