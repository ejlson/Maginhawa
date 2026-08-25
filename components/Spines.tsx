"use client";

/* ═══ THE SPINES — the "Our Restaurants" chapter on a phone ═══════════════
 *
 * WHAT IT REPLACES AND WHY. Below 461px the grid is one column of
 * 358 × 294 cards: measured at 390 × 844 that is 2,418px of section, 2.86
 * screens, and about 2.3 cards on the first one. Worse, each card rested
 * with exactly ONE control — the split row renders Menu · Visit · Book and
 * collapses all but the last with `.cardBtnGhost:not(:last-child)`, and the
 * unfold is a hover, so a touch reader never saw the other two.
 *
 * This is the same eight venues as eight full-width bands: a letterboxed
 * strip of the venue's photograph under a left-to-right ramp, the wordmark
 * in the dark end, every control the venue HAS as a pill in the light end.
 * 628px closed against a 650px budget, so the whole group lands on one
 * screen with all its controls live.
 *
 * PRESS A BAND AND IT OPENS IN PLACE — to 140px, giving up its address and
 * hours, while the other seven compress to 66 (630px, still one screen).
 * The eight never leave the viewport, which is what the full-screen
 * <ExpandedCard> costs a reader on a phone: it takes the list away and
 * gives them a modal to get back out of. That expansion is desktop-only
 * now; see the swap in Discover.tsx.
 *
 * ⚠️ THE PILLS ARE THE CARD'S OWN. `.pill` composes .cardBtn / .cardBtnGhost
 * / .cardBtnFill straight out of VenueCard.module.css — the same radius,
 * the same label voice, the same hover and :active response, one spelling.
 * Do not restate a pill property here; change it there and both surfaces
 * move. The AVAILABILITY of the three is shared the same way, through
 * lib/venueActions.ts.
 *
 * ⚠️ THIS LIST IS NOT SERVER-RENDERED. Discover picks between the grid and
 * this on a matchMedia read, which has no server, so the exported HTML
 * always carries the GRID and its eight links. That is deliberate — it
 * keeps the crawlable markup identical to what it has always been — and it
 * is invisible to a reader because the chapter's top edge sits ~1,176px
 * down the page, so the swap has happened long before the section is
 * scrolled to. Same argument the Tile's `mounted` gate already makes.
 * ═══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useId, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./Spines.module.css";
import { asset } from "@/lib/media";
import { getRestaurant } from "@/lib/restaurants";
import { splitActions } from "@/lib/venueActions";
import { menuHref } from "@/lib/menu";
import type { VenueCardItem } from "@/lib/venueCards";

/* THE LETTERBOX'S OWN FOCAL POINTS, and they are a different question from
   the card's. `focal` on the card record answers "this subject is not in
   the middle of a PORTRAIT crop"; a band is 358 × 75, roughly 4.8 : 1, and
   what it cuts is almost the entire vertical. Three of the eight land on a
   frame containing the venue's own shopfront signage, so the cream
   wordmark ends up beside a photographed second copy of itself.

   ⚠️ SPINE-ONLY ON PURPOSE. Writing these into the card record would
   re-crop the 358 × 294 portrait on the grid and the 3:4 expansion, which
   are not broken. The card's own `focal` still applies where this table is
   silent — see the merge in `frame()` below.

   ── HOW TO DERIVE ONE, because guessing costs a round-trip ──
   `cover` scales the source to the band's WIDTH (every one of these is
   wider than 4.8 : 1 once fitted), so there is no horizontal crop at all
   and the X term is decorative. What matters is Y:

     shown  = 358 / imageWidth × imageHeight     (the fitted height)
     spill  = shown − 75                          (what falls outside)
     window = [spill × Y%, spill × Y% + 75] / shown   (as a fraction)

   So to clear a sign that ends at fraction `s` of the frame, Y% must
   exceed `s × shown / spill`. Measured on the source files: */
const SPINE_FOCAL: Record<string, string> = {
  /* the green fascia and its HOODWOOD sign sit across the middle of the
     frame; opening the window downward takes the shopfront's glass and
     door instead, which is the room rather than its nameplate */
  hoodwood: "50% 78%",
  /* 3000 × 2000, so 238.7 fitted and 163.7 of spill. The lit BELLY panel's
     LETTERS end at 52% of the frame, which needs Y > 75.8%; 72% put the
     window at 49–81% and the band opened on the bottom half of the word.
     84% seats it at 58–89% — the jar shelf and the wall under it. */
  belly: "50% 84%",
  /* 1600 × 900: 201.4 fitted, 126.4 of spill. The BUNSO fascia ends at 43%
     and the default centre crop showed 31–69%, i.e. all of it. 74% opens
     at 46% — under the sign, onto the lit counter and the forecourt. */
  bunso: "50% 74%",
};

