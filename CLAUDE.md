# CLAUDE.md

Project guidance for Claude Code working on **Maginhawa** — a professional,
editorial-style website for the Maginhawa Group of restaurants. Direction is clean and
content-forward: strong typography, generous whitespace, high-quality photography, and
clear navigation. Polish and credibility over gimmick.

Stack: Next.js 15 (App Router) + React 19 + TypeScript on Vercel, an editorial design
system (Tailwind or CSS modules), restrained motion (Framer Motion for subtle transitions
only), photography via `next/image`, and CMS/MDX for editable content.

> Note: an earlier "immersive scrollytelling street" concept (illustrated buildings,
> scroll-driven character, GSAP/ScrollTrigger, Howler audio, mobile fallback route) has
> been **dropped**. Do not revive it.

---

## Agent Pipeline

All non-trivial work flows through **four agents, in order**. Each agent hands its
output to the next. Treat this as an assembly line: do not skip stages, and do not let
a later stage start until the previous stage has produced a clean handoff.

```
User request
   │
   ▼
1. Prompt Architect ──▶ 2. Builder ──▶ 3. Tester ──▶ 4. Reviewer
   (clarify & spec)      (write code)    (test it)     (final QA on the site)
```

The main Claude Code session acts as the **orchestrator**: it spawns each agent with the
`Agent` tool (`subagent_type: "general-purpose"` unless noted), waits for the handoff,
and passes it forward. Run stages sequentially — each depends on the one before it.

---

### Agent 1 — Prompt Architect

**Goal:** Turn the user's raw request into a detailed, unambiguous specification.

**Does:**
- Restate the request in clear, complete language.
- Fill in implied requirements; flag genuine ambiguities (ask the user only if a decision
  can't be made from the request, the code, or sensible defaults).
- Break the work into concrete, ordered tasks with acceptance criteria.
- Note affected files, components, pages/sections, and content/media assets.
- Call out constraints: editorial layout system, typography/spacing scale, performance
  budgets (Core Web Vitals), accessibility, SEO, and brand tone.

**Hands off:** A written spec — goal, task list, acceptance criteria, files to touch,
and open questions (if any). No code.

---

### Agent 2 — Builder

**Goal:** Implement the spec from Agent 1.

**Does:**
- Write the code to satisfy every acceptance criterion.
- Match existing conventions: component structure, the editorial design system
  (typography, spacing, grid), naming, and comment density of surrounding code.
- Build responsive, accessible layouts; use `next/image` for photography.
- Surface any spec gaps back to the orchestrator instead of guessing on big decisions.

**Hands off:** The changed/added files with a short summary of what was implemented and
anything that deviated from the spec.

---

### Agent 3 — Tester

**Goal:** Verify the Builder's code actually works.

**Does:**
- Run the build and any existing tests/linters; report real output (don't claim green if red).
- Add or run tests covering the acceptance criteria from Agent 1.
- Exercise edge cases: responsive breakpoints, long/missing content, image loading,
  navigation, and accessibility (keyboard, contrast, semantics).
- For each acceptance criterion, mark pass / fail with evidence.

**Hands off:** A test report — what passed, what failed (with output), and any defects.
If anything fails, the work loops back to Agent 2 before continuing.

---

### Agent 4 — Reviewer

**Goal:** Final quality pass on the live website — does it look and feel right?

**Does:**
- Run the app and walk through the affected pages end to end.
- Check editorial polish: typography hierarchy, spacing/grid alignment, photography
  treatment, page transitions, and overall visual rhythm.
- Verify responsiveness across mobile, tablet, and desktop.
- Confirm the result matches the original intent and the professional, editorial brand feel.

**Hands off:** A go / no-go verdict with a punch list of any visual or UX issues. Issues
route back to Agent 2 (code) or Agent 1 (spec) as appropriate.

---

## Orchestration Rules

- **Sequential by default.** 1 → 2 → 3 → 4. A stage starts only after a clean handoff.
- **Loop back, don't paper over.** Test failures (Agent 3) or QA issues (Agent 4) return
  to the relevant earlier agent until resolved.
- **Faithful reporting.** Every agent reports outcomes honestly — failing tests, skipped
  steps, and deviations are stated plainly, never hidden.
- **Single source of intent.** Agent 1's spec is the contract; Agents 3 and 4 check against
  it. If the spec was wrong, fix the spec, then flow forward again.
- For trivial, single-file mechanical edits the orchestrator may shortcut the pipeline, but
  anything touching layout, the design system, content structure, or navigation should run
  the full loop.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
