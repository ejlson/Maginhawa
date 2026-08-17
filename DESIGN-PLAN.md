# Design Plan — brand fit and audience needs

Output of `/plan-design-review`, run 2026-08-04 against the prod build (`:3100`)
on branch `feat/manifesto-after-restaurants` @ 08bcf1c.

The question this plan answers: **does the design reflect the restaurants, and
does it serve what the audience came for?** Craft is not the problem — the
editorial execution is strong and carries no AI-slop patterns. The gaps are
identity (it doesn't read Filipino until screen two) and jobs-to-be-done (a
diner cannot learn when anything is open).

Every measurement below was taken from the running prod build via Puppeteer,
not inferred from source.

---

## Scores

| Pass | Dimension | Before | After spec | Gate |
|------|-----------|-------:|-----------:|------|
| 1 | Information architecture | 5/10 | 9/10 | |
| 2 | Interaction state coverage | 4/10 | 9/10 | |
| 3 | User journey & emotional arc | 6/10 | 9/10 | |
| 4 | AI-slop risk | 9/10 | 9/10 | already clean |
| 5 | Design-system alignment | 3/10 | 8/10 | no DESIGN.md exists |
| 6 | Responsive & accessibility | 5/10 | 9/10 | |
| 7 | Design decisions | 4 open | 0 open | all four resolved |

Craft 8/10 · brand-and-audience fit 5/10 → target 9/10.

---

## Pass 1 — Information architecture · 5/10

### The gap

The home page is sequenced as an essay, not as a way in. Measured section
seats at 1440×900 (`docH` 8243):

| y | Section | h |
|---:|---|---:|
| 0 | Hero — film, wordmark, SCROLL | 900 |
| 900 | Manifesto — "We are a vibrant Filipino…" | 419 |
| 1938 | Discover — "Our Restaurants." + 8 tiles | 1706 |
| 3258 | AboutIntro — maroon band | 900 |
| 4158 | PressWall — 9 mastheads | 188 |
| 5318 | Interlude + Blog | 900 |
| 6218 | Reservations — "Where will you start?" | 1125 |
| 7343 | Footer | 900 |

Three structural problems:

1. **The first screen carries no identity and no action.** It is a flame-grill
   film, the wordmark, and `SCROLL`. Nothing says Filipino, London, seven
   kitchens, or *do this next*. The sentence that identifies the group sits at
   y900 — the reader must commit a full screen of scroll to learn what they are
   looking at. Litmus "brand/product unmistakable in first screen" = **NO**.
   The `<title>` does this work; the design does not.
2. **619px of empty cream** between the statement ending (y1319) and the grid
   starting (y1938) — over two-thirds of a viewport of nothing at the exact
   moment the reader has just been told who you are and wants the rooms.
3. **No `<h1>` on the page.** Heading order reads `H2>H2>H2>H2>H2>H2>H3…`.
   Both a screen-reader and a search-engine problem, and search/press
   discovery is a stated success metric.

### Fix to 10

**Target hierarchy for the first screen** — first, second, third:

```
+--------------------------------------------------------------+
|  [mark]                    RESTAURANTS BLOG ABOUT CAREERS ... |
|                                                               |
|                                                               |
|                     film: Filipino food,                      |
|                     not generic flame                         |
|                                                               |
|   MAGINHAWA                              <- 1st: who (h1)     |
|   Filipino & pan-Asian kitchens.         <- 2nd: what/where   |
|   Seven rooms across London. Since 1987.                      |
|                                                               |
|   [ Find a restaurant ]   [ Book a table ]  <- 3rd: the act   |
+--------------------------------------------------------------+
```

- Promote the wordmark to `<h1>`; every current `H2` shifts one level or the
  wordmark takes `h1` and section titles stay `h2` (preferred — no cascade).
- One identifying line under the wordmark. Constraint: **12 words maximum**,
  and it must name *Filipino*, *London* and *seven*.
- One action pair. `Find a restaurant` anchors to Discover; `Book a table`
  goes to Reservations.
- Close the y1319→y1938 gap to ≤ 30vh.

**CTA visual spec** — both pills use the existing tile-pill vocabulary (no
border-radius beyond the system default; not bubbly, not full-pill):
- Primary `Find a restaurant`: maroon fill (`--c-maroon`), cream text, no
  border — same authority as the booking pill on tiles.
- Secondary `Book a table`: cream/transparent fill, maroon stroke + maroon text
  — same shape, lighter presence.
- At 390px only `Find a restaurant` shows at full width; `Book a table` moves
  into the tile expansion (it is a tile-level decision at that viewport).

