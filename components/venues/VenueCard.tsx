"use client";

import Image from "next/image";
import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, type MotionProps } from "framer-motion";
import styles from "./VenueCard.module.css";
import { getRestaurant, primaryAction } from "@/lib/restaurants";
import { splitActions } from "@/lib/venueActions";
import type { VenueCardItem } from "@/lib/venueCards";
import { asset } from "@/lib/media";

/* ═══════════════════════ THE VENUE CARD ═══════════════════════════════
   ONE CARD, NOT TWO OBJECTS. This design started as a photograph with a
   detached block of type under it on the page's cream — a reader saw a
   picture and then a caption, and eight of those at eight different
   heights read as a masonry wall. The card is a single object: a
   full-bleed photograph, a photo-derived ramp seated in its bottom edge
   carrying the facts and the actions, the venue's mark bare and large on
   the picture in the top-left corner, and a soft shadow holding the whole
   thing off the page.

   THIS COMPONENT IS `.cardSurface` AND INWARD, AND NOTHING OUTSIDE IT.
   The SEAT — the box that gives the card its aspect — belongs to the page,
   because the two grids need different things from it: the home grid's
   seat carries framer's `layoutId` (the expansion morphs out of that
   rectangle) and a `data-plate` index (the assembly intro's flight lands
   on it), and its aspect is 3 : 4.3; /restaurants' seat is a plain
   `aspect-ratio: 1` box. A component that owned the seat would have to
   own both, and the transform this card puts on itself under the pointer
   must NOT live on the measured box — that is a bug this card has already
   shipped once, when the lift lived on a <button> wrapping the plate and
   a morph opened mid-hover measured a 1%-too-big rectangle.

   THE SQUARE VARIANT is one class. Everything that has to know the card's
   aspect reads a custom property, and `.square` is the only place their
   square values are written — see the long derivation in
   VenueCard.module.css.

   MOTION IS INJECTED, NOT OWNED, AND NOBODY INJECTS ANY TODAY. The three
   beat props exist because the home grid used to build the card during its
   assembly intro — the ramp and the crown on one beat, the block's type on
   the next, the controls last. That intro is deleted, so both grids now
   pass nothing and all three default to `{}`; the card simply renders and
   takes its entrance from whatever the page moves its seat with. The props
   stay because the staging they describe is a page's decision, not the
   card's. Two things about the shape are load-bearing rather than
   stylistic, and they hold whether or not a beat is ever passed again:
     · the RAMP'S TWO LAYERS take the beat SEPARATELY. They are siblings
       and not children of one wrapper because `backdrop-filter` samples
       its nearest backdrop ROOT, and any ancestor with opacity < 1 becomes
       one — a wrapper carrying the fade would leave the blur sampling an
       empty backdrop for the whole of it, i.e. the card's colour would
       snap in at the end. An element's OWN opacity does not do that.
     · they are `motion.div` even when nothing is passed. Swapping the
       element type on a prop would remount the subtree, and on the home
       grid that subtree is mid-flight.
   ═══════════════════════════════════════════════════════════════════ */

/* THE TWO STAT GLYPHS, inline rather than from a sprite or an icon font.
   They are 11px of stroke on a card that already ships a photograph and
   sometimes a video clip; a request for either would be a network round
   trip for 400 bytes of path data.

   `aria-hidden` on both: the meaning is carried by the visually-hidden
   words beside them (.srOnly), because the design deliberately has no
   visible label under the value and a title on the <svg> would announce
   the icon rather than the datum. `currentColor` throughout, so both
   inherit the value's colour and there is one place to change it. */
/* PriceGlyph — a coin, drawn rather than a "£" so it did not repeat the
   "££" beside it — stood here and went with `priceRange`. It is deleted
   rather than left unused: nothing renders it now, and a dead 400-byte
   inline SVG on a card that already ships a photograph is exactly the
   weight the note above argues against. It is in git if the datum ever
   comes back. */
