# Graph Report - Maginhawa  (2026-08-03)

## Corpus Check
- 63 files · ~6,558,242 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 440 nodes · 628 edges · 22 communities (19 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cf081078`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- user-account-core-06dbaa1bcfe1a542-min.en-US.js
- common-dabb52f27fbf7211-min.en-US.js
- 8018.js
- x
- package.json
- RestaurantsShowcase.tsx
- Press.tsx
- BlogIndex.tsx
- compilerOptions
- Pt
- Experience.tsx
- RestaurantDetail.tsx
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
4. `useRouteTransition()` - 11 edges
5. `About()` - 10 edges
6. `getRestaurant()` - 10 edges
7. `Product` - 10 edges
8. `Nav()` - 9 edges
9. `Reveal()` - 9 edges
10. `DarkZone()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `RestaurantPage()` --calls--> `getRestaurant()`  [EXTRACTED]
  app/restaurants/[slug]/page.tsx → lib/restaurants.ts
- `Tile()` --calls--> `getRestaurant()`  [EXTRACTED]
  components/Discover.tsx → lib/restaurants.ts
- `ExpandedCard()` --calls--> `getRestaurant()`  [EXTRACTED]
  components/Discover.tsx → lib/restaurants.ts
- `RestaurantDetail()` --calls--> `pressForRestaurant()`  [EXTRACTED]
  components/RestaurantDetail.tsx → lib/press.ts
- `RestaurantsShowcase()` --calls--> `getRestaurant()`  [EXTRACTED]
  components/RestaurantsShowcase.tsx → lib/restaurants.ts

## Import Cycles
- None detected.

## Communities (22 total, 3 thin omitted)

### Community 0 - "user-account-core-06dbaa1bcfe1a542-min.en-US.js"
Cohesion: 0.06
Nodes (33): 10. Home page copy, 11. Navigation & footer links, 12. Images & video, 13. Page titles & SEO, 14. Publishing your changes, 15. Known placeholders, 16. Troubleshooting, 1. Before you start (+25 more)

### Community 1 - "common-dabb52f27fbf7211-min.en-US.js"
Cohesion: 0.07
Nodes (20): metadata, EASE, HOME_SLUGS, POOL, BlogIndexInner(), FILTERS, pageCountFor(), postsForPage() (+12 more)

### Community 2 - "8018.js"
Cohesion: 0.11
Nodes (17): .next-about-dev/types/**/*.ts, .next-about/types/**/*.ts, .next-cb-dev/types/**/*.ts, .next-cb/types/**/*.ts, .next-contact/types/**/*.ts, next-env.d.ts, .next-join/types/**/*.ts, .next-menu/types/**/*.ts (+9 more)

### Community 20 - "x"
Cohesion: 0.08
Nodes (21): metadata, Mode, FILTERS, GlassFilters(), KEEP, LENS_MAP, PILL_MAP, framer-motion (+13 more)

### Community 25 - "package.json"
Cohesion: 0.10
Nodes (19): devDependencies, puppeteer-core, @types/node, @types/react, @types/react-dom, typescript, name, private (+11 more)

### Community 29 - "RestaurantsShowcase.tsx"
Cohesion: 0.08
Nodes (28): metadata, ITEMS, Menu(), getNavTheme(), LINKS, Nav(), Theme, CURTAIN (+20 more)

### Community 30 - "Press.tsx"
Cohesion: 0.13
Nodes (17): generateMetadata(), RestaurantPage(), ExpandedCard(), Tile(), EASE, LANE, PressWall(), GroupPressJsonLd() (+9 more)

### Community 31 - "BlogIndex.tsx"
Cohesion: 0.06
Nodes (38): jsonLd, metadata, About(), bandServerSnapshot(), bandSnapshot(), CHAPTERS, COVERAGE_GROUPS, CoverageRow (+30 more)

### Community 33 - "compilerOptions"
Cohesion: 0.11
Nodes (19): dom, dom.iterable, esnext, compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules (+11 more)

### Community 35 - "Pt"
Cohesion: 0.17
Nodes (13): EASE, Enter, ENTER_OFFSET, KEY_WORDS, Manifesto(), PARTS, SCRUB_EASE, ScrubLine() (+5 more)

### Community 38 - "Experience.tsx"
Cohesion: 0.08
Nodes (22): Experience(), HERO_INSETS, CLIPS, CYCLE, EASE, ALPHABET, FlipLetter(), holePath() (+14 more)

### Community 42 - "RestaurantDetail.tsx"
Cohesion: 0.10
Nodes (16): jsonLd, metadata, Contact(), ContactProps, ContactPage(), mapUrl(), VISITABLE, ITEMS (+8 more)

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
Cohesion: 0.09
Nodes (23): ChapterPin(), cellVariants, clamp01(), CUE, DECK_OFFSETS, DEPART_SPRING, Discover(), DiscoverItem (+15 more)

### Community 178 - "JoinUs.tsx"
Cohesion: 0.10
Nodes (17): jsonLd, metadata, DarkZone(), clamp01(), DIAL_CODES, DIGITS, FlipDigit(), HERO_LINES (+9 more)

## Knowledge Gaps
- **202 isolated node(s):** `jsonLd`, `metadata`, `metadata`, `jsonLd`, `metadata` (+197 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SmoothScroll()` connect `x` to `common-dabb52f27fbf7211-min.en-US.js`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **Why does `dependencies` connect `x` to `package.json`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `About()` (e.g. with `bandServerSnapshot()` and `bandSnapshot()`) actually correct?**
  _`About()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `jsonLd`, `metadata`, `metadata` to the rest of the system?**
  _202 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `user-account-core-06dbaa1bcfe1a542-min.en-US.js` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._
- **Should `common-dabb52f27fbf7211-min.en-US.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07301587301587302 - nodes in this community are weakly interconnected._
- **Should `8018.js` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._