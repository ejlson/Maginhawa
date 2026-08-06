# TODOS

Design debt raised by `/plan-design-review` on 2026-08-04 (branch
`feat/manifesto-after-restaurants` @ 08bcf1c). The four resolved design
decisions live in [DESIGN-PLAN.md](DESIGN-PLAN.md) and are not repeated here —
this file holds the debt that sits *outside* those decisions.

Ordered by trust cost, highest first.

## Status — 2026-08-04, implementation pass

| # | Item | State |
|---|------|-------|
| 1 | Placeholder phone | **DONE** — `CONTACT.phone` is `null`; footer row and Contact entry both guard on it |
| 2 | `OurRestaurants.` at ≤980px | **DONE** — verified 13px gap at 390, 16px at 768, unchanged at 1440 |
| 3 | Write `DESIGN.md` | open |
| 4 | Accessibility gaps | **PARTIAL** — `<h1>` done (the hero statement carries it); `--scrim-text` token added and used on the hero. Skip link and the 25 sub-44px tap targets still open |
| 5 | Form states | open |
| 6 | Re-cut hero film | open — still the generic flame grill |
| 7 | Seven rooms vs eight tiles | open |

Also shipped this pass, from DESIGN-PLAN.md decisions:

- **Decision 2 (type voice)** — display roles moved to Contralto. `probe-manifesto.mjs`
  caught a uniform +5px mask overflow the swap introduced; the statement's clip
  padding went 0.14em → 0.22em and the probe is clean again (wrap still 4 lines,
  2 words on the last, all 18 words at rest).
- **Decision 1 (first screen)** — the hero now states who the group is and offers
  two ways in. Landed jointly with your own refactor moving the wordmark to the
  navbar, so the statement itself is the `<h1>`.
- **Decision 4 (every venue transacts)** — `primaryAction()` in `lib/restaurants.ts`
  derives one action per venue. Verified live: Book ×4, Visit ×3, Opening soon ×1.
  See the ⚠️ in that function — `Visit` is a holding label for the three walk-in
  venues and is blocked on data, not code.
- **Decision 3 (hours + open-now)** — **NOT STARTED, and blocked.** The mechanism
  is buildable now; the data is not. No venue carries opening hours, and only the
  four bookable ones carry a street address. Inventing either for real restaurants
  would break `PRODUCT.md`'s "facts are binding" — a wrong opening time sends
  someone to a closed door. Needs the client to supply hours and addresses for
  Mamasons, Hoodwood, Café Mama and Bunso.

**Pre-existing failure, not from this pass:** `probe-manifesto.mjs` reports
`mid-sequence drift: 107px at y=1440 — STILL SNAPPING` and `landing did not run`.
Confirmed identical on a clean baseline with the font change stashed, so it
belongs to the scroll-assist work already in flight on this branch.

---

## 1. Replace the placeholder phone number — **ship-blocking**

**What:** The footer renders `+44 01234 5678`, wired as a live
`tel:+44012345678` link, on every page of the site.

**Why:** `PRODUCT.md` states all content is real and client-approved and that
nothing is placeholder. The site's stated #1 success measure is reading as an
established, award-recognised group. A fake phone number that someone can
actually tap is the cheapest possible way to lose that, and it is currently in
the production build.

**Pros:** Minutes of work; removes the single highest trust-cost defect found.
**Cons:** None. If no public number exists yet, deleting the line and the
`tel:` link is strictly better than shipping a fake one.
**Context:** Found in the prod build at `:3100` on the home page, `/contact`,
and every venue page — it is in the shared footer component.
**Depends on:** The client supplying the real number, or a decision to omit it.

---

## 2. `Our Restaurants.` renders as `OurRestaurants.` at ≤980px — **bug**

**What:** The word gap on the Discover section title collapses to zero below
981px. Measured after the reveal settles: **0px at 390×844, 0px at 768×1024,
58px at 1440×900.**

**Why:** It is the main commercial heading on the page, and it is broken for
every phone and tablet visitor — i.e. most restaurant traffic.

**Pros:** One-line fix, and the fix already exists twelve lines away.
**Cons:** None.
**Context:** `.titleLine { display: block }` is trapped inside
`@media (min-width: 981px)` at `components/Discover.module.css:340`, and the
title's word-clips carry no `margin-right` — unlike `.captionWord`, which has
`margin-right: 0.28em` at line 881. Verify the fix at 390 / 768 / 1440.
**Depends on:** Nothing.

---

## 3. Write `DESIGN.md`

