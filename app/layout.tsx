import type { Metadata } from "next";
import "./globals.css";
import PageTransition from "@/components/PageTransition";
import CustomCursor from "@/components/CustomCursor";
import GlassFilters from "@/components/GlassFilters";
import SmoothScroll from "@/lib/SmoothScroll";
import { OrganizationJsonLd, WebSiteJsonLd } from "@/lib/jsonld";

/* NO next/font LOADER, AND THAT IS THE POINT.
   The site ran Hanken Grotesk and DM Mono through next/font/google — two
   self-hosted families, two preloaded woff2 files on every route. Both are
   retired: the text voice is Helvetica now (see globals.css), which is
   resident on macOS/iOS and metrically matched by Arial on Windows and
   Liberation Sans on Linux. A resident face makes no request, so it cannot
   FOUT and there is nothing left to preload.

   What next/font ALSO did was inject the `--font-hanken` / `--font-dm-mono`
   custom properties onto <html>. Nothing reads them any more — globals.css
   resolves --font-sans and --font-mono straight to the Helvetica stack — so
   the className is empty and <html> carries no font class at all. */

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
    <html lang="en-GB">
      <head>
        {/* Contralto (Adobe Fonts kit pev2vne) is now the ONLY web font on
            the site, so its round-trip is the whole font critical path —
            and it is a two-hop one: the kit CSS comes from use.typekit.net
            and the woff2 files it @font-faces come from p.typekit.net.
            Warming both connections costs two link tags and saves the
            DNS + TLS handshake on the second hop, which used to be hidden
            behind next/font's self-hosted files.
            crossOrigin is required — fonts are always fetched in CORS mode,
            and a preconnect without it warms a connection the font request
            then refuses to reuse. */}
        <link
          rel="preconnect"
          href="https://use.typekit.net"
          crossOrigin="anonymous"
        />
        <link
          rel="preconnect"
          href="https://p.typekit.net"
          crossOrigin="anonymous"
        />
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
