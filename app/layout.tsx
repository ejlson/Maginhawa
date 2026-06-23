import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import PageTransition from "@/components/PageTransition";
import SmoothScroll from "@/lib/SmoothScroll";
import { OrganizationJsonLd, WebSiteJsonLd } from "@/lib/jsonld";

const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-fraunces",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-inter",
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
    <html lang="en-GB" className={`${fraunces.variable} ${inter.variable}`}>
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
        {/* persistent depth-of-field band at the bottom of the viewport —
            content sitting in the lower portion of the screen always reads
            slightly defocused and resolves as it scrolls upward */}
        <div className="scrollBlur" aria-hidden />
      </body>
    </html>
  );
}
