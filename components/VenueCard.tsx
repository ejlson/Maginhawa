"use client";

import Image from "next/image";
import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, type MotionProps } from "framer-motion";
import styles from "./VenueCard.module.css";
import { getRestaurant, primaryAction } from "@/lib/restaurants";
import type { VenueCardItem } from "@/lib/venueCards";

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
function PriceGlyph() {
  return (
    <svg
      className={styles.statIcon}
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden
      focusable="false"
    >
      {/* a coin: the price datum is £/££/£££, so the glyph says "money"
          rather than "£" — a £ sign next to "££" is the same mark twice */}
      <circle cx="6" cy="6" r="4.6" stroke="currentColor" strokeWidth="1.1" />
      <path
        d="M4.6 6.15h2.6M6.9 3.9a1.35 1.35 0 0 0-2.1 1.15v2.05c0 .5-.3.9-.3.9h3.7"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
  /** THE SECONDARY CONTROL. Either form renders the same cream outline
   *  pill, and NEITHER renders unless the venue actually carries
   *  `menuPages` — a "Menu" pill on a venue with no menu on file is the
   *  dead control this design forbids. `onMenu` is for a page that has a
   *  <MenuOverlay> mounted already; `menuHref` is for one that does not
   *  and has to send the reader to the venue's own page. */
  onMenu?: () => void;
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
};

export default function VenueCard({
  item,
  square,
  sizes,
  priority,
  onPress,
  pressLabel,
  pressHasPopup,
  onMenu,
  menuHref,
  clip,
  blurb,
  furnitureMotion = {},
  glassMotion = {},
  actionMotion = {},
}: VenueCardProps) {
  const reduce = useReducedMotion();

  /* ONE read of the canonical record for the card's one ACTION. It comes
     from the data rather than from the page, which is the whole point of
     primaryAction(): a parlour does not get a Book pill and does not get
     nothing either. */
  const rest = getRestaurant(item.slug);
  const action = rest ? primaryAction(rest) : null;

  /* THE SECOND CONTROL, and it renders only where there is something
     behind it — both a menu on file AND somewhere for the page to send
     it. Half the venues carry `menuPages`; the rest render one control
     and that asymmetry costs nothing structurally, because both pills are
     the same height and the block's height is identical either way (the
     probe asserts the eight heights agree to within a pixel). */
  const hasMenu = Boolean(item.menuPages && item.menuPages.length > 0);
  const menu = hasMenu && (onMenu || menuHref) ? "Menu" : null;

  /* THE TWO STATS, right of the address. Each is an icon and a value and
     NOTHING ELSE — no "Per head", no "Today" beneath them. Those labels
     were 40–55px of type sitting under two values on the one side of the
     block that could afford to give width back to the address, and
     "Today" claimed live opening data this codebase does not have.
     A venue with neither datum renders no stats at all and the address
     takes the whole measure. */
  const stats = (
    [
      ["price", item.priceRange],
      ["hours", item.hours],
    ] as ["price" | "hours", string | undefined][]
  ).filter((s): s is ["price" | "hours", string] => Boolean(s[1]));

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
    if (!v.src) v.src = clip!;
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
      <div className={styles.hoverShade} aria-hidden />

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
             mark is what makes the picture mean something. */
          <span className={styles.cardLogo} role="img" aria-label={item.name}>
            <span
              className={styles.cardLogoMark}
              style={{ "--ov-logo-url": `url(${item.logo})` } as React.CSSProperties}
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
        {/* THE STORY, on hover/focus — cream copy seated just above this
            block's top edge, over the hover shade's band. A child of the
            BLOCK rather than of .cardTop, so `bottom: calc(100% + …)`
            measures from the block's top edge with nothing having to know
            how tall the block is. That is what lets one rule serve a
            portrait card and a square one. */}
        {blurb ? (
          <span className={styles.hoverBlurb} aria-hidden>
            {blurb}
          </span>
        ) : null}

        {/* ═══ THE ADDRESS AND THE STATS, SIDE BY SIDE.

            THE MEASURE IS THE WHOLE PROBLEM. On the narrowest 4-up column
            the block's measure is ~163px and the address lines run to 19
            characters ("157 Kentish Town Rd"). What closed it, in the
            order each is worth:
              1. the PRICE datum — the real `££` rather than an invented
                 `£25–40`: ~27px, and it cost nothing.
              2. the stats' own gutters, both halved.
              3. `min-width: 0` on the address column. THE SILENT KILLER: a
                 flex item's `min-width` is `auto`, i.e. its content's
                 min-content size, so without it the column refuses to
                 shrink and pushes the stats off the block. Every ellipsis
                 below is inert without it.
              4. the labels, which go anyway.
            The per-venue proof is the clip table in
            scripts/probe-square-cards.mjs. ═══ */}
        {/* ═══ ABOVE THE RULE: WHO THIS IS ═══
            The name, and under it what the room actually is. At the user's
            instruction, and it is the change that stops eight cards reading
            as one address printed eight times: `tagline` is a per-venue
            line that already existed in lib/restaurants.ts and was only
            ever shown in the home grid's hover expansion, so a reader on
            touch — or anyone who did not hover — met a set of near-identical
            Kentish Town addresses with no way to tell a ramen bar from an
            ice cream parlour. */}
        <div className={styles.blockHead}>
          <span className={styles.blockWho}>
            <span className={styles.venueName}>{item.name}</span>
            {item.tagline ? (
              <span className={styles.venueTag}>{item.tagline}</span>
            ) : null}
          </span>

          {/* THE STATS STAY ABOVE THE RULE AND CLOSE THE ROW, at the user's
              instruction: price and hours are FACTS about the room, so they
              belong with its name rather than with its address. It also
              keeps the block short — carried under the address they added a
              third row to the left column and pushed the block to 55% of
              the card. */}
          {stats.length > 0 ? (
            <span className={styles.stats}>
              {stats.map(([key, value], si) => (
                  <Fragment key={key}>
                    {si > 0 ? (
                    <span className={styles.statRule} aria-hidden />
                  ) : null}
                    {/* data-stat, not a position: the narrow card sheds one
                        of these and the pair is conditional, so a venue with
                        no price makes hours the FIRST child and a positional
                        rule would take the wrong one. */}
                  <span className={styles.stat} data-stat={key}>
                      {key === "price" ? <PriceGlyph /> : <HoursGlyph />}
                    <span className={styles.srOnly}>
                        {key === "price" ? "Price range " : "Opening hours "}
                      </span>
                    <span className={styles.statValue}>{value}</span>
                    </span>
                  </Fragment>
                ))}
              </span>
          ) : null}
        </div>

        {/* the hairline. A real element rather than a border on the row
            below it, because that row is the last child of a flex column
            and a border would travel with it, leaving the rule against the
            controls instead of closing the facts. */}
        <span className={styles.blockRule} aria-hidden />

        {/* ═══ BELOW THE RULE: WHERE IT IS, AND WHAT TO DO ═══
            Address at the left, controls at the right, at the user's
            instruction. The two used to sit on opposite sides of the rule —
            facts above, actions below — and this puts them on one line
            instead, which is what lets the name and its description own the
            whole of the block's top half. */}
        <div className={styles.blockFoot}>
          <p className={styles.addr}>
            {/* TWO LINES NOW, NOT THREE: the venue's name has moved above
                the rule, so this is the postal address alone. Each line is
                still `white-space: nowrap` with its own ellipsis — a line
                too long for the card loses its tail rather than reflowing
                the block to an extra row and breaking the grid's shared
                card height. */}
            <span className={styles.addrLine}>{item.address.road}</span>
            <span className={styles.addrLine}>{item.address.city}</span>
          </p>

        {/* THE CONTROLS — two small pills, and NO ANNATTO ANYWHERE ON THE
            CARD. The ramp under these is photo-derived, so its hue moves
            from card to card and a fixed chromatic fill sat wrong on half
            the grid. Cream is the one ink that reads on every one.
            Secondary (outline) left, primary (fill) right; the primary is
            pushed right by `margin-left: auto` ONLY when it has a sibling
            (see the rule). */}
        {action || menu ? (
          <motion.div className={styles.actionRow} {...actionMotion}>
            {menu ? (
              menuHref ? (
                <Link
                  href={menuHref}
                  className={`${styles.cardBtn} ${styles.cardBtnGhost}`}
                  aria-label={`Menu — ${item.name}`}
                >
                  Menu
                </Link>
              ) : (
                <button
                  type="button"
                  className={`${styles.cardBtn} ${styles.cardBtnGhost}`}
                  onClick={onMenu}
                  aria-label={`Menu — ${item.name}`}
                >
                  Menu
                </button>
              )
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
        ) : null}
        </div>
      </motion.div>
    </div>
  );
}
