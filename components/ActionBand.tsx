import styles from "./ActionBand.module.css";

/* ── "READ MORE →", the line itself ──
   Factored out because the band sets it TWICE — once in maroon on the
   cream and once in cream inside the sweep panel — and the two have to be
   the same glyphs at the same size or the wipe reads as a swap rather than
   as a colour change. See .sweep in the stylesheet.

   The label is wrapped so its text box can be trimmed to the cap-to-
   baseline band — see .label for the measurements that made a plain text
   node insufficient. */
function ActionLine() {
  return (
    <>
      <span className={styles.label}>Read More</span>
      <svg
        className={styles.arrow}
        viewBox="0 0 32 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M0 5 H26" />
        <path d="M22 1 L26 5 L22 9" />
      </svg>
    </>
  );
}

/**
 * ═══ THE ACTION BAND — the control both journal cards close on ═══
 *
 * A label at one end and an arrow at the other, the full width of the
 * card, sitting between two hairlines the CARD owns. Hover the link that
 * contains it and a maroon panel wipes downward from the rule above to the
 * rule below, carrying a cream copy of the line with it.
 *
 * ⚠️ IT IS A SPAN, NEVER AN ANCHOR. On both surfaces the whole card is the
 * link, and nesting anchors is invalid. `aria-hidden` for the same reason:
 * the card's accessible name is already its headline, and announcing "Read
 * More" after it would offer the same link twice.
 *
 * ── THE CONTRACT WITH THE CARD ──
 * Three things have to be true of wherever this is placed, and the band
 * cannot check any of them:
 *
 *   1. an ancestor <a> — the hover and focus states key off it, which is
 *      how one stylesheet drives a control on two pages whose card classes
 *      are hashed into different modules;
 *   2. a hairline immediately above and below it, separated from the band
 *      by --entry-band;
 *   3. --entry-gap and --entry-band declared on the card's body — see the
 *      note over .band for what the margin computed from them is doing.
 *
 * Shared rather than copied because the two surfaces' copies WOULD drift:
 * the home page's strip and /blog's archive grid are different widths, and
 * this is the one part of the card that is meant to be identical at both.
 */
export default function ActionBand() {
  return (
    <span className={styles.band} aria-hidden>
      <ActionLine />

      {/* ⚠️ THE LINE IS SET TWICE, AND THE SECOND COPY IS THE WHOLE POINT.
          The band fills maroon on hover, and maroon type on a maroon ground
          is not type. The alternative — one line whose `color` flips to
          cream on a delay — is a hard cut in the middle of a 400ms wipe,
          and the word is illegible for whichever half of the sweep the
          delay guesses wrong.

          So the panel and a CREAM copy of the line sit in one box and ONE
          clip-path reveals both together: the ink changes colour exactly
          where the edge is, because it IS the edge. */}
      <span className={styles.sweep}>
        <span className={styles.ink}>
          <ActionLine />
        </span>
      </span>
    </span>
  );
}
