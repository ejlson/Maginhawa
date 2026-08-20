/* THE FACTS A LEGAL PAGE CANNOT BE WRITTEN WITHOUT — and the ones this
 * repository does not have.
 *
 * ── THREE OF THESE ARE NOW FILLED IN; ONE IS NOT ──
 * Supplied 2026-08-20 from the Companies House register. `icoReference`
 * is still null and is the one that may not be a lookup at all — see below.
 * A privacy notice under UK GDPR has to name the DATA CONTROLLER: the legal
 * entity, not the trading name. "Maginhawa Group" is a brand; the controller
 * is whatever limited company sits behind it, at its registered office. That
 * fact is not anywhere in this codebase — grepped for `limited`, `ltd`,
 * `registered`, `company number`, `VAT` and `ICO` across lib/ and
 * components/ and there is nothing. It lives on a Companies House record and
 * in somebody's filing cabinet.
 *
 * ⚠️ SO THEY ARE `null`, AND THAT IS THE POINT. The alternative was a
 * plausible-looking placeholder — "Maginhawa Group Ltd, company no.
 * 12345678" — and a privacy notice naming the wrong controller is worse than
 * one that admits it does not know, because it reads as complete and nobody
 * ever goes back to it. The pages render a visible gap instead (see
 * `LegalPage`'s `pending` treatment), which is ugly on purpose: it is a
 * to-do the reader can see, and it disappears the moment these strings are
 * filled in.
 *
 * This is the same convention `CONTACT.phone` already uses in lib/contact.ts
 * — a value that reaches nobody is dropped rather than rendered as dead text
 * — with one difference: a missing phone number is a shorter list, and a
 * missing controller is a page that is not yet doing its legal job. Hence
 * the visible marker rather than a silent omission.
 *
 * ── FILLING THESE IN IS THE WHOLE HANDOVER ──
 * Replace the nulls, set LEGAL_UPDATED to the day you did it, and both pages
 * are complete. Nothing else in app/privacy or app/terms needs touching.
 */
export const LEGAL_ENTITY = {
  /** Registered company name, exactly as filed. Companies House shows it
   *  in caps ("MAGINHAWA GROUP LTD"); the register capitalises every name
   *  that way and it is not part of the name, so it is set here in the case
   *  a reader expects to see it in a sentence. */
  companyName: "Maginhawa Group Ltd" as string | null,
  /** Companies House registration number. Verified against the register:
   *  incorporated 12 February 2025, status Active. */
  companyNumber: "16248501" as string | null,
  /** Registered office, one line per row. The register prints it as a
   *  single comma-separated string — "1a Hawley Road, Camden, London,
   *  United Kingdom, NW1 8NX" — with the country BEFORE the postcode;
   *  re-ordered here into the postal form a UK reader reads without
   *  stumbling. Same address, conventional order. */
  registeredOffice: [
    "1a Hawley Road",
    "Camden",
    "London NW1 8NX",
    "United Kingdom",
  ] as string[] | null,
  /**
   * ICO registration reference. Most UK businesses processing personal data
   * must register with the Information Commissioner's Office and pay the
   * data-protection fee; a restaurant group running a careers inbox and an
   * enquiry form is squarely in scope. If the group is not yet registered,
   * that is the action this null is really flagging.
   */
  icoReference: null as string | null,
} as const;

/**
 * The date the wording below was last changed, ISO for sorting and machine
 * reading. A legal page without one gives the reader no way to tell whether
 * they are looking at the terms they agreed to, which is the single most
 * common defect in the genre.
 *
 * ⚠️ BUMP THIS WHEN THE COPY CHANGES, not when the file is touched.
 */
export const LEGAL_UPDATED = "2026-08-20";

/** Pretty label for the same date — the site never derives one at runtime
 *  (see lib/blog.ts, which carries `date` and `dateLabel` side by side for
 *  the same reason: a static export has no request-time locale to format
 *  against, and a hydration-time `toLocaleDateString` mismatches the server). */
export const LEGAL_UPDATED_LABEL = "20 August 2026";
