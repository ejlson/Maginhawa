"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  META_PIXEL_ID,
  TIKTOK_PIXEL_ID,
  readConsent,
  subscribeConsent,
  type ConsentCategories,
} from "@/lib/consent";

/* ── THE META AND TIKTOK PIXELS ──
 *
 * Google Ads is NOT here — it rides the shared gtag.js in
 * components/GoogleTag.tsx, and loading Google's library twice breaks both
 * products. See the banner there. These two are genuinely independent
 * scripts with their own globals (`fbq`, `ttq`), so they live together.
 *
 * ⚠️ NEITHER LOADS UNTIL `marketing` IS GRANTED. Same PECR argument as the
 * analytics tag, and it bites harder here: a Meta pixel firing before
 * consent discloses the visitor's IP and the page they are reading to Meta,
 * who can join it to a logged-in Facebook or Instagram account. That is the
 * disclosure a reader has most reason to object to and least ability to
 * detect.
 *
 * ⚠️ ⚠️ META PIXEL MAKES THIS SITE A JOINT CONTROLLER WITH META. That is
 * settled EU/UK case law (CJEU C-40/17, *Fashion ID*) and it survives in
 * retained UK GDPR: where a site operator and a platform jointly determine
 * the purposes of collection, both are controllers. The practical
 * consequences are NOT in this file — they are in app/privacy/page.tsx,
 * which must describe the arrangement, and in a Meta controller-controller
 * addendum accepted in Business Manager. Installing the pixel without those
 * is the actual compliance risk; the code below is the easy part.
 *
 * ── SPA PAGEVIEWS ──
 * Both pixels auto-fire a page view on load and neither notices a client
 * route change, exactly like gtag. Both therefore get an explicit
 * per-pathname call, skipping the first one because the init script has
 * already counted it.
 */
declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { callMethod?: unknown };
    _fbq?: unknown;
    ttq?: { page: () => void; load: (id: string) => void; [k: string]: unknown };
    TiktokAnalyticsObject?: string;
  }
}

export default function MarketingPixels() {
  const [consent, setConsent] = useState<ConsentCategories | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    setConsent(readConsent());
    return subscribeConsent(setConsent);
  }, []);

  const on = Boolean(consent?.marketing);
  const meta = on && META_PIXEL_ID;
  const tiktok = on && TIKTOK_PIXEL_ID;

  /* Skips the mount, because both init scripts fire their own first view.
     Without the guard every visitor's landing page is counted twice, which
     inflates exactly the number an ad campaign is judged on. */
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (!on) return;
    if (!mounted) {
      setMounted(true);
      return;
    }
    if (typeof window.fbq === "function") window.fbq("track", "PageView");
    if (window.ttq && typeof window.ttq.page === "function") window.ttq.page();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, on]);

  if (!on) return null;

  return (
    <>
      {meta && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window,document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${META_PIXEL_ID}');
            fbq('track', 'PageView');
          `}
        </Script>
      )}

      {tiktok && (
        <Script id="tiktok-pixel" strategy="afterInteractive">
          {`
            !function (w, d, t) {
              w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
              ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];
              ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
              for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
              ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};
              ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";
                ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;
                ttq._o=ttq._o||{};ttq._o[e]=n||{};var o=d.createElement("script");
                o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;
                var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
              ttq.load('${TIKTOK_PIXEL_ID}');
              ttq.page();
            }(window, document, 'ttq');
          `}
        </Script>
      )}
    </>
  );
}

/* ── A BOOKING CLICK, REPORTED TO THE AD PLATFORMS ──
 * The marketing counterpart to trackOutboundClick in GoogleTag.tsx. `Lead`
 * and `ClickButton` are the standard event names on each platform — using
 * the conventional ones means the event appears in the platforms' own
 * reporting instead of only in a custom breakdown, and both are what their
 * campaign optimisers know how to bid against.
 *
 * No-ops before consent, because neither global exists until the scripts
 * above have mounted. */
export function trackMarketingOutbound(venue: string) {
  if (typeof window === "undefined") return;
  if (typeof window.fbq === "function") {
    window.fbq("track", "Lead", { content_name: venue });
  }
  if (window.ttq && typeof window.ttq.track === "function") {
    (window.ttq.track as (e: string, p: unknown) => void)("ClickButton", {
      content_name: venue,
    });
  }
}
