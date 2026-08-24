/* ═══ THE ONE PIECE OF THIS SITE THAT RUNS AT REQUEST TIME ═══
 *
 * POST /api/contact — takes the enquiry form's JSON, checks it, and hands it
 * to Resend to deliver as an email. Nothing is stored anywhere.
 *
 * ── ⚠️ THIS IS NOT A NEXT ROUTE, AND THAT IS THE WHOLE TRICK ──
 * next.config.mjs sets `output: "export"`, which means Next emits a folder of
 * static files and has no request-time anything — a Next route handler here
 * would fail the build outright ("Route handlers cannot be used with output:
 * export"). Cloudflare Pages solves it from the other side: it serves the
 * exported `out/` directory AND runs whatever it finds in a top-level
 * `functions/` directory as Workers, on the same origin, deployed by the same
 * push. `functions/api/contact.ts` becomes `POST https://<site>/api/contact`.
 *
 * So the static export stays exactly as it is. Nothing about the build
 * changes; this file is picked up by the host, not by Next.
 *
 * ── WHY SAME-ORIGIN MATTERS MORE THAN IT LOOKS ──
 * public/_headers sets `form-action 'self'` and a `connect-src` allow-list. A
 * third-party form service would have needed BOTH relaxed, would have held
 * every message a diner ever sent us on someone else's server, and would have
 * had to be named as a processor in the privacy notice. `/api/contact` is
 * this origin, so `connect-src 'self'` already covers it and the only
 * processor added is the one that actually delivers the mail.
 *
 * ── WHAT HAS TO BE SET FOR THIS TO WORK ──
 * In the Cloudflare dashboard, Pages → the project → Settings → Environment
 * variables:
 *
 *   RESEND_API_KEY   (secret)  re_xxxxxxxx from resend.com/api-keys
 *   CONTACT_TO       (plain)   where enquiries land, e.g. info@mgnhw.com
 *   CONTACT_FROM     (plain)   the verified sender, e.g. "Maginhawa Group
 *                              <website@mgnhw.com>"
 *
 * And ONE BINDING, which is not an environment variable and is not set on
 * that screen: CONTACT_RATELIMIT, declared in wrangler.toml's [[ratelimits]]
 * block. Unlike the three above, a deployment missing it still sends mail —
 * see the note above the check itself for why that asymmetry is deliberate.
 *
 * ⚠️ CONTACT_FROM MUST BE ON A DOMAIN VERIFIED IN RESEND, and that is a DNS
 * job, not a code one — Resend gives you the records to add. An unverified
 * sender does not bounce, it is REFUSED at the API and every enquiry fails
 * with a 502 from here. It is the single most likely reason this stops
 * working, so the error path below says so in as many words.
 *
 * ⚠️ THESE ARE NOT NEXT_PUBLIC_. They are read here, on the server, and must
 * never be inlined into the browser bundle — the API key especially. This
 * file is never imported by anything under app/ or components/.
 */

/* Minimal local types. The real ones live in @cloudflare/workers-types, and
   that package is a large dependency to add for four field names in a file
   the Next build only ever type-checks — it never bundles or runs it. */

/* The platform's rate-limit binding, which is a single method. `success` is
   false once the key has spent its allowance for the current period. */
type RateLimit = { limit(input: { key: string }): Promise<{ success: boolean }> };

type Env = {
  RESEND_API_KEY?: string;
  CONTACT_TO?: string;
  CONTACT_FROM?: string;
  /* OPTIONAL ON PURPOSE — see the note above the check in handlePost. A
     deployment with no binding sends mail unthrottled rather than not at
     all. */
  CONTACT_RATELIMIT?: RateLimit;
};

type Ctx = { request: Request; env: Env };

/* The reader is told the truth in every branch, so each failure has its own
   sentence rather than one shrugging "something went wrong". `retry` tells
   the CLIENT whether offering the email address as a fallback is the right
   move — it always is, but a validation failure should be fixed in the form
   instead. */
const json = (
  status: number,
  body: Record<string, unknown>,
  /* only the 429 sets anything here (Retry-After); the parameter exists so
     that one branch does not have to hand-build a Response and re-state the
     two headers every other branch gets for free */
  extra?: Record<string, string>,
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      /* the browser must never reuse a submission response */
      "cache-control": "no-store",
      ...extra,
    },
  });

