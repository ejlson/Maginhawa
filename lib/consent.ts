/* ── WHETHER THIS VISITOR HAS AGREED TO ANALYTICS COOKIES ──
 *
 * One fact, one home. The banner writes it, the GA4 loader reads it, the
 * privacy page offers a way to change it, and none of the three may keep
 * its own copy — a site that shows the banner again after you accepted, or
 * keeps measuring after you declined, is doing so because that fact lived
 * in two places.
 *
 * ── IT IS localStorage, NOT A COOKIE, AND THAT IS DELIBERATE ──
 * A consent record is generally treated as "strictly necessary" and so is
 * exempt from needing consent itself — but writing a cookie in order to
 * remember that someone REFUSED cookies is a bad look and an argument
 * nobody wants to have. localStorage sidesteps it: nothing is sent to any
 * server, on any request, ever. It also cannot be read by the analytics
 * script, which is the point.
 *
 * ── null IS A REAL STATE AND IS NOT "denied" ──
 * Three states, not two: granted, denied, and NOT YET ASKED. Collapsing the
 * third into "denied" would be convenient and would make the banner
 * impossible to show. Every consumer has to handle null.
 *
 * ⚠️ THE VERSION IN THE KEY IS LOAD-BEARING. If the site ever starts using
 * cookies for a NEW purpose, the old "granted" no longer covers what is
 * being asked — consent is specific to a purpose, so it cannot be inherited
 * across a change of scope. Bumping this key re-asks everyone, which is the
 * correct behaviour and the only honest one.
 */
export type ConsentState = "granted" | "denied";

/* ── TWO PURPOSES NOW, NOT ONE ──
 * `analytics` is GA4. `marketing` is the Meta pixel, the TikTok pixel and
 * the Google Ads tag — three products, one purpose, because that is the
 * granularity a reader can actually reason about. Nobody wants a banner
 * with a switch per vendor. */
export type ConsentCategories = {
  analytics: boolean;
  marketing: boolean;
};

export const NO_CONSENT: ConsentCategories = {
  analytics: false,
  marketing: false,
};

export type CategoryKey = keyof ConsentCategories;

/* ── THE RECORD REMEMBERS WHAT IT WAS ASKED, NOT JUST WHAT WAS ANSWERED ──
 *
 * `asked` is the list of purposes that existed on screen at the moment this
 * visitor answered. Without it a stored record is ambiguous in a way that
 * quietly breaks the site months later:
 *
 *   Today there are no pixels, so the banner offers ANALYTICS only and a
 *   reader accepts → {analytics: true, marketing: false}. Three months
 *   later a Meta pixel is configured. `readConsent()` returns a record,
 *   the banner sees "already answered" and never appears again — and that
 *   reader is never asked about marketing FOR AS LONG AS THE RECORD LIVES.
 *   `marketing: false` is honoured, so nothing unlawful happens; they
 *   simply lose the ability to opt in, permanently and invisibly.
 *
 * With `asked`, "false because they refused" and "false because nobody
 * asked" stop looking identical, and `needsAsking()` below re-opens the
 * banner for exactly the people who have a new question to answer.
 *
 * ⚠️ THIS IS WHY ADDING A PIXEL NO LONGER REQUIRES BUMPING CONSENT_KEY.
 * The key bump was the blunt instrument for this problem — it works by
 * re-asking EVERYONE, including people whose existing answers are still
 * perfectly valid. This re-asks only those with an unanswered purpose, and
 * it happens on its own. Bump the key only if the MEANING of an existing
 * category changes, which is a different event entirely. */
export type ConsentRecord = ConsentCategories & { asked: CategoryKey[] };

/* ⚠️ v2, AND THE BUMP IS THE WHOLE POINT — DO NOT "MIGRATE" v1.
 *
 * v1 stored a single "granted"/"denied" and it meant ANALYTICS, because
 * analytics was the only thing this site did. Marketing pixels are a new
 * purpose, and consent under UK GDPR is specific to the purpose it was
 * given for: someone who agreed to being counted did not agree to being
 * retargeted on Instagram. Carrying their "granted" across would be
 * manufacturing consent they never gave, for the vendor with the sharpest
 * regulatory attention on it.
 *
 * So v1 is not read, not mapped, and not upgraded. Every visitor is asked
 * again. That is the cost of adding a purpose and it is supposed to be —
 * the key was versioned in the first place so that this would be a
 * one-character change rather than an argument.
 *
 * The old key is left in place rather than deleted: clearing storage the
 * reader did not ask us to touch buys nothing, and it is dead the moment
 * they answer the new banner. */
export const CONSENT_KEY = "mg-consent-v2";

/* Every read and write is wrapped. Safari in Lockdown/private mode, and any
   browser with site data disabled, THROWS on localStorage access rather than
   returning null — the same defensive shape components/Loader.tsx already
   uses for its sessionStorage read. A visitor whose browser refuses storage
   is treated as "not yet asked": they will see the banner each visit, which
   is the conservative outcome, and nothing is ever measured. */
export function readConsent(): ConsentRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<ConsentRecord>;
    /* Coerced field by field rather than trusted. This value is stored in
       the reader's own browser, so it is editable by hand and by any
       extension — a malformed or half-written record must read as "not yet
       asked", never as a grant. `=== true` is what makes anything other
       than an explicit true fall to false. */
    return {
      analytics: v?.analytics === true,
      marketing: v?.marketing === true,
      /* An older record (written before `asked` existed) has none. Treating
         that as "asked about nothing" would re-prompt every visitor once,
         which is the wrong default for a field added to fix a future
         problem — so a legacy record is read as having answered whatever it
         has values for, i.e. everything that existed when it was written.
         In practice that is `analytics`, the only purpose there has ever
         been at the time of writing. */
      asked: Array.isArray(v?.asked)
        ? (v.asked.filter(
            (k): k is CategoryKey => k === "analytics" || k === "marketing",
          ) as CategoryKey[])
        : (["analytics"] as CategoryKey[]),
    };
  } catch {
    /* unreadable storage OR unparseable JSON — both mean we do not know
       what this visitor wants, which is not the same as them refusing, so
       the banner asks again */
    return null;
  }
}

