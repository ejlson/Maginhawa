/* ═══ THE WORKER ENTRY — WHAT ACTUALLY ANSWERS A REQUEST ═══════════════════
 *
 * ── WHY THIS FILE HAD TO EXIST ──
 * `functions/api/contact.ts` was written as a **Cloudflare Pages Function**:
 * drop a file in a top-level `functions/` directory and Pages routes
 * `functions/api/contact.ts` to `/api/contact` for you, with no entry script
 * anywhere. That is a real and documented convention — for PAGES.
 *
 * This is not a Pages project. wrangler.toml declares `[assets]` and deploys
 * with `wrangler deploy`, which is a **Workers** project, and Workers has no
 * `functions/` routing. It has one entry script, named by `main`, and `main`
 * was absent. So the directory shipped to the host and nothing ever ran it:
 * every enquiry POSTed to a URL no code was listening on, fell through to the
 * static asset server, and came back 405. Measured against production
 * 2026-08-27, `/api/contact` and `/api/definitely-not-real` answered
 * IDENTICALLY — which is the proof, since a live handler would diverge.
 *
 * ⚠️ 405 ON A POST IS NOT EVIDENCE THE HANDLER EXISTS. It is the asset server
 * refusing a non-GET on any path at all. The honest test is the comparison
 * against a made-up path, never the bare status code.
 *
 * This file is the missing `main`. It routes `/api/contact` to the handler
 * that was already written, tested and correct, and hands everything else to
 * the static site.
 *
 * ── THE ROUTING, AND WHY IT IS SPLIT THIS WAY ──
 * `run_worker_first = ["/api/*"]` in wrangler.toml means only /api/* reaches
 * this script first. Every other request is served straight from `out/` by
 * the asset server without invoking a Worker at all — so the 21 pages and all
 * the media keep the exact behaviour they have today, at no added latency,
 * and this script cannot become a new single point of failure for the site.
 *
 * The `run_worker_first` list is what makes /api/contact reliable rather than
 * merely likely. Left to the default (assets first, Worker only on a miss) it
 * would still work today — nothing in `out/` is called /api/contact — but it
 * would be resting on the absence of a file, and `not_found_handling` is
 * evaluated in that same path. Naming the route removes the question.
 *
 * ⚠️ KEEP THE PATTERN AND THE `if` BELOW IN STEP. A route added to
 * wrangler.toml's list but not matched here falls to the 404 at the bottom of
 * this file; a route handled here but absent from the list is served from
 * `out/` instead and never reaches this code. Neither disagreement is
 * detected anywhere.
 */

/* Minimal local types, for the same reason contact.ts carries its own: the
   real ones are in @cloudflare/workers-types, which is a large dependency for
   a handful of field names, and `next build` type-checks this file — every
   TypeScript file is in tsconfig's `include` — without bundling or running
   it. */

/** the platform's rate-limit binding — one method. Restated from contact.ts,
 *  whose copy is not exported; the two must stay structurally identical or
 *  the call below stops type-checking, which is the detection. */
type RateLimit = { limit(input: { key: string }): Promise<{ success: boolean }> };

/** the static-assets binding, declared as `binding = "ASSETS"` under
 *  [assets]. Without the binding key this is undefined at runtime and every
 *  page 500s — see the guard in fetch(). */
type Assets = { fetch(request: Request): Promise<Response> };

/** the email-sending binding, `[[send_email]]` in wrangler.toml. Restated
 *  from contact.ts for the same reason as RateLimit above — its copy is not
 *  exported, and the two must stay structurally identical or the handoff
 *  below stops type-checking. */
type EmailSender = {
  send(message: {
    from: string;
    to: string;
    replyTo?: string;
    subject: string;
    text?: string;
    html?: string;
  }): Promise<{ messageId: string }>;
};

type Env = {
  ASSETS: Assets;
  EMAIL?: EmailSender;
  CONTACT_TO?: string;
  CONTACT_FROM?: string;
  CONTACT_RATELIMIT?: RateLimit;
};

import { onRequest as contact } from "../functions/api/contact";

const handler = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname === "/api/contact") {
      return contact({ request, env });
    }

    /* Anything else under /api/ arrives here only because the
       `run_worker_first` pattern is broader than the routes above. There is
       no asset to fall back to, so answer honestly rather than handing back
       the site's 404 page — a JSON caller should get JSON. */
    if (pathname.startsWith("/api/")) {
      return new Response(
        JSON.stringify({ error: `No endpoint at ${pathname}.` }),
        {
          status: 404,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
          },
        },
      );
    }

    /* ── THE SITE ITSELF ──
       Reached only on an asset miss, since everything outside /api/* is
       asset-first. Handing the request back to the binding is what applies
       `not_found_handling = "404-page"`, so an unknown path still gets
       out/404.html with a real 404 status exactly as it does today. */
    if (!env.ASSETS) {
      /* `binding = "ASSETS"` is missing from [assets]. Nothing else in this
         file can compensate, and a blank page with no explanation is the
         worst version of this failure. */
      return new Response("Static assets binding is not configured.", {
        status: 500,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
    return env.ASSETS.fetch(request);
  },
};

/* The default export is what the Workers runtime looks for; `main` in
   wrangler.toml points at this file and the platform calls `fetch` on
   whatever it finds here. */
export default handler;