function HoursGlyph() {
  return (
    <svg
      className={styles.statIcon}
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden
      focusable="false"
    >
      {/* a clock, hands at 12 and 4 — a neutral reading, deliberately not
          a time anyone could mistake for the venue's actual hours */}
      <circle cx="6" cy="6" r="4.6" stroke="currentColor" strokeWidth="1.1" />
      <path
        d="M6 3.4V6l1.9 1.1"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export type VenueCardProps = {
  item: VenueCardItem;
  /** the 1:1 variant (/restaurants). Omitted = the 3 : 4.3 portrait. */
  square?: boolean;
  /** next/image `sizes`. The PAGE knows its own column count; the card
   *  does not, and a wrong `sizes` is a 4K decode on a 220px box. */
  sizes: string;
  /** above-the-fold cards on a grid that is visible on arrival */
  priority?: boolean;
  /** a press anywhere on the card that is not a control. Omitted and no
   *  pressable layer renders at all — a card with nothing behind it must
   *  not advertise a cursor. */
  onPress?: () => void;
  /** what the pressable announces, e.g. "Open Bintang" */
  pressLabel?: string;
  /** what the press OPENS, when it opens something rather than going
   *  somewhere. The home grid's press expands the card into a modal, so its
   *  button has to say `aria-haspopup="dialog"`; /restaurants' press
   *  navigates to the venue's page, where the same attribute would be a
   *  lie. It is therefore per-page rather than baked in. */
  pressHasPopup?: React.AriaAttributes["aria-haspopup"];
  /** THE SECONDARY CONTROL — a cream outline pill that renders only where
   *  the venue actually carries `menuPages`, because a "Menu" pill on a
   *  venue with no menu on file is the dead control this design forbids.
   *
   *  ⚠️ IT IS A LINK, AND `onMenu` IS GONE. This prop used to have a
   *  callback twin for the pages that mounted a <MenuOverlay>; that
   *  component no longer exists. The menu is a route (/menus/<slug>, built
   *  by lib/menu) and both grids pass an href, so there is one branch here
   *  instead of two. */
  menuHref?: string;
  /** short muted clip that wipes open from the cursor on hover. Hover
   *  furniture: touch never sees it and nothing depends on it. */
  clip?: string;
  /** the story, on hover, seated on the block's top edge */
  blurb?: string;
  /** the staged-intro beats — see the banner. `{}` on a page that stages
   *  nothing, which is the default. */
  furnitureMotion?: MotionProps;
  glassMotion?: MotionProps;
  actionMotion?: MotionProps;
  /** HOW THE ACTION ROW BEHAVES. "row" (the default) is today's shape —
   *  every control visible at rest, primaryAction() picking the fill —
   *  and is byte-identical in behaviour for /restaurants and the
   *  expansion. "split" is the home grid's: a single cream Book pill at
   *  rest (or nothing, for a venue with no booking), splitting into
   *  Menu / Visit / Book on hover or focus-within. See VenueBlock. */
  actions?: "row" | "split";
  /** the warm photographic grade — a static filter + multiply wash over
   *  the picture and the hover film only, never the type or the pills.
   *  Opt-in so /restaurants stays ungraded; the home grid passes it. */
  grade?: boolean;
};

export default function VenueCard({
  item,
  square,
  sizes,
  priority,
  onPress,
  pressLabel,
  pressHasPopup,
  menuHref,
  clip,
  blurb,
  furnitureMotion = {},
  glassMotion = {},
  actionMotion = {},
  actions = "row",
  grade,
}: VenueCardProps) {
  const reduce = useReducedMotion();

  /* THE BLOCK'S OWN DERIVATIONS — the action, the menu control and the two
     stats — MOVED INTO <VenueBlock> with the markup that prints them. The
     home page's expansion renders that block too now, and a derivation left
     up here would have had to be done a second time over there, which is
     exactly how the expansion came to disagree with the card in the first
     place. See the banner on VenueBlock. */

  /* ── HOVER FILM ──
     NOTHING HERE MAY RE-RENDER THIS CARD. On the home grid the seat above
     carries a `layoutId`, so every render is a layout re-measure — and a
     re-measure taken mid-hover is what once threw the photograph off
     screen. The film is therefore driven entirely through the DOM: no
     state, no render, no projection.

     The element is present from mount but EMPTY — `preload="none"` and no
     `src` at all — so the clips cost nothing until a pointer asks for one.
     The source is attached on first hover, and it is revealed on `playing`
     and not a moment before: with nothing buffered the element has nothing
     to draw when the pointer arrives, and fading it in on hover alone
     crossfaded the photograph into an empty box for as long as the fetch
     took, which read as the picture vanishing under the cursor. A clip
     that never loads simply never appears. */
  const [canHover, setCanHover] = useState(false);
  useEffect(() => {
    setCanHover(window.matchMedia("(hover: hover) and (pointer: fine)").matches);
  }, []);
  const clipRef = useRef<HTMLVideoElement>(null);
  // is the pointer STILL on the card? `playing` can arrive long after the
  // pointer has left, and a film that fades up over an unhovered plate is
  // worse than one that never plays
  const wantClip = useRef(false);
  const filmable = Boolean(clip) && canHover && !reduce;

  /* Where the pointer crossed the card's edge, as percentages of it. The
     wipe opens from there, so the film arrives at the point the reader
     actually touched rather than always from the middle. Stored on the
     element as custom properties — a ref, not state, for the reason
     above. */
  const onEnter = (e: React.MouseEvent) => {
    const v = clipRef.current;
    if (!filmable || !v) return;
    wantClip.current = true;
    const host = v.parentElement;
    if (host) {
      const r = host.getBoundingClientRect();
      if (r.width && r.height) {
        v.style.setProperty("--wipe-x", `${((e.clientX - r.left) / r.width) * 100}%`);
        v.style.setProperty("--wipe-y", `${((e.clientY - r.top) / r.height) * 100}%`);
      }
    }
    // the CDN URL when one is configured; `clip` itself stays the raw
    // path, since it is also what `filmable` and the record are keyed on
    if (!v.src) v.src = asset(clip!);
    void v.play().catch(() => {});
  };
  const onLeave = () => {
    const v = clipRef.current;
    wantClip.current = false;
    if (!v) return;
    // back to the resting class, whose clip is already OPEN — so this is a
    // fade-out of a full frame, not a circle collapsing into the cursor
    v.classList.remove(styles.hoverClipOn, styles.hoverClipEnter);
    v.pause();
  };
  const onClipPlaying = () => {
    const v = clipRef.current;
    if (!wantClip.current || !v) return;
    /* TWO CLASSES AND A FORCED FLUSH between them. Going straight to the
       open state would transition from the RESTING clip, which is already
       open — i.e. no visible wipe at all. The enter class pinches the
       circle at the cursor with `transition: none`, reading offsetWidth
       commits that as a real style, and only then does the open class
       animate. */
    v.classList.add(styles.hoverClipEnter);
    void v.offsetWidth;
    v.classList.remove(styles.hoverClipEnter);
    v.classList.add(styles.hoverClipOn);
  };

  return (
    <div
      className={`${styles.cardSurface}${square ? ` ${styles.square}` : ""}`}
      data-grade={grade ? "on" : undefined}
      onMouseEnter={filmable ? onEnter : undefined}
      onMouseLeave={filmable ? onLeave : undefined}
    >
      {item.image ? (
        <Image
          className={styles.photo}
          style={item.focal ? { objectPosition: item.focal } : undefined}
          src={item.image}
          // DECORATIVE. The venue is named twice already — by the mark
          // above (role="img", the venue's name) and by the block's first
          // line, which is real text. A third announcement of the same
          // word is noise on a screen reader.
          alt=""
          fill
          sizes={sizes}
          priority={priority}
        />
      ) : (
        // the photo-less card (Bunso today) — a deep maroon field. NOT an
        // exception to the design: it gets the same bare mark, the same
        // ramp, the same block and the same control. The field is simply
        // the picture it has, and it reads as a plate still waiting for
        // its photograph, which is true.
        <div className={styles.fallback} aria-hidden />
      )}

      {/* the hover film — empty until a pointer asks for it, then faded in
          once it is genuinely playing. Both are done on the element
          itself; see the handlers above for why this must not render. */}
      {filmable ? (
        <video
          ref={clipRef}
          className={styles.hoverClip}
          muted
          loop
          playsInline
          preload="none"
          onPlaying={onClipPlaying}
        />
      ) : null}

      {/* HOVER SHADE, not a resting scrim. The card's resting furniture
          carries its own grounds — the mark has a corner wash, the sticker
          is an opaque mark, the type sits on the ramp — so the ink only
          comes up under the pointer, where the blurb needs a ground the
          film cannot guarantee. A plain div with CSS-owned opacity: an
          inline opacity from framer would beat any :hover rule. */}
      <div
        className={styles.hoverShade}
        aria-hidden
        /* ⚠️ A HOVER STATE, NOT AN ENTRANCE — it must STAY hidden when the
           page is read without JavaScript. The chapter around it is
           tagged data-entrance="scope", which restores everything inside
           it; this opts back out. See app/layout.tsx. */
        data-entrance="hold"
      />

      {/* ═══ THE RAMP — the card's bottom material. TWO STACKED LAYERS,
          both pointer-transparent, both painted UNDER everything the
          reader reads. Layer one samples the PHOTOGRAPH through a 34px
          backdrop blur and hands its colour back, so a warm card goes warm
          and a green one goes green because their own pictures do. Layer
          two is a NEUTRAL black scrim that only darkens. No brand tint
          anywhere in it and no edge anywhere in it — the blur's mask and
          the scrim's gradient both start at zero and ramp, so there is no
          line to find.

          TWO SIBLINGS, NOT A PARENT WITH TWO CHILDREN, and the reason is
          in the banner at the top of this file. Do not wrap them. ═══ */}
      <motion.div className={styles.rampBlur} aria-hidden {...furnitureMotion} />
      <motion.div className={styles.rampScrim} aria-hidden {...furnitureMotion} />

      {/* THE PRESSABLE, covering the whole card and sitting UNDER the
          furniture. It is a LAYER rather than a wrapper because the card's
          controls are anchors, and an anchor inside a button is invalid
          content with unpredictable activation. The crown and the block
          above are pointer-transparent, the controls inside take their own
          clicks back, and every other pixel of the card lands here.
          A page that gives the card nothing to do renders no layer at all
          rather than an inert one with a pointer cursor. */}
      {onPress ? (
        <button
          type="button"
          className={styles.plateHit}
          onClick={onPress}
          aria-haspopup={pressHasPopup}
          aria-label={pressLabel ?? item.name}
        />
      ) : null}

      {/* THE CROWN — the card's top corner furniture, as a flex row rather
          than two absolutely-seated corners. The mark is at the left and
          the credential at the right, and a row that space-betweens them
          with the mark allowed to shrink is what makes the collision
          STRUCTURALLY impossible instead of merely unlikely at the widths
          anyone happened to measure. */}
      <motion.div className={styles.cardCrown} {...furnitureMotion}>
        {item.logo ? (
          /* THE VENUE'S MARK — THE CARD'S IDENTITY, not a watermark.
             Top-left, on nothing: no chip, no capsule, no plate, and no
             drop-shadow. Its whole legibility budget is the corner wash on
             .cardCrown::before, which is sized so it does not need one;
             do not reintroduce a shadow here to "help", because two
             grounds on one mark is how the frosted pill came back last
             time.

             STILL TWO ELEMENTS: the outer is the flex slot that yields
             width to the sticker, the inner is the mask.

             role="img" WITH THE VENUE'S NAME. The block below names the
             venue in text as well, and that is not a duplicate worth
             fixing: one is a logotype a reader recognises and the other is
             the string search and a screen reader need. Announcing the
             mark is what makes the picture mean something.

             `--la` / `--lr` ARE THE MARK'S MEASURED OPTICS (see LOGO_OPTICS
             in lib/venueCards.ts): its intrinsic aspect, and the fraction
             of its box the LETTERFORMS occupy. The crown sizes the slot as
             cap / --lr, so every venue's name renders at the same height
             whatever furniture its lockup carries around it. Absent on a
             venue with no measurement, where the CSS fallbacks keep the
             old flat-slot behaviour. */
          <span
            className={styles.cardLogo}
            role="img"
            aria-label={item.name}
            style={
              {
                ...(item.logoAspect ? { "--la": item.logoAspect } : null),
                ...(item.logoInkRatio ? { "--lr": item.logoInkRatio } : null),
              } as React.CSSProperties
            }
          >
            <span
              className={styles.cardLogoMark}
              style={{ "--ov-logo-url": `url(${asset(item.logo)})` } as React.CSSProperties}
            />
          </span>
        ) : (
          // no mark on file: the row still needs a left item or the
          // sticker would swing over to the left edge
          <span aria-hidden />
        )}

        {/* the Michelin credential as a STICKER on the top-right —
            slightly rotated, like it was pressed onto the photograph.
            Served through next/image rather than a raw tag: the source
            mark is 2965² (8.8 megapixels) and this box is 64px, and
            unoptimised the browser decodes the whole thing and scales it
            down on the exact frame the marks are revealed. */}
        {item.badge ? (
          <span className={styles.stickerBadge} title={item.badgeLabel}>
            <Image
              src={item.badge}
              alt={item.badgeLabel ?? ""}
              width={128}
              height={128}
              sizes="128px"
              draggable={false}
            />
          </span>
        ) : null}
      </motion.div>

      {/* the photograph's own area — everything above the block, and
          nothing else. A real flex child rather than an inset because the
          block is `flex: none` and something has to take the remaining
          height. Empty by design: the hover blurb lives in the block. */}
      <div className={styles.cardTop} />

      {/* THE BLOCK — the type that sits ON the ramp: a three-line address,
          two slim stats, a hairline, and the controls. It carries NO
          material of its own; the ramp above is the ground, and a second
          one stacked here would put back the one thing the ramp exists to
          remove — a locatable edge.

          THE VENUE NAME IS NOT A DISPLAY HEADLINE HERE. The mark in the
          corner reads the venue's name in its own lettering; the block's
          first line is the same word as TEXT, at 700, which is a different
          job (search, screen readers, anyone who does not recognise a
          logotype) and not the same word twice in two typefaces.

          Pointer-transparent so the card underneath stays pressable; the
          controls inside take their clicks back. */}
      <motion.div className={styles.glass} {...glassMotion}>
        <VenueBlock
          item={item}
          hoverBlurb={blurb}
          /* NO `addressLines`, AND THAT IS THE CARD'S WHOLE FORM NOW, at the
             user's instruction: the postal address and the opening-hours stat
             are off the card, the hairline that divided them from the
             controls goes with them, and the venue's name and tagline move
             DOWN into the row the address used to hold. What is left is a
             mark in the top-left, a name and a description in the bottom-left
             and the controls in the bottom-right — one row of type instead of
             three. The block halves in height (112px → ~63px on the desktop
             card), which is why the ramp behind it came down too; see
             `--vc-ramp-h` in VenueCard.module.css.

             THE EXPANSION STILL PASSES ONE — it has the height for the whole
             record, and it is the object a reader opens to get exactly the
             facts this card no longer prints. */
          menuHref={menuHref}
          actionMotion={actionMotion}
          actions={actions}
        />
      </motion.div>
    </div>
  );
}

/* ═══════════════════ THE BLOCK, AND BOTH OBJECTS WEAR IT ═══════════════
   The type that stands ON the ramp: who this is, the two facts about it, a
   hairline, then where it is and what to do. It carries NO material of its
   own — the ramp above is the ground, and a second one stacked here would
   put back the one thing the ramp exists to remove, a locatable edge.

   IT IS A COMPONENT BECAUSE THE HOME PAGE'S EXPANSION RENDERS IT TOO. Press
   a card on the home grid and it morphs into a portrait modal; that modal
   used to print a SECOND, unrelated design of the same facts — the venue's
   name in the display face, a mono "EST. 1987 · FILIPINO FUSION RESTAURANT
   · ££" strip, no stats, no hairline, a green pill and an underlined text
   link. Two designs of one object, and the drift showed: the expansion's
   descriptor came from a per-page copy table that had gone stale against
   the canonical `tagline` on two venues. The expansion is the card OPENED,
   so it is now the card's block at the card's proportions, one size up.

   IT RETURNS A FRAGMENT, NOT A WRAPPER. `.hoverBlurb` is seated with
   `bottom: calc(100% + …)` against the BLOCK'S top edge, and the two rows
   are flex children of it — an element in between would break both. The
   page owns the box: the card's is `.glass`, the expansion's is
   `.expandBody`, and the expansion adds `.blockLarge` for the scale.

   THE THREE DERIVATIONS BELOW ARE THE WHOLE REASON THIS IS SHARED. The
   action comes from the canonical record rather than from the page (that is
   what primaryAction() is for), the menu control renders only where there
   is both a menu on file and somewhere to send it, and the stats drop out
   individually. Done twice, they are two chances to disagree. */
export function VenueBlock({
  item,
  hoverBlurb,
  story,
  addressLines,
  plate = false,
  menuHref,
  actionMotion = {},
  actions = "row",
}: {
  item: VenueCardItem;
  /** the story ON HOVER, seated above the block over the shade's band —
   *  the card's form of it. The expansion has the height to print it
   *  outright and passes `story` instead. */
  hoverBlurb?: string;
  /** the story PRINTED, as a row above the hairline. The expansion only:
   *  the card has no room for it and shows it on hover. */
  story?: string;
  /** the address, one entry per line. Every line is nowrap+ellipsis.
   *
   *  ⚠️ IT IS THE FORM SWITCH AS WELL AS THE DATUM, and that is deliberate
   *  rather than clever: an address is the only thing that ever stood in the
   *  block's lower row, so a block with no address has no lower row to fill
   *  and the two upper rows — the name lockup and the hairline that closed
   *  them — have nothing left to sit above. Omitted, the block collapses to
   *  its CARD form: one row, the name and its tagline at the left, the
   *  controls at the right, no stats and no rule. Passed, it is the FULL
   *  form the expansion wears — name + stats, an optional story, the
   *  hairline, then address and controls.
   *
   *  A separate `compact` boolean was the alternative and it is worse: two
   *  props that must always disagree is two chances to render a hairline
   *  over nothing. */
  addressLines?: string[];
  /** THE PLATE FORM — the home grid's expansion, and a THIRD arrangement of
   *  facts the other two forms already print.
   *
   *  It is a boolean rather than something derived, and that is the one
   *  place it departs from `addressLines` above. The card/full switch is a
   *  consequence of what the VENUE has on file; this is not. The same venue,
   *  with the same address and the same story, is printed one way inside a
   *  3 : 4.3 grid cell and another way across a 16 : 9 plate — the PAGE
   *  knows which surface it is standing on and no record ever will.
   *
   *  IT READS UPWARD, and that is the whole difference: the story at the
   *  top, the place and what the room is beneath it, the hairline, and then
   *  the venue's name sharing one baseline with the controls. The rule is
   *  doing real work in that order — everything above it is prose,
   *  everything on it is something a reader can press.
   *
   *  IT DROPS NO DATUM. Name, tagline (folded into the where-line beside
   *  the address), the hours stat, the story and the same three controls —
   *  every one of them still prints. That is not tidiness: the reason this
   *  component exists at all is that the expansion and the tile must never
   *  disagree about what a reader can do, and a form that quietly lost a
   *  fact would be that same bug wearing a new shape.
   *
   *  Requires `story` and `addressLines`. Without them it has no upper half
   *  and the hairline would be a line drawn across a photograph. */
  plate?: boolean;
  menuHref?: string;
  actionMotion?: MotionProps;
  /** see the prop on VenueCardProps — "split" is the home grid's resting
   *  Book pill that opens into the full set on hover/focus. */
  actions?: "row" | "split";
}) {
  /* ONE read of the canonical record for the block's one ACTION. It comes
     from the data rather than from the page, which is the whole point of
     primaryAction(): a parlour does not get a Book pill and does not get
     nothing either. */
  const rest = getRestaurant(item.slug);
  const action = rest ? primaryAction(rest) : null;

  /* THE SECOND CONTROL, and it renders only where there is something
     behind it — both a menu on file AND somewhere for the page to send
     it. Seven of the eight carry `menuPages` now; Bunso is the one that
     does not, and it renders one control
     and that asymmetry costs nothing structurally, because both pills are
     the same height and the block's height is identical either way (the
     probe asserts the eight heights agree to within a pixel). */
  const hasMenu = Boolean(item.menuPages && item.menuPages.length > 0);
  /* ONE READ OF THE AVAILABILITY RULE, shared with <Spines> — see the split
     block below and lib/venueActions.ts. `menu` is the same answer either
     path wants, so both take it from here. */
  const set = splitActions(rest, {
    hasMenuPages: hasMenu,
    menuReachable: Boolean(menuHref),
  });
  const menu = set.menu ? "Menu" : null;

  /* THE VENUE'S OWN SITE, AS A CONTROL OF ITS OWN, at the user's
     instruction: every card offers a way through to the restaurant's
     website, not just the four that primaryAction() happens to resolve
     `Visit` for.

     IT IS DERIVED, NOT DUPLICATED, and the condition is the whole point.
     primaryAction() ALREADY sends four of the eight to `r.website` — the
     three walk-in rooms as "Visit" and Bunso as "Opening soon" — so an
     unconditional pill would put two controls with one destination on half
     the grid, which is the dead-control rule this block already keeps for
     "Menu". Comparing the HREF rather than the label is what makes that
     hold when the labels change: the note on primaryAction() says "Visit"
     is a holding label and the intended words are "Order" and "Find us",
     and on the day those land this line still suppresses the duplicate.

     So in practice it renders on the four BOOKABLE venues, which are
     exactly the ones whose one action was a booking host and whose own
     site was unreachable from the card. */
  const visit =
    rest?.website && rest.website !== action?.href
      ? { label: "Visit", href: rest.website }
      : null;

  /* ═══ THE SPLIT PATH'S OWN DERIVATIONS — "split" only ═══
     ⚠️ THE RULE MOVED TO lib/venueActions.ts and this reads it. It is not
     the only surface printing Menu · Visit · Book any more: the phone
     renders <Spines> instead of this grid and shows all three at rest, so
     the two would have been two spellings of one availability rule. Read
     that file for why each of the three is conditional; nothing about the
     answers changed in the move.

     The "row" path and the expansion still run primaryAction() untouched —
     that funnel promotes SOMETHING to a fill for every venue, where the
     split's resting state is "Book, or nothing". */
  const split = actions === "split";
  const book = split ? set.book : null;
  const visitSplit = split ? set.visit : null;

  /* THE STAT, right of the name — an icon and a value and NOTHING ELSE.
     No "Per head", no "Today" beneath it: those labels were 40–55px of
     type on the one side of the block that could afford to give width
     back to the address, and "Today" claimed live opening data this
     codebase does not have. A venue with no datum renders no stats at all
     and the name takes the whole measure.

     ⚠️ IT WAS A PAIR — price and hours — AND THE LIST SHAPE IS KEPT ON
     PURPOSE. `priceRange` is gone from VenueCardItem (commented out in
     lib/venueCards.ts, type and data together), and the reference left
     here failed the production type-check and blocked the Cloudflare
     build. Collapsing this to a bare conditional would also throw away
     the separator and the `data-stat` targeting the narrow-card rule
     depends on, so the list stays and the price row leaves. Add a second
     datum back and the map, the rule between them and the CSS all still
     work. */
  const stats = ([["hours", item.hours]] as ["hours", string | undefined][])
    .filter((s): s is ["hours", string] => Boolean(s[1]));

  /* THE FORM, AND IT IS DECIDED BY WHETHER THERE IS AN ADDRESS TO PRINT —
     see the prop's own note. FULL is the expansion's: name + stats, the
     story, the hairline, then the address beside the controls. CARD is the
     grid's: the name lockup beside the controls and nothing else. */
  const full = Boolean(addressLines && addressLines.length > 0);

  /* THE NAME AND THE DESCRIPTION, AS ONE LOCKUP — declared once because both
     forms print it and they print it in DIFFERENT ROWS: the full block heads
     itself with it, the card seats it in its single foot row where the
     address used to be. Two copies of this JSX is how the expansion and the
     card came to disagree about the same two lines before <VenueBlock>
     existed. */
  const who = (
    <span className={styles.blockWho}>
      <span className={styles.venueName}>{item.name}</span>
      {item.tagline ? (
        <span className={styles.venueTag}>{item.tagline}</span>
      ) : null}
    </span>
  );

  /* THE CONTROLS — up to three small pills, and NO ANNATTO ANYWHERE ON THE
     CARD. The ramp under these is photo-derived, so its hue moves from card
     to card and a fixed chromatic fill sat wrong on half the grid. Cream is
     the one ink that reads on every one. Secondaries (outline) left, primary
     (fill) right; the primary is pushed right by `margin-left: auto` ONLY
     when it has a sibling (see the rule).

     DECLARED ONCE, FOR THE SAME REASON `who` IS. All three forms print this
     row and the plate prints it on a different baseline from the other two —
     three copies of it is three chances for the grid and the expansion to
     start offering a reader different things to press, which is the exact
     bug <VenueBlock> was extracted to make impossible.

     ⚠️ THREE OF THESE DO NOT FIT BESIDE THE FACTS on a card narrower than
     ~365px, so the foot stacks from there down — see the container query in
     VenueCard.module.css, which carries the measured table. Add a fourth
     control and that threshold has to be re-measured, not guessed. */
  /* ═══ THE SPLIT ROW — the home grid's controls ═══
     EVERY CARD RESTS WITH EXACTLY ONE CONTROL, at the user's instruction:
     the cream Book pill where the venue takes bookings, and otherwise the
     venue's primary available action as a GHOST outline in the same
     bottom-right seat (Visit for Mamasons/Hoodwood/Café Mama, "Opening
     soon" for Bunso). Under the pointer — or keyboard focus anywhere in
     the card — the rest of the set unfolds to its left, staggered
     Menu-then-Visit, always reading MENU · VISIT · BOOK, right-anchored.

     ⚠️ THE ORDER BELOW IS LOAD-BEARING, AND THE STYLESHEET DEPENDS ON IT.
     The pills render menu → visit → book and members are only ever
     omitted, so the LAST child is always the venue's primary action. The
     collapse rule is `.cardBtnGhost:not(:last-child)`, which is what
     leaves exactly one pill standing on all eight cards without this file
     having to nominate one. Reorder these three and that rule breaks —
     see the block comment on .actionRow[data-split].

     The unfold is pure CSS; `data-act` is the stagger hook. Touch readers
     get the resting pill and no unfold; the expansion (always "row")
     still offers the full set, and the whole card is the press target
     that opens it. */
  const splitControls =
    menu || visitSplit || book ? (
      <motion.div className={styles.actionRow} data-split="" {...actionMotion}>
        {menu && menuHref ? (
          <Link
            href={menuHref}
            /* see the prefetch note in components/layout/CookieBanner.tsx —
               seven of these per page, 22KB of RSC payload each, against a
               640ms curtain that covers the fetch */
            prefetch={false}
            className={`${styles.cardBtn} ${styles.cardBtnGhost}`}
            data-act="menu"
            aria-label={`Menu — ${item.name}`}
          >
            Menu
          </Link>
        ) : null}
        {visitSplit ? (
          <a
            href={visitSplit.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.cardBtn} ${styles.cardBtnGhost}`}
            data-act="visit"
            aria-label={`Visit ${item.name}'s website`}
          >
            {visitSplit.label}
          </a>
        ) : null}
        {book ? (
          <a
            href={book.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.cardBtn} ${styles.cardBtnFill}`}
            aria-label={`${book.label} — ${item.name}`}
          >
            {book.label}
          </a>
        ) : null}
      </motion.div>
    ) : null;

  const rowControls =
    action || menu || visit ? (
      <motion.div className={styles.actionRow} {...actionMotion}>
        {menu && menuHref ? (
          <Link
            href={menuHref}
            /* see the prefetch note in components/layout/CookieBanner.tsx —
               seven of these per page, 22KB of RSC payload each, against a
               640ms curtain that covers the fetch */
            prefetch={false}
            className={`${styles.cardBtn} ${styles.cardBtnGhost}`}
            aria-label={`Menu — ${item.name}`}
          >
            Menu
          </Link>
        ) : null}
        {/* THE SITE, BETWEEN THE MENU AND THE BOOKING. A second OUTLINE
            pill, not a second fill: the row still has exactly one thing in
            it a reader is meant to press first, and two cream fills on one
            ramp would be two primaries. Its place in the order is the
            reading order of the decision — what's on, where it is, then book
            it. Always external, because the only href it can ever carry is
            the venue's own site. */}
        {visit ? (
          <a
            href={visit.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.cardBtn} ${styles.cardBtnGhost}`}
            aria-label={`Visit ${item.name}'s website`}
          >
            {visit.label}
          </a>
        ) : null}
        {action ? (
          <a
            href={action.href}
            {...(action.external
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
            className={`${styles.cardBtn} ${styles.cardBtnFill}`}
            aria-label={`${action.label} — ${item.name}`}
          >
            {action.label}
          </a>
        ) : null}
      </motion.div>
    ) : null;

  const controls = split ? splitControls : rowControls;

  /* ═══ THE PLATE FORM — READ UPWARD ═══
     The story, then where the room is and what it is, then the hairline,
     then the name on one baseline with the controls. See the prop's note
     for why this is a boolean and why it prints every fact the full form
     prints.

     `full` GATES IT AS WELL, so a plate that was handed no address falls
     through to whichever of the other two forms its data supports rather
     than rendering a rule over nothing — the same invariant the full form
     keeps, stated once more because this branch returns before it. */
  if (plate && full) {
    return (
      <>
        {/* the description, and it is the top of the block rather than a row
            squeezed above a hairline: on a landscape plate this is the widest
            measure the card has and the line the reader is here to read. */}
        {story ? <p className={styles.blockStory}>{story}</p> : null}

        {/* WHERE IT IS, with the hours stat closing the row — exactly as the
            stat closed the name's row in the full form. `.addr` and
            `.addrLine` are the CARD'S OWN address classes, not a set of the
            plate's: the requirement on this surface is that a pressed card
            look like the card that was pressed, so nothing here gets a size,
            a weight or a colour the grid does not already use. */}
        <div className={styles.plateWhere}>
          <p className={styles.addr}>
            {addressLines!.map((line) => (
              <span key={line} className={styles.addrLine}>
                {line}
              </span>
            ))}
          </p>

          {stats.length > 0 ? (
            <span className={styles.stats}>
              {stats.map(([key, value]) => (
                <span key={key} className={styles.stat} data-stat={key}>
                  <HoursGlyph />
                  <span className={styles.srOnly}>Opening hours </span>
                  <span className={styles.statValue}>{value}</span>
                </span>
              ))}
            </span>
          ) : null}
        </div>

        {/* the same hairline element the full form uses, doing a different
            job: there it closed the facts, here it separates the prose above
            it from the row of things a reader can press below. */}
        <span className={styles.blockRule} aria-hidden />

        {/* ═══ THE FOOT, AND IT IS THE CARD'S FOOT — `.blockFoot` with `who`
            and `controls` in it, which is character for character what an
            UNPRESSED tile prints in the same corner.

            That is the whole requirement, and it is why there is no
            `.plateFoot` and no display-face name here any more. Both existed
            for one pass and both were wrong: a pressed card that re-sets its
            own name in a different face at three times the size is a
            different card arriving, not the card the reader pressed opening
            up. The expansion earns its extra room by printing MORE — the
            story, the address, the hours — not by printing the same two
            lines louder. ═══ */}
        <div className={styles.blockFoot}>
          {who}
          {controls}
        </div>
      </>
    );
  }

  return (
    <>
      {/* THE STORY, on hover/focus — cream copy seated just above this
          block's top edge, over the hover shade's band. A child of the
          BLOCK rather than of .cardTop, so `bottom: calc(100% + …)`
          measures from the block's top edge with nothing having to know
          how tall the block is. That is what lets one rule serve a
          portrait card and a square one. */}
      {hoverBlurb ? (
        <span
          className={styles.hoverBlurb}
          aria-hidden
          /* a hover state, not an entrance — see .hoverShade above */
          data-entrance="hold"
        >
          {hoverBlurb}
        </span>
      ) : null}

      {/* ═══ THE UPPER HALF — THE FULL FORM ONLY ═══
          The name and its stat above a hairline is what the block looked
          like on BOTH objects until the card was stripped back: the card's
          address, its opening-hours stat and the rule that divided them
          from the controls are all gone at the user's instruction, so the
          card now renders none of this and the expansion renders all of it.
          The one row they still share is the foot below.

          THE MEASURE FIGHT THIS BLOCK WAS BUILT AROUND WENT WITH THE
          ADDRESS. It ran: on the narrowest 4-up column the block has ~163px
          and had to hold a 19-character road line ("157 Kentish Town Rd")
          beside two stats, which is what bought the halved stat gutters, the
          deleted labels and the `min-width: 0` below. Only the last of those
          is still load-bearing here, and it is load-bearing for a different
          reason — see .blockWho. The per-venue proof of the old fight is the
          clip table in scripts/probe-square-cards.mjs. ═══ */}
      {full ? (
        <>
          {/* WHO THIS IS: the name, and under it what the room actually is.
              `tagline` is a per-venue line from lib/restaurants.ts, and it
              is the thing that stops eight venues reading as one Kentish
              Town address printed eight times. */}
          <div className={styles.blockHead}>
            {who}

            {/* THE STATS CLOSE THE ROW — facts about the room, so they sit
                with its name rather than with its address. The CARD does not
                print them at all any more; this is the expansion's row, and
                it has the measure for them. */}
            {stats.length > 0 ? (
              <span className={styles.stats}>
                {stats.map(([key, value], si) => (
                  <Fragment key={key}>
                    {si > 0 ? (
                      <span className={styles.statRule} aria-hidden />
                    ) : null}
                    {/* data-stat, not a position: a list that grows or
                        shrinks can never leave the rule taking the wrong
                        one. Kept keyed rather than hardcoded now that hours
                        is the only datum, for the reason stated on `stats`
                        above. */}
                    <span className={styles.stat} data-stat={key}>
                      <HoursGlyph />
                      <span className={styles.srOnly}>Opening hours </span>
                      <span className={styles.statValue}>{value}</span>
                    </span>
                  </Fragment>
                ))}
              </span>
            ) : null}
          </div>

          {/* THE STORY, PRINTED — and it sits ON TOP OF THE RULE. The card
              has no room for it and shows it on hover over the picture
              (`hoverBlurb` above); the expansion is the same block on a card
              twice the height, and the height it gains is spent here. It is
              a row of the block's own flex column rather than anything
              absolutely seated, so the hairline and the foot simply move
              down by however many lines the copy runs to. */}
          {story ? <p className={styles.blockStory}>{story}</p> : null}

          {/* the hairline. A real element rather than a border on the row
              below it, because that row is the last child of a flex column
              and a border would travel with it, leaving the rule against the
              controls instead of closing the facts. It renders WITH the rows
              above it and never without them — a rule under nothing is a
              line across the middle of a photograph. */}
          <span className={styles.blockRule} aria-hidden />
        </>
      ) : null}

      {/* ═══ THE FOOT — THE ONE ROW BOTH FORMS PRINT ═══
          Facts at the left, controls at the right, seated on the block's
          floor. WHICH facts is the difference between the two objects: the
          expansion prints the address here, under the rule that closed its
          name and stat; the card prints the NAME LOCKUP here, because that
          is all it prints at all. Same row, same seating, same controls. */}
      <div className={styles.blockFoot}>
        {full ? (
          <p className={styles.addr}>
            {/* THE PAGE DECIDES HOW MANY LINES — the expansion passes the
                single line its own record words (the one venue with two
                sites is why that line is written out rather than joined from
                the address). Each line is `white-space: nowrap` with its own
                ellipsis. */}
            {addressLines!.map((line) => (
              <span key={line} className={styles.addrLine}>
                {line}
              </span>
            ))}
          </p>
        ) : (
          who
        )}

        {controls}
      </div>
    </>
  );
}
