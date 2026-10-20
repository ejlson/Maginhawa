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
 *   three   bintang, guanabana, ramo, belly, bunso
 *   two     mamasons, cafemama, hoodwood (all walk-in, so no Book)
 *   none    ramo (relocating — the "Relocating" chip stands alone)
 *   (+ a "Now open" chip beside Book on bunso — see venueStatus)
 *
 * ⚠️ THIS TABLE MOVES WHEN A MENU LANDS. Guanabana, Mamasons and Hoodwood
 * all gained `menuPages` in August 2026 and each climbed a row without a
 * line of this file changing — which is the point, but it does mean the
 * table is a SNAPSHOT rather than a rule. Bunso sat alone on one control
 * (Visit, "Opening soon") until it opened in October 2026; it took a
 * booking host and an external `menuUrl` and landed on three. Its Menu is
 * the one in the set that leaves the site — see menuLink in lib/menu.ts,
 * which is where that distinction lives, not here.
 */
import type { Restaurant } from "./restaurants";
import { menuLink, type MenuLink } from "./menu";

export type VenueAction = { label: string; href: string };

export type SplitActions = {
  /** where the venue's menu is — a page here, or the venue's own online
   *  menu — and null where there is neither. See menuLink(). */
  menu: MenuLink | null;
  /** the venue's own website — a ghost in the set, always */
  visit: VenueAction | null;
  /** the one filled control, and only where a booking is actually takeable */
  book: VenueAction | null;
};

/* ⚠️ THE `opts` BAG IS GONE. It carried `hasMenuPages` (the card record's
   copy of a fact the canonical record already answers) and `menuReachable`
   (whether the caller owned an overlay to send the press to — always true
   since the menu became a route). Both answers now come out of menuLink(),
   so a caller cannot pass a reachability that disagrees with the data. */
export function splitActions(r: Restaurant | undefined): SplitActions {
  /* BETWEEN ADDRESSES: no control at all. A menu, a site or a booking host
     for a room that is not currently anywhere would each send a reader
     somewhere that cannot seat them; the "Relocating" chip (venueStatus)
     is the one thing the row prints. primaryAction() draws the same line. */
  if (r?.status === "relocating") return { menu: null, visit: null, book: null };

  return {
    menu: menuLink(r),

    /* THE VENUE'S OWN SITE, on every card that has one — not just the four
       primaryAction() happens to resolve `Visit` for. A room that has not
       opened keeps an "Opening soon" wording here, demoted from a fill to a
       ghost because there is nothing to Book yet. (No venue is in that
       state today.) */
    visit: r?.website
      ? { label: r.comingSoon ? "Opening soon" : "Visit", href: r.website }
      : null,

    /* BOOKABLE VENUES ONLY, and `comingSoon` is excluded on purpose — a
       room that has not opened is not taking bookings whatever its
       `bookable` says. The same distinction RestaurantsShowcase draws for
       its walk-in list. */
    book:
      r?.bookable && r.bookingUrl && !r.comingSoon
        ? { label: "Book", href: r.bookingUrl }
        : null,
  };
}

/* THE CHIP BESIDE (OR INSTEAD OF) THE CONTROLS — "Now open", "Relocating",
   or nothing. It is NOT a member of SplitActions: it is a label, not a
   control, and every surface seats it immediately before the Book pill
   rather than in the row's own order. "Now open" answers only where a Book
   pill will actually stand next to it — a chip with no pill to annotate
   would be a stray — and never on a room that has not opened, whatever
   `status` says. "Relocating" answers whenever the record says so: it is
   the row's only member, the controls having withheld themselves above. */
export function venueStatus(r: Restaurant | undefined): string | null {
  if (r?.status === "relocating") return "Relocating";
  return r?.status === "now-open" && !r.comingSoon && splitActions(r).book
    ? "Now open"
    : null;
}