export type SpineItem = VenueCardItem & { location?: string };

export default function Spines({ items }: { items: SpineItem[] }) {
  /* ⚠️ `onMenu` IS GONE FROM THIS COMPONENT'S SIGNATURE. The list used to
     take a callback and hand a slug back up to whichever page owned the
     the menu overlay. The menu is a ROUTE now (/menus/<slug>), so the band
     builds its own href from the slug it already has and the page above it
     brokers nothing. Every caller that passed `onMenu` dropped it. */
  /* WHICH BAND IS OPEN, BY SLUG rather than by index: the array's order is
     the chapter's business and a slug survives a reorder. Null closes the
     set, which is also what makes the return journey undelayed — every
     band comes back to 75 together. */
  const [open, setOpen] = useState<string | null>(null);
  const listId = useId();

  const toggle = useCallback(
    (slug: string) => setOpen((was) => (was === slug ? null : slug)),
    [],
  );

  /* ESCAPE CLOSES IT. A band that has grown is a small disclosure rather
     than a modal — nothing is trapped and nothing is covered — but the key
     is free and a reader who has just met a dialog on the same page will
     try it. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <ul
      className={styles.spines}
      aria-label="Our restaurants"
      /* the compression is a property of the LIST, not of each band: seven
         bands all doing the same thing is one attribute and a CSS
         transition, not seven pieces of state */
      data-any-open={open ? "on" : undefined}
    >
      {items.map((item) => (
        <Spine
          key={item.slug}
          item={item}
          open={open === item.slug}
          onToggle={() => toggle(item.slug)}
          panelId={`${listId}-${item.slug}`}
        />
      ))}
    </ul>
  );
}

/** the band's crop, spine table first and the card's own focal behind it */
function frame(item: SpineItem) {
  return SPINE_FOCAL[item.slug] ?? item.focal ?? "50% 50%";
}