**Identifying line typography** — this is a body sentence under the wordmark,
not a display moment. It stays in `--font-ui` (Helvetica) at regular weight,
set at roughly 16–18px. Contralto is reserved for the wordmark itself and
section titles; the identifying line is the *bridge* between the mark and the
grid, not a competing headline.

Constraint worship — if the first screen can only carry three things, they are:
**the name, what kind of food and where, and the way in.** The film is the
fourth thing and it currently occupies the slot of all three.

---

## Pass 2 — Interaction state coverage · 4/10

### The gap

The happy path is designed. Nothing else is. `/contact` has **no required
fields at all** (firstName, lastName, email, message all optional — an empty
submit is possible), and neither form has an `aria-live` region, so a success
or failure message is never announced.

### Fix to 10 — state table

| Surface | Loading | Empty | Error | Success | Partial |
|---|---|---|---|---|---|
| Hero film | Poster frame holds; wordmark animates on `canplay`, never on a timer alone | — | Film 404/blocked → poster still frame, wordmark + line still readable | Film loops silently | Slow connection → poster only, no layout shift |
| Restaurant grid | Tile skeletons at the plate's aspect ratio — no reflow when photos land | n/a (data is static) | Photo fails → cream plate + venue wordmark, tile still clickable | Tiles settle, captions rise | Some photos landed → each tile resolves on its own, no barrier |
| Tile expansion | Instant — content is already in memory | — | — | Overlay traps focus, `Esc` closes, focus returns to the tile | — |
| Menu overlay | Page-image skeleton per page | Venue has no `menuPages` → "Menu coming soon" + link to the venue's own site, never an empty overlay | Image fails → "Menu unavailable — see [venue site]" | Pages paginate | First page shown while later pages load |
| Journal / Blog | Card skeletons (already built) | Filter yields nothing → "No stories in this filter yet." + a button clearing to All | Feed fails → last-known cards + quiet retry line | Cards land | — |
| Reservations | — | — | Booking host down → the venue's phone number and address as fallback | Opens booking host in a new tab | — |
| Contact form | Submit disabled + "Sending…" | — | Per-field message under the field, `aria-live="polite"` summary at the top, values retained | "Thanks — we'll reply within two working days." Focus moves to the message | — |
| Careers form | Submit disabled + "Sending…" | — | CV wrong type/too large → states the limit and the accepted types before upload is attempted | Confirmation names the role applied for | CV upload progress for files > 1MB |
| Open/closed status | "Checking…" never shown — computed client-side, instant | — | Missing hours data → show the address only, never "Closed" by default | "Open now · until 22:00" · within 30 min of close: "Open now · closing soon (22:00)" | — |

Every empty state above names a next action. None of them says "No results."

Additional required changes:
- `/contact`: mark firstName, email and message `required`; keep lastName optional.
- Both forms: add `aria-live="polite"` status region.
- `/careers`: decide whether `cv` is required (currently optional on a CV-upload flow).

---

## Pass 3 — User journey & emotional arc · 6/10

### Storyboard — a diner on a phone, deciding where to eat tonight

| # | User does | Should feel | Plan specifies? |
|---|---|---|---|
| 1 | Lands from Instagram | "Oh — this looks good" | **Partly.** Film is appetising on mobile, but nothing says who or where |
| 2 | Scrolls once | "Ah, Filipino, London, seven places" | Yes — the statement does this well |
| 3 | Reaches the grid | "Which one is near me / open now?" | **No.** No hours, no distance, no open/closed |
| 4 | Taps a tile | "What do they serve, what's it cost?" | Yes — blurb, cuisine, est., price band |
| 5 | Wants the menu | "Show me the food" | Yes — menu overlay |
| 6 | Wants to go | "Book, or just turn up?" | **Bookable only.** Parlour/café/takeaway dead-end |
| 7 | Checks it's real | "Are they any good?" | Yes — press wall is excellent |

Steps 3 and 6 are where the journey breaks, and they are the two steps closest
to the money.

### Time horizons

- **5 seconds (visceral)** — currently the film carries this alone. It is
  beautiful and anonymous. Fix in Pass 1.
- **5 minutes (behavioural)** — the reader wants hours, address, menu, book.
  Two of four are missing. Fix in Pass 1 + the hours work below.
- **5 years (reflective)** — this is the site's real strength. Family, 1987,
  Omar's portrait, the Tagalog definition, the Michelin listing. Keep all of it.

### Fix to 10

- Add **opening hours and a street address to every venue**, on the tile
  expansion and the venue page. `Restaurant.addresses` already exists in
  `lib/restaurants.ts` and is currently only surfaced in Reservations.
