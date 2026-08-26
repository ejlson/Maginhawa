"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./CookieBanner.module.css";
import {
  analyticsConfigured,
  consentRequired,
  marketingConfigured,
  needsAsking,
  NO_CONSENT,
  readConsent,
  readDismissed,
  setConsent,
  setDismissed,
  subscribeConsent,
  type ConsentRecord,
} from "@/lib/consent";

/* ── THE CONSENT BANNER ──
 *
 * Two purposes now: analytics (GA4) and marketing (Meta pixel, TikTok
 * pixel, Google Ads). Each row appears only if something is configured
 * behind it — see `analyticsConfigured` / `marketingConfigured` in
 * lib/consent.ts. Configure nothing and the banner does not exist.
 *
 * ── THE SHAPE CAME FROM A REFERENCE; TWO DETAILS OF IT DID NOT ──
 * Modelled on Big Mamma's banner at the user's request: corner card, an ×,
 * an expanding Preferences panel, Accept / Save / Decline. What was not
 * copied:
 *
 * 1. ⚠️ THE COPY, WHICH HAS NOW CHANGED BACK. The reference reads "Our
 *    partners and we use cookies … and tailor marketing", and when this
 *    site ran analytics alone that was three false claims. With the pixels
 *    configured it is TRUE, so the wording below says it — conditionally,
 *    on `marketingConfigured`, because the day the pixels are removed it
 *    becomes a lie again and nobody will remember to edit this string.
 *    A consent notice describes what the site does; it is not decoration.
 *
 * 2. ⚠️ THE BUTTON HIERARCHY. The reference puts Accept and Save in filled
 *    buttons and Decline in a small underlined text link — the arrangement
 *    the ICO singles out, since refusing must be as easy as accepting. All
 *    three here are the same pill on three equal grid tracks.
 */
export default function CookieBanner() {
  const [consent, setLocal] = useState<ConsentRecord | null>(null);
  const [dismissed, setLocalDismissed] = useState(false);
  const [ready, setReady] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);

  /* Both start FALSE and nothing renders them otherwise: a pre-ticked
     consent box is not consent (GDPR recital 32), so "Save" with nothing
     ticked is a refusal — which is exactly what it should mean. */
  const [analyticsOn, setAnalyticsOn] = useState(false);
  const [marketingOn, setMarketingOn] = useState(false);

  useEffect(() => {
    const existing = readConsent();
    setLocal(existing);
    setLocalDismissed(readDismissed());
    /* Seed the switches from any answer this visitor has ALREADY given.
       This is not a pre-tick: a pre-tick is us assuming consent nobody
       expressed, whereas this is showing someone the choice they made last
       time so that being asked about a NEW purpose does not silently reset
       the old one. A reader who accepted analytics and is now being asked
       about marketing should not have to re-grant analytics to keep it. */
    if (existing) {
      setAnalyticsOn(existing.analytics);
      setMarketingOn(existing.marketing);
      /* They have answered before, so the detail is the point of showing
         this again — open on the panel rather than the summary. */
      setShowPrefs(true);
    }
    setReady(true);
    return subscribeConsent(setLocal);
  }, []);

  /* ── THE CARD PUBLISHES THE STRIP IT OCCUPIES, AS `--consent-h` ──
   * It is `position: fixed`, so it is outside every page's flow and no
   * layout can see it. On most routes that is fine — the content underneath
   * scrolls and the reader passes it. On the 404 it was not: that page's
   * doors are its ONLY navigation and they sit on the bottom edge, so on a
   * phone, where this card is full-bleed, it buried two of the five exits at
   * 375x812 and all five in landscape. app/not-found.module.css reserves
   * this value under the doors.
   *
   * The number is the card's height PLUS its gap to the bottom of the
   * window, i.e. the whole strip it makes unusable, not just its box.
   *
   * ⚠️ THE EFFECT IS DECLARED HERE, ABOVE THE EARLY RETURNS BELOW, because
   * hooks cannot live after a conditional return. It therefore also runs on
   * the renders where the card is NOT drawn — which is what removes the
   * property again the moment consent is given or the × is pressed. The
   * fallback in the consuming rule is 0px, so a route that reserves space
   * for this reserves nothing when the card is gone.
   *
   * The observer watches the CARD and writes to the ROOT — two different
   * elements, so expanding Preferences re-measures without feeding itself. */
  const cardRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const root = document.documentElement;
    const card = cardRef.current;
    if (!card) {
      root.style.removeProperty("--consent-h");
      return;
    }
    const publish = () => {
      const box = card.getBoundingClientRect();
      const strip = box.height + Math.max(0, window.innerHeight - box.bottom);
      root.style.setProperty("--consent-h", `${Math.ceil(strip)}px`);
    };
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(card);
    window.addEventListener("resize", publish);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", publish);
      root.style.removeProperty("--consent-h");
    };
  }, [ready, dismissed, consent, showPrefs]);

  if (!consentRequired) return null;
  if (!ready) return null;
  /* ⚠️ needsAsking, NOT `consent !== null`. A stored record does not mean
     every purpose has been answered — see ConsentRecord in lib/consent.ts
     for the failure that replaced. */
  if (!needsAsking(consent) || dismissed) return null;

  const close = () => {
    setDismissed();
    setLocalDismissed(true);
  };

  /* Accept grants every purpose that EXISTS, rather than a hardcoded pair.
     If marketing is later removed, "Accept" must not keep granting it. */
  const acceptAll = () =>
    setConsent({
      analytics: analyticsConfigured,
      marketing: marketingConfigured,
    });

  const save = () =>
    setConsent({
      analytics: analyticsConfigured && analyticsOn,
      marketing: marketingConfigured && marketingOn,
    });

  return (
    <aside
      ref={cardRef}
      className={styles.banner}
      role="region"
      aria-label="Cookie choices"
    >
      {/* ⚠️ THE × WRITES NO CONSENT. It records only that this visitor has
          been asked, in session storage, so the banner does not reappear on
          the next route change. Nothing is enabled and nothing is refused.
          The accessible name says "without accepting" because an unlabelled
          × in a cookie notice is genuinely ambiguous, and the one thing it
          must never be read as is consent. */}
      <button
        type="button"
        className={styles.close}
        onClick={close}
        aria-label="Close without accepting"
      >
        <svg viewBox="0 0 16 16" aria-hidden focusable="false">
          <path
            d="M4 4l8 8M12 4l-8 8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <p className={styles.text}>
        {marketingConfigured
          ? "Our partners and we use cookies and other technologies to enhance your experience, measure performance, and tailor marketing."
          : "We and the services that deliver this site use cookies and similar technologies to measure how it performs. We do not use them for advertising."}{" "}
        <Link className={styles.link} href="/privacy">
          Privacy notice
        </Link>
      </p>

      {showPrefs && (
        <div className={styles.prefs}>
          <div className={styles.pref}>
            <label className={styles.prefRow}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={marketingOn}
                disabled={!marketingConfigured}
                onChange={(e) => setMarketingOn(e.target.checked)}
              />
              <span className={styles.prefName}>Marketing</span>
            </label>
            <span className={styles.prefNote}>
              {marketingConfigured
                ? "Allows storage related to advertising — Meta, TikTok and Google Ads."
                : "Not used on this site. We run no advertising or marketing cookies."}
            </span>
          </div>

          <div className={styles.pref}>
            <label className={styles.prefRow}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={analyticsOn}
                disabled={!analyticsConfigured}
                onChange={(e) => setAnalyticsOn(e.target.checked)}
              />
              <span className={styles.prefName}>Analytics</span>
            </label>
            <span className={styles.prefNote}>
              {analyticsConfigured
                ? "Allows storage related to analytics (e.g., visit durations)."
                : "Not used on this site."}
            </span>
          </div>
        </div>
      )}

      {/* Three equal tracks. Accept and Decline are the two answers and are
          identical; Preferences/Save shares their style because a control
          that opens the detail should not look like an afterthought.

          ⚠️ THE TWO ANSWERS SIT TOGETHER, at the user's instruction — Decline
          reads immediately to the right of Accept rather than across the row
          from it. Accept and Decline are the same question answered two ways,
          so the eye should not have to cross a third control to find the
          second one; Preferences opens the detail and now trails them both. */}
      <div className={styles.actions}>
        <button type="button" className={styles.button} onClick={acceptAll}>
          Accept
        </button>
        <button
          type="button"
          className={styles.button}
          onClick={() => setConsent(NO_CONSENT)}
        >
          Decline
        </button>
        <button
          type="button"
          /* the outlined variant — see the ⚠️ on .buttonOutline for why this
             control, and ONLY this control, may differ from the other two */
          className={`${styles.button} ${styles.buttonOutline}`}
          onClick={() => (showPrefs ? save() : setShowPrefs(true))}
          aria-expanded={showPrefs ? undefined : false}
        >
          {showPrefs ? "Save" : "Preferences"}
        </button>
      </div>
    </aside>
  );
}

