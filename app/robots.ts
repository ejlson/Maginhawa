import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/* ── robots.txt ──
 *
 * Generated, for the same reason the sitemap is: the `Sitemap:` line has to
 * be an ABSOLUTE url, which means naming the host, which means it has to
 * agree with the canonical. See lib/site.ts.
 *
 * ── NOTHING IS DISALLOWED, AND THAT IS THE DECISION ──
 * The obvious candidates are /lab/*, and they are handled by a noindex in
 * app/lab/layout.tsx instead — a Disallow would stop a crawler fetching
 * those pages and therefore stop it ever READING the noindex, which leaves
 * them eligible to be indexed as bare titles. The two directives look
 * interchangeable and are close to opposites; the note in that layout has
 * the full argument.
 *
 * ⚠️ AI CRAWLERS ARE DELIBERATELY NOT BLOCKED — no GPTBot, ClaudeBot,
 * PerplexityBot or CCBot exclusions. It is increasingly common to paste in a
 * block-list without deciding anything, and for THIS site that would be
 * self-harm: a restaurant group's discovery is moving into assistant
 * answers ("where should I eat Filipino food in London?"), and the whole
 * point of the JSON-LD in lib/jsonld.tsx and of public/llms.txt is to be
 * legible to exactly those readers. Blocking them here while publishing
 * llms.txt would be the site arguing with itself.
 *
 * If the group ever DOES want to opt out of AI training specifically, the
 * honest way is a per-agent rule here naming the training crawlers, left
 * separate from the answer-engine crawlers that drive traffic — they are
 * not the same bots and blocking both costs bookings.
 */
/* ⚠️ `force-static` IS REQUIRED HERE, AND ITS ABSENCE FAILS THE BUILD.
   Under `output: "export"` Next 15 refuses to compile a metadata route
   without it, verbatim:

     export const dynamic = "force-static"/export const revalidate not
     configured on route "/robots.txt" with "output: export"

   Metadata routes are compiled as App Route handlers internally, and an
   exported build has no request time for a handler to run at — so Next
   makes you SAY that this one is resolved once, at build. It is not a
   default: this file rendered a 500 in dev and would have taken the
   Cloudflare build down with it, which is the same class of trap the
   `output: "export"` notes in next.config.mjs are about.

   It does not make this a route handler in the sense that config file
   forbids — nothing here touches next/server, and the output is a static
   file in out/. */
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
