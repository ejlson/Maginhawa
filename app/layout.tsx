import type { Metadata } from "next";
import "./globals.css";
import PageTransition from "@/components/PageTransition";
import CustomCursor from "@/components/CustomCursor";
import GlassFilters from "@/components/GlassFilters";
import SmoothScroll from "@/lib/SmoothScroll";
import { OrganizationJsonLd, WebSiteJsonLd } from "@/lib/jsonld";
import { SITE_URL } from "@/lib/site";
import GoogleTag from "@/components/GoogleTag";
import MarketingPixels from "@/components/MarketingPixels";
import CookieBanner from "@/components/CookieBanner";
import { EB_Garamond, Figtree } from "next/font/google";

/* TWO next/font LOADERS: the DISPLAY voice and, for the first time in a
   while, the TEXT voice as well.

   THE DISPLAY FACE IS EB GARAMOND. Five faces got here first and the reasons
   they lost are the spec for this one. Fraunces was rejected on sight.
   Newsreader read flat and generic at hero display scale against the moody
   photography. Instrument Serif fixed that and then lost on a
   non-typographic ground: Big Mamma Group already uses it, and they are the
   comparison every London reader makes. Gilda Display held the role for a
   while and lost for the reason below.

   WHAT ALL OF THEM SHARED, AND WHY IT WAS THE WRONG SHAPE OF FACE.
   Contralto — the wordmark, the one thing not up for debate — is a
   high-contrast Didone: vertical stress, hairline thins, sharp terminals.
   Every face tried for the display role was built the same way, Gilda most
   of all, and the note in the version of this comment that Gilda replaced
   said as much: "two of those on a page blur into each other until the
   wordmark stops being the sharpest thing on screen". The answer was to
   pick a QUIETER Didone, and that only ever managed the symptom.

   EB Garamond is not a Didone at all. It is an old-style humanist:
   DIAGONAL stress, low stroke contrast, calligraphic roots — the opposite
   construction. The wordmark now reads as a different KIND of object rather
   than as a larger heading, which is the thing the display role was
   supposed to buy and never did. See the specimen sheet the decision came
   off (throwaway route /lab/type/plaster, nine systems on one ground).

   NOT ONE STATIC WEIGHT ANY MORE. Gilda shipped 400 and nothing else, so
   there was no weight-based hierarchy available inside the display role. EB
   Garamond is variable 400–800, and the display role runs 500 rather than
   400 deliberately — Garamond's regular is a TEXT weight drawn for 10–14pt,
   and at hero scale it goes weedy and the ink loses its authority. 500 is a
   drawn instance on the variable font, not a synthesised bold. */
const displayFace = EB_Garamond({
  subsets: ["latin"],
  display: "swap",
  /* named for the ROLE this loader fills, not the face in it — this token
     has now outlived five faces and the name should stop needing to change
     with them. globals.css owns --font-display-face and reads this. */
  variable: "--font-display-loaded",
});

/* THE TEXT VOICE IS FIGTREE, AND HELVETICA IS RETIRED.

   Helvetica was chosen for a good reason and kept for a bad one. The good
   reason: it is resident on macOS and iOS, metrically matched by Arial on
   Windows, so the text voice cost zero bytes and could not FOUT. The bad
   one: `maginhawa` is Tagalog for COMFORTABLE, and the most deliberately
   neutral face in the canon was arguing against every word of the copy. The
   font block in globals.css admitted this in as many words and then used it
   to justify adding a display serif rather than to reconsider the text face.

   WHAT THE SWAP ACTUALLY FIXES, beyond tone. Helvetica's weights differ BY
   PLATFORM: macOS ships a real Light at 300, Arial and Liberation Sans do
   not. Every weight decision on this site was written against that split,
   and --w-medium was aliased away to 400 entirely because nothing in the
   stack draws a 500 (see the weights block in globals.css). Figtree is
   variable 300–900 and self-hosted, so all three weights are real, drawn,
   and identical on every platform. The split is gone.

   WHAT IT COSTS: one more woff2 on the critical path, where there were
   none. next/font self-hosts and preloads it, and `display: swap` means
   text paints in the fallback rather than not at all — but this is a real
   regression against "the text voice makes no request", and it is the price
   of the tone being right. */