- Use the clock the page already runs (`IT'S 10:32 IN LONDON`) to render
  **"Open now · until 22:00"** / **"Opens 12:00"** per venue. The site knows
  the time and cannot currently tell anyone whether anything is open.
- Give every non-bookable venue a first-class action (see Pass 7, decision 4).

---

## Pass 4 — AI-slop risk · 9/10

**Classifier: MARKETING/LANDING** (brand-forward, conversion via booking).

Checked against all ten blacklist patterns. **The page carries none of them:**
no purple/indigo gradient, no 3-column icon-in-circle feature grid, no
centred-everything, no uniform bubbly radii, no decorative blobs or wavy
dividers, no emoji, no coloured left-border cards, no "Unlock the power of",
no cookie-cutter section rhythm. Cards are used only where the card *is* the
interaction. Copy is product language, not design commentary.

Litmus checks: 1 **NO** (fixed in Pass 1) · 2 YES · 3 YES · 4 YES · 5 YES ·
6 YES · 7 YES.

The one point held back is litmus 1. Nothing else to fix here — this is the
strongest dimension on the site and the spec must not disturb it.

---

## Pass 5 — Design-system alignment · 3/10

### The gap

**No `DESIGN.md` exists.** The system is real but it lives only in
`app/globals.css` comments — excellent comments, but not a shared contract, so
nothing can be reviewed *against* anything.

The substantive finding: **`--font-display`, `--font-display-sm`,
`--font-display-xs`, `--font-emphasis` and `--font-mono` all resolve to
Helvetica** (`globals.css:69–119`). Contralto — the brand's own face, carrying
300/400/600/700/900 and true italics — is confined to `--font-display-big` and
`--font-display-small`, i.e. wordmarks only. The stylesheet says so itself:
*"every one of them resolves to Helvetica today, and that is not meant to be
permanent."*

That is a defensible Swiss-editorial position. It is also in tension with the
brand's own thesis. `maginhawa` means *comfortable*; the About copy promises
food with deep roots, rooms that feel like home, guests treated as family. The
typeface currently delivering that promise is the most neutral, most corporate
face in the canon. **Principle broken: trust is earned at the pixel level —
the type argues against the positioning.** This is decision 2 in Pass 7.

### Fix to 10

1. Write `DESIGN.md` capturing what already exists: the maroon/cream/saffron
   palette, the type roles and why they resolve where they do (including the
   Contralto-wordmark / Fraunces-display / Helvetica-body split), the
   12-column grid, `--pad-x`/`--grid-gutter`, the motion grammar (word-masks,
   chapter pins, marquee), and the plate aspect ratios.
2. Point `--font-display`, `--font-display-sm` and `--font-display-xs` at
   **Fraunces** (already in the fallback stack — zero kit changes). Contralto
   stays on `--font-display-big` and `--font-display-small` (wordmarks only).
   See Decision 2 for the full weight/size table.
3. Rename `--font-mono` to `--font-label` — the stylesheet already flags this
   as the right follow-up; there is no monospace left in the stack.

---

## Pass 6 — Responsive & accessibility · 5/10

### Verified defects

**`Our Restaurants.` renders as `OurRestaurants.` at ≤980px.** Measured word
gap after the reveal settles:

| Viewport | Gap |
|---|---:|
| 390×844 | **0px** |
| 768×1024 | **0px** |
| 1440×900 | 58px |

Cause: `.titleLine { display: block }` sits inside `@media (min-width: 981px)`
(`components/Discover.module.css:340`), and the title's word-clips carry no
`margin-right` — unlike `.captionWord`, which has `margin-right: 0.28em` at
line 881. Hits every phone and tablet visitor on the page's main commercial
heading.

**Placeholder phone number in production.** The footer renders
`+44 01234 5678`, wired as `tel:+44012345678`, on **every page** — while
`PRODUCT.md` states nothing on the site is placeholder. Someone will tap it.
Highest trust-cost-per-byte defect on the site.

**No `<h1>`** anywhere on the home page (see Pass 1).

**No skip link** (`skipLink: false`) — keyboard users traverse the full nav on
every page.

**25 tap targets below 44×44px at 390px wide**, including the home logo link
at 34×34.

