# Maginhawa Group — Content Guide

How to add, change and remove content on the Maginhawa Group website.

This site has **no CMS**. Content lives in the repo as files, edited in a code
editor and published by committing. That sounds intimidating and isn't — most
edits are copying an existing block, changing the words inside the quote marks,
and saving.

There are two kinds of content file:

- **Journal posts we write** are Markdown — `content/posts/<name>.md`. One file
  per post, and it becomes its own page. See [The Journal](#3-the-journal-blog).
- **Everything else** is a TypeScript data file in `lib/` — restaurants, jobs,
  contact details, press coverage. Lists of facts, not prose.

> **The one rule that matters:** content is data, and the data lives in `lib/`
> (or, for a post, in `content/posts/`). If you find yourself editing a component
> in `components/` to change a sentence, check the table below first — there's
> often a data file that owns it.

---

## Contents

1. [Before you start](#1-before-you-start)
2. [Where everything lives](#2-where-everything-lives)
3. [The Journal (blog)](#3-the-journal-blog)
4. [Restaurants](#4-restaurants)
5. [Careers](#5-careers)
6. [Contact details & socials](#6-contact-details--socials)
7. [Press, awards & quotes](#7-press-awards--quotes)
8. [FAQ](#8-faq)
9. [The About page timeline](#9-the-about-page-timeline)
10. [Home page copy](#10-home-page-copy)
11. [Navigation & footer links](#11-navigation--footer-links)
12. [Images & video](#12-images--video)
13. [Page titles & SEO](#13-page-titles--seo)
14. [Publishing your changes](#14-publishing-your-changes)
15. [Known placeholders](#15-known-placeholders)
16. [Troubleshooting](#16-troubleshooting)

---

## 1. Before you start

Install once:

```bash
npm install
```

Run the site locally and watch your edits appear:

```bash
npm run dev
```

Then open <http://localhost:3000>. Save a file and the browser updates itself.

Before publishing, check the site still builds:

```bash
npm run build
```

**Never run `npm run build` while `npm run dev` is running** — they write to the
same `.next` folder and will corrupt each other. Stop the dev server first.

`npm run build` writes a folder of finished files to `out/`, which is exactly
what the live site serves. To look at that rather than the dev server:

```bash
npx serve out -l 3100
```

One difference to know about: the dev server and the live site both understand
`/blog/a-note-on-service`, but a plain local file server does not — open
`/blog/a-note-on-service.html` there instead.

> **After pulling these changes for the first time, run `npm install` again.**
> Writing posts added two packages (`gray-matter` for the post facts, and the `remark`/`rehype` family for the writing), and
> without them the site won't start.

### How to read the data files

Content files are arrays of objects. One object = one blog post, one restaurant,
one job. They look like this:

```ts
{
  slug: "belly",
  name: "Belly",
  bookable: true,
}
```

Rules that will save you an hour of confusion:

- Text goes **inside double quotes**. `name: "Belly"`
- Every line ends in a **comma**.
- An apostrophe inside quotes is fine: `"London's best"`. A double quote inside
  double quotes is not — use the curly `"` `"` characters instead.
- `true` / `false` and numbers have **no** quotes.
- A field marked `?` in the type definition at the top of the file is **optional**
  — you can leave the whole line out.
- Image paths start from the `public` folder: the file `public/images/belly.jpg`
  is written as `"/images/belly.jpg"`.

If you break the syntax, the dev server shows a red error naming the file and
line. Nothing is lost — fix the line and it recovers.

---

## 2. Where everything lives

| What you want to change | File | The bit to edit |
| --- | --- | --- |
| **Journal posts we write** | `content/posts/<name>.md` | the whole file — one per post |
| Which posts appear on the home page | [components/Blog.tsx](components/Blog.tsx) | `HOME_SLUGS` |
| Press coverage & other links in the Journal | [lib/blog.ts](lib/blog.ts) | `BLOG` |
| Restaurant facts, addresses, booking links, menus | [lib/restaurants.ts](lib/restaurants.ts) | `RESTAURANTS` (L40) |
| Restaurant tiles on the home page | [components/Discover.tsx](components/Discover.tsx) | `ITEMS` (L48) |
| Restaurant carousel on `/restaurants` | [components/RestaurantsShowcase.tsx](components/RestaurantsShowcase.tsx) | `RESTAURANTS` (L79) |
| Job openings | [lib/jobs.ts](lib/jobs.ts) | `JOBS` (L17) |
| Phone, email, office hours | [lib/contact.ts](lib/contact.ts) | `CONTACT` (L7) |
| Social media links | [lib/contact.ts](lib/contact.ts) | `SOCIALS` (L30) |
| Press coverage & logos | [lib/press.ts](lib/press.ts) | `FEATURED_OUTLETS` (L26), `PRESS` (L143) |
| FAQ questions | [components/FAQ.tsx](components/FAQ.tsx) | `ITEMS` (L10) |
| About page story timeline | [components/About.tsx](components/About.tsx) | `CHAPTERS` (L68) |
| Careers page headline & values | [components/JoinUs.tsx](components/JoinUs.tsx) | `PILLARS` (L24), `HERO_LINES` (L110) |
| Home page opening statement | [components/Manifesto.tsx](components/Manifesto.tsx) | `PARTS` (L35) |
| Top navigation links | [components/Nav.tsx](components/Nav.tsx) | `LINKS` (L15) |
| Full-screen menu links | [components/Menu.tsx](components/Menu.tsx) | `ITEMS` (L10) |
| Footer links | [components/Footer.tsx](components/Footer.tsx) | `EXPLORE` (L18) |
| Page titles & search descriptions | `app/*/page.tsx` | `metadata` |
| Site-wide title & description | [app/layout.tsx](app/layout.tsx) | `metadata` (L25) |

---

## 3. The Journal (blog)

The Journal has **two kinds of entry**, and which one you are adding decides
which file you touch.

| | **Our own posts** | **Coverage we link to** |
| --- | --- | --- |
| Lives in | `content/posts/<slug>.md` — one file per post | [lib/blog.ts](lib/blog.ts) — one block per entry |
| The reader lands on | a page on this site, `/blog/<slug>` | the outlet's own website, in a new tab |
| You write | a headline, a few facts, and the piece itself | just the card — there is no page behind it |

Both kinds flow into the same three places, mixed together and **sorted by date,
newest first, automatically**:

- the `/blog` index — one featured story at the top, then 8 cards a page,
- the "Latest" rail on the home page (hand-picked — see [below](#put-a-post-on-the-home-page)),
- the restaurant filter on `/blog`, which counts both kinds.

---

### Write a post

**1. Make the file.** Anywhere in `content/posts/`, named for the web address you
want:

```
content/posts/a-note-on-service.md   →   /blog/a-note-on-service
```

Lowercase, hyphens instead of spaces, ending in `.md`. **The filename is the
URL** — there is no `slug` field to fill in, and renaming the file changes the
address (which breaks any link already shared, so decide before you publish).

**2. Open it with the facts, then write.** The block between the two `---` lines
is the card; everything after it is the piece.

```md
---
title: "A note on service"
date: 2026-08-20
excerpt: "Why we stopped calling it hospitality and started calling it looking after people."
image: /blog/DSCF2298-web.jpg
restaurant: belly
category: news
author: "Chef Omar"
---

My parents opened Bintang on Kentish Town Road in 1987 with a dining room
that sat under thirty people.

## What we mean by service

Everything since has been an attempt to write that down without killing it.
```

| Field | Required | Notes |
| --- | --- | --- |
| `title` | yes | The headline. Shown on the card and as the page's heading. |
| `date` | yes | **`YYYY-MM-DD`**. Drives the ordering of the whole Journal. |
| `excerpt` | yes | The standfirst under the headline on the card, and the description Google shows. Two sentences reads best. |
| `image` | yes | The photograph at the top of the post and on its card. A path under `public/` — see [Images & video](#12-images--video). |
| `category` | yes | One of `news`, `feature`, `review`, `inclusion`. Nothing else is accepted. |
| `author` | no | The byline. Defaults to `Maginhawa Group`. |
| `restaurant` | no | A restaurant slug from [lib/restaurants.ts](lib/restaurants.ts) — `belly`, `mamasons`, `guanabana`… Puts the venue's mark on the card and files the post under that room in the `/blog` filter. |
| `imageAlt` | no | A description of the photograph for screen readers. Leave it out unless the picture says something the words don't — the headline sits right under it and describing the same thing twice is noise. |

Quotes around the text are the safe habit; they are only strictly required when
the line contains a `:` or starts with punctuation.

### What you do **not** have to write

All of this is worked out from the file for you:

- the pretty date (`20 Aug 2026`) — from `date`,
- the "2 min read" estimate — from the length of the piece,
- the web address — from the filename,
- the card on `/blog` and its place in the order,
- the page title, search description, and the preview card shown when the link
  is shared on WhatsApp, Slack or Facebook,
- the structured data Google reads to treat the page as an article.

### Writing the piece

The body is **Markdown** — plain text with a few marks in it.

| You type | You get |
| --- | --- |
| `## A heading` | A section heading in the display face |
| a blank line between blocks | A new paragraph |
| `**important**` | **bold** |
| `*quietly*` | *italic* |
| `- a point` (one per line) | A list, marked with the house em-dash |
| `> One standard, held in eight rooms.` | A pull quote, set large in the display face |
| `[Belly](https://www.bellylondon.com)` | A link. External ones open in a new tab on their own. |
| `![](/blog/DSCF3015-web.jpg)` | A photograph, full width, mid-piece |
| `---` on its own line | A short centred rule between sections |

A single newline inside a paragraph is just a line wrap — it does not start a new
paragraph. Leave a blank line for that.

### Drafts

**Put an underscore at the front of the filename** and the post is skipped
entirely:

```
content/posts/_kentish-town-opens.md     ← written, committed, not published
content/posts/kentish-town-opens.md      ← published
```

Renaming it is what publishes it. This is the safe way to work on something over
several days, or to have it reviewed, without it appearing on the site.

### Look at it before you publish

```bash
npm run dev
```

Then open <http://localhost:3000/blog>. The post should be at the top if it is
the newest; click it to read the page. Save the file and the browser updates
itself.

### Edit a post

Open the file and change the words. Nothing else needs touching — the card, the
page and the search description all read from the same file.

If you change `title` after publishing, the address stays the same (it comes from
the filename), which is usually what you want.

### Delete a post

Delete the file. The index re-paginates itself.

> **Careful:** deleting the newest entry also changes the large featured card at
> the top of `/blog`, because it always shows whatever is now newest. Look at the
> page afterwards.

### Put a post on the home page

The "Latest" rail on the home page is **hand-picked, not automatic** — it shows
four chosen stories rather than the four newest. The list is `HOME_SLUGS` near the
top of [components/Blog.tsx](components/Blog.tsx):

```ts
const HOME_SLUGS = [
  "olive-best-new-restaurants",
  "a-note-on-service",        // ← a post of ours, named by its filename
  ...
] as const;
```

Add the post's slug (its filename without `.md`) and remove one, since only four
fit. Whichever entry in that list is **newest by date** becomes the big
photograph above the rail.

---

### Add a link to someone else's article

Coverage in the press gets a card but no page — clicking it sends the reader to
the publication. Copy an existing block inside the `BLOG` array in
[lib/blog.ts](lib/blog.ts) and change the values:

```ts
{
  slug: "olive-best-new-restaurants",
  title: "Belly named among London's best new restaurants",
  date: "2026-02-14",
  dateLabel: "14 Feb 2026",
  excerpt:
    "Two sentences at most — this is the paragraph under the headline on the card.",
  source: "Olive Magazine",
  url: "https://www.olivemagazine.com/restaurants/london/best-new-restaurants-in-london/",
  image: "/blog/DSCF3052-web.jpg",
  restaurant: "belly",
  category: "feature",
  kind: "press",
},
```

| Field | Required | Notes |
| --- | --- | --- |
| `slug` | yes | Lowercase, hyphens. Must be unique — and must not match the filename of one of our posts. |
| `title` | yes | The headline as the outlet ran it. |
| `date` | yes | **`YYYY-MM-DD`** — drives the sorting. |
| `dateLabel` | yes | What readers see: `"14 Feb 2026"`. Typed by hand here, so keep it in step with `date`. |
| `excerpt` | yes | Card summary. |
| `source` | yes | The outlet. This is the credential the card leads with. |
| `url` | yes | The article. Must start `https://` — that is what makes the card open in a new tab. |
| `image` | yes | Path under `public/`. |
| `restaurant` | no | A restaurant slug. |
| `category` | yes | `feature`, `review`, `news` or `inclusion`. |
| `kind` | yes | `press` for coverage in a publication; `native` for something a venue published itself (its own blog, a creator's TikTok). Both still link out. |

> **Do not add our own posts to this array.** An entry here is a card with no
> page behind it — the post's own file in `content/posts/` already produces its
> card. The build will stop with an error if a slug appears in both places.

---

## 4. Restaurants

Restaurants are the one piece of content that lives in **three places**. This is
deliberate — each surface shows different things — but it means adding or
removing a restaurant is a checklist, not a single edit.

| File | What it controls |
| --- | --- |
| [lib/restaurants.ts](lib/restaurants.ts) → `RESTAURANTS` (L40) | **The source of truth.** Detail pages and their web addresses, Google/SEO data, the booking section, the Google-review picker, the address list on `/contact`. |
| [components/Discover.tsx](components/Discover.tsx) → `ITEMS` (L48) | The photo tiles on the **home page** — longer blurbs, founding year, hover video. |
| [components/RestaurantsShowcase.tsx](components/RestaurantsShowcase.tsx) → `RESTAURANTS` (L79) | The scrolling carousel on **`/restaurants`** — display order and background video. |

### Change a fact about an existing restaurant

Most fields — booking link, address, description, price range, menus — only need
`lib/restaurants.ts`.

But **the home page tiles carry their own copy.** If the change is to the blurb,
the address line or the tagline as shown on the home page, edit `ITEMS` in
`Discover.tsx` too. Search for the restaurant name in both files to be sure.

Useful fields in `lib/restaurants.ts`:

```ts
{
  slug: "belly",                       // the key everything else joins on
  name: "Belly",
  tagline: "Modern Filipino Bistro",
  cuisine: "Filipino · Bistro",
  description: "Shown on the /restaurants page and in Google results.",
  location: "Kentish Town, London",    // editorial shorthand
  addresses: [                         // the postal address; drives /contact
    { street: "157 Kentish Town Rd", locality: "London", postcode: "NW1 8PD" },
  ],
  image: "/images/belly.jpg",
  logo: "/logo/belly.png",
  website: "https://www.bellylondon.com/",   // "Visit" opens this
  menuPages: [                               // menu overlay, in page order
    "/menu/belly/food.png",
    "/menu/belly/drinks-1.png",
  ],
  menuLabel: "February 2026",                // small caption above the menu
  bookable: true,                            // false = walk-in only
  bookingUrl: "https://booking.resdiary.com/...",
  googleReviewUrl: "...",                    // optional; falls back to a Maps search
  comingSoon: true,                          // not open yet — see below
},
```

**`bookable` vs `comingSoon`.** `bookable: false` means walk-in. `comingSoon: true`
means the doors haven't opened. A venue that is `bookable: false` *and*
`comingSoon: true` (Bunso) is correctly excluded from both the walk-in list and
the "leave us a review" picker — don't set `comingSoon` on an open restaurant to
hide it from bookings.

### Update a menu

1. Export each menu page as a PNG or JPG.
2. Drop the files in `public/menu/<restaurant>/`.
3. List them, in reading order, in `menuPages` in **both** `lib/restaurants.ts`
   and `ITEMS` in `Discover.tsx`.
4. Update `menuLabel` to the new month, e.g. `"August 2026"`.

### Add a restaurant

Work through all of these:

1. **[lib/restaurants.ts](lib/restaurants.ts)** — add an entry to `RESTAURANTS`.
   This alone creates the page at `/restaurants/<slug>`.
2. **[lib/restaurants.ts](lib/restaurants.ts)** — add the display name to
   `SLUG_BY_NAME` (L201). The carousel matches on the name, so this must be
   character-for-character identical to step 4.
3. **[components/Discover.tsx](components/Discover.tsx)** — add an entry to
   `ITEMS` for the home page tile.
4. **[components/RestaurantsShowcase.tsx](components/RestaurantsShowcase.tsx)** —
   add an entry to `RESTAURANTS` (L79), a line to `LOGOS` (L136) and, if you have
   photography, a line to `PHOTOS` (L148).
5. Add the images — see [Images & video](#12-images--video).

Then check the home page, `/restaurants`, `/restaurants/<slug>` and `/contact`.

> The name string is the join key across steps 2–4. `"Café Mama & Sons"` with a
> plain `e` instead of `é`, or `and` instead of `&`, silently produces a card
> with no logo and a dead link.

### Delete a restaurant

Remove it from the three files above **and** search the repo for its `slug` —
it may be referenced in:

- `lib/blog.ts` (`restaurant: "..."` on posts),
- `lib/press.ts` (`restaurants: [...]` on coverage),
- `lib/jobs.ts` (`restaurantSlug`),
- `components/About.tsx` (`slug` on a timeline chapter),
- `components/FAQ.tsx` and `components/JoinUs.tsx`, where restaurant names appear
  in prose.

Leaving a stale slug behind won't crash the site, but it will point readers at a
page that no longer exists.

---

## 5. Careers

**File:** [lib/jobs.ts](lib/jobs.ts) → `JOBS` (L17)

Openings appear on `/careers` and are also published as structured job data that
Google can lift into its jobs panel — so keep them accurate and remove them when
filled.

```ts
{
  id: "sous-chef-belly",
  title: "Sous Chef",
  restaurantSlug: "belly",              // optional; matches lib/restaurants.ts
  restaurantName: "Belly",
  location: "Kentish Town, London",
  type: "Full-time",                    // Full-time | Part-time | Casual
  area: "Kitchen",                      // Kitchen | Front of House | Bar | Group
  summary: "One or two sentences — this is the line on the listing card.",
  responsibilities: [
    "One bullet per line",
    "Four or five reads best",
  ],
  requirements: [
    "3+ years as Sous, or strong Chef de Partie ready to step up",
    "Right to work in the UK",
  ],
},
```

- `type` and `area` must be **exactly** one of the listed values — they're used
  for filtering, and a typo is a build error.
- `id` must be unique. It becomes the link to that role, e.g.
  `/careers#sous-chef-belly`.
- For a group role with no single restaurant, leave out `restaurantSlug` and set
  `restaurantName: "Maginhawa Group"`.

**To close a role,** delete the whole block. The page and the job listings update
themselves; there's nothing else to switch off.

### Where applications go

The application form on `/careers` opens the reader's email client with a
pre-filled message to **hr@mgnhw.com** ([JoinUs.tsx:697](components/JoinUs.tsx#L697)).
Nothing is stored on the website and no server receives it.

Because it's an email draft, **a CV cannot be attached automatically** — the form
names the file the applicant chose and asks them to attach it themselves before
sending. To change the recipient address, edit the `mailto:` line in
[components/JoinUs.tsx:697](components/JoinUs.tsx#L697).

### Careers page copy

Also in [components/JoinUs.tsx](components/JoinUs.tsx):

- `HERO_LINES` (L110) — the two-line headline. It's split across a photograph, so
  keep it as two strings. The animation re-times itself to whatever you write.
- `HERO_STAND` (L115) — the paragraph beneath it.
- `PILLARS` (L24) — the three numbered "why work here" blocks.

---

## 6. Contact details & socials

**File:** [lib/contact.ts](lib/contact.ts)

```ts
export const CONTACT = {
  phone: "+44 01234 5678",
  email: "info@mgnhw.com",
  officeHours: { days: "Mon – Fri", time: "09:00 – 17:00" },
};
```

Change it here and it updates on the contact page, in the footer, and in the
clickable phone/email links everywhere — they're generated from these values.

⚠️ **All three are currently placeholders and are not real.** See
[Known placeholders](#15-known-placeholders).

`officeHours` is head-office hours, not restaurant service hours.

### Socials

```ts
export const SOCIALS = [
  { label: "LinkedIn", url: null },
  { label: "Facebook", url: null },
  { label: "Instagram", url: "https://www.instagram.com/maginhawagroup/" },
];
```

`url: null` renders the label as plain text rather than a link. Supply a real URL
and it becomes clickable automatically. LinkedIn and Facebook are deliberately
blank rather than guessed.

### The enquiry form

The contact form on `/contact` currently **does nothing at all**. Pressing Send
is intentionally stopped ([Contact.tsx:88](components/Contact.tsx#L88)) because no
form service is connected yet — the reader gets no confirmation, no error, and the
message goes nowhere. Until a form service is wired up, the only working route for
enquiries is the email address shown beside the form.

---

## 7. Press, awards & quotes

**File:** [lib/press.ts](lib/press.ts)

Four separate lists, each feeding a different surface:

| List | Line | Where it appears |
| --- | --- | --- |
| `FEATURED_OUTLETS` | L26 | The scrolling masthead logos ("As seen in") |
| `HIGHLIGHT_QUOTES` | L49 | The rotating pull-quote beneath the logos |
| `PRESS_INDEX` | L87 | The compact outlet/year/quote list |
| `PRESS` | L143 | Full coverage — the Awards & Recognition table on `/about`, and the structured data search engines read |

**To add a logo to the masthead:** save the outlet's SVG into
`public/press-logo/`, then add a line to `FEATURED_OUTLETS`:

```ts
{ name: "The Observer", logo: "/press-logo/observer.svg" },
```

Add `tier: "headline"` for extra prominence, or `scale: 1.6` if the wordmark
looks small next to the others (compact marks like The Independent's "i" need it).

**To add a piece of coverage:** add to `PRESS`. The `restaurants` field is an
array of slugs, so one article can credit several venues:

```ts
{
  outlet: "The Observer",
  feature: "Filipino baked goods are hot cakes",
  quote: "Optional — a sentence worth pulling out.",
  date: "—",
  url: "https://...",
  restaurants: ["belly", "cafemama"],
},
```

Most entries carry `date: "—"` because the source tracker didn't record dates;
that's expected and the table doesn't render a date column.

> A press item that should also appear in the Journal needs a **separate** entry
> in `lib/blog.ts` with `kind: "press"`. The two lists are independent on purpose
> — press is the full archive, the Journal is the curated feed.

---

## 8. FAQ

**File:** [components/FAQ.tsx](components/FAQ.tsx) → `ITEMS` (L10)

Shown on `/contact`, and also published as structured data so Google can show the
questions directly in search results.

```ts
{
  q: "Do I need to book a table?",
  a: "Belly, Bintang, Guanabana and Ramo Ramen all take reservations — you'll find a booking link on each restaurant's page.",
},
```

Add, reorder or delete freely — the accordion and the search data both follow the
array. Answers are plain text; you can't put links or bold inside them.

Several answers name specific restaurants and which ones take bookings. **If you
add or remove a restaurant, re-read these** — they'll otherwise go quietly out of
date.

---

## 9. The About page timeline

**File:** [components/About.tsx](components/About.tsx) → `CHAPTERS` (L68)

The scrolling year-by-year story on `/about`.

```ts
{
  year: "2025",
  title: "Belly",
  body: "A modern Filipino bistro opens in Kentish Town — Chef Omar's most personal kitchen.",
  image: "/images/belly.jpg",
  imageAlt: "Belly dining room, Kentish Town",
  place: "Kentish Town",
  slug: "belly",          // optional — links the card to the restaurant page
  wordmark: true,         // optional — for venues with no photography yet
},
```

Entries appear in the order written, so add new chapters at the **end** of the
array.

Each card is randomly dealt a landscape or portrait shape, derived from its
`title`. This is deterministic, not random per visit — but it does mean
**changing a chapter's title can change its card shape**. That's harmless; it just
means the layout may look slightly different after a copy edit.

---

## 10. Home page copy

The home page is assembled in [components/Experience.tsx](components/Experience.tsx),
which is where sections are switched on and off — it renders the page top to
bottom, so reading it tells you the running order.

| Section | File | Constant |
| --- | --- | --- |
| Hero background videos | [components/Hero.tsx](components/Hero.tsx) | `CLIPS` (L16) |
| The opening statement | [components/Manifesto.tsx](components/Manifesto.tsx) | `PARTS` (L35) |
| Restaurant tiles | [components/Discover.tsx](components/Discover.tsx) | `ITEMS` (L48) |
| Booking section video | [components/Reservations.tsx](components/Reservations.tsx) | `CLIP` (L23) |

### The opening statement

`PARTS` is the sentence written as a list of words with photographs laid between
them, so the pictures read as words in the sentence:

```ts
const PARTS = [
  "A", "vibrant", "Filipino",
  { img: "/blog/DSC07739-web.jpg", w: 0.62, enter: "drop" },
  "and", "pan-Asian", "collective", "of", "restaurants,", "cafés",
  ...
];
```

Each word is its own string — including its punctuation, so `"London."` keeps its
full stop. `w` is the picture's width and `enter` is how it arrives (`"drop"`,
`"slide"` or `"rise"`). Just below, `KEY_WORDS` (L63) lists the words printed in
the accent colour; they must match the strings in `PARTS` exactly, full stop
included. `SUPPORT` (L66) is the sentence underneath.

Three photographs is a deliberate maximum — one per line. More turns the sentence
into a contact sheet.

---

## 11. Navigation & footer links

The same navigation is written in three places, and all three need to agree:

| Where | File | Constant |
| --- | --- | --- |
| Top bar | [components/Nav.tsx](components/Nav.tsx) | `LINKS` (L15) |
| Full-screen menu | [components/Menu.tsx](components/Menu.tsx) | `ITEMS` (L10) — also carries "Home" |
| Footer | [components/Footer.tsx](components/Footer.tsx) | `EXPLORE` (L18) |

```ts
{ label: "Restaurants", href: "/restaurants" },
```

Internal links start with `/`. External links use the full `https://...` address
and open in a new tab automatically. The footer's email and phone links are
generated from `lib/contact.ts` — don't type them in by hand.

### Adding a new page

Create `app/<name>/page.tsx`, then add the link to all three lists above.
Copying an existing page such as [app/about/page.tsx](app/about/page.tsx) is the
easiest start — it already has the title and search-description block set up.

---

## 12. Images & video

Everything the site serves lives in `public/`. A file at
`public/images/belly.jpg` is written in the data as `"/images/belly.jpg"`.

| Folder | Contents |
| --- | --- |
| `public/images/` | Restaurant photography, careers photos |
| `public/blog/` | Journal and press card images |
| `public/logo/` | Restaurant marks and award badges |
| `public/press-logo/` | Publication wordmarks (SVG) |
| `public/menu/<restaurant>/` | Menu pages as PNG/JPG |
| `public/videos/` | Background and hover clips |

**Before adding a photograph:** resize and compress it first. Aim for **under
400KB** and no wider than **2400px**. The repo already carries a lot of oversized
media and it is the main cause of slow page loads — a 4K photograph does not look
better on screen, it just takes longer to arrive.

Give files descriptive lowercase names with hyphens: `belly-dining-room.jpg`.

**Photographs inside a post** work the same way: put the file in `public/blog/`
and write `![](/blog/your-photo.jpg)` on its own line in the post. It renders
full width, and it loads lazily so it costs nothing until the reader scrolls to
it.

### Video

`public/videos/` **is committed to git and ships with the site** — that changed
when the site moved to Cloudflare Pages, whose bandwidth is free and unmetered.
The one hard rule is Cloudflare's: **no single file over 25MB**, or the whole
deploy is refused. `scripts/compress-media.mjs` is what brings clips under it.

Photographs can optionally be served from a CDN instead of `public/` — set
`NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` at build time. Leaving it unset serves them
from `public/` at their original size, which works but is heavier. See
`.env.example` and `CLOUDINARY.md`.

---

## 13. Page titles & SEO

Each page owns the title and description shown in Google and in link previews.

- **Site-wide defaults:** [app/layout.tsx](app/layout.tsx) — the fallback title,
  the description, and the keyword list.
- **Per page:** the `metadata` block at the top of each `app/*/page.tsx`.

```ts
export const metadata: Metadata = {
  title: "Careers",                 // shown as "Careers — Maginhawa Group"
  description: "Open positions across the Maginhawa Group — kitchens, front of house, bar...",
  alternates: { canonical: "/careers" },
  openGraph: { /* the preview card shown when the link is shared */ },
};
```

**Journal posts write their own.** A post's title, search description, share
preview and structured data all come from the frontmatter at the top of its
`.md` file — there is no `metadata` block to edit and no `app/` file to create.
Change `title` or `excerpt` in the post and everything follows.

The address the site calls home — used in every canonical link, share preview and
piece of structured data — is the single line in [lib/site.ts](lib/site.ts).

---

## 14. Publishing your changes

1. Check the site locally with `npm run dev` — look at every page your change
   touches, and check a narrow browser window as well as a wide one.
2. Stop the dev server, then confirm the build passes:

```bash
npm run build
```

3. Commit and push:

```bash
git add -A && git commit -m "Update August menus and close the Sous Chef role" && git push
```

**Cloudflare Pages builds from the push** and the new version is live a couple of
minutes later at <https://www.maginhawagroup.co.uk>. A failed build does **not**
replace the live site — the previous version stays up, and the failure is
reported in the Cloudflare dashboard.

There is nothing to press: committing a post is publishing it. If you are not
ready for that, rename the file with a leading underscore (see
[Drafts](#drafts)) and commit it that way.

If you changed component files rather than just data, refresh the project's code
map afterwards:

```bash
graphify update .
```

---

## 15. Known placeholders

Things that are visibly wrong on the live site and need real values.

| What | Where | Note |
| --- | --- | --- |
| Phone number `+44 01234 5678` | [lib/contact.ts:9](lib/contact.ts#L9) | Not a real number. Shown on the contact page and in the footer. |
| Email `info@mgnhw.com` | [lib/contact.ts:11](lib/contact.ts#L11) | Not a real inbox. Careers mail goes to `hr@mgnhw.com`, which is real. |
| Office hours | [lib/contact.ts:16](lib/contact.ts#L16) | Assumed, not confirmed. |
| LinkedIn & Facebook | [lib/contact.ts:31](lib/contact.ts#L31) | Blank, so they show as plain text. Add URLs to make them links. |
| Contact form doesn't send | [components/Contact.tsx:88](components/Contact.tsx#L88) | Submitting does nothing and says nothing — a reader can fill it in, press Send, and reasonably believe the message arrived. Needs a form service connected. |
| Mamasons & Bunso photography | `lib/restaurants.ts` | `image` points at `mamasons-placeholder.jpg` and `bunso-placeholder.jpg`, **which don't exist**. The site is written to skip them rather than show a broken image, so this is invisible today — but adding the two files (under those exact names) turns the photography on everywhere at once. |

---

## 16. Troubleshooting

**A red error appears and the page won't load.**
Read the file and line number in the message — it's nearly always a missing comma,
an unclosed quote or an unclosed `}`. Undo your last edit to confirm, then redo it
carefully.

**`Type '"Weekend"' is not assignable to type '"Full-time" | "Part-time" | "Casual"'`**
A field that only accepts specific values got something else. The allowed values
are listed in the error and in the type block at the top of the file.

**A picture doesn't show.**
Check the file is really in `public/`, and that the path in the data starts with
`/` and matches the filename exactly — including capital letters and the extension
(`.jpg` vs `.jpeg`).

**I changed a restaurant blurb and the home page still shows the old one.**
The home page tiles keep their own copy in `ITEMS` in
[components/Discover.tsx](components/Discover.tsx). See
[Restaurants](#4-restaurants).

**A new blog post isn't at the top.**
Check `date` is in `YYYY-MM-DD` form. `"01-08-2026"` sorts as if it were the year 1.

**A post I wrote isn't on the site at all.**
Three things to check, in order: the filename does not start with `_` (that means
draft), it ends in `.md`, and it is inside `content/posts/`.

**`content/posts/….md: \`category\` must be one of feature, review, news, inclusion`**
The build checks a post's facts and stops rather than publishing something
broken. The message names the file and the field. The same happens for a missing
`title`, `excerpt` or `image`, a `date` that isn't `YYYY-MM-DD`, and a
`restaurant` that isn't one of ours.

**`…collides with the … entry in lib/blog.ts`**
A post's filename is the same as the `slug` of a press entry. Rename one of them
— two entries cannot own the same address.

**The post's page is there but the text runs together in one block.**
Markdown needs a **blank line** between paragraphs. A single newline is only a
line wrap.

**A restaurant card has no logo, or its link goes nowhere.**
Its display name doesn't match across `SLUG_BY_NAME`, `LOGOS`, `PHOTOS` and the
carousel's `RESTAURANTS`. Compare the strings character by character — accents and
`&` are the usual culprits.

**Everything looks broken after pulling changes.**
Run `npm install` — someone may have added a dependency.
