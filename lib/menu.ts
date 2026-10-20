/* THE MENU'S TWO SHARED FACTS — the standing note, and where a menu lives.
 *
 * ── WHY THIS FILE EXISTS ──
 * The menu used to be an overlay that four surfaces mounted, so "what the
 * menu says" and "how you get to it" were both answered inside one
 * component. It is a ROUTE now (app/menus/[slug]), which means the note is
 * printed by the page while the four surfaces print links to it — five
 * places, and nothing structural keeping them in step.
 *
 * Both constants are here so that a change to either is a one-line change.
 * The href in particular: `/menus/<slug>` is spelled in VenueCard, Spines,
 * Discover and RestaurantsShowcase, and a route that moves without them is
 * four dead controls that still look alive.
 */

import type { Restaurant } from "./restaurants";

/** the slug's menu page — the ONE spelling of this route */
export const menuHref = (slug: string) => `/menus/${slug}`;

/** where a Menu control goes, and whether it leaves the site */
export type MenuLink = { href: string; external: boolean };

/* WHERE A VENUE'S MENU IS — the one rule behind every Menu control.
 *
 * Pages on file win and go to the route above. A venue with none but with
 * a `menuUrl` of its own (Bunso, since it opened in October 2026 with no
 * artwork supplied) sends the reader to that menu in a new tab, the way
 * every Visit and Book control already leaves the site. Neither and there
 * is no control: a Menu pill with nothing behind it is the dead control
 * this design forbids.
 *
 * It is here rather than in each surface because the alternative was the
 * same ternary in VenueCard, Spines, Discover and RestaurantsShowcase —
 * four spellings of one rule, the exact drift menuHref() exists to stop.
 * ⚠️ IT DOES NOT DECIDE THE ROUTE TABLE. withMenus() in lib/restaurants.ts
 * does, on `menuPages` alone; an external menu is a link, not a page. */
export function menuLink(r: Restaurant | undefined): MenuLink | null {
  if (!r) return null;
  if (r.menuPages?.length) return { href: menuHref(r.slug), external: false };
  if (r.menuUrl) return { href: r.menuUrl, external: true };
  return null;
}

/* ⚠️ THE WORDING IS THE GROUP'S, NOT OURS. It was supplied verbatim and
   should be changed only on their say-so — it is the one sentence on the
   site that limits what a printed price commits them to. */
export const MENU_DISCLAIMER =
  "Our online menu is a guide and may differ from the menu available in the restaurant. Dishes, ingredients and prices are subject to change.";

/** the label the note leads with, kept beside the sentence it introduces */
export const MENU_DISCLAIMER_LABEL = "Please note:";
