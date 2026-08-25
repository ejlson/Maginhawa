/* THE SPLIT ROW'S THREE CONTROLS, DERIVED ONCE.
 *
 * ── WHY THIS FILE EXISTS ──
 * Two surfaces now print Menu · Visit · Book for the same venue: the home
 * grid's card (components/VenueCard.tsx, `actions="split"`) and the mobile
 * band list (components/Spines.tsx). They must never disagree about which
 * controls a venue HAS — a Book pill on a venue that takes no bookings is
 * the dead control this design forbids, and two spellings of one rule are
 * two rules that will drift. The derivation lived inside VenueCard until
 * the band list needed it; it is here now and VenueCard reads it too.
 *
 * ⚠️ THIS IS THE **SPLIT** PATH ONLY. It is deliberately not
 * primaryAction(): that funnel promotes SOMETHING to a fill for every
 * venue (Visit, Opening soon) because the /restaurants card and the
 * expansion always show one primary. The split's resting state is "Book,
 * or nothing", so each of the three is derived independently and renders
 * only where there is something behind it. The "row" path in VenueCard
 * still runs primaryAction() and is untouched by this file.
 *
 * What the eight resolve to today:
 *   three   bintang, ramo, belly
 *   two     guanabana (no menuPages), cafemama (not bookable)
 *   one     mamasons, hoodwood (Visit), bunso (Visit, "Opening soon")
 */
import type { Restaurant } from "./restaurants";

export type VenueAction = { label: string; href: string };

export type SplitActions = {
  /** the venue has menu pages AND somewhere for the press to go */
  menu: boolean;
  /** the venue's own website — a ghost in the set, always */
  visit: VenueAction | null;
  /** the one filled control, and only where a booking is actually takeable */
  book: VenueAction | null;
};

export function splitActions(
  r: Restaurant | undefined,
  opts: {
    /** `menuPages` on the card record — the pages themselves */
    hasMenuPages: boolean;
    /** whether the CALLER can act on a press (an overlay it owns, or an
     *  href). A menu with nothing to open it is still a dead control. */
    menuReachable: boolean;
  },
): SplitActions {
  return {
    menu: opts.hasMenuPages && opts.menuReachable,

    /* THE VENUE'S OWN SITE, on every card that has one — not just the four
       primaryAction() happens to resolve `Visit` for. Bunso keeps its
       "Opening soon" wording here: that label is content that exists
       nowhere else, demoted from a fill to a ghost because a room that has
       not opened has nothing to Book. */
    visit: r?.website
      ? { label: r.comingSoon ? "Opening soon" : "Visit", href: r.website }
      : null,

    /* BOOKABLE VENUES ONLY, and `comingSoon` is excluded on purpose —
       Bunso is `bookable: false` because it has not opened, which is not a
       booking policy. The same distinction RestaurantsShowcase draws for
       its walk-in list. */
    book:
      r?.bookable && r.bookingUrl && !r.comingSoon
        ? { label: "Book", href: r.bookingUrl }
        : null,
  };
}
