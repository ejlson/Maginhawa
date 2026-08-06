# Graph Report - Maginhawa  (2026-08-05)

## Corpus Check
- 115 files · ~6,639,292 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 865 nodes · 1082 edges · 77 communities (58 shown, 19 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.62)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `08bcf1ca`
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
- ContactPage.tsx
- jsonld.tsx
- RestaurantsShowcase.tsx
- Reveal.tsx
- Product
- page.tsx
- Footer.tsx
- Agent Pipeline
- restaurants.ts
- Blog.tsx
- shoot-sections.mjs
- probe-about-maroon-seams.mjs
- probe-palette-screenshots.mjs
- .closeMenuOverlay
- next.config.mjs
- next-env.d.ts
- Discover.tsx
- JoinUs.tsx

## God Nodes (most connected - your core abstractions)
1. `Maginhawa Group — Content Guide` - 18 edges
2. `compilerOptions` - 16 edges
3. `include` - 15 edges
4. `useRouteTransition()` - 13 edges
5. `getRestaurant()` - 13 edges
6. `Design Plan — brand fit and audience needs` - 12 edges
7. `Product` - 10 edges
8. `Nav()` - 9 edges
9. `Reveal()` - 9 edges
10. `TODOS` - 9 edges

## Surprising Connections (you probably didn't know these)
- `BlogIndexInner()` --indirect_call--> `p()`  [INFERRED]
  components/BlogIndex.tsx → scripts/probe-band-about-press.mjs
- `JoinUs()` --indirect_call--> `p()`  [INFERRED]
  components/JoinUs.tsx → scripts/probe-band-about-press.mjs
- `JoinUs()` --indirect_call--> `q()`  [INFERRED]
  components/JoinUs.tsx → scripts/probe-timeline.mjs
- `RestaurantsShowcase()` --indirect_call--> `slug()`  [INFERRED]
  components/RestaurantsShowcase.tsx → scripts/shoot-sections.mjs
- `generateMetadata()` --calls--> `getRestaurant()`  [EXTRACTED]
  app/restaurants/[slug]/page.tsx → lib/restaurants.ts

## Import Cycles
- None detected.

## Communities (77 total, 19 thin omitted)

### Community 0 - "user-account-core-06dbaa1bcfe1a542-min.en-US.js"
Cohesion: 0.06
Nodes (33): 10. Home page copy, 11. Navigation & footer links, 12. Images & video, 13. Page titles & SEO, 14. Publishing your changes, 15. Known placeholders, 16. Troubleshooting, 1. Before you start (+25 more)

### Community 1 - "common-dabb52f27fbf7211-min.en-US.js"
Cohesion: 0.15
Nodes (9): metadata, BlogIndexInner(), FILTERS, pageCountFor(), postsForPage(), ROOM_NAME, ROOM_ORDER, RoomFilter() (+1 more)

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
Cohesion: 0.06
Nodes (24): argv, bands, clips, docTop(), errors, failed, inlines, lefts (+16 more)

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
Cohesion: 0.06
Nodes (31): framer-motion, lenis, SmoothScroll(), next, dependencies, framer-motion, lenis, next (+23 more)

### Community 26 - "probe-title-oneline.mjs"
Cohesion: 0.29
Nodes (4): maxR, minL, sampled, steps

### Community 29 - "RestaurantsShowcase.tsx"
Cohesion: 0.08
Nodes (21): Experience(), HERO_INSETS, CYCLE, EASE, ALPHABET, FlipLetter(), holePath(), LETTERS (+13 more)

### Community 31 - "BlogIndex.tsx"
Cohesion: 0.08
Nodes (26): jsonLd, metadata, About(), CHAPTERS, COVERAGE_GROUPS, CoverageRow, COVERED_RESTAURANTS, MISSING_IMAGES (+18 more)

### Community 33 - "compilerOptions"
Cohesion: 0.05
Nodes (36): dom, dom.iterable, esnext, .next-about-dev/types/**/*.ts, .next-about/types/**/*.ts, .next-cb-dev/types/**/*.ts, .next-cb/types/**/*.ts, .next-contact/types/**/*.ts (+28 more)

### Community 37 - "probe-discover-card.mjs"
Cohesion: 0.07
Nodes (30): allClip, anchored, areas, belly, blockHs, bunso, bunsoEdge, clipped (+22 more)

### Community 38 - "Experience.tsx"
Cohesion: 0.12
Nodes (13): displayFace, metadata, Mode, FILTERS, GlassFilters(), KEEP, LENS_MAP, PILL_MAP (+5 more)

### Community 39 - "Discover.tsx"
Cohesion: 0.13
Nodes (14): argv, brightestGround(), CR(), failed, HOME, L(), lin(), open() (+6 more)

### Community 41 - "PageTransition.tsx"
Cohesion: 0.20
Nodes (11): CLIPS, Hero(), scrollToSection(), CURTAIN, IMAGES, Navigate, PageTransition(), Phase (+3 more)