const textFace = Figtree({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-text-loaded",
});

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
  /* ⚠️ THE SHARE CARD IS ITS OWN FILE, AND IT IS NOT A PHOTOGRAPH FROM
     `/images/`. Every `openGraph` and `twitter` block on this site pointed at
     `/images/belly.jpg` and declared it `width: 1200, height: 630`. That file is
     1611x2416 — a PORTRAIT, at an aspect of 0.67:1, described to every social
     platform as a 1.91:1 landscape. The declared numbers are what a card is laid
     out against before the bytes arrive, so the shape was wrong everywhere it
     was rendered, and `summary_large_image` in particular wants 2:1.

     It was also 2,782KB, which is the part that made it silently invisible
     rather than merely wrong: WhatsApp does not fetch a preview image over
     roughly 300KB, so the most-shared surface for a London restaurant group
     rendered no card at all.

     `public/og/maginhawa-og.jpg` is a real 1200x630 crop of the same
     photograph — same subject, same room, so nothing about the brand changes —
     at 87KB.

     ── THE CROP IS THE ONE PART WORTH A SECOND OPINION ──
     It is a horizontal band lifted from the portrait's upper-middle (the table,
     the wine, the window), chosen by eye against three alternatives because a
     1.91:1 window on a 0.67:1 source has to discard most of the frame. It is a
     defensible reading of the picture, not an art-directed share card. If the
     group wants a photograph composed for this, replace the file and leave
     everything else alone — the size and the path are what the code depends
     on. */
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
        url: "/og/maginhawa-og.jpg",
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
    images: ["/og/maginhawa-og.jpg"],
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
    <html lang="en-GB" className={`${displayFace.variable} ${textFace.variable}`}>
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

        {/* ═══ THE PAGE WITHOUT JAVASCRIPT ═══
            Every route on this site is prerendered to real HTML, so the words
            are always in the document — but two mechanisms then hide them
            from a person whose browser never runs the script, and both are
            invisible in testing because a developer's browser always does.

            1. THE SCROLL LOCK. The loader sets `is-loading` on <body> in the
               server HTML and removes it when it finishes playing. It never
               finishes without JS, so `overflow: hidden; height: 100vh`
               stands: the reader gets the top of the page and cannot move.
               This is the big one — it applies to every route.

            2. THE ENTRANCES. Anything that animates in is written into the
               HTML wearing its hidden state as inline style. `[data-entrance]`
               is the opt-in mark for those; see the note on the attribute in
               components/Reveal.tsx. The value says WHICH properties do the
               hiding, so the reset stays narrow — a bare mark is opacity
               only, "rise" adds the transform and blur, "wipe" the clip-path.

            3. THE CHAPTERS. The home page does not animate through Reveal.
               Each chapter hides its own parts in its own stylesheet, keyed
               off a `data-in` attribute an observer sets on the section —
               dozens of elements per chapter, and CSS cannot add the missing
               attribute. So the SECTION carries `data-entrance="scope"` and
               everything inside it is restored at once. Measured with scripts
               off before this existed: the home page was a blank cream sheet
               from the hero to the footer.

               ⚠️ `transform` IS NOT RESET BY THE SCOPE RULE, deliberately. A
               chapter's descendants use transforms for LAYOUT as well as for
               entrances, and a blanket `transform: none` would take the
               composition apart to fix the visibility. An entrance offset of
               a few dozen pixels left in place is invisible next to that.
               Individual elements that genuinely need it can take the "rise"
               mark instead.

               ⚠️ `data-entrance="hold"` IS THE WAY BACK OUT, and it is not
               hypothetical: the venue cards' hover shade and hover blurb sit
               inside the Discover chapter and are hidden BECAUSE THEY ARE
               HOVER STATES. Revealing those would print a paragraph of blurb
               over all eight photographs.

            ⚠️ `!important` IS LOAD-BEARING, NOT LAZINESS. Every state being
            overridden here is an INLINE style written by framer-motion, and
            nothing in a stylesheet beats an inline declaration without it.

            ⚠️ WHAT IS DELIBERATELY NOT RESET: the glass cursor, the menu
            overlay, the page-transition curtain and the loader itself all sit
            at opacity 0 or off-screen and MUST stay there — they are chrome
            that only means anything once the script is running, and a
            blanket `[style*="opacity:0"]` rule would drop the transition
            curtain over the whole page. Hence an opt-in attribute rather
            than a sweep.

            This does not make the site work without JavaScript — the filters,
            the menu and the scroll choreography are all script. It makes it
            READABLE, which is the part that matters to a crawler that does
            not execute, to a reader on a connection that dropped the bundle,
            and to anyone browsing with scripts off. */}
        <noscript>
          <style>{`
            body.is-loading { overflow: visible !important; height: auto !important; }
            [data-entrance] { opacity: 1 !important; visibility: visible !important; }
            [data-entrance="rise"] { transform: none !important; filter: none !important; }
            [data-entrance="wipe"] { clip-path: none !important; }

            [data-entrance="scope"],
            [data-entrance="scope"] *:not([data-entrance="hold"]) {
              opacity: 1 !important;
              visibility: visible !important;
              filter: none !important;
              clip-path: none !important;
              transform: none !important;
            }

            [data-nojs-hide] { display: none !important; }
            [data-nojs-ground="film"] { background: var(--maroon) !important; }
          `}</style>
        </noscript>
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

        {/* ── ANALYTICS AND THE CONSENT IT WAITS FOR ──
            Both are inert until NEXT_PUBLIC_GA_ID is set as a BUILD
            variable, and deleting that variable is a complete rollback:
            no gtag, no banner, and the privacy notice's cookie section
            hides itself to match. See lib/consent.ts.

            ⚠️ NEITHER RENDERS ANYTHING until the matching consent is
            granted — they are not tags that load and then behave. It is
            not a tag that loads and then behaves. UK PECR governs the act
            of writing to the device, so the request to Google cannot be
            made first and apologised for afterwards. The long-form
            argument is at the top of components/Analytics.tsx.

            THE ORDER HERE IS NOT THE PAINT ORDER — the banner is
            position:fixed at z-index 250, which puts it over the nav and
            under the glass cursor. It sits last in the body so that with
            JavaScript disabled, and thus with neither of these rendering,
            nothing is left behind. */}
        <GoogleTag />
        <MarketingPixels />
        <CookieBanner />
      </body>
    </html>
  );
}
