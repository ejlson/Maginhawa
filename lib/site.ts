/* THE ORIGIN THIS SITE CALLS HOME — one copy, and that is the point.
 *
 * ── WHY THIS FILE EXISTS ──
 * This constant was declared FIVE times, each with its own literal:
 * app/layout.tsx, app/about/page.tsx, app/careers/page.tsx,
 * app/contact/page.tsx and lib/jsonld.tsx. It is emitted as
 * `metadataBase`, as `rel="canonical"`, as `og:url`, and as every JSON-LD
 * `@id` and `url` on the site — so all five have to agree or a page
 * contradicts its own structured data, and nothing in the build would say
 * so. Five spellings of one fact are five facts that will disagree; the
 * same argument lib/venueCards.ts makes about the venue records.
 *
 * ⚠️ THIS IS A workers.dev SUBDOMAIN, AT THE USER'S INSTRUCTION, and it is
 * a deliberate step DOWN from what those five copies said —
 * `https://maginhawa.group`, which has NO DNS RECORD AT ALL. Checked
 * 2026-08-17: no A record, no CNAME, connection refused. A canonical
 * pointing at a host that does not resolve is worse than a plain one — a
 * crawler follows it, fails, and may index nothing at all. This resolves,
 * which is the whole improvement being made here.
 *
 * ⚠️ IT IS NOT A GOOD FOREVER ANSWER, and it should not quietly become
 * one. workers.dev is a deployment hostname rather than a brand, search
 * engines treat it as such, and every canonical the site publishes now
 * names it. The day maginhawa.group (or whatever the real origin turns out
 * to be) is pointed at the Worker, change the ONE line below — that is now
 * the entire migration, which is the other reason this file exists.
 *
 * No trailing slash: every caller composes `${SITE_URL}/path`, and a
 * trailing slash here would produce `//path` in canonicals and @ids.
 */
export const SITE_URL = "https://maginhawa.rough-pine-59be.workers.dev";