### Community 42 - "RestaurantDetail.tsx"
Cohesion: 0.13
Nodes (15): RestaurantPage(), cellVariants, DiscoverDisplay, DiscoverItem, DISPLAY, EASE, EXPAND_SPRING, ExpandedCard() (+7 more)

### Community 43 - "probe-verify-head.mjs"
Cohesion: 0.47
Nodes (3): freshPage(), runIntro(), sleep()

### Community 45 - "probe-verify-head2.mjs"
Cohesion: 0.10
Nodes (21): bareOK(), brightest(), CR(), CREAM, failed, L(), lin(), markMin (+13 more)

### Community 50 - "probe-discover-cards.mjs"
Cohesion: 0.36
Nodes (6): failed, open(), R, s(), seatGrid(), walk()

### Community 55 - "probe-about-open.mjs"
Cohesion: 0.15
Nodes (7): anyOverlap, down, errs, MARKS, msgs, sorted, up

### Community 58 - "RestaurantDetail.tsx"
Cohesion: 0.28
Nodes (9): ITEMS, Menu(), getNavTheme(), LINKS, Nav(), Theme, useRouteTransition(), Placeholder() (+1 more)

### Community 59 - "ContactPage.tsx"
Cohesion: 0.24
Nodes (6): jsonLd, metadata, ContactPage(), mapUrl(), VISITABLE, DarkZone()

### Community 60 - "jsonld.tsx"
Cohesion: 0.11
Nodes (17): armReveals(), consoleErrors, failures, L, lin(), lum(), newErrors, out (+9 more)

### Community 61 - "RestaurantsShowcase.tsx"
Cohesion: 0.12
Nodes (11): metadata, CARDS, LOOP, MID, nameList(), project(), NOTE: one video ships today (hero-draft3). Drop a per-restaurant clip in, RESTAURANTS (+3 more)

### Community 62 - "Reveal.tsx"
Cohesion: 0.21
Nodes (6): AboutIntro(), Contact(), ContactProps, ITEMS, Reveal(), RevealProps

### Community 63 - "Product"
Cohesion: 0.18
Nodes (10): Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product, Product Principles (+2 more)

### Community 64 - "page.tsx"
Cohesion: 0.19
Nodes (12): generateMetadata(), CREDENTIALS, EASE, hrefFor(), LANE, PressWall(), RestaurantJsonLd(), FEATURED_OUTLETS (+4 more)

### Community 65 - "Footer.tsx"
Cohesion: 0.28
Nodes (6): CONTACT_LINKS, EXPLORE, FootLink, FootLinkA(), CONTACT, SOCIALS

### Community 66 - "Agent Pipeline"
Cohesion: 0.22
Nodes (7): Agent 1 — Prompt Architect, Agent 2 — Builder, Agent 3 — Tester, Agent 4 — Reviewer, Agent Pipeline, graphify, Orchestration Rules

### Community 67 - "restaurants.ts"
Cohesion: 0.19
Nodes (11): REVIEWABLE, reviewUrl(), ReviewUs(), Restaurant, RESTAURANTS, SLUG_BY_NAME, VenueAction, Extras (+3 more)

### Community 68 - "Blog.tsx"
Cohesion: 0.24
Nodes (6): EASE, HOME_SLUGS, POOL, BLOG, BlogEntry, NOTE: the old FEATURED_BLOG / TOP_THREE / REST slices were removed — the

### Community 69 - "shoot-sections.mjs"
Cohesion: 0.83
Nodes (3): armReveals(), open(), s()

### Community 75 - ".closeMenuOverlay"
Cohesion: 0.22
Nodes (6): files, found, globals, PROPS, ROOTS, tokens

### Community 89 - "Discover.tsx"
Cohesion: 0.17
Nodes (14): Enter, ENTER_OFFSET, KEY_WORDS, Manifesto(), PARTS, SCRUB_EASE, ScrubLine(), ScrubWord() (+6 more)

### Community 178 - "JoinUs.tsx"
Cohesion: 0.10
Nodes (16): jsonLd, metadata, clamp01(), DIAL_CODES, DIGITS, FlipDigit(), HERO_LINES, inkBox() (+8 more)

## Knowledge Gaps
- **392 isolated node(s):** `jsonLd`, `metadata`, `metadata`, `jsonLd`, `metadata` (+387 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `JoinUs()` connect `JoinUs.tsx` to `Discover.tsx`, `Discover.tsx`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `q()` connect `Discover.tsx` to `JoinUs.tsx`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `p()` connect `Discover.tsx` to `probe-band-about-press.mjs`, `common-dabb52f27fbf7211-min.en-US.js`, `JoinUs.tsx`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `jsonLd`, `metadata`, `metadata` to the rest of the system?**
  _392 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `user-account-core-06dbaa1bcfe1a542-min.en-US.js` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._
- **Should `probe-timeline.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `probe-band-about-press.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.10098522167487685 - nodes in this community are weakly interconnected._