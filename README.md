# Maginhawa Group — Content Guide

How to add, change and remove content on the Maginhawa Group website.

This site has **no CMS**. Content lives in the repo as files, edited in a code
editor and published by committing. That sounds intimidating and isn't — most
edits are copying an existing block, changing the words inside the quote marks,
and saving.

---

## Start here

**Changing words on a page?** Find the page in the table in
[Where everything lives](#2-where-everything-lives), open that file, change the
text between the quote marks, save. The browser updates itself.

**Writing a new Journal post?** Make a file in `content/posts/` and write in it.
[Jump to the instructions](#write-a-post).

**Everything else** — a new restaurant, a closed job, a menu — is a short
checklist in the section for it below.

> **The one rule that matters:** content is data, and the data lives in `lib/`
> (or, for a post, in `content/posts/`). If you find yourself editing something
> in `components/` to change a sentence, check the table in section 2 first —
> there is usually a data file that owns it.

### A note on how this guide points at things

This guide names files and **the constant inside them** — `RESTAURANTS`,
`HOME_SLUGS`, `CHAPTERS` — and never a line number. Line numbers rot the moment
anyone edits above them, and an earlier version of this file was full of numbers
that had drifted by hundreds of lines. A name you can search for stays true.

To find one, open the file and search (⌘F / Ctrl-F) for the name in CAPITALS.
It is always declared as `const NAME = [` near the top of its section.

**Please don't add line numbers back.**

---

## Contents

1. [Before you start](#1-before-you-start)
2. [Where everything lives](#2-where-everything-lives)
3. [The Journal (blog)](#3-the-journal-blog)
4. [Restaurants](#4-restaurants)
5. [Careers](#5-careers)
6. [Contact details & socials](#6-contact-details--socials)
7. [The enquiry form](#7-the-enquiry-form)
8. [Press, awards & quotes](#8-press-awards--quotes)
9. [FAQ](#9-faq)
10. [The About page timeline](#10-the-about-page-timeline)
11. [Home page copy](#11-home-page-copy)
12. [Navigation & footer links](#12-navigation--footer-links)
13. [Images & video](#13-images--video)
14. [Page titles & SEO](#14-page-titles--seo)
15. [Publishing your changes](#15-publishing-your-changes)
16. [Known placeholders & gaps](#16-known-placeholders--gaps)
17. [Troubleshooting](#17-troubleshooting)

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

> **Never run `npm run build` while `npm run dev` is running.** They write to the
> same `.next` folder and will corrupt each other. Stop the dev server first.

`npm run build` writes a folder of finished files to `out/`, which is exactly
what the live site serves. To look at that rather than the dev server:

```bash
npx serve out -l 3100
```

One difference to know about: the dev server and the live site both understand
`/blog/a-note-on-service`, but a plain local file server does not — open
`/blog/a-note-on-service.html` there instead.

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

| What you want to change | File | The constant to edit |
| --- | --- | --- |
| **Journal posts we write** | `content/posts/<name>.md` | the whole file — one per post |
| Which posts appear on the home page | [components/home/Blog.tsx](components/home/Blog.tsx) | `HOME_SLUGS` |
| Press coverage & other links in the Journal | [lib/blog.ts](lib/blog.ts) | `BLOG` |
| Restaurant facts, addresses, booking links, menus | [lib/restaurants.ts](lib/restaurants.ts) | `RESTAURANTS` |
| Restaurant card details (address lines, hours, badge) | [lib/venueCards.ts](lib/venueCards.ts) | `EXTRAS` |
| Home page restaurant blurbs & hover clips | [components/home/Discover.tsx](components/home/Discover.tsx) | `DISPLAY` |
| Restaurant carousel on `/restaurants` | [components/venues/RestaurantsShowcase.tsx](components/venues/RestaurantsShowcase.tsx) | `RESTAURANTS` |
| Job openings | [lib/jobs.ts](lib/jobs.ts) | `JOBS` |
| Phone, email, press email, office hours | [lib/contact.ts](lib/contact.ts) | `CONTACT` |
| Social media links | [lib/contact.ts](lib/contact.ts) | `SOCIALS` |
| Press coverage & logos | [lib/press.ts](lib/press.ts) | `FEATURED_OUTLETS`, `PRESS` |
| FAQ questions | [components/contact/FAQ.tsx](components/contact/FAQ.tsx) | `ITEMS` |
| About page story timeline | [components/about/About.tsx](components/about/About.tsx) | `CHAPTERS` |
| Careers page headline & values | [components/careers/JoinUs.tsx](components/careers/JoinUs.tsx) | `PILLARS`, `HERO_LINES` |
| Home page opening statement | [components/home/Manifesto.tsx](components/home/Manifesto.tsx) | `WORDS` |
| Top navigation links | [components/layout/Nav.tsx](components/layout/Nav.tsx) | `LINKS` |
| Full-screen menu links | [components/layout/Menu.tsx](components/layout/Menu.tsx) | `ITEMS` |
| Footer links | [components/layout/Footer.tsx](components/layout/Footer.tsx) | `EXPLORE` |
| Legal entity, privacy/terms dates | [lib/legal.ts](lib/legal.ts) | `LEGAL_ENTITY`, `LEGAL_UPDATED` |
| Page titles & search descriptions | `app/*/page.tsx` | `metadata` |
| Site-wide title & description | [app/layout.tsx](app/layout.tsx) | `metadata` |
| The site's own web address | [lib/site.ts](lib/site.ts) | `SITE_URL` |

### The pages that exist

Every page on the site, and the file that makes it:

| Address | File |
| --- | --- |
| `/` | [app/page.tsx](app/page.tsx) → [components/home/Experience.tsx](components/home/Experience.tsx) |
| `/restaurants` | [app/restaurants/page.tsx](app/restaurants/page.tsx) |
| `/menus/<slug>` | [app/menus/[slug]/page.tsx](app/menus/[slug]/page.tsx) — one per venue with menu pages |
| `/blog` | [app/blog/page.tsx](app/blog/page.tsx) |
| `/blog/<slug>` | [app/blog/[slug]/page.tsx](app/blog/[slug]/page.tsx) — one per post in `content/posts/` |
| `/about` | [app/about/page.tsx](app/about/page.tsx) |
| `/careers` | [app/careers/page.tsx](app/careers/page.tsx) |
| `/contact` | [app/contact/page.tsx](app/contact/page.tsx) |
| `/privacy`, `/terms` | [app/privacy/page.tsx](app/privacy/page.tsx), [app/terms/page.tsx](app/terms/page.tsx) |
| `/lab/…` | Internal type and hero experiments. Not linked from anywhere; ignore. |

> **There is no `/restaurants/<slug>` page.** Individual restaurants are
> presented on the `/restaurants` carousel and on their own **menu** page at
> `/menus/<slug>`. Adding a restaurant does not create a detail page, because
> there is no such page type. If you have seen an older note claiming otherwise,
> it was wrong.

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

**1. Make the file.** In `content/posts/`, named for the web address you want:

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
| `image` | yes | The photograph at the top of the post and on its card. A path under `public/` — see [Images & video](#13-images--video). |
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
chosen stories rather than the newest ones. The list is `HOME_SLUGS` near the top
of [components/home/Blog.tsx](components/home/Blog.tsx):

```ts
const HOME_SLUGS = [
  "olive-best-new-restaurants",
  "a-note-on-service",        // ← a post of ours, named by its filename
  ...
] as const;
```

Add the post's slug — for one of our posts that is its filename without `.md`;
for coverage it is the `slug` in `lib/blog.ts`. Whichever entry in that list is
**newest by date** becomes the big photograph above the rail, regardless of where
it sits in the list.

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

There is **one source of truth** for a restaurant — [lib/restaurants.ts](lib/restaurants.ts) —
and two files that add things only their own surface prints. Learning which is
which is the whole of this section.

| File | What it owns |
| --- | --- |
| [lib/restaurants.ts](lib/restaurants.ts) → `RESTAURANTS` | **The source of truth.** Name, tagline, cuisine, description, postal address, photograph, logo, website, booking link, menu pages, `bookable`, `comingSoon`. Feeds Google/SEO data, the booking section, the review picker, `/contact`, and the menu pages. |
| [lib/venueCards.ts](lib/venueCards.ts) → `venueCards()` | **The card record.** Reads the file above and adds only what a *card* prints and nothing else carries: the three printable address lines, opening hours, the Michelin sticker, and a focal point for off-centre photographs. Both card grids read this one function. |
| [components/home/Discover.tsx](components/home/Discover.tsx) → `DISPLAY` | **Home page copy only.** The five things unique to the home grid: `tag`, one-line `location`, `blurb`, founding year `est`, and the hover `clip`. |
| [components/venues/RestaurantsShowcase.tsx](components/venues/RestaurantsShowcase.tsx) → `RESTAURANTS` | **The `/restaurants` carousel.** Display order, the short tag and location as the carousel prints them, and the full-screen background `video`. |

> **Why it is split this way:** two spellings of one fact are two facts that will
> eventually disagree. This file used to hold duplicate `LOGOS` and `PHOTOS`
> tables, and one of them had already drifted — the carousel was showing a
> different photograph of Ramo Ramen from the one the home page showed, and
> because both files existed nothing 404'd and nothing caught it. Those tables
> are gone; the card now reads one record.

### Change a fact about an existing restaurant

Start in [lib/restaurants.ts](lib/restaurants.ts). Booking link, address,
description, cuisine, menus and `bookable` all live there and nowhere else.

**The exception is the home page's marketing copy.** The blurb, the tag line and
the one-line location as shown on the home grid are written in `DISPLAY` in
[components/home/Discover.tsx](components/home/Discover.tsx), and the carousel's
short tag and location are in `RESTAURANTS` in
[components/venues/RestaurantsShowcase.tsx](components/venues/RestaurantsShowcase.tsx).
If your change is to a *sentence a visitor reads on the home page or the
carousel*, search for the restaurant's name in those two files too.

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

> **`priceRange` no longer exists.** The group does not publish a price band
> anywhere on the site. Don't re-add the field expecting it to appear.

### Update a menu

1. Export each menu page as a PNG or JPG.
2. Drop the files in `public/menu/<restaurant>/`.
3. List them, in reading order, in `menuPages` in
   **[lib/restaurants.ts](lib/restaurants.ts)** — this is the only place they go.
4. Update `menuLabel` to the new month, e.g. `"August 2026"`.

Adding `menuPages` to a venue that had none also **creates its menu page** at
`/menus/<slug>` — that route is built from whichever venues have menu pages.
Removing them removes the page, so check nothing still links to it.

### Add a restaurant

Work through all of these:

1. **[lib/restaurants.ts](lib/restaurants.ts)** — add an entry to `RESTAURANTS`.
2. **[lib/restaurants.ts](lib/restaurants.ts)** — add the display name to
   `SLUG_BY_NAME`. The carousel matches on the name, so this must be
   character-for-character identical to step 4.
3. **[components/home/Discover.tsx](components/home/Discover.tsx)** — add an
   entry to `DISPLAY` for the home page tile's copy and hover clip. *(A venue
   with no entry here still renders — it just carries no blurb and no film, and
   falls back to its own postal address for the location line.)*
4. **[components/venues/RestaurantsShowcase.tsx](components/venues/RestaurantsShowcase.tsx)**
   — add an entry to `RESTAURANTS` for the carousel.
5. **[lib/venueCards.ts](lib/venueCards.ts)** — add the three printable address
   lines, and a Michelin badge or photo focal point if it needs one.
6. **`public/llms.txt`** — see the warning below.
7. Add the images — see [Images & video](#13-images--video).

Then check the home page, `/restaurants`, `/menus/<slug>` and `/contact`.

> ⚠️ **`public/llms.txt` restates the whole restaurant list by hand.** It is the
> plain-text summary that AI assistants read, it ships out of `public/`
> uncompiled, and so it cannot import the array — it names every venue, its
> cuisine, whether it takes bookings, and the addresses of those that publish
> one. **Nothing in the build checks it.** Add, rename or close a venue and that
> file is silently wrong until you edit it too. It is short, and the list is near
> the top.

> The name string is the join key across steps 2–4. `"Café Mama & Sons"` with a
> plain `e` instead of `é`, or `and` instead of `&`, silently produces a card
> with no logo and a dead link.

### Delete a restaurant

Remove it from the files above **and** search the repo for its `slug` — it may be
referenced in:

- `lib/blog.ts` (`restaurant: "..."` on posts),
- `content/posts/*.md` (`restaurant:` in the frontmatter),
- `lib/press.ts` (`restaurants: [...]` on coverage),
- `lib/jobs.ts` (`restaurantSlug`),
- `components/about/About.tsx` (`slug` on a timeline chapter),
- `components/contact/FAQ.tsx` and `components/careers/JoinUs.tsx`, where
  restaurant names appear in prose,
- `public/llms.txt`.

A stale slug in a post's frontmatter is a **build error** — the build refuses a
`restaurant` that isn't one of ours, which is the good case. The others fail
quietly.

---

## 5. Careers

**File:** [lib/jobs.ts](lib/jobs.ts) → `JOBS`

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
pre-filled message to **careers@mgnhw.com**. Nothing is stored on the website and no
server receives it — search [components/careers/JoinUs.tsx](components/careers/JoinUs.tsx)
for `mailto:` to change the recipient.

Because it's an email draft, **a CV cannot be attached automatically** — the form
names the file the applicant chose and asks them to attach it themselves before
sending.

### Careers page copy

Also in [components/careers/JoinUs.tsx](components/careers/JoinUs.tsx):

- `HERO_LINES` — the two-line headline. It's split across a photograph, so keep
  it as two strings. The animation re-times itself to whatever you write.
- `HERO_STAND` — the paragraph beneath it.
- `PILLARS` — the three numbered "why work here" blocks.

---

## 6. Contact details & socials

**File:** [lib/contact.ts](lib/contact.ts)

```ts
export const CONTACT = {
  phone: null,                          // no number on file — see below
  email: "info@mgnhw.com",              // PLACEHOLDER
  pressEmail: "lily@amywilliamsconsultancy.com",   // real
  officeHours: { days: "Mon – Fri", time: "09:00 – 17:00" },  // PLACEHOLDER
};
```

Change it here and it updates on the contact page, in the footer, and in the
clickable phone/email links everywhere — they're generated from these values.

**`phone` is deliberately `null`.** It used to hold `+44 01234 5678` and rendered
it as a live `tel:` link in the footer of every page — so a reader tapping it
dialled a stranger. The footer row and the contact entry both guard on it and are
simply dropped while it is null. **Supply the real number here and both come back
on their own.**

**`pressEmail` is real** and is not a placeholder — don't sweep it up with the
others. It is deliberately absent from the footer: the footer offers one way in,
and journalists arrive via `/contact` where the two inboxes are labelled apart.

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
blank rather than guessed — a social link that lands on the wrong company's page
is worse than one that isn't clickable yet.

---

## 7. The enquiry form

The form on `/contact` **opens a draft in the reader's own email app**, pre-filled with
everything they typed. There is no server, no email service, no account and no API key —
the site is static from end to end.

**Enquiries go to `info@mgnhw.com`**, taken from `CONTACT.email` in
[lib/contact.ts](lib/contact.ts). Change it there and the form follows, along with every
other place the address appears.

> ⚠️ **Nothing is sent until the reader presses send in their own mail app.** That is the
> one thing to understand about this form, and it is why the button says *"Open in your
> email app"* rather than "Submit", why the fields are **not** cleared afterwards, and why
> the confirmation card says *"ready — but not sent yet"*. Every one of those is load-bearing:
> a form that reads as delivered when it is not is the failure this design exists to avoid.

The careers form on `/careers` works the same way, sending to `careers@mgnhw.com`.

### What it costs you

Worth knowing, because it is a real trade:

- A reader with **no mail app configured** — webmail in a browser tab, or a phone with no
  account set up — may see nothing happen. The card covers this: it repeats the link and
  prints the address in full so the message can be copied by hand.
- There is **a step where people drop off.** Some will compose the message and never press
  send, and nothing on this site can tell you that happened.

Both are the price of having no server. If enquiries ever start feeling thin, that is the
first thing to suspect, and [section 15](#15-publishing-your-changes) records what a
server-side version would take.

### Changing where enquiries go

Change `email` in [lib/contact.ts](lib/contact.ts). That single value is the address printed
on the page, the address in the footer, and the recipient the draft is addressed to.

### If you ever want it to send by itself

The machinery for server-side delivery was built and then removed on purpose. The handler
([functions/api/contact.ts](functions/api/contact.ts)), the Worker entry
([worker/index.ts](worker/index.ts)) and its 28-assertion test suite
([scripts/probe-contact-fn.mjs](scripts/probe-contact-fn.mjs)) are all **still in the
repository and all inert** — nothing loads a Worker without `main` in
[wrangler.toml](wrangler.toml), and that key is gone.

The full list of what to put back is written in the comment block in
[wrangler.toml](wrangler.toml). Two things from it are worth knowing before you start:

- It needs a **sending domain onboarded** in Cloudflare, on a subdomain such as
  `send.maginhawagroup.co.uk` — onboarding writes `_dmarc.<domain>` at the root, and this
  zone already has one governing the group's real Microsoft 365 mail.
- ⚠️ **Do not reach for Email Routing.** That is the *inbound* feature and cannot send;
  turning it on takes over the root domain's MX records, which currently point at
  Microsoft 365, and would redirect the group's real incoming mail.

---

## 8. Press, awards & quotes

**File:** [lib/press.ts](lib/press.ts)

Four separate lists, each feeding a different surface:

| List | Where it appears |
| --- | --- |
| `FEATURED_OUTLETS` | The scrolling masthead logos ("As seen in") |
| `HIGHLIGHT_QUOTES` | The rotating pull-quote beneath the logos |
| `PRESS_INDEX` | The compact outlet/year/quote list |
| `PRESS` | Full coverage — the Awards & Recognition table on `/about`, and the structured data search engines read |

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

## 9. FAQ

**File:** [components/contact/FAQ.tsx](components/contact/FAQ.tsx) → `ITEMS`

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

## 10. The About page timeline

**File:** [components/about/About.tsx](components/about/About.tsx) → `CHAPTERS`

The scrolling year-by-year story on `/about`.

```ts
{
  year: "2025",
  title: "Belly",
  body: "A modern Filipino bistro opens in Kentish Town — Chef Omar's most personal kitchen.",
  image: "/images/belly.jpg",
  imageAlt: "Belly dining room, Kentish Town",
  place: "Kentish Town",
  slug: "belly",          // optional — files the chapter under that venue
  wordmark: true,         // optional — for venues with no photography yet
},
```

Entries appear in the order written, so add new chapters at the **end** of the
array.

Each card is dealt a landscape or portrait shape derived from its `title`. This is
deterministic, not random per visit — but it does mean **changing a chapter's
title can change its card shape**. That's harmless; it just means the layout may
look slightly different after a copy edit.

---

## 11. Home page copy

The home page is assembled in
[components/home/Experience.tsx](components/home/Experience.tsx), which is where
sections are switched on and off — it renders the page top to bottom, so reading
it tells you the running order.

| Section | File | Constant |
| --- | --- | --- |
| Hero background videos | [components/home/Hero.tsx](components/home/Hero.tsx) | `CLIPS` |
| The opening statement | [components/home/Manifesto.tsx](components/home/Manifesto.tsx) | `WORDS` |
| Restaurant tiles | [components/home/Discover.tsx](components/home/Discover.tsx) | `DISPLAY` |
| The "Latest" rail | [components/home/Blog.tsx](components/home/Blog.tsx) | `HOME_SLUGS` |
| Booking section video | [components/home/Reservations.tsx](components/home/Reservations.tsx) | `CLIP` |

### The opening statement

The statement is built from **two constants that work together**.

`WORDS` is the sentence, one word per line:

```ts
const WORDS = [
  "Maginhawa", "is", "Tagalog", "for", "comfort.",
  "A", "quiet", "idea", "that", "shapes", "every", "room", "we", "create,",
  ...
];
```

Each word is its own string — **including its punctuation**, so `"comfort."`
keeps its full stop. To reword the statement, edit this array.

`INLINE` places the photographs. It is keyed by the **position of the word each
picture follows**, counting from `0`:

```ts
const INLINE = new Map([
  [4,  { src: "/images/manifesto/mamasons-web.jpg", alt: "" }],  // after "comfort."
  [11, { src: "/images/manifesto/belly-web.jpg", alt: "", portrait: true }],
  ...
]);
```

> ⚠️ **Those numbers count words, so rewording `WORDS` moves every picture.**
> Add a word near the start and all four photographs slide one word later. After
> any edit to `WORDS`, re-count and update the keys — the comment beside each
> line names the word it should follow, which is how you check.

`portrait: true` is for a photograph that is natively portrait. It is a
description of the file, not a crop instruction — setting it on a landscape image
does not crop it, so re-crop the source first.

Every picture is `alt: ""` on purpose. They illustrate nothing the sentence
doesn't already say, and a screen reader announcing four descriptions mid-sentence
would break the statement into pieces. The statement carries its own
`aria-label`.

Two more constants sit just below:

- `KEY_WORDS` — the words printed in the accent colour, as a `Set`. Write them
  **without punctuation**: the lookup strips trailing punctuation, so `"comfort"`
  matches the word `"comfort."` in the sentence. Three accents across twenty
  words is the deliberate ceiling — accent most of a sentence and it stops being
  an accent.
- `EYEBROW` — the small line above the statement.

Four photographs is the working maximum — one per line. More turns the sentence
into a contact sheet.

---

## 12. Navigation & footer links

The same navigation is written in three places, and all three need to agree:

| Where | File | Constant |
| --- | --- | --- |
| Top bar | [components/layout/Nav.tsx](components/layout/Nav.tsx) | `LINKS` |
| Full-screen menu | [components/layout/Menu.tsx](components/layout/Menu.tsx) | `ITEMS` |
| Footer | [components/layout/Footer.tsx](components/layout/Footer.tsx) | `EXPLORE` |

```ts
{ label: "Restaurants", href: "/restaurants" },
```

Internal links start with `/`. External links use the full `https://...` address
and open in a new tab automatically. The footer's email and phone links are
generated from `lib/contact.ts` (`CONTACT_LINKS`) — don't type them in by hand.

### Adding a new page

Create `app/<name>/page.tsx`, then add the link to all three lists above.
Copying an existing page such as [app/about/page.tsx](app/about/page.tsx) is the
easiest start — it already has the title and search-description block set up.

---

## 13. Images & video

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
| `public/og/` | Share-preview images |

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

`public/videos/` **is committed to git and ships with the site.** The one hard
rule is Cloudflare's: **no single file over 25MB**, or the whole deploy is
refused. `scripts/compress-media.mjs` is what brings clips under it.

Photographs can optionally be served from a CDN instead of `public/` — set
`NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` at build time. Leaving it unset serves them
from `public/` at their original size, which works but is heavier. See
`.env.example` and `CLOUDINARY.md`.

> ⚠️ That variable must be set as a **build** variable in Cloudflare
> (Settings → Build → "Build variables and secrets"), not a runtime one. Next
> inlines `NEXT_PUBLIC_*` at build time, so one set in the runtime section is read
> by nothing and every photograph silently stays local.

---

## 14. Page titles & SEO

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
piece of structured data — is `SITE_URL` in [lib/site.ts](lib/site.ts).

`public/llms.txt` is the plain-text summary AI assistants read. It is maintained
by hand — see the warning in [Restaurants](#add-a-restaurant).

---

## 15. Publishing your changes

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

**Cloudflare builds from the push** and the new version is live a couple of
minutes later at <https://www.maginhawagroup.co.uk>. A failed build does **not**
replace the live site — the previous version stays up, and the failure is
reported in the Cloudflare dashboard.

There is nothing to press: committing a post is publishing it. If you are not
ready for that, rename the file with a leading underscore (see
[Drafts](#drafts)) and commit it that way.

### How the deploy is wired

Worth knowing before you change anything about it:

- This is a **Workers** project, not a Pages project, even though the two look
  similar in the dashboard. [wrangler.toml](wrangler.toml) declares
  `[assets] directory = "./out"`.
- `npm run build` runs `next build`, which — because `next.config.mjs` sets
  `output: "export"` — writes a folder of plain HTML into `out/`. That folder is
  the website.
- **The build command is a dashboard setting**, not something in this repo.
  Settings → Build → Build command: `npm run build`.
- Per-file ceiling is **25 MiB**. Exceed it and the whole deploy is refused.

If you changed component files rather than just data, refresh the project's code
map afterwards:

```bash
graphify update .
```

---

## 16. Known placeholders & gaps

Things that are visibly wrong or missing on the live site.

| What | Where | Note |
| --- | --- | --- |
| Enquiry form needs a mail app | [components/contact/Contact.tsx](components/contact/Contact.tsx) | Not a defect — a deliberate trade. The form opens a draft in the reader's own email app rather than sending, so a visitor with no mail account configured must copy the address instead. See [section 7](#7-the-enquiry-form). |
| No phone number | [lib/contact.ts](lib/contact.ts) | `phone: null`. The footer row and contact entry are hidden rather than showing a fake number. Supply it and they return. |
| Email `info@mgnhw.com` | [lib/contact.ts](lib/contact.ts) | Not a real inbox. Careers mail goes to `careers@mgnhw.com`, which is real, as is `pressEmail`. |
| Office hours | [lib/contact.ts](lib/contact.ts) | Assumed, not confirmed. |
| LinkedIn & Facebook | [lib/contact.ts](lib/contact.ts) | Blank, so they show as plain text. Add URLs to make them links. |
| **Opening hours on every venue card** | [lib/venueCards.ts](lib/venueCards.ts) | ⚠️ Every venue carries an invented `"12–11"`. No venue's real hours are on file anywhere in this repo. Get the real hours before anything on the site presents them as live data. |
| Mamasons & Bunso photography | [lib/restaurants.ts](lib/restaurants.ts) | `image` points at `-placeholder.jpg` files **which don't exist**. The site is written to skip them rather than show a broken image, so this is invisible today — but adding the files under those exact names turns the photography on everywhere at once. |

---

## 17. Troubleshooting

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
The home page tiles keep their own marketing copy in `DISPLAY` in
[components/home/Discover.tsx](components/home/Discover.tsx), and the carousel
keeps its own in `RestaurantsShowcase.tsx`. See [Restaurants](#4-restaurants).

**A new blog post isn't at the top.**
Check `date` is in `YYYY-MM-DD` form. `"01-08-2026"` sorts as if it were the year 1.

**A post I wrote isn't on the site at all.**
Three things to check, in order: the filename does not start with `_` (that means
draft), it ends in `.md`, and it is inside `content/posts/`.

**`content/posts/....md: category must be one of feature, review, news, inclusion`**
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
Its display name doesn't match between `SLUG_BY_NAME` in `lib/restaurants.ts` and
the carousel's `RESTAURANTS`. Compare the strings character by character —
accents and `&` are the usual culprits.

**A restaurant's menu page 404s.**
Menu pages exist only for venues with `menuPages` in `lib/restaurants.ts`. No
menu pages, no `/menus/<slug>` page.

**Everything looks broken after pulling changes.**
Run `npm install` — someone may have added a dependency.

**Someone says they filled in the contact form but we never got it.**
Expected, occasionally, and not a bug. The form hands a draft to the reader's own email
app; if they never press send there, nothing reaches you and nothing on this site can
know. If it happens often, that is the argument for server-side delivery — see
[section 7](#if-you-ever-want-it-to-send-by-itself).

**The contact form does not open anything when I press the button.**
The reader has no application registered for `mailto:` — common with webmail in a browser
tab. The card that appears after pressing carries the link again and prints the address in
full, so the message can still be copied across. Check the fields are all valid first: an
invalid form reports the problem instead of handing off.

**`npm run build` fails or behaves strangely.**
Check `npm run dev` isn't running in another terminal. They share `.next` and
corrupt each other.
