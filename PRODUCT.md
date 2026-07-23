# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Confirmed: the site is the group's **brand hub serving all audiences with equal weight** — Londoners and visitors deciding where to eat (browsing restaurants, menus, booking links), press and guides evaluating the group, job applicants (careers flow with CV upload), and potential partners. It is the group's credibility anchor first, not a single-audience booking funnel.

## Product Purpose

The official website of the **Maginhawa Group** — a London family of seven restaurants founded in Camden in 1987 by Chef Omar's family. The site presents the group's story, its restaurants (each with menus and, where available, booking links), press coverage and awards, a blog of stories/press, careers, and contact.

Success (confirmed): **booking/menu click-throughs** on restaurant pages, and the site **reading as an established, award-recognised restaurant group** (brand credibility & press impressions).

## Positioning

Thirty-eight years of Filipino kitchens in London, grown from one Camden family restaurant into seven distinct dining rooms across four cuisines — including London's first Filipino ice-cream parlour (Mamasons), the world's first Filipino-Japanese ramen joint (Ramo), and Belly, added to the Michelin Guide for Greater London in 2026. "Maginhawa" is Tagalog for *comfortable*; comfort is the through-line. No neighbouring restaurant group can truthfully copy this history.

## Operating Context

Visitors arrive from press coverage, social, and search; diners click through to individual restaurant pages for menus and external booking. Restaurants: Bintang (Camden, est. 1987), Guanabana, Mamasons, Ramo Ramen, Café Mama & Sons, Hoodwood, Belly (all Kentish Town/Camden/Soho area). Content lives in code (`lib/restaurants.ts`, `lib/press.ts`, `lib/blog.ts`) — no CMS yet (CMS/MDX is the intended future direction per project docs).

## Capabilities and Constraints

- Next.js 15 App Router + React 19 + TypeScript, deployed on Vercel; CSS Modules; Framer Motion for restrained motion; Lenis smooth scroll; photography via `next/image` intended.
- Display face **Contralto** loads via Adobe Fonts kit `pev2vne` (Fraunces is the fallback, also used for italic inflections — Contralto has no italic cut).
- Pages: home, about, restaurants (index + per-restaurant), blog (home section + index), careers (index, CV upload), contact.
- An earlier "immersive scrollytelling street" concept was **dropped and must not be revived** (per project CLAUDE.md).

## Brand Commitments

- Name: **Maginhawa Group**; "maginhawa" = Tagalog for *comfortable* — used in brand copy.
- Direction (binding, per checked-in project docs): professional, editorial, content-forward — strong typography, generous whitespace, high-quality photography, clear navigation; polish and credibility over gimmick. Design reference: thisisstudiox.com. The user supplies mockups (e.g. `assets/pages/Home Page.svg`) that are the brief for specific surfaces.
- Footer credit "By (EJ)" — the developer/owner (git user ejlson).

## Evidence on Hand

**All content is real and client-approved as-is** (confirmed): the story timeline (1987 Bintang → 2026 Belly in the Michelin Guide), press quotes and outlets (`lib/press.ts`), awards, restaurant data and booking links (`lib/restaurants.ts`), blog entries (`lib/blog.ts`), photography (`public/images/`) and film clips (`public/videos/`). Nothing here is placeholder; future work must not alter dates, awards, or quotes, and must not fabricate additional claims, testimonials, or coverage.

## Product Principles

1. **Credibility over gimmick** — every surface must read as an established, award-recognised group; restraint is the brand.
2. **Facts are binding** — real dates, real press, real awards; never embellish or invent.
3. **Every audience one step from its job** — dine (menus/booking), evaluate (story/press), join (careers), reach us (contact).
4. **One family, distinct kitchens** — each restaurant keeps its own identity under the group umbrella.
5. **Comfort is the through-line** — the "maginhawa" idea shapes tone and pacing across the site.
