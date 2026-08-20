"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ADS_ID,
  GA_ID,
  readConsent,
  subscribeConsent,
  type ConsentCategories,
} from "@/lib/consent";

/* ── GOOGLE'S TAG, SERVING TWO PRODUCTS UNDER TWO SEPARATE CONSENTS ──
 *
 * This file was components/Analytics.tsx and loaded GA4 alone. It now also
 * carries the Google Ads conversion tag, and the merge is not tidiness:
 *
 * ⚠️ GA4 AND GOOGLE ADS SHARE ONE gtag.js AND MUST NOT HAVE TWO. Both are
 * configured through the same `window.dataLayer` and the same `gtag()`
 * function. Loading the library twice — once "for analytics" and once "for
 * ads" — redefines gtag over a dataLayer that already has queued commands,
 * and the classic symptom is conversions that fire intermittently or
 * pageviews that double-count. One <Script>, two `config` calls.
 *
 * ── BUT THE TWO CONSENTS ARE STILL SEPARATE ──
 * That shared library is exactly why Consent Mode exists. The tag may be
 * loaded because the reader accepted analytics, while ads storage stays
 * denied — so what gets loaded and what gets PERMITTED are two different
 * questions here:
 *
 *   load gtag at all   ← (analytics AND GA_ID) OR (marketing AND ADS_ID)
 *   analytics_storage  ← analytics
 *   ad_storage etc.    ← marketing
 *   config GA_ID       ← analytics
 *   config ADS_ID      ← marketing
 *
 * Nothing is requested from Google until at least one of the two is
 * granted. UK PECR governs the act of writing to the device and wants
 * consent BEFORE it, not a promise to behave once the script is running —
 * so the common "load with defaults denied" pattern is deliberately not
 * used. The `default: denied` line below still runs, one tick before the
 * update, so that any future Google product added here starts denied
 * rather than silently on.
 */
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export default function GoogleTag() {
  /* null until the effect has read storage — localStorage does not exist
     during the static export, so seeding state from it would render a
     <Script> on the client's first pass that the server did not, which is a
     hydration mismatch. */
  const [consent, setConsent] = useState<ConsentCategories | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    setConsent(readConsent());
    return subscribeConsent(setConsent);
  }, []);

  const analyticsOn = Boolean(consent?.analytics && GA_ID);
  const adsOn = Boolean(consent?.marketing && ADS_ID);
  const loadTag = analyticsOn || adsOn;

  /* One page_view per route, and only while ANALYTICS is on — a pageview is
     an analytics event, so a reader who took marketing and refused
     analytics must not generate them.

     ⚠️ usePathname, NOT useSearchParams. That hook drags a Suspense
     boundary in with it for static prerendering (components/BlogIndex.tsx
     already carries one for exactly that reason). Reading
     `window.location.search` inside an effect gets the same string with no
     boundary, because by then we are unambiguously in the browser. */
  useEffect(() => {
    if (!analyticsOn || typeof window.gtag !== "function") return;
    window.gtag("event", "page_view", {
      page_path: pathname + window.location.search,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [analyticsOn, pathname]);

  if (!loadTag) return null;

  /* The id in the library URL is only the FIRST product; both are then
     configured explicitly below, so it does not matter which one gets to
     name the request — but one of them must, and it has to be an id we
     actually have consent for. */
  const bootId = analyticsOn ? GA_ID : ADS_ID;

  return (
    <>
      <Script
        id="google-tag-src"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${bootId}`}
      />
      <Script id="google-tag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('consent', 'default', {
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            analytics_storage: 'denied'
          });
          gtag('consent', 'update', {
            analytics_storage: '${analyticsOn ? "granted" : "denied"}',
            ad_storage: '${adsOn ? "granted" : "denied"}',
            ad_user_data: '${adsOn ? "granted" : "denied"}',
            ad_personalization: '${adsOn ? "granted" : "denied"}'
          });
          ${analyticsOn ? `gtag('config', '${GA_ID}', { send_page_view: false });` : ""}
          ${adsOn ? `gtag('config', '${ADS_ID}');` : ""}
        `}
      </Script>
    </>
  );
}

/* ── TRACKING A BOOKING CLICK ──
 * The reason to measure this site at all is to learn how many readers leave
 * for OpenTable, SevenRooms or a venue's own site; a pageview count cannot
 * answer it. Call from a venue link's onClick.
 *
 * A no-op without consent, because window.gtag only exists once the script
 * above has mounted — so any component may call it without knowing anything
 * about consent state. */
export function trackOutboundClick(venue: string, destination: string) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", "outbound_click", { venue, destination, outbound: true });
}