/* ── THE LIMITS ARE HERE AS WELL AS IN THE FORM ──
   The form validates for the reader's benefit; this validates because the
   form's validation is a suggestion. Anything can POST to this URL. */
const MAX = { name: 100, email: 254, message: 5000 } as const;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ⚠️ THIS NUMBER IS NOT THE LIMIT — IT ONLY REPORTS IT. The window and the
   allowance are set in wrangler.toml's [[ratelimits]] block, because the
   counting happens in the platform, not here. This constant exists so the
   429 can put an honest number in `Retry-After`, and it MUST be changed in
   step with `period` there; nothing detects a disagreement. */
const WINDOW_SECONDS = 60;

const clean = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

async function handlePost({ request, env }: Ctx): Promise<Response> {
  /* ── CONFIGURATION IS CHECKED BEFORE THE MESSAGE IS ──
     A missing key is our fault, not the sender's, and it must not read to
     them as "your message was rejected". 503 with `retry: true` puts the
     form into its "we could not send this, here is the address" branch. */
  const { RESEND_API_KEY, CONTACT_TO, CONTACT_FROM } = env;
  if (!RESEND_API_KEY || !CONTACT_TO || !CONTACT_FROM) {
    return json(503, {
      error:
        "The contact form is not configured on this deployment. Set RESEND_API_KEY, CONTACT_TO and CONTACT_FROM in the Pages project.",
      retry: true,
    });
  }

  /* ── THE THROTTLE, AND IT SITS AHEAD OF EVERY OTHER CHECK ──
     The honeypot and the three-second timer below stop the laziest bots and
     nothing else: both are one line of work to defeat, and neither costs an
     attacker anything to retry. Until this, the only ceiling on how many
     times a stranger could make us call Resend was how fast they could type
     `curl` — which is somebody else's quota, our sending reputation, and
     the inbox a real enquiry has to be found in.

     ⚠️ IT RUNS BEFORE `request.json()`, WHICH IS THE POINT OF PUTTING IT
     HERE. A throttled caller must not get us to parse a body first;
     otherwise the cheap half of the flood still costs us the parse.

     ⚠️ `CF-Connecting-IP` IS THE ONLY HEADER HERE THAT CANNOT BE FORGED.
     Cloudflare SETS it at the edge, overwriting whatever the client sent.
     `X-Forwarded-For` is client-supplied and would let one attacker mint a
     fresh identity per request by changing a header — a rate limiter keyed
     on it is worse than none, because it reads as protection. The docs warn
     against keying on IP at all since households share one; that advice is
     for APIs that have a user ID to key on instead, and an anonymous form
     has nothing else. The cost of the shared case is bounded and known: a
     second person behind the same address within the minute is told to
     email us, which the fallback already offers them.

     ── WHY A MISSING BINDING SENDS THE MAIL ANYWAY ──
     Unlike RESEND_API_KEY above, this is not answered with a 503. A
     deployment that cannot send is broken and must say so; a deployment
     that cannot throttle still delivers every real enquiry, and taking the
     form offline over a missing limiter would lose the business the form
     exists for. It is logged rather than silent, so `wrangler tail` says
     plainly that the protection is not there — the failure mode this guards
     against is not "unthrottled", it is "unthrottled and nobody knew".

     The same reasoning covers a limiter that throws: the enquiry goes
     through. A rate limiter outage must not become a contact-form outage. */
  const limiter = env.CONTACT_RATELIMIT;
  if (!limiter) {
    console.error(
      "contact: CONTACT_RATELIMIT is not bound — this deployment accepts enquiries unthrottled. See [[ratelimits]] in wrangler.toml.",
    );
  } else {
    /* An address is missing only for a request that did not come through
       Cloudflare, which in production does not happen. Keying those
       together under one bucket is deliberate: it is a single shared
       allowance for the anomalous case, not a free pass per caller. */
    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    let allowed = true;
    try {
      ({ success: allowed } = await limiter.limit({ key: `contact:${ip}` }));
    } catch (err) {
      console.error(`contact: rate limiter failed, allowing through — ${err}`);
    }
    if (!allowed) {
      /* 429 with `retry: true` lands in the client's fallback branch — see
         the note on `res.status === 400` in components/Contact.tsx — so the
         reader is given the email address rather than sent back to fields
         that were never wrong. `Retry-After` is the machine-readable half
         of the same sentence. */
      return json(
        429,
        {
          error:
            "That is more messages than we can take from one place at once. Please email us instead.",
          retry: true,
        },
        { "retry-after": String(WINDOW_SECONDS) },
      );
    }
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json(400, { error: "That request could not be read.", retry: false });
  }

  /* ── THE HONEYPOT ──
     A field the form renders and hides from people (see the note on
     `.trap` in components/Contact.tsx). A human never fills it; the
     simplest bots fill everything they find.

     ⚠️ IT ANSWERS 200, NOT 400. Telling a bot which check it failed is
     telling it what to change. As far as the caller can see the message was
     accepted; it simply is not sent. */
  if (clean(body.company, 100)) return json(200, { ok: true });

  /* The form stamps the moment it mounted. A submission that arrives less
     than three seconds after the page rendered was not typed by a person.
     A missing or unparseable stamp is NOT treated as a failure — an old
     cached page or a privacy tool could drop it, and a real enquiry must
     never be silently binned for that. */
  const startedAt = Number(body.startedAt);
  if (Number.isFinite(startedAt) && Date.now() - startedAt < 3000) {
    return json(200, { ok: true });
  }

  const firstName = clean(body.firstName, MAX.name);
  const lastName = clean(body.lastName, MAX.name);
  const email = clean(body.email, MAX.email);
  const message = clean(body.message, MAX.message);

  const missing: string[] = [];
  if (!firstName) missing.push("name");
  if (!email || !EMAIL.test(email)) missing.push("email address");
  if (!message) missing.push("message");
  if (missing.length) {
    return json(400, {
      error: `Please check the ${missing.join(", ")} and try again.`,
      retry: false,
    });
  }

  const name = `${firstName} ${lastName}`.trim();

  /* ── THE SENDER IS OURS, THE REPLY-TO IS THEIRS ──
     `from` has to be a domain Resend has verified for us, so it cannot be
     the diner's address. `reply_to` is what makes hitting reply in the inbox
     go to the person who actually wrote — without it, every reply would come
     back to our own sending mailbox. */
  const sent = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: CONTACT_FROM,
      to: [CONTACT_TO],
      reply_to: email,
      subject: `Website enquiry — ${name}`,
      /* PLAIN TEXT, DELIBERATELY. The body is whatever a stranger typed;
         interpolating it into HTML is how a contact form becomes an
         injection vector against the person reading the inbox. Nothing here
         is parsed as markup. */
      text: [
        `From: ${name} <${email}>`,
        `Sent: ${new Date().toISOString()}`,
        "",
        message,
        "",
        "— sent from the enquiry form on maginhawagroup.co.uk",
      ].join("\n"),
    }),
  });

  if (!sent.ok) {
    /* Read the provider's reason into OUR log, never into the response: it
       can quote configuration back at us (an unverified domain, a revoked
       key) and none of that belongs in a stranger's browser. */
    const detail = await sent.text().catch(() => "");
    console.error(`resend ${sent.status}: ${detail.slice(0, 500)}`);
    return json(502, {
      error: "We could not send that just now.",
      retry: true,
    });
  }

  return json(200, { ok: true });
}

/* ONE EXPORT, SWITCHING ON THE METHOD, rather than `onRequestPost` beside an
   `onRequest`. Pages resolves method-specific handlers ahead of the catch-all
   and both shapes work — but "both are exported and one of them is
   unreachable" is a thing every future reader has to verify against the
   platform's docs, and a single entry point cannot be got wrong.

   The 405 matters: without it a GET to /api/contact falls through to the
   static site and answers with the 404 page, which reads as "the endpoint was
   never deployed" to whoever is checking whether it was. */
export const onRequest = async (ctx: Ctx): Promise<Response> =>
  ctx.request.method === "POST"
    ? handlePost(ctx)
    : json(405, { error: "Send this form with POST.", retry: false });