/* The listener set is what keeps the banner, the GA loader and the privacy
   page's control in step WITHIN one tab — a `storage` event only fires in
   OTHER tabs, so a same-tab subscriber would never hear about a change
   without this. Both paths are wired below. */
const listeners = new Set<(v: ConsentRecord | null) => void>();

export function setConsent(value: ConsentCategories): void {
  /* `asked` is stamped HERE rather than passed in, so no caller can forget
     it and no caller can lie about it: it is always exactly the set of
     purposes this build actually offers. */
  const record: ConsentRecord = { ...value, asked: configuredCategories() };
  try {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify(record));
  } catch {
    /* storage refused — the choice still takes effect for THIS page view
       through the listeners below; it simply will not be remembered. Better
       than dropping the click entirely. */
  }
  listeners.forEach((fn) => fn(record));
}

export function subscribeConsent(
  fn: (v: ConsentRecord | null) => void,
): () => void {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => {
    if (e.key === CONSENT_KEY) fn(readConsent());
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}

/* ── "CLOSED WITHOUT ANSWERING" IS NOT A THIRD CONSENT STATE ──
 *
 * The banner has an × because the design asked for one, and it writes
 * NOTHING to the consent store — closing a cookie notice is not consent and
 * it is not refusal either. What it writes instead is a note, in SESSION
 * storage, that this visitor has already been asked once.
 *
 * ⚠️ THE STORAGE CHOICE IS THE WHOLE BEHAVIOUR. sessionStorage is discarded
 * when the tab closes, so the × quietens the banner for the current visit
 * and it returns on the next one. localStorage would make × a permanent
 * silent refusal, which sounds kind and is worse: it lets a reader opt out
 * of ever being asked by clicking the one control whose meaning they did
 * not have to read, and we would never know whether they meant it.
 *
 * Without it, the banner would reappear on the very next route change,
 * because `readConsent()` is still null — which is a nag, not a choice. */
const DISMISS_KEY = "mg-consent-asked-v1";

export function readDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function setDismissed(): void {
  try {
    window.sessionStorage.setItem(DISMISS_KEY, "1");
  } catch {
    /* storage refused — the banner closes for this render either way */
  }
  listeners.forEach((fn) => fn(readConsent()));
}

/* THE MEASUREMENT ID, AND THE SWITCH THAT TURNS THIS WHOLE FEATURE OFF.
 *
 * `NEXT_PUBLIC_` is INLINED AT BUILD TIME, so a host must set this as a
 * BUILD variable — set only at runtime it will read as undefined and
 * nothing will happen. That is the same trap next.config.mjs documents for
 * NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, and it fails the same silent way.
 *
 * ⚠️ NO ID MEANS NO BANNER. Not "a banner that measures nothing" — no
 * banner at all. Asking someone to consent to analytics that are not
 * configured is asking a question with no meaning, and it would put a
 * cookie prompt in front of every reader of a site that sets no cookies.
 * Deleting the variable is therefore a complete rollback: no gtag, no
 * banner, and the privacy notice's cookie section hides itself to match.
 */
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

/* ── THE THREE MARKETING IDS ──
 * Each is independent and each is inert without its own variable, exactly
 * like GA_ID. That matters more here than it did for analytics: these will
 * arrive one at a time as campaigns are actually funded, and setting up a
 * Meta pixel should not require having a TikTok one.
 *
 *   ADS_ID     Google Ads conversion ID, "AW-XXXXXXXXX". Rides the SAME
 *              gtag.js as GA4 — see components/GoogleTag.tsx for why the
 *              two products share one loader and must not have two.
 *   META_ID    Meta (Facebook/Instagram) pixel ID — 15-ish digits.
 *   TIKTOK_ID  TikTok pixel ID — alphanumeric.
 */
export const ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
export const TIKTOK_PIXEL_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;

export const analyticsConfigured = Boolean(GA_ID);

/* Whether the MARKETING category exists at all. If no pixel is configured
   the banner must not offer a switch for it and the privacy notice must not
   describe it — a consent choice over nothing is noise, and a cookie table
   listing cookies that are never set is a false statement. */
export const marketingConfigured = Boolean(
  ADS_ID || META_PIXEL_ID || TIKTOK_PIXEL_ID,
);

/* The banner appears if there is ANY purpose to ask about. */
export const consentRequired = analyticsConfigured || marketingConfigured;

/* Which purposes this build actually has something behind. Order is the
   order the banner lists them in. */
export function configuredCategories(): CategoryKey[] {
  const out: CategoryKey[] = [];
  if (marketingConfigured) out.push("marketing");
  if (analyticsConfigured) out.push("analytics");
  return out;
}

/* ⚠️ THE BANNER'S ONE CONDITION. Not `consent === null` — that was the bug
   described on ConsentRecord above. A visitor needs asking if they have no
   record at all, OR if any purpose now configured was not on screen when
   they last answered. Everything else about their previous answer stands. */
export function needsAsking(record: ConsentRecord | null): boolean {
  if (!consentRequired) return false;
  if (record === null) return true;
  return configuredCategories().some((c) => !record.asked.includes(c));
}
