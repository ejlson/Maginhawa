"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./CookieBanner.module.css";
import {
  analyticsConfigured,
  consentRequired,
  marketingConfigured,
  NO_CONSENT,
  readConsent,
  readDismissed,
  setConsent,
  setDismissed,
  subscribeConsent,
  type ConsentCategories,
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
  const [consent, setLocal] = useState<ConsentCategories | null>(null);
  const [dismissed, setLocalDismissed] = useState(false);
  const [ready, setReady] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);

  /* Both start FALSE and nothing renders them otherwise: a pre-ticked
     consent box is not consent (GDPR recital 32), so "Save" with nothing
     ticked is a refusal — which is exactly what it should mean. */
  const [analyticsOn, setAnalyticsOn] = useState(false);
  const [marketingOn, setMarketingOn] = useState(false);

  useEffect(() => {
    setLocal(readConsent());
    setLocalDismissed(readDismissed());
    setReady(true);
    return subscribeConsent(setLocal);
  }, []);

  if (!consentRequired) return null;
  if (!ready) return null;
  if (consent !== null || dismissed) return null;

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
    <aside className={styles.banner} role="region" aria-label="Cookie choices">
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
          that opens the detail should not look like an afterthought. */}
      <div className={styles.actions}>
        <button type="button" className={styles.button} onClick={acceptAll}>
          Accept
        </button>
        <button
          type="button"
          className={styles.button}
          onClick={() => (showPrefs ? save() : setShowPrefs(true))}
          aria-expanded={showPrefs ? undefined : false}
        >
          {showPrefs ? "Save" : "Preferences"}
        </button>
        <button
          type="button"
          className={styles.button}
          onClick={() => setConsent(NO_CONSENT)}
        >
          Decline
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
  const [consent, setLocal] = useState<ConsentCategories | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLocal(readConsent());
    setReady(true);
    return subscribeConsent(setLocal);
  }, []);

  if (!consentRequired) return null;

  const current = consent ?? NO_CONSENT;
  const flip = (key: keyof ConsentCategories, value: boolean) =>
    setConsent({ ...current, [key]: value });

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