**Text over moving film has uncontrolled contrast.** ~25 text runs sit
directly on video or photography with no measurable scrim — the nav labels,
the `SCROLL` cue, the tile captions, and the "ma·gin·ha·wa" definition card
(white copy over a bright, busy food shot, where the copy also appears to
overrun the panel's bottom edge). Contrast over a *video* changes frame to
frame, so it cannot be verified — which is itself the finding.

### What is already right — do not regress it

- **Focus rings on every interactive element** (`outline: solid` throughout).
- **Tab order is genuinely excellent**: logo → menu → view toggles → tile →
  Book → tile → Book… logical and predictable.
- **`prefers-reduced-motion` works** — statement at opacity 1, loader gone,
  nothing wedged.
- **All 53 images carry `alt`.** `lang="en-GB"` set. One `<main>`, one
  `<footer>`, sensible `<nav>`s.
- Every form field on both forms is properly labelled.

### Fix to 10

- Give the settled title's words `margin-right: 0.28em`, matching
  `.captionWord`, or move `.titleLine { display: block }` out of the 981px
  query. One-line fix; verify at 390/768/1440.
- Replace the placeholder phone with the real number, or remove the phone
  line and the `tel:` link entirely until one exists.
- Add `<h1>`, add a skip link.
- Raise sub-44px targets to 44px minimum via padding, not font size.
- Put a defined scrim behind every text run that sits on media — a token, not
  a per-component guess — and re-seat the definition card's copy inside its
  panel. **Scrim token:** `--scrim: rgba(0, 0, 0, 0.35)` in `globals.css`.
  This passes WCAG AA for white text over most food photography; apply it as a
  CSS custom property referenced by the hero nav area, the `SCROLL` cue, tile
  captions, and the definition card — not hard-coded per component.

### Responsive intent per viewport — not "stacked on mobile"

- **390px** — one column. Hero: wordmark + identifying line + a single full-
  width `Find a restaurant`; `Book` moves into the tile expansion. Venue tiles
  carry name, cuisine, price, area, and open/closed. Press wall keeps
  marqueeing (it reads as motion, not content).
- **768px** — two columns. The About band's photo and copy stay side by side;
  the definition card moves below its photo rather than on top of it.
- **1440px+** — as built. The 12-column grid and the chapter pins are working.

---

## Pass 7 — Design decisions · 4 raised, 4 resolved

All four were owner calls. All four are decided — this section is the contract
the Builder implements against.

### Decision 1 — The first screen identifies and offers a way in

Keep the current hero film. Add, under the wordmark:

- The wordmark becomes the page's `<h1>`. Section titles stay `<h2>`.
- **One identifying line, 12 words maximum**, naming *Filipino*, *London* and
  *seven*. It must be the same claim the `<title>` already makes, so the
  design stops lagging the metadata.
- **Two actions**: `Find a restaurant` (anchors to Discover) and
  `Book a table` (anchors to Reservations). On 390px the second collapses
  into the tile expansion and only `Find a restaurant` shows full-width.
- Close the y1319→y1938 dead gap to ≤ 30vh.

Not doing: re-cutting the hero film. Noted as a follow-up — the mobile hero
frame already shows a Filipino dish and reads better than the desktop flame,
so a re-cut is worth revisiting when footage time exists.

### Decision 2 — Fraunces takes the display roles; Contralto stays on the wordmark

**Contralto is the logo face, full stop.** `--font-display-big` and
`--font-display-small` stay on Contralto at 700 (wordmarks only — unchanged).

Point `--font-display`, `--font-display-sm` and `--font-display-xs` at
**Fraunces** — a warm optical-size serif already loading as the Contralto
fallback, so this costs zero new kit additions. Helvetica remains the body
voice (`--font-ui` / `--font-sans`).

Three-way split:
```
Contralto  →  wordmark only     ("MAGINHAWA", "Maginhawa Group")
Fraunces   →  display / edit    (section titles, manifesto, restaurant names)
Helvetica  →  body / UI         (running text, labels, captions)
```

**Weight and size pairings** — Fraunces is a variable face; use the Display
optical axis at large sizes:

| Role | Token | Size guidance | Weight |
|---|---|---|---|
| Wordmark | `--font-display-big` / `--font-display-small` | as built | 700 Contralto |
| Section titles ("Our Restaurants.") | `--font-display` | ~60–80px | 400 Fraunces |
| Manifesto statement | `--font-display` | as built | 600 Fraunces |
| Restaurant names (tile + overlay) | `--font-display-sm` | ~28–36px | 400 Fraunces |
| "Where will you start?" close | `--font-display` | as built | 400 Fraunces |
| Warm sub-heads / captions | `--font-display-xs` | ~18–22px | 400 Fraunces |
| Body / UI | `--font-ui` / `--font-sans` | as built | Helvetica unchanged |

- Affected by the swap: section titles ("Our Restaurants.", "About Us.",
  "Blog."), the manifesto statement, restaurant names, the closing line.
- The token layer was built for exactly this; it is one token change per role,
  not a 60-file edit. Delete the "not meant to be permanent" note once done.
- **Verify after the swap**: the manifesto's locked line count and its
  four-line/one-word widow (`scripts/probe-manifesto.mjs` exists for this) —
  Fraunces's metrics differ from Helvetica's and the wrap will move.
- Re-check `--w-medium`: the weight tiers were reasoned against Helvetica's
  400/700-only stack. Fraunces has full variable weight range, so weights that
  were flattened can be restored.
- Rename `--font-mono` → `--font-label` in the same pass. There is no
  monospace left in the stack and the stylesheet already flags this.

### Decision 3 — Hours, and a computed open/closed state

- Add an hours field per venue to `lib/restaurants.ts` (per-day open/close,
  with a holiday-override escape hatch).
- Render **"Open now · until 22:00"** / **"Opens 12:00"** on every venue tile
  expansion and every venue page, computed from the London clock the
  `Reservations` section already runs.
- Surface the street address alongside it. `Restaurant.addresses` already
  exists and is currently only used by Reservations — extend it to all eight
  venues rather than adding a second address model.
- **Failure rule**: a venue with missing or malformed hours shows its address
  only. It must never render "Closed" by default — a false "Closed" costs a
  covered table.

### Decision 4 — Every venue transacts, matched to its type

| Venue | Action | Why |
|---|---|---|
| Bintang, Guanabana, Ramo, Belly | `Book a table` | as built |
| Hoodwood | `Order` | it is a takeaway; ordering is the job |
| Mamasons | `Find us` — address + hours + open/closed | walk-in parlour, two sites |
| Café Mama & Sons | `Find us` — address + hours + open/closed | walk-in café |
| Bunso | `Opening soon` — date, or an email signup | honest, and captures intent |

Every tile carries an inline pill. No venue is inline-actionless, so the
parlour and the café stop reading as lesser rooms on first scan.

The closing section changes with it: **"Where will you start?" addresses all
eight venues, not the four that take reservations.** Its current `CHOOSE A
RESTAURANT` action and the "Seven rooms" line need to reconcile with the
eight tiles the grid shows (seven open + Bunso).

**Closing section copy** — "Seven rooms. Different worlds. One table." needs
to account for eight tiles. Draft options:
- "Eight rooms. Different worlds. One starting point." — keeps the rhythm,
  acknowledges Bunso, removes the wrong count.
- "Seven kitchens. One more on the way." — honest about the coming-soon state.
  Roll into this pass rather than a separate task.

Not doing: delivery-platform integrations. `Order` points at whatever
ordering surface Hoodwood already has; building an integration is separate
work.

---

## NOT in scope

- **CMS/MDX migration.** Content lives in `lib/*.ts` and that is fine for this
  work; converting it is an ocean, not a lake.
- **Reviving the scrollytelling street.** Dropped per `CLAUDE.md`, stays dropped.
- **Rebuilding the chapter-pin motion.** It is documented, reasoned and works;
  the spec must not disturb it.
- **Per-venue sub-brands.** Each restaurant keeps its own identity via its own
  site; the group site stays one system.
- **Delivery integrations** (Deliveroo/UberEats). Flagged in decision 4 as an
  option, but building the integration is separate work.

## What already exists and should be reused

- `Restaurant.addresses`, `menuPages`, `bookable` in
  `lib/restaurants.ts` — the hours work needs one new field, not a new model.
  (`priceRange` was on this list and has since been removed from the model
  entirely — the group publishes no price band.)
- The live London clock in `Reservations` — already computing time; open/closed
  needs no new machinery.
- The token layer in `app/globals.css` — the display-face decision is one
  token change by design.
- `.captionWord`'s `margin-right: 0.28em` — the fix for the title bug already
  exists twelve lines away.
- The press wall, founder portrait and Tagalog definition card — the three
  strongest brand moments on the site. Build the identity work *from* these.

---

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | — |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 0 | — | — |
| Design Review | `/plan-design-review` | UI/UX gaps | 2 | CLEAN | run 1: 5/10→9/10, 4 decisions; run 2: 9/10→10/10, type direction resolved (Fraunces display + weight table), CTA spec, scrim token, closing copy draft, "closing soon" edge case |

**UNRESOLVED:** 0 design decisions. 7 items tracked in TODOS.md, 2 ship-blocking bugs.

**VERDICT:** DESIGN CLEARED for implementation — eng review required before shipping.

> Review log not persisted: the gstack toolchain is not installed at
> `~/.codex/skills/gstack` or `.agents/skills/gstack`, so `gstack-review-log`
> and the readiness dashboard could not run. This table is hand-written.