function Spine({
  item,
  open,
  onToggle,
  panelId,
}: {
  item: SpineItem;
  open: boolean;
  onToggle: () => void;
  panelId: string;
}) {
  const rest = getRestaurant(item.slug);
  const acts = splitActions(rest, {
    hasMenuPages: Boolean(item.menuPages && item.menuPages.length > 0),
    /* ALWAYS REACHABLE NOW. This used to say "this list owns an overlay to
       send the press to"; the destination is a route every venue with
       pages has, so the answer is the same for a different reason. */
    menuReachable: true,
  });

  /* THE ADDRESS AS THE CARD PRINTS IT — lines 2 and 3 of the block, because
     line 1 is the venue's NAME and the wordmark above has already said it. */
  const address = [item.address?.road, item.address?.city].filter(Boolean);

  return (
    <li className={styles.spine} data-open={open ? "on" : undefined}>
      {item.image ? (
        /* ⚠️ THE PICTURE GETS ITS OWN PINNED BOX, and the wrapper is the
           whole point of it. `fill` writes `position:absolute; inset:0;
           height:100%` as an INLINE style: a class cannot outrank it (the
           pin sat in Spines.module.css doing nothing, and looked right only
           because 100% of a shut band is 75px anyway — it showed the moment
           a band opened, the photograph growing to 138 with it and the
           address landing on bare un-ramped picture), and setting
           `style.height` instead is a hard THROW from next/image: "Images
           with fill always use height 100% - it cannot be modified."
           So the frame is pinned and `fill` fills the frame. The picture's
           box is then identical in all three band states — one raster, and
           the band's growth is a clip the compositor does for free. See the
           block over .photo in the stylesheet for what that measured. */
        <span className={styles.frame}>
          <Image
            className={styles.photo}
            src={asset(item.image)}
            alt=""
            fill
            // one band, full measure, at every phone width
            sizes="100vw"
            style={{ objectPosition: frame(item) }}
          />
        </span>
      ) : (
        // no photograph on file: the band paints the ink field, which is
        // that venue's picture rather than an exception to the design
        <span className={styles.fallback} aria-hidden />
      )}

      {/* THE RAMP, AND ITS LIGHT END CANNOT GO AS LIGHT AS IT WANTS TO. At
          22% ink the controls landed on Hoodwood's green fascia and Ramo's
          blue door carrying a 42%-cream outline and no contrast at all.
          52% is where a ghost pill reads on all eight photographs. */}
      <span className={styles.ramp} aria-hidden />

      {/* THE PRESS TARGET IS THE WHOLE BAND and it sits UNDER the controls
          in paint order, so a thumb that lands on Book books and a thumb
          that lands anywhere else opens the band. Same arrangement the card
          keeps between .plateHit and its action row. */}
      <button
        type="button"
        className={styles.hit}
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span className="sr-only">
          {open ? `Close ${item.name}` : `${item.name} — address and hours`}
        </span>
      </button>

      <div className={styles.band}>
        <span className={styles.who}>
          {item.logo ? (
            /* THE MARK, sized from its LETTERFORMS and not from its box —
               `--la` / `--lr` are the measured optics in lib/venueCards.ts
               and the slot is cap / --lr, exactly as .cardLogo computes it.
               Fitting the whole lockup to one flat slot equalises the
               crest and the strapline along with the name, which is how
               Bintang's script ended up half the size of Bunso's wordmark. */
            <span
              className={styles.markSlot}
              role="img"
              aria-label={item.name}
              style={
                {
                  ...(item.logoAspect ? { "--la": item.logoAspect } : null),
                  ...(item.logoInkRatio ? { "--lr": item.logoInkRatio } : null),
                  /* the DRAWN box, so the slot can be the artwork rather
                     than the file — see LOGO_INK in lib/venueCards.ts */
                  ...(item.logoInkW ? { "--iw": item.logoInkW } : null),
                  ...(item.logoInkH ? { "--ih": item.logoInkH } : null),
                } as React.CSSProperties
              }
            >
              <span
                className={styles.mark}
                style={
                  { "--ov-logo-url": `url(${asset(item.logo)})` } as React.CSSProperties
                }
              />
            </span>
          ) : (
            <span className={styles.markText}>{item.name}</span>
          )}

          {/* THE NEIGHBOURHOOD, not the tagline. A band gives the who-line
              one short string and the reader of a London restaurant group's
              list on a phone is choosing by where they are; the tagline is
              what the opened band and the venue's own page are for. */}
          <span className={styles.area}>{item.address?.area ?? item.location}</span>
        </span>

        {/* ⚠️ THE ORDER IS LOAD-BEARING and it is the card's: menu → visit
            → book, members only ever OMITTED, so the last pill standing is
            always the venue's primary. It also means the reading order is
            the order of the decision — what's on, where it is, then book
            it. */}
        <span className={styles.acts}>
          {acts.menu ? (
            /* A LINK, NOT A BUTTON, and the element change is the whole
               point of the move: this navigates somewhere that exists, so
               it long-presses, opens in a new tab and copies as a URL like
               any other link on the site. A <button> could do none of it. */
            <Link
              href={menuHref(item.slug)}
              className={`${styles.pill} ${styles.pillGhost}`}
              aria-label={`Menu — ${item.name}`}
            >
              Menu
            </Link>
          ) : null}
          {acts.visit ? (
            <a
              href={acts.visit.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.pill} ${styles.pillGhost}`}
              aria-label={
                rest?.comingSoon
                  ? `${item.name} — opening soon`
                  : `Visit ${item.name}'s website`
              }
            >
              {acts.visit.label}
            </a>
          ) : null}
          {acts.book ? (
            <a
              href={acts.book.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.pill} ${styles.pillFill}`}
              aria-label={`Book — ${item.name}`}
            >
              {acts.book.label}
            </a>
          ) : null}
        </span>
      </div>

      {/* WHAT THE BAND GIVES UP WHEN IT OPENS. Kept in the DOM at all times
          and hidden with `visibility`, not unmounted: the height animates,
          and a panel that mounts on the same frame the box starts growing
          arrives mid-flight. `visibility` is also what keeps it out of the
          tab order and off the accessibility tree while shut. */}
      {/* ⚠️ NOT `hidden`, WHICH IS THE OBVIOUS SPELLING AND IS WRONG HERE.
          The `hidden` attribute is `display: none`, and a box coming out of
          display:none has no previous computed opacity to interpolate from
          — the panel simply appeared at full strength on the frame the
          attribute cleared, while the band was still growing underneath
          it. `visibility` keeps it out of the tab order and off the
          accessibility tree exactly as `hidden` does, and it is one of the
          few discrete properties CSS will still transition, so the fade
          survives. See .more in the stylesheet for the pairing. */}
      <div className={styles.more} id={panelId}>
        {address.length ? (
          <p className={styles.addr}>
            {address.map((line) => (
              <span key={line} className={styles.addrLine}>
                {line}
              </span>
            ))}
          </p>
        ) : null}
        {/* ⚠️ `hours` IS AN INVENTED PLACEHOLDER — every venue carries
            "12–11" and no real opening times exist anywhere in this repo.
            It is printed the way the card's stat prints it, as a bare
            value with no "Today", precisely because the bare form claims a
            posted time and not live data. Read the note at the top of
            lib/venueCards.ts before shipping a change to it. */}
        {item.hours ? (
          <span className={styles.hours}>
            <span className="sr-only">Opening hours </span>
            {item.hours}
          </span>
        ) : null}
      </div>
    </li>
  );
}
