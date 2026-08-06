# Handoff — home page redesign (2026-08-06)

State of the work at the end of the session that rebuilt the home page's
middle chapters. Written to be actionable without the conversation.

## Where the home page stands

`components/Experience.tsx` order is now:

```
Hero → Discover → Manifesto (+ StoryStrip inside it) → AboutSplit
     → Interlude → Blog → Reservations → DarkZone(Footer)
```

Removed this session: `AboutIntro` (About Us chapter), `PressWall`
("Featured In"). Both files still exist and are **unreferenced** — dead code
with a stay of execution, not keepers. `MaroonZone.tsx` is also unreferenced.

## The spacing system that now governs

One number, `--grid-gutter` (12px), is used for: the gap between the story
band's photographs, the gap below them, the masthead's inset from the screen
edge, the gap around the About panel, and the seam between About and the
Interlude. It is also Discover's card gutter at ≥981px.

**The recurring trap:** two neighbouring sections each contributing 12px
makes a 24px seam. `AboutSplit` therefore has `padding: 0 var(--grid-gutter)`
— no vertical padding at all — and lets its neighbours own the seams.

## Do these first — ALL THREE DONE (2026-08-06)

0. **`Discover.tsx` did not compile, and that is why item 2 looked like HMR
   lag.** Lines 277–282 were prose sitting outside any comment: the block
   above them already closed at 275, and a duplicate paragraph plus a second
   `*/` had been left below it. `tsc` reported ~40 errors from line 277 on.
   The dev server was serving the last good bundle, which is the 1.03 the
   previous session measured — the ratio was never the problem. Fixed by
   folding the one non-duplicated sentence into the surviving block.

1. ~~**`Discover.module.css` stale fallback.**~~ Now `padding-top: 76%`, and
   the prose around it no longer claims 3 : 3.8. **Verified** in the browser:
   the stylesheet rule and the inline value from `PLATE_RATIO` both read
   `76%`.

2. ~~**Verify `PLATE_RATIO = 0.76` renders.**~~ **Verified**, once it
   compiled. At 1440×900: card **331×252**, ratio **0.7600**, Discover
   section **898px** in a 900px viewport. Also checked 1280×1000 → 849px,
   ratio holds.

3. ~~**Replace `<Interlude />` with `<PressWall />`.**~~ Done. Interlude is
   now unreferenced (joins AboutIntro and MaroonZone). Verified: order is
   Hero → Discover → Manifesto → AboutSplit → **PressWall** → Blog →
   Reservations, 3 credentials, 28 mastheads, `pressDrift` running, title at
   x=40 (agreeing with Discover's head).
   - **The marquee's seam is restored exactly** — PressWall's bottom and
     Blog's top are the same y. The deceleration ramp has its host back.
     *Not* observed animating: the preview pane freezes rAF, so framer's
     `useMotionValueEvent` never fires. The animation object and the
     geometry it needs are both confirmed; the live ramp is not.
   - **The section padding was NOT zeroed, deliberately** — the one place
     this deviates from the plan above. The 12px seam was meaningful because
     the interlude put a *photograph* 12px below AboutSplit's video; with a
     type chapter there, 12px would weld the title to the image, and since
     the gap is cream either way, splitting it into "12px seam + head
     margin" is invisible. Seam is 117px padding / 135px ink-to-ink. Full
     argument in `PressWall.module.css`'s `.section` note.
   - **Stale comments corrected in that file** while in there: the header
     block still described PressWall as living inside `MaroonZone` with
     cream type, above a 317px seam to `AboutIntro`. All false since the
     dark band was dropped, and it directly contradicted the note being
     added.

## Discover: the fit-one-screen arithmetic

Measured at 1440 wide, four-up:

```
card width   (1360 − 3×12) / 4 = 331px
fixed cost above the grid       = 377px  (108 padding + 234 head + 34 gap)
fits viewport H when  ratio ≤ (H − 395) / 662
   → 1.035 at H=1080   0.914 at H=1000   0.763 at H=900
```

0.76 was chosen so it fits *any* window ≥900, not just a tall one. The cost
is that the cards are landscape (331×252) where the user originally chose
3:3.8 uprights.

**The proper fix**, if the upright is wanted back: drive card height from the
viewport instead of from card width — flex-column section, `.grid { flex: 1 }`,
`grid-template-rows: repeat(2, minmax(0,1fr))`, and plates on `height: 100%`
rather than the padding-top ratio. That is a change to `VenueCard` and makes
the fit exact at every height rather than merely safe.

## Blog section — not started

The last chapter still on the old system. Three changes align it:

- **Head:** reuse Discover's structure (label + logo mark → Freight display
  line → hairline). `/blog` still has its own title treatment.
- **Left edge:** the grid is on `--grid-col2`, the last chapter with the old
  margin — it lines up with nothing above it.
- **Radius + rhythm:** media still carries the 2px sharp print cut while the
  home page has moved to 8px `--radius-tile`; gaps predate the 12px system.
- **Stale literal:** `BlogIndex.module.css:371` still has
  `rgba(47, 0, 0, 0.14)` — pre-migration ink. The featured rule at line 42
  was already fixed to `var(--rule)` (it measured 1.29:1).

## Known costs, accepted deliberately

- **`mamasons-hero.mp4` is 25.6MB** — the About panel's video, chosen by the
  user. Nine times the clip it replaced. `preload="metadata"` keeps it off
  the critical path, but a compressed ~3–5MB derivative would look identical
  in a 660px frame.
- **The three prints in About have no visible labels.** Removed on request.
  They are links to `/restaurants/{bintang,ramo,guanabana}` and the only
  sighted affordance left is a hover lift — which does not exist on touch.
  Accessible names are intact.
- **Orphaned assets:** `belly-web.jpg`, `cafemama-web.jpg`,
  `mamasons-web.jpg`. `omar.jpg` (16.5MB) is no longer used here.
- **The image pool is empty.** Every photograph in `public/images` at a sane
  weight is now placed. A new picture for any panel needs a new asset or a
  swap out of the story band.

## Things that will waste your time if you don't know them

- **The preview pane is a hidden document.** `document.visibilityState ===
  "hidden"`, `requestAnimationFrame` runs **0 frames**, IntersectionObserver
  never fires. Screenshots come back flat cream and `whileInView` entrances
  never play. Verify by DOM measurement; ask the user for a screenshot when
  you need to see it. `document.scrollingElement.scrollTop = …` works when
  Lenis' `scrollTo` does not (its rAF is frozen too).
- **Lenis is `window.__lenis`.** `window.lenis` is a version stub with no
  methods.
- **Class-prefix selectors over-match.** `[class*="Foo_thumb"]` matches
  `thumbs`; `[class*="Nav_link"]` matches `Nav_links`. This produced two
  false readings this session.
- **Read computed values off the real element, never off the first
  declaration in the file.** Discover's `.grid` base rule says
  `gap: clamp(10px, 1.2vw, 20px)` and is overridden at every width ≥461px —
  the cards actually sit at 12px while that clamp computes 17.28px.
- **Measure rendered elements, not strings.** A plain-text probe of the
  Discover lede predicted a two-line break that the real element (word spans
  in inline-block masks) did not produce.