/* ── THE WITHDRAWAL CONTROL ──
 * Rendered on the privacy page. Withdrawing has to be as easy as giving,
 * which means it must live somewhere permanent rather than in a banner that
 * is gone the moment it is answered. It shows the current state of each
 * purpose and lets either be flipped on its own.
 *
 * Turning one OFF takes effect immediately — GoogleTag and MarketingPixels
 * subscribe to the same store and unmount their scripts on the next render.
 * ⚠️ Unmounting a tag stops FURTHER events; it does not unring the bell for
 * cookies already written, which is why the copy says to clear them and
 * does not pretend otherwise. */
export function ConsentControl() {
  const [consent, setLocal] = useState<ConsentRecord | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLocal(readConsent());
    setReady(true);
    return subscribeConsent(setLocal);
  }, []);

  if (!consentRequired) return null;

  const current = consent ?? NO_CONSENT;
  const flip = (key: "analytics" | "marketing", value: boolean) =>
    setConsent({
      analytics: current.analytics,
      marketing: current.marketing,
      [key]: value,
    });

  const rows = [
    {
      key: "analytics" as const,
      label: "Analytics",
      shown: analyticsConfigured,
    },
    {
      key: "marketing" as const,
      label: "Marketing",
      shown: marketingConfigured,
    },
  ].filter((r) => r.shown);

  return (
    <div className={styles.control}>
      {rows.map((r) => (
        <div key={r.key} className={styles.controlRow}>
          <p className={styles.controlState}>
            {!ready
              ? `${r.label}: checking…`
              : consent === null
                ? `${r.label}: off — you have not made a choice yet.`
                : `${r.label}: ${current[r.key] ? "ON" : "OFF"} for this browser.`}
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.button}
              onClick={() => flip(r.key, false)}
              disabled={!ready || (consent !== null && !current[r.key])}
            >
              Turn off
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={() => flip(r.key, true)}
              disabled={!ready || current[r.key]}
            >
              Turn on
            </button>
          </div>
        </div>
      ))}
      <p className={styles.controlNote}>
        Turning a category off stops further measurement immediately. It does
        not delete cookies already stored — clear those in your browser
        settings.
      </p>
    </div>
  );
}
