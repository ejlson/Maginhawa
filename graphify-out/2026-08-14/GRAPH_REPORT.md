# Graph Report - Maginhawa  (2026-08-14)

## Corpus Check
- 152 files · ~6,701,087 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1137 nodes · 1424 edges · 101 communities (73 shown, 28 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 34 edges (avg confidence: 0.68)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cfe22c37`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- user-account-core-06dbaa1bcfe1a542-min.en-US.js
- common-dabb52f27fbf7211-min.en-US.js
- 8018.js
- probe-timeline.mjs
- probe-manifesto-measure.mjs
- probe-manifesto-wrap.mjs
- probe-band-about-press.mjs
- probe-viewswitch.mjs
- probe-manifesto.mjs
- probe-walk.mjs
- probe-discover-tiles.mjs
- Discover.tsx
- probe-timeline-audit.mjs
- probe-timeline-perf.mjs
- probe-timeline-followup.mjs
- probe-hydration-compare.mjs
- probe-timeline-geometry.mjs
- shoot-hero.mjs
- x
- probe-hover-wipe.mjs
- probe-timeline-yearink.mjs
- package.json
- probe-title-oneline.mjs
- probe-timeline-yearvis2.mjs
- probe-title-measure.mjs
- RestaurantsShowcase.tsx
- probe-font-trial.mjs
- BlogIndex.tsx
- compilerOptions
- PageTransition.tsx
- probe-discover-card.mjs
- Experience.tsx
- Discover.tsx
- Experience.tsx
- PageTransition.tsx
- RestaurantDetail.tsx
- probe-verify-head.mjs
- probe-phase2a-after.mjs
- probe-verify-head2.mjs
- probe-verify-head4.mjs
- probe-discover-cards.mjs
- probe-timeline-contrast.mjs
- Footer.tsx
- probe-about-open.mjs
- ms
- RestaurantDetail.tsx
- jsonld.tsx
- RestaurantsShowcase.tsx
- jsonld.tsx
- Product
- restaurants.ts
- probe-press-lane.mjs
- Agent Pipeline
- Blog.tsx
- shoot-sections.mjs
- probe-about-maroon-seams.mjs
- probe-palette-screenshots.mjs
- venueCards.ts
- probe-type-lab.mjs
- Interlude.tsx
- .closeMenuOverlay
- crop-press-strip.mjs
- shoot-press-section.mjs
- probe-press-ink.mjs
- probe-press-profile.mjs
- shoot-press-sheet.mjs
- Manifesto.tsx
- shoot-about-rules.mjs
- restaurants.ts
- next.config.mjs
- next-env.d.ts
- shoot-pass.mjs
- probe-press-wrap.mjs
- shoot-blog.mjs
- RestaurantsShowcase.tsx
- press.ts
- venueCards.ts
- probe-cta-instances.mjs
- page.tsx
- compress-media.mjs
- Experience.tsx
- .tmp-probe-morph.mjs
- .tmp-expand-foot.mjs
- JoinUs.tsx

## God Nodes (most connected - your core abstractions)
1. `asset()` - 29 edges
2. `Maginhawa Group — Content Guide` - 18 edges
3. `getRestaurant()` - 17 edges
4. `include` - 17 edges
5. `compilerOptions` - 16 edges
6. `useRouteTransition()` - 13 edges
7. `Design Plan — brand fit and audience needs` - 12 edges
8. `q()` - 10 edges
9. `Product` - 10 edges
10. `PillCta()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `BlogIndexInner()` --indirect_call--> `p()`  [INFERRED]
  components/BlogIndex.tsx → scripts/probe-band-about-press.mjs
- `JoinUs()` --indirect_call--> `q()`  [INFERRED]
  components/JoinUs.tsx → scripts/probe-timeline.mjs
- `PressWall()` --calls--> `asset()`  [EXTRACTED]
  components/PressWall.tsx → lib/media.ts
- `RestaurantsShowcase()` --indirect_call--> `slug()`  [INFERRED]
  components/RestaurantsShowcase.tsx → scripts/shoot-sections.mjs
- `SmoothScroll()` --indirect_call--> `frame()`  [INFERRED]
  lib/SmoothScroll.tsx → scripts/probe-indent-hover.mjs

## Import Cycles
- None detected.

## Communities (101 total, 28 thin omitted)

### Community 0 - "user-account-core-06dbaa1bcfe1a542-min.en-US.js"
Cohesion: 0.06
Nodes (33): 10. Home page copy, 11. Navigation & footer links, 12. Images & video, 13. Page titles & SEO, 14. Publishing your changes, 15. Known placeholders, 16. Troubleshooting, 1. Before you start (+25 more)

### Community 1 - "common-dabb52f27fbf7211-min.en-US.js"
Cohesion: 0.05
Nodes (46): metadata, generateMetadata(), RestaurantPage(), cellVariants, DiscoverDisplay, DiscoverItem, DISPLAY, EASE (+38 more)

### Community 2 - "8018.js"
Cohesion: 0.20
Nodes (9): min, openPage(), others, radii, RATIO, s(), samples, seatGrid() (+1 more)

### Community 3 - "probe-timeline.mjs"
Cohesion: 0.05
Nodes (38): Decision 1 — The first screen identifies and offers a way in, Decision 2 — Fraunces takes the display roles; Contralto stays on the wordmark, Decision 3 — Hours, and a computed open/closed state, Decision 4 — Every venue transacts, matched to its type, Design Plan — brand fit and audience needs, Fix to 10, Fix to 10, Fix to 10 (+30 more)

### Community 6 - "probe-manifesto-measure.mjs"
Cohesion: 0.29
Nodes (4): CAPS, head, table, WIDTHS

### Community 7 - "probe-manifesto-wrap.mjs"
Cohesion: 0.33
Nodes (4): COEFS, head, table, WIDTHS

### Community 8 - "probe-band-about-press.mjs"
Cohesion: 0.10
Nodes (25): aboutLast, argv, CR(), crop(), down, errors, failed, L() (+17 more)

### Community 10 - "probe-manifesto.mjs"
Cohesion: 0.50
Nodes (3): H, idx, W

### Community 11 - "probe-walk.mjs"
Cohesion: 0.50
Nodes (3): H, stops, W

### Community 13 - "Discover.tsx"
Cohesion: 0.09
Nodes (16): argv, bands, clips, docTop(), errors, failed, inlines, lefts (+8 more)

### Community 14 - "probe-timeline-audit.mjs"
Cohesion: 0.12
Nodes (10): centre(), centreOf(), consoleMsgs, fails, flight, R, travelTo(), visible (+2 more)

### Community 15 - "probe-timeline-perf.mjs"
Cohesion: 0.25
Nodes (8): dIn, dOut, hf, inTl, longIn, outTl, pct(), row()

### Community 17 - "probe-hydration-compare.mjs"
Cohesion: 0.33
Nodes (4): cases, head418, out, wt418

### Community 20 - "x"
Cohesion: 0.09
Nodes (23): bareOK(), CR(), CREAM, edgeRows, extremes(), failed, L(), lightest (+15 more)

### Community 23 - "probe-hover-wipe.mjs"
Cohesion: 0.20
Nodes (7): anchored, enterX, enterY, min, radii, samples, trough

### Community 24 - "probe-timeline-yearink.mjs"
Cohesion: 0.29
Nodes (4): centreYear(), hidden, named, travelTo()

### Community 25 - "package.json"
Cohesion: 0.04
Nodes (42): displayFace, metadata, textFace, Mode, FILTERS, GlassFilters(), KEEP, LENS_MAP (+34 more)

### Community 26 - "probe-title-oneline.mjs"
Cohesion: 0.29
Nodes (4): maxR, minL, sampled, steps

### Community 29 - "RestaurantsShowcase.tsx"
Cohesion: 0.16
Nodes (9): CATEGORY_LABEL, EASE, HOME_SLUGS, POOL, RAIL, VenueMark(), BLOG, BlogEntry (+1 more)

### Community 31 - "BlogIndex.tsx"
Cohesion: 0.08
Nodes (26): jsonLd, metadata, About(), CHAPTERS, COVERAGE_GROUPS, CoverageRow, COVERED_RESTAURANTS, MISSING_IMAGES (+18 more)

### Community 33 - "compilerOptions"
Cohesion: 0.05
Nodes (38): dom, dom.iterable, esnext, .next-about-dev/types/**/*.ts, .next-about/types/**/*.ts, .next-ac1-before/types/**/*.ts, .next-cb-dev/types/**/*.ts, .next-cb/types/**/*.ts (+30 more)

### Community 37 - "probe-discover-card.mjs"
Cohesion: 0.07
Nodes (30): allClip, anchored, areas, belly, blockHs, bunso, bunsoEdge, clipped (+22 more)

### Community 38 - "Experience.tsx"
Cohesion: 0.09
Nodes (16): argv, creds, DRY, files, FORCE, IMAGE_EXT, jobs, manifest (+8 more)

### Community 39 - "Discover.tsx"
Cohesion: 0.13
Nodes (14): argv, brightestGround(), CR(), failed, HOME, L(), lin(), open() (+6 more)

### Community 41 - "PageTransition.tsx"
Cohesion: 0.13
Nodes (16): Film(), metadata, AboutSplit(), CardMedia(), VenueMark(), DarkZone(), MenuOverlay(), RestaurantDetail() (+8 more)

### Community 42 - "RestaurantDetail.tsx"
Cohesion: 0.33
Nodes (5): EASE, MARKS, ORDER, PressWall(), FEATURED_OUTLETS

### Community 43 - "probe-verify-head.mjs"
Cohesion: 0.47
Nodes (3): freshPage(), runIntro(), sleep()

### Community 45 - "probe-verify-head2.mjs"
Cohesion: 0.10
Nodes (21): bareOK(), brightest(), CR(), CREAM, failed, L(), lin(), markMin (+13 more)

### Community 50 - "probe-discover-cards.mjs"
Cohesion: 0.36
Nodes (6): failed, open(), R, s(), seatGrid(), walk()

### Community 51 - "probe-timeline-contrast.mjs"
Cohesion: 0.06
Nodes (33): CustomCursor(), CASES, centreOf(), diff(), frame(), layoutCost(), layoutCount(), midFlight() (+25 more)

### Community 55 - "probe-about-open.mjs"
Cohesion: 0.15
Nodes (7): anyOverlap, down, errs, MARKS, msgs, sorted, up

### Community 58 - "RestaurantDetail.tsx"
Cohesion: 0.22
Nodes (8): Blog section — not started, Discover: the fit-one-screen arithmetic, Do these first — ALL THREE DONE (2026-08-06), Handoff — home page redesign (2026-08-06), Known costs, accepted deliberately, The spacing system that now governs, Things that will waste your time if you don't know them, Where the home page stands

### Community 60 - "jsonld.tsx"
Cohesion: 0.11
Nodes (17): armReveals(), consoleErrors, failures, L, lin(), lum(), newErrors, out (+9 more)

### Community 61 - "RestaurantsShowcase.tsx"
Cohesion: 0.16
Nodes (9): metadata, BlogIndexInner(), FILTERS, pageCountFor(), postsForPage(), ROOM_NAME, ROOM_ORDER, RoomFilter() (+1 more)

### Community 62 - "jsonld.tsx"
Cohesion: 0.13
Nodes (14): blockVariants, EASE_ENTRANCE, eyebrowVariants, KEY_WORDS, Manifesto(), STATEMENT, statementVariants, wordClass() (+6 more)

### Community 63 - "Product"
Cohesion: 0.18
Nodes (10): Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product, Product Principles (+2 more)

### Community 65 - "probe-press-lane.mjs"
Cohesion: 0.22
Nodes (7): done, got, hs, mids, sd, STEP, want

### Community 66 - "Agent Pipeline"
Cohesion: 0.22
Nodes (7): Agent 1 — Prompt Architect, Agent 2 — Builder, Agent 3 — Tester, Agent 4 — Reviewer, Agent Pipeline, graphify, Orchestration Rules

### Community 68 - "Blog.tsx"
Cohesion: 0.11
Nodes (18): armReveals(), byRoute, consoleErrors, fails, held, L, lin(), lum() (+10 more)

### Community 69 - "shoot-sections.mjs"
Cohesion: 0.07
Nodes (27): archivo, bricolage, epilogue, familjen, figtree, fontVars, garamond, host (+19 more)

### Community 72 - "venueCards.ts"
Cohesion: 0.20
Nodes (9): 1. Get an account, 2. Upload, 3. Turn it on, 4. Then, and only then, shrink the repo, Deploying to Cloudflare, Doing it, Gotchas worth knowing before you hit them, Media on Cloudinary → hosting on Cloudflare (+1 more)

### Community 73 - "probe-type-lab.mjs"
Cohesion: 0.22
Nodes (9): accents, FACES, flat, LADDER, lum(), PANELS, ratio(), SHEET_FACES (+1 more)

### Community 75 - ".closeMenuOverlay"
Cohesion: 0.22
Nodes (6): files, found, globals, PROPS, ROOTS, tokens

### Community 76 - "crop-press-strip.mjs"
Cohesion: 0.40
Nodes (4): bits, h, half, top

### Community 82 - "Manifesto.tsx"
Cohesion: 0.31
Nodes (6): LONDON_CLOCK, LondonClock(), Reservations(), Clip, clipStyle(), VideoBackdrop()

### Community 83 - "shoot-about-rules.mjs"
Cohesion: 0.06
Nodes (35): jsonLd, metadata, Contact(), ContactProps, ContactPage(), mapUrl(), VISITABLE, ITEMS (+27 more)

### Community 84 - "restaurants.ts"
Cohesion: 0.15
Nodes (12): DOOR_IN, DOOR_WIPE, DOORS, EASE, FADE, HEADING_V, LINE, PARA (+4 more)

### Community 88 - "shoot-pass.mjs"
Cohesion: 0.47
Nodes (5): H, s(), settle(), shotAt(), W

### Community 90 - "shoot-blog.mjs"
Cohesion: 1.00
Nodes (3): s(), shoot(), walk()

### Community 91 - "RestaurantsShowcase.tsx"
Cohesion: 0.28
Nodes (7): Common, MAGNET, PillCta(), Props, MAGNET_SPRING, MagnetOptions, useMagnet()

### Community 92 - "press.ts"
Cohesion: 0.83
Nodes (3): armReveals(), open(), s()

### Community 96 - "compress-media.mjs"
Cohesion: 0.11
Nodes (14): argv, CRF, files, IMAGE_EXT, jobs, ONLY, ORIGINALS, PUBLIC (+6 more)

### Community 97 - "Experience.tsx"
Cohesion: 0.18
Nodes (11): Experience(), HERO_INSETS, ALPHABET, FlipLetter(), holePath(), LETTERS, Loader(), Rect (+3 more)

### Community 98 - ".tmp-probe-morph.mjs"
Cohesion: 0.36
Nodes (11): analyse(), anis(), crop(), open(), progressOf(), run(), s(), SAMPLER() (+3 more)

### Community 99 - ".tmp-expand-foot.mjs"
Cohesion: 0.33
Nodes (4): H, report, VENUES, W

### Community 178 - "JoinUs.tsx"
Cohesion: 0.10
Nodes (17): jsonLd, metadata, clamp01(), DIAL_CODES, DIGITS, FlipDigit(), HERO_LINES, inkBox() (+9 more)

## Knowledge Gaps
- **535 isolated node(s):** `jsonLd`, `metadata`, `metadata`, `jsonLd`, `metadata` (+530 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `q()` connect `probe-timeline-contrast.mjs` to `JoinUs.tsx`, `Discover.tsx`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `JoinUs()` connect `JoinUs.tsx` to `probe-timeline-contrast.mjs`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `frame()` connect `probe-timeline-contrast.mjs` to `package.json`, `.tmp-probe-morph.mjs`, `RestaurantsShowcase.tsx`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **What connects `jsonLd`, `metadata`, `metadata` to the rest of the system?**
  _535 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `user-account-core-06dbaa1bcfe1a542-min.en-US.js` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._
- **Should `common-dabb52f27fbf7211-min.en-US.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05314685314685315 - nodes in this community are weakly interconnected._
- **Should `probe-timeline.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._