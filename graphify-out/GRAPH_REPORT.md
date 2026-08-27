# Graph Report - Maginhawa  (2026-08-27)

## Corpus Check
- 264 files · ~5,060,019 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1837 nodes · 2322 edges · 201 communities (148 shown, 53 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 49 edges (avg confidence: 0.67)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `92abd21d`
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
- posts.ts
- probe-font-trial.mjs
- BlogIndex.tsx
- compilerOptions
- PageTransition.tsx
- probe-discover-card.mjs
- Experience.tsx
- Discover.tsx
- Experience.tsx
- PageTransition.tsx
- probe-videoscale.mjs
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
- BlogIndex.tsx
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
- AboutSplit.tsx
- seek-offset-search.mjs
- PillCta.tsx
- getRestaurant
- q
- Reveal.tsx
- getRestaurant
- zoom-loader-handover.mjs
- window-content.mjs
- Placeholder.tsx
- Reservations.tsx
- Passage.tsx
- ReviewUs.tsx
- StoryStrip.tsx
- VenueCard.tsx
- page.tsx
- page.tsx
- page.tsx
- 3. The Journal (blog)
- probe-screencast-control.mjs
- shoot-reveal-filmstrip.mjs
- probe-loader-hold.mjs
- probe-reveal-seam.mjs
- probe-clip-mechanism.mjs
- probe-manifesto-order.mjs
- probe-video-census.mjs
- VideoBackdrop.tsx
- page.tsx
- dependencies
- VideoBackdrop.tsx
- probe-mobile-weight.mjs
- probe-hero-clip-swap.mjs
- probe-404.mjs
- probe-timeline-contrast.mjs
- Blog.tsx
- optimize-press-logos.mjs
- probe-loader-hold.mjs
- PillCta.tsx
- scripts
- gray-matter
- press.ts
- a-note-on-service.mdx
- SplitWords.tsx
- package.json
- layout.tsx
- CustomCursor.tsx
- VideoBackdrop.tsx
- Menu.tsx
- Contact.tsx
- _tmp-seam-lr.mjs
- Blog.tsx
- react
- framer-motion
- probe-blog-index.mjs
- Experience.tsx
- page.tsx
- JoinUs.tsx
- SplitWords.tsx
- page.tsx
- _dbg.mjs
- probe-awards-hover.mjs
- VideoBackdrop.tsx
- probe-verify-scrollfixes.mjs
- Interlude.tsx
- PressWall.tsx
- Experience.tsx
- VideoBackdrop.tsx
- restaurants.ts
- probe-bytecensus.mjs
- venueCards.ts
- shoot-sections.mjs
- probe-routeload.mjs
- probe-grain-parity.mjs
- probe-navtiming.mjs
- probe-prefetch.mjs
- probe-videofit.mjs

## God Nodes (most connected - your core abstractions)
1. `asset()` - 33 edges
2. `getRestaurant()` - 20 edges
3. `include` - 20 edges
4. `Maginhawa Group — Content Guide` - 20 edges
5. `compilerOptions` - 16 edges
6. `Menu()` - 13 edges
7. `q()` - 12 edges
8. `Design Plan — brand fit and audience needs` - 12 edges
9. `BlogIndexInner()` - 11 edges
10. `useRouteTransition()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `CardMedia()` --calls--> `asset()`  [EXTRACTED]
  components/blog/BlogIndex.tsx → lib/media.ts
- `RoomFilter()` --indirect_call--> `slug()`  [INFERRED]
  components/blog/BlogIndex.tsx → scripts/shoot-sections.mjs
- `BlogIndexInner()` --indirect_call--> `p()`  [INFERRED]
  components/blog/BlogIndex.tsx → scripts/probe-band-about-press.mjs
- `JournalPost()` --calls--> `getRestaurant()`  [EXTRACTED]
  components/blog/JournalPost.tsx → lib/restaurants.ts
- `JoinUs()` --indirect_call--> `p()`  [INFERRED]
  components/careers/JoinUs.tsx → scripts/probe-band-about-press.mjs

## Import Cycles
- None detected.

## Communities (201 total, 53 thin omitted)

### Community 0 - "user-account-core-06dbaa1bcfe1a542-min.en-US.js"
Cohesion: 0.04
Nodes (46): 10. The About page timeline, 11. Home page copy, 12. Navigation & footer links, 13. Images & video, 14. Page titles & SEO, 15. Publishing your changes, 16. Known placeholders & gaps, 17. Troubleshooting (+38 more)

### Community 1 - "common-dabb52f27fbf7211-min.en-US.js"
Cohesion: 0.11
Nodes (19): Arrival, arrivalProgress(), CAPTION_SLOT, Discover(), DiscoverDisplay, DiscoverItem, DISPLAY, EASE (+11 more)

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
Cohesion: 0.07
Nodes (31): aboutLast, argv, CR(), crop(), down, errors, failed, L() (+23 more)

### Community 10 - "probe-manifesto.mjs"
Cohesion: 0.50
Nodes (3): H, idx, W

### Community 11 - "probe-walk.mjs"
Cohesion: 0.50
Nodes (3): H, stops, W

### Community 13 - "Discover.tsx"
Cohesion: 0.09
Nodes (15): argv, bands, clips, errors, failed, inlines, lefts, R (+7 more)

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
Cohesion: 0.10
Nodes (21): chrome-launcher, eslint, eslint-config-next, @eslint/eslintrc, lighthouse, devDependencies, chrome-launcher, eslint (+13 more)

### Community 26 - "probe-title-oneline.mjs"
Cohesion: 0.29
Nodes (4): maxR, minL, sampled, steps

### Community 29 - "posts.ts"
Cohesion: 0.12
Nodes (20): dotSlots(), em(), filmReaches(), Line, LINE_SLOTS_NARROW, LINE_SLOTS_WIDE, LINE_TRACK, LINE_TRACK_NARROW (+12 more)

### Community 31 - "BlogIndex.tsx"
Cohesion: 0.18
Nodes (12): About(), ChapterRow(), CHAPTERS, COVERAGE_GROUPS, CoverageRow, COVERED_RESTAURANTS, INSETS, MISSING_IMAGES (+4 more)

### Community 33 - "compilerOptions"
Cohesion: 0.05
Nodes (41): dom, dom.iterable, esnext, .next-about-dev/types/**/*.ts, .next-about/types/**/*.ts, .next-cb-dev/types/**/*.ts, .next-cb/types/**/*.ts, .next-contact/types/**/*.ts (+33 more)

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
Cohesion: 0.15
Nodes (15): Film(), metadata, MenuPage(), MenuSheet, houseRules(), pipeline, asset(), AssetOptions (+7 more)

### Community 42 - "probe-videoscale.mjs"
Cohesion: 0.17
Nodes (8): argv, CATS, FILM, out, ROOT, SAVEDIR, server, VARIANTS

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
Cohesion: 0.05
Nodes (42): docTop(), CASES, centreOf(), diff(), frame(), layoutCost(), layoutCount(), midFlight() (+34 more)

### Community 55 - "probe-about-open.mjs"
Cohesion: 0.07
Nodes (17): anyOverlap, down, errs, MARKS, msgs, read(), sorted, up (+9 more)

### Community 58 - "RestaurantDetail.tsx"
Cohesion: 0.22
Nodes (8): Blog section — not started, Discover: the fit-one-screen arithmetic, Do these first — ALL THREE DONE (2026-08-06), Handoff — home page redesign (2026-08-06), Known costs, accepted deliberately, The spacing system that now governs, Things that will waste your time if you don't know them, Where the home page stands

### Community 59 - "ContactPage.tsx"
Cohesion: 0.20
Nodes (10): CLIPS, CURTAIN, IMAGES, Navigate, PageTransition(), Phase, TransitionCtx, WIPES (+2 more)

### Community 60 - "jsonld.tsx"
Cohesion: 0.11
Nodes (17): armReveals(), consoleErrors, failures, L, lin(), lum(), newErrors, out (+9 more)

### Community 61 - "RestaurantsShowcase.tsx"
Cohesion: 0.17
Nodes (14): clean(), Ctx, EmailSender, Env, handlePost(), json(), MAX, onRequest() (+6 more)

### Community 62 - "jsonld.tsx"
Cohesion: 0.17
Nodes (10): DOORS, growStartFor(), Reservations(), Common, MAGNET, PillCta(), Props, MAGNET_SPRING (+2 more)

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
Cohesion: 0.17
Nodes (11): 1. Credentials, 2. Upload, 3. Turn it on, 4. Verify, Deploying to Cloudflare, Doing it, Gotchas worth knowing before you hit them, Media: photographs on Cloudinary, film on Cloudflare (+3 more)

### Community 73 - "probe-type-lab.mjs"
Cohesion: 0.22
Nodes (9): accents, FACES, flat, LADDER, lum(), PANELS, ratio(), SHEET_FACES (+1 more)

### Community 74 - "Interlude.tsx"
Cohesion: 0.11
Nodes (20): AboutSplit(), Door(), DOORS, DRAWER, DRIFT, EASE, FADE, HEAD_IN (+12 more)

### Community 75 - ".closeMenuOverlay"
Cohesion: 0.22
Nodes (6): files, found, globals, PROPS, ROOTS, tokens

### Community 76 - "crop-press-strip.mjs"
Cohesion: 0.40
Nodes (4): bits, h, half, top

### Community 82 - "Manifesto.tsx"
Cohesion: 0.12
Nodes (14): jsonLd, metadata, CARDS, LOOP, MID, nameList(), project(), NOTE: one video ships today (hero-draft3). Drop a per-restaurant clip in (+6 more)

### Community 83 - "shoot-about-rules.mjs"
Cohesion: 0.18
Nodes (13): JournalPost(), HERO_INSETS, Hero(), FootLinkA(), ITEMS, Menu(), getNavTheme(), LINKS (+5 more)

### Community 84 - "BlogIndex.tsx"
Cohesion: 0.23
Nodes (10): Contact(), ContactProps, EMPTY, Errors, mailtoHref(), validate(), Values, ContactPage() (+2 more)

### Community 88 - "shoot-pass.mjs"
Cohesion: 0.47
Nodes (5): H, s(), settle(), shotAt(), W

### Community 90 - "shoot-blog.mjs"
Cohesion: 1.00
Nodes (3): s(), shoot(), walk()

### Community 91 - "RestaurantsShowcase.tsx"
Cohesion: 0.08
Nodes (36): displayFace, metadata, textFace, GoogleTag(), Window, MarketingPixels(), Window, ConsentControl() (+28 more)

### Community 92 - "press.ts"
Cohesion: 0.13
Nodes (10): backOk, down, firstTrue, geoms, keys, lastTrue, seat(), seatP() (+2 more)

### Community 96 - "compress-media.mjs"
Cohesion: 0.11
Nodes (14): argv, CRF, files, IMAGE_EXT, jobs, ONLY, ORIGINALS, PUBLIC (+6 more)

### Community 97 - "AboutSplit.tsx"
Cohesion: 0.22
Nodes (8): FULL_COLOUR, MARKS, ORDER, PressWall(), FEATURED_OUTLETS, HIGHLIGHT_QUOTES, PRESS_INDEX, PressMention

### Community 98 - "seek-offset-search.mjs"
Cohesion: 0.13
Nodes (13): band, bandFiles, CUT, cuts, diff, full, fullFiles, luma() (+5 more)

### Community 99 - "PillCta.tsx"
Cohesion: 0.18
Nodes (14): CLAUSE_BREAK, EYEBROW_IN, INLINE, KEY_WORDS, Manifesto(), Piece, PIECES, SCRUB_OFFSET (+6 more)

### Community 101 - "q"
Cohesion: 0.15
Nodes (21): BlogPage(), metadata, generateMetadata(), generateStaticParams(), JournalPostPage(), generateStaticParams(), Home(), sitemap() (+13 more)

### Community 102 - "Reveal.tsx"
Cohesion: 0.12
Nodes (12): boardGone, firstFilm, frames, fullBleed, maxDrift, n1(), parseHole(), recorder() (+4 more)

### Community 103 - "getRestaurant"
Cohesion: 0.18
Nodes (6): breaches, fail, flat, restaurants, travel, worst

### Community 104 - "zoom-loader-handover.mjs"
Cohesion: 0.22
Nodes (5): CREAM, frames, MAROON, report, trace

### Community 106 - "Placeholder.tsx"
Cohesion: 0.11
Nodes (13): jsonLd, metadata, jsonLd, metadata, jsonLd, metadata, jsonLd, metadata (+5 more)

### Community 108 - "Passage.tsx"
Cohesion: 0.25
Nodes (5): all, bands, big, flatRuns, keys

### Community 109 - "ReviewUs.tsx"
Cohesion: 0.08
Nodes (27): argv, bad, countIn(), D, displayed, drawFrame, dropped, durIn() (+19 more)

### Community 111 - "VenueCard.tsx"
Cohesion: 0.11
Nodes (15): all, analyse(), argv, CATS, FAT, LABEL, NAMES, NOGPURASTER (+7 more)

### Community 112 - "page.tsx"
Cohesion: 0.20
Nodes (5): ENV, good, longestX, mailer, out

### Community 113 - "page.tsx"
Cohesion: 0.33
Nodes (5): bytes, rows, t0, total, urls

### Community 114 - "page.tsx"
Cohesion: 0.07
Nodes (27): ALPHABET, EASE_OUT, FlipLetter(), LETTERS, Loader(), SHUTTERS, SMOOTH, Vp (+19 more)

### Community 116 - "3. The Journal (blog)"
Cohesion: 0.42
Nodes (7): gateVideoPlayback(), playGate(), useVisiblePlayback(), warmGate(), Clip, clipStyle(), VideoBackdrop()

### Community 118 - "probe-screencast-control.mjs"
Cohesion: 0.22
Nodes (9): argv, CAST, FILM, pct(), PORT, report(), revRecorder(), ROOT (+1 more)

### Community 119 - "shoot-reveal-filmstrip.mjs"
Cohesion: 0.22
Nodes (6): argv, frames, OUT, PORT, step, tiles

### Community 124 - "probe-manifesto-order.mjs"
Cohesion: 0.50
Nodes (3): ebDone, samples, wordStart

### Community 135 - "page.tsx"
Cohesion: 0.22
Nodes (7): byTid, longTasks, main, nodes, self, st2, stack

### Community 136 - "dependencies"
Cohesion: 0.10
Nodes (21): framer-motion, gray-matter, dependencies, framer-motion, gray-matter, react, react-dom, rehype-stringify (+13 more)

### Community 137 - "VideoBackdrop.tsx"
Cohesion: 0.19
Nodes (6): ITEMS, REVIEWABLE, reviewUrl(), ReviewUs(), Reveal(), RevealProps

### Community 142 - "probe-mobile-weight.mjs"
Cohesion: 0.40
Nodes (4): by, bytes, rows, total

### Community 144 - "probe-404.mjs"
Cohesion: 0.08
Nodes (35): BlogIndexInner(), buildFilters(), CardMedia(), navigate(), pageCountFor(), postsForPage(), queryListeners, ROOM_NAME (+27 more)

### Community 152 - "Blog.tsx"
Cohesion: 0.14
Nodes (14): CLOSE_CTA, CLOSE_INVITE, CLOSE_MARK, CLOSE_OFFSET, closeInk(), CONTACT_LINKS, EASE, EXPLORE (+6 more)

### Community 154 - "probe-loader-hold.mjs"
Cohesion: 0.33
Nodes (3): argv, MARKS, PORT

### Community 155 - "PillCta.tsx"
Cohesion: 0.18
Nodes (5): buckets, dead, energy, long, steps

### Community 156 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, lighthouse, lint, press-logos, start

### Community 157 - "gray-matter"
Cohesion: 0.25
Nodes (4): bad, got, MARKS, PANELS

### Community 160 - "SplitWords.tsx"
Cohesion: 0.29
Nodes (3): rows, TARGETS, TIMES

### Community 162 - "package.json"
Cohesion: 0.33
Nodes (5): name, overrides, sharp, private, version

### Community 164 - "CustomCursor.tsx"
Cohesion: 0.60
Nodes (5): clean(), handlePost(), json(), MAX, onRequest()

### Community 165 - "VideoBackdrop.tsx"
Cohesion: 0.32
Nodes (7): num(), perPlate, sa, sb, sleep(), spread(), walk()

### Community 168 - "Menu.tsx"
Cohesion: 0.29
Nodes (5): blame, JS, RECALC, stack, X

### Community 169 - "Contact.tsx"
Cohesion: 0.67
Nodes (3): lenis, SmoothScroll(), lenis

### Community 170 - "_tmp-seam-lr.mjs"
Cohesion: 0.20
Nodes (6): byKind, bytes, rows, t0, total, urlOf

### Community 171 - "Blog.tsx"
Cohesion: 0.40
Nodes (4): REGIONS, run(), sleep(), SUSPECTS

### Community 174 - "framer-motion"
Cohesion: 0.33
Nodes (4): counts, inval, key, recalcs

### Community 176 - "Experience.tsx"
Cohesion: 0.33
Nodes (4): bandVariants, frameVariants, MARKS, PRINTS

### Community 178 - "JoinUs.tsx"
Cohesion: 0.09
Nodes (18): jsonLd, metadata, clamp01(), DIAL_CODES, DIGITS, FlipDigit(), HERO_LINES, inkBox() (+10 more)

### Community 179 - "SplitWords.tsx"
Cohesion: 0.50
Nodes (3): CREAM, readStrip(), run()

### Community 183 - "VideoBackdrop.tsx"
Cohesion: 0.50
Nodes (3): res, sample(), sleep()

### Community 184 - "probe-verify-scrollfixes.mjs"
Cohesion: 0.40
Nodes (3): samples, uniq, vals

### Community 186 - "PressWall.tsx"
Cohesion: 0.29
Nodes (9): generateMetadata(), VenueMenuPage(), VenueMark(), VenueMark(), Intrinsic, intrinsicSize(), isJpegFrame(), parse() (+1 more)

### Community 189 - "Experience.tsx"
Cohesion: 0.32
Nodes (6): acc, CACHE_OFFSETS(), CSS, sample(), sleep(), VARIANTS

### Community 190 - "VideoBackdrop.tsx"
Cohesion: 0.32
Nodes (6): acc, CSS, PAUSE_VIDEO, sample(), sleep(), VARIANTS

### Community 191 - "restaurants.ts"
Cohesion: 0.23
Nodes (9): VenueBlock(), VenueCard(), VenueCardProps, primaryAction(), Restaurant, SLUG_BY_NAME, VenueAction, splitActions (+1 more)

### Community 192 - "probe-bytecensus.mjs"
Cohesion: 0.29
Nodes (5): got, per, rows, total, urlOf

### Community 195 - "venueCards.ts"
Cohesion: 0.33
Nodes (6): Extras, LOGO_INK, LOGO_OPTICS, VenueAddress, venueCard(), venueCards()

### Community 198 - "shoot-sections.mjs"
Cohesion: 0.29
Nodes (5): CSS, latest, named, painted, px

### Community 200 - "probe-grain-parity.mjs"
Cohesion: 0.70
Nodes (4): compare(), pair(), raw(), sleep()

## Knowledge Gaps
- **840 isolated node(s):** `jsonLd`, `metadata`, `metadata`, `jsonLd`, `metadata` (+835 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **53 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `JoinUs()` connect `JoinUs.tsx` to `probe-band-about-press.mjs`, `PageTransition.tsx`, `probe-timeline-contrast.mjs`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `q()` connect `probe-timeline-contrast.mjs` to `JoinUs.tsx`, `press.ts`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `probe-loader-hold.mjs`, `Contact.tsx`, `package.json`, `VideoBackdrop.tsx`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **What connects `jsonLd`, `metadata`, `metadata` to the rest of the system?**
  _840 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `user-account-core-06dbaa1bcfe1a542-min.en-US.js` be split into smaller, more focused modules?**
  _Cohesion score 0.0425531914893617 - nodes in this community are weakly interconnected._
- **Should `common-dabb52f27fbf7211-min.en-US.js` be split into smaller, more focused modules?**
  _Cohesion score 0.11231884057971014 - nodes in this community are weakly interconnected._
- **Should `probe-timeline.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._