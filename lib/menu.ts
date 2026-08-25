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

/** the slug's menu page — the ONE spelling of this route */
export const menuHref = (slug: string) => `/menus/${slug}`;

/* ⚠️ THE WORDING IS THE GROUP'S, NOT OURS. It was supplied verbatim and
   should be changed only on their say-so — it is the one sentence on the
   site that limits what a printed price commits them to. */
export const MENU_DISCLAIMER =
  "Our online menu is a guide and may differ from the menu available in the restaurant. Dishes, ingredients and prices are subject to change.";

/** the label the note leads with, kept beside the sentence it introduces */
export const MENU_DISCLAIMER_LABEL = "Please note:";
