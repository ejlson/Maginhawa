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
 * ── IT WAS A workers.dev SUBDOMAIN UNTIL 2026-08-19, AND THAT WAS A BUG ──
 * The previous value here was `https://maginhawa.rough-pine-59be.workers.dev`,
 * a deployment hostname, adopted as a step up from `https://maginhawa.group`
 * — which had no DNS record at all (checked 2026-08-17: no A, no CNAME,
 * connection refused). Resolving beat not resolving, so it shipped, with a
 * note that it was not a forever answer.
 *
 * ⚠️ WHAT MADE IT URGENT RATHER THAN UNTIDY: BOTH HOSTNAMES SERVE THE SITE.
 * Measured 2026-08-19 — `www.maginhawagroup.co.uk` returns 200 and
 * `maginhawa.rough-pine-59be.workers.dev` returns 200, with identical
 * content and no redirect between them. That is duplicate content across two
 * origins, and the canonical is the tie-breaker a crawler uses to pick the
 * survivor. Pointing it at workers.dev was actively nominating the throwaway
 * hostname as the real one, on every page, in `og:url`, in `twitter:image`
 * and in every JSON-LD `@id` the site publishes.
 *
 * ⚠️ IT IS `www`, NOT THE APEX, AND THAT IS NOT A STYLE CHOICE.
 * `maginhawagroup.co.uk` DOES NOT RESOLVE — same check, same day: the host
 * does not exist. A canonical naming it would be the maginhawa.group problem
 * over again. If the apex is ever pointed at the Worker and made to redirect
 * to `www`, this line stays as it is; if the apex is ever made the primary,
 * this line changes and nothing else does.
 *
 * ── THE REMAINING HALF OF THE JOB IS NOT IN THIS REPOSITORY ──
 * A canonical is a hint, not an enforcement. As long as the workers.dev
 * hostname answers 200 it can still be crawled and linked. Closing that means
 * a redirect from `*.workers.dev` to `www.maginhawagroup.co.uk`, which is a
 * Cloudflare dashboard setting (or `workers_dev = false` in wrangler.toml),
 * not a line of code here.
 *
 * ⚠️ ONE COPY OF THIS HOSTNAME IS NOT IMPORTABLE, AND IT IS public/llms.txt.
 * That file is served verbatim out of `public/` — it is read by assistants,
 * not compiled — so it cannot read this constant and spells every URL by
 * hand. It is therefore the ONE place this fact still exists twice, and the
 * exception to everything above. If this line ever changes, grep
 * `public/llms.txt` and change it there too; nothing in the build will tell
 * you. (app/sitemap.ts and app/robots.ts DO import this, so they need no
 * such warning.)
 *
 * No trailing slash: every caller composes `${SITE_URL}/path`, and a
 * trailing slash here would produce `//path` in canonicals and @ids.
 */
export const SITE_URL = "https://www.maginhawagroup.co.uk";