**What:** Capture the design system that currently exists only as comments in
`app/globals.css`: the maroon/cream/saffron palette, the type roles and why
each resolves where it does, the 12-column grid, `--pad-x` / `--grid-gutter`,
the motion grammar (word-masks, chapter pins, marquee), and the plate aspect
ratios.

**Why:** There is no shared contract, so no design work can be reviewed
*against* anything — this review had to calibrate against universal principles
plus `PRODUCT.md` instead. The comments in `globals.css` are unusually good;
they are just not discoverable or reviewable where they are.

**Pros:** Every future review gets a baseline; the Contralto re-pairing gets
documented as it happens rather than after.
**Cons:** A document that can drift from the code if nobody maintains it.
**Context:** Flagged as a Pass 5 gap; the dimension scored 3/10 largely on
this absence. Best written *during* the Fraunces/display-font swap, not
before — so the three-way split (Contralto wordmark / Fraunces display /
Helvetica body) is documented once it's verified.
**Depends on:** Decision 2 landing first, so the type section is written once.

---

## 4. Accessibility gaps

**What:** Four items, all verified in the prod build:
- **No `<h1>`** on the home page. Heading order reads `H2>H2>H2>H2>H2>H2>H3…`.
  (Decision 1 fixes this by promoting the wordmark — tracked here so it is not
  lost if that work is split.)
- **No skip link** — keyboard users traverse the whole nav on every page.
- **25 tap targets below 44×44px** at 390px wide, including the home logo link
  at 34×34. Raise via padding, not font size.
- **Text over film has uncontrolled contrast** — ~25 runs sit on video or
  photography with no measurable scrim: nav labels, the `SCROLL` cue, tile
  captions, and the "ma·gin·ha·wa" definition card (white copy on a bright,
  busy food shot, where the copy also appears to overrun its panel). Contrast
  over *video* changes frame to frame, so it cannot be verified — that is the
  finding. Needs a scrim token, not a per-component guess.

**Why:** The `<h1>` gap also costs search and press discovery, which is a
stated success metric.

**Pros:** All four are small and independent.
**Cons:** The scrim needs a design call — how dark, and does it apply to the
nav as well as body runs.
**Context:** What is already right and must not regress: focus rings on every
interactive element, a genuinely excellent tab order (logo → menu → view
toggles → tile → Book → tile → Book), working `prefers-reduced-motion`, `alt`
on all 53 images, `lang="en-GB"`, and correct landmarks.
**Depends on:** Nothing.

---

## 5. Form states — required fields and live regions

**What:** On `/contact`, **no field is marked `required`** — firstName,
lastName, email and message are all optional, so an empty form can be
submitted. Neither `/contact` nor `/careers` has an `aria-live` region, so
success and error messages are never announced to a screen reader. On
`/careers`, the `cv` file input is optional on what is a CV-upload flow.

**Why:** An empty enquiry is a lost enquiry — nobody can reply to it. And a
blind applicant currently gets no confirmation that their application sent.

**Pros:** Small, well-scoped, and the full state table is already specified in
DESIGN-PLAN.md Pass 2.
**Cons:** Requires deciding whether a CV is mandatory or whether applicants
may apply with a message alone.
**Context:** Every field on both forms is already correctly labelled — this is
validation and announcement only, not a forms rebuild.
**Depends on:** A call on whether `cv` is required.

---

## 6. Re-cut the hero film

**What:** Replace the desktop hero's generic flame-grill footage with Filipino
dishes.

**Why:** The flame could belong to any steakhouse in Europe. The mobile hero
already lands on an actual Filipino dish and reads markedly better — the
desktop cut is the weaker of the two.

**Pros:** The single highest-leverage change to how Filipino the site *feels*
in the first second.
**Cons:** Needs footage and edit time, which is why Decision 1 deliberately
does not depend on it.
**Context:** Decision 1 fixes the first screen's *identity* with copy and
actions; this fixes its *imagery*. They are independent and can ship in either
order.
**Depends on:** Footage availability.

---

## 7. Reconcile "Seven rooms" with eight tiles

**What:** The Reservations section says "Seven rooms. Different worlds. One
table." while the grid shows eight tiles (seven open + Bunso, coming soon).

**Why:** Small, but `PRODUCT.md` makes facts binding, and Decision 4 opens the
closing section to all eight venues — which makes the count visible.

**Pros:** Copy-only.
**Cons:** None.
**Context:** Roll into Decision 4 rather than doing separately.
**Depends on:** Decision 4.
