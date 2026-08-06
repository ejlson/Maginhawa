# Graph Report - Maginhawa  (2026-08-04)

## Corpus Check
- 104 files · ~6,615,063 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 690 nodes · 875 edges · 57 communities (42 shown, 15 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.66)
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
- probe-settle-travel.mjs
- probe-viewswitch.mjs
- probe-manifesto.mjs
- probe-walk.mjs
- probe-discover-tiles.mjs
- probe-pasteboard.mjs
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
- Experience.tsx
- RestaurantDetail.tsx
- probe-verify-head.mjs
- probe-phase2a-after.mjs
- probe-verify-head2.mjs
- probe-verify-head4.mjs
- probe-discover-cards.mjs
- probe-timeline-contrast.mjs
- ms
- Product
- Agent Pipeline
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
5. `Design Plan — brand fit and audience needs` - 12 edges
6. `getRestaurant()` - 10 edges
7. `Product` - 10 edges
8. `Nav()` - 9 edges
9. `Reveal()` - 9 edges
10. `TODOS` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Discover()` --indirect_call--> `check()`  [INFERRED]
  components/Discover.tsx → scripts/probe-discover-panels.mjs
- `Discover()` --indirect_call--> `q()`  [INFERRED]
  components/Discover.tsx → scripts/probe-timeline.mjs
- `JoinUs()` --indirect_call--> `q()`  [INFERRED]
  components/JoinUs.tsx → scripts/probe-timeline.mjs
- `FlipLetter()` --indirect_call--> `step()`  [INFERRED]
  components/Loader.tsx → scripts/probe-timeline-audit.mjs
- `RestaurantsShowcase()` --indirect_call--> `slug()`  [INFERRED]
  components/RestaurantsShowcase.tsx → scripts/shoot-sections.mjs

## Import Cycles
- None detected.

## Communities (57 total, 15 thin omitted)

### Community 0 - "user-account-core-06dbaa1bcfe1a542-min.en-US.js"
Cohesion: 0.06
Nodes (33): 10. Home page copy, 11. Navigation & footer links, 12. Images & video, 13. Page titles & SEO, 14. Publishing your changes, 15. Known placeholders, 16. Troubleshooting, 1. Before you start (+25 more)

### Community 1 - "common-dabb52f27fbf7211-min.en-US.js"
Cohesion: 0.08
Nodes (19): metadata, EASE, HOME_SLUGS, POOL, BlogIndexInner(), FILTERS, pageCountFor(), postsForPage() (+11 more)

### Community 2 - "8018.js"
Cohesion: 0.20
Nodes (9): min, openPage(), others, radii, RATIO, s(), samples, SLUGS (+1 more)

### Community 3 - "probe-timeline.mjs"
Cohesion: 0.05
Nodes (38): Decision 1 — The first screen identifies and offers a way in, Decision 2 — Fraunces takes the display roles; Contralto stays on the wordmark, Decision 3 — Hours, and a computed open/closed state, Decision 4 — Every venue transacts, matched to its type, Design Plan — brand fit and audience needs, Fix to 10, Fix to 10, Fix to 10 (+30 more)

### Community 6 - "probe-manifesto-measure.mjs"
Cohesion: 0.29
Nodes (4): CAPS, head, table, WIDTHS

### Community 7 - "probe-manifesto-wrap.mjs"
Cohesion: 0.33
Nodes (4): COEFS, head, table, WIDTHS

### Community 8 - "probe-settle-travel.mjs"
Cohesion: 0.33
Nodes (5): every, H, swaps, valid, W

### Community 10 - "probe-manifesto.mjs"
Cohesion: 0.50
Nodes (3): H, idx, W

### Community 11 - "probe-walk.mjs"
Cohesion: 0.50
Nodes (3): H, stops, W

### Community 14 - "probe-timeline-audit.mjs"
Cohesion: 0.13
Nodes (10): centre(), centreOf(), consoleMsgs, fails, flight, R, travelTo(), visible (+2 more)

### Community 15 - "probe-timeline-perf.mjs"
Cohesion: 0.25
Nodes (8): dIn, dOut, hf, inTl, longIn, outTl, pct(), row()

### Community 17 - "probe-hydration-compare.mjs"
Cohesion: 0.33
Nodes (4): cases, head418, out, wt418

### Community 20 - "x"
Cohesion: 0.07
Nodes (22): displayFace, metadata, Mode, FILTERS, GlassFilters(), KEEP, LENS_MAP, PILL_MAP (+14 more)

### Community 23 - "probe-hover-wipe.mjs"
Cohesion: 0.20
Nodes (7): anchored, enterX, enterY, min, radii, samples, trough

### Community 24 - "probe-timeline-yearink.mjs"
Cohesion: 0.29
Nodes (4): centreYear(), hidden, named, travelTo()

### Community 25 - "package.json"
Cohesion: 0.10
Nodes (19): devDependencies, puppeteer-core, @types/node, @types/react, @types/react-dom, typescript, name, private (+11 more)

### Community 26 - "probe-title-oneline.mjs"
Cohesion: 0.29
Nodes (4): maxR, minL, sampled, steps

### Community 29 - "RestaurantsShowcase.tsx"
Cohesion: 0.06
Nodes (41): metadata, Contact(), ContactProps, CONTACT_LINKS, EXPLORE, FootLink, FootLinkA(), CLIPS (+33 more)

### Community 31 - "BlogIndex.tsx"
Cohesion: 0.07
Nodes (28): jsonLd, metadata, About(), CHAPTERS, COVERAGE_GROUPS, CoverageRow, COVERED_RESTAURANTS, HERO_DELAY (+20 more)

### Community 33 - "compilerOptions"
Cohesion: 0.05
Nodes (36): dom, dom.iterable, esnext, .next-about-dev/types/**/*.ts, .next-about/types/**/*.ts, .next-cb-dev/types/**/*.ts, .next-cb/types/**/*.ts, .next-contact/types/**/*.ts (+28 more)

### Community 36 - "PageTransition.tsx"
Cohesion: 0.20
Nodes (8): box, consoleErrors, fails, part(), q(), results, rmBox, sel

### Community 38 - "Experience.tsx"
Cohesion: 0.08
Nodes (21): Experience(), HERO_INSETS, CYCLE, EASE, ALPHABET, FlipLetter(), holePath(), LETTERS (+13 more)

### Community 42 - "RestaurantDetail.tsx"
Cohesion: 0.09
Nodes (26): jsonLd, metadata, generateMetadata(), RestaurantPage(), ContactPage(), mapUrl(), VISITABLE, EASE (+18 more)

### Community 43 - "probe-verify-head.mjs"
Cohesion: 0.47
Nodes (3): freshPage(), runIntro(), sleep()

### Community 45 - "probe-verify-head2.mjs"
Cohesion: 0.09
Nodes (24): bareOK(), brightest(), CR(), CREAM, failed, L(), lin(), markMin (+16 more)

### Community 50 - "probe-discover-cards.mjs"
Cohesion: 0.36
Nodes (6): failed, open(), R, s(), seatGrid(), walk()

### Community 63 - "Product"
Cohesion: 0.18
Nodes (10): Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product, Product Principles (+2 more)

### Community 66 - "Agent Pipeline"
Cohesion: 0.22
Nodes (7): Agent 1 — Prompt Architect, Agent 2 — Builder, Agent 3 — Tester, Agent 4 — Reviewer, Agent Pipeline, graphify, Orchestration Rules

### Community 75 - ".closeMenuOverlay"
Cohesion: 0.22
Nodes (6): files, found, globals, PROPS, ROOTS, tokens

### Community 89 - "Discover.tsx"
Cohesion: 0.06
Nodes (41): ChapterPin(), cellVariants, clamp01(), CUE, DECK_OFFSETS, DEPART_SPRING, Discover(), DiscoverItem (+33 more)

### Community 178 - "JoinUs.tsx"
Cohesion: 0.08
Nodes (20): jsonLd, metadata, ITEMS, clamp01(), DIAL_CODES, DIGITS, FlipDigit(), HERO_LINES (+12 more)

## Knowledge Gaps
- **319 isolated node(s):** `jsonLd`, `metadata`, `metadata`, `jsonLd`, `metadata` (+314 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SmoothScroll()` connect `x` to `RestaurantsShowcase.tsx`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `dependencies` connect `x` to `package.json`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **What connects `jsonLd`, `metadata`, `metadata` to the rest of the system?**
  _319 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `user-account-core-06dbaa1bcfe1a542-min.en-US.js` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._
- **Should `common-dabb52f27fbf7211-min.en-US.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08266129032258064 - nodes in this community are weakly interconnected._
- **Should `probe-timeline.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `probe-timeline-audit.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.1323529411764706 - nodes in this community are weakly interconnected._