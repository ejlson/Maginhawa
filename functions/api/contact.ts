/* ═══ THE ONE PIECE OF THIS SITE THAT RUNS AT REQUEST TIME ═══
 *
 * POST /api/contact — takes the enquiry form's JSON, checks it, and hands it
 * to Cloudflare's own email-sending binding to deliver. Nothing is stored
 * anywhere, and no third-party service is involved.
 *
 * ── ⚠️ THIS IS NOT A NEXT ROUTE, AND THAT IS THE WHOLE TRICK ──
 * next.config.mjs sets `output: "export"`, which means Next emits a folder of
 * static files and has no request-time anything — a Next route handler here
 * would fail the build outright ("Route handlers cannot be used with output:
 * export"). The host solves it from the other side: it serves the exported
 * `out/` directory AND runs a Worker on the same origin, deployed by the same
 * push. So the static export stays exactly as it is; nothing about the build
 * changes, and this file is run by the host rather than by Next.
 *
 * ── ⚠️ AND IT IS NOT ROUTED BY ITS PATH. READ THIS BEFORE MOVING IT. ──
 * The `functions/api/…` location is the **Cloudflare PAGES** convention,
 * where a top-level functions/ directory is file-routed for you and no entry
 * script exists. This is a **Workers** project (wrangler.toml: `[assets]`,
 * deployed with `wrangler deploy`), and Workers does not read functions/ at
 * all. For roughly two weeks that difference meant this handler was never
 * run by anything: every enquiry POSTed to a URL nothing was listening on,
 * fell through to the static asset server, and came back 405.
 *
 * What routes it now is `worker/index.ts`, named by `main` in wrangler.toml,
 * which imports `onRequest` below and calls it for `/api/contact`. The path
 * of THIS file is therefore just a filename — the import in worker/index.ts
 * is the only thing that connects it to a URL. Move or rename it and update
 * that import (and scripts/probe-contact-fn.mjs, which compiles this path).
 *
 * ── WHY SAME-ORIGIN MATTERS MORE THAN IT LOOKS ──
 * public/_headers sets `form-action 'self'` and a `connect-src` allow-list. A
 * third-party form service would have needed BOTH relaxed, would have held
 * every message a diner ever sent us on someone else's server, and would have
 * had to be named as a processor in the privacy notice. `/api/contact` is
 * this origin, so `connect-src 'self'` already covers it — and since the mail
 * now leaves through the host's own binding rather than a third party's API,
 * NO additional processor is involved at all.
 *
 * ── WHAT HAS TO BE SET FOR THIS TO WORK ──
 * NOTHING. There is no API key and no account. CONTACT_TO, CONTACT_FROM and
 * the [[send_email]] binding are all committed in wrangler.toml, so a fresh
 * deploy is correct with no dashboard step and no secret to rotate.
 *
 * The one thing that is NOT in this repository is DNS: the sending domain has
 * to be onboarded once in the Cloudflare dashboard (Compute → Email Service →
 * Email Sending → Onboard Domain), which writes its own SPF, DKIM, DMARC and
 * bounce-MX records into the zone.
 *
 * And ONE BINDING, which is not an environment variable and is not set on
 * that screen: CONTACT_RATELIMIT, declared in wrangler.toml's [[ratelimits]]
 * block. Unlike the three above, a deployment missing it still sends mail —
 * see the note above the check itself for why that asymmetry is deliberate.
 *
 * ⚠️ CONTACT_FROM MUST BE ON AN ONBOARDED SENDING DOMAIN, and that is a DNS
 * job rather than a code one. An unverified sender does not bounce — the
 * binding throws `E_SENDER_NOT_VERIFIED` and every enquiry fails with a 502
 * from here. It is the single most likely reason this stops working, which is
 * why the catch below logs the platform's error `code` rather than only its
 * message.
 *
 * ⚠️ AND IT IS A SUBDOMAIN ON PURPOSE: send.maginhawagroup.co.uk, not the
 * apex — because of DMARC, and NOT because of SPF. Onboarding writes SPF and
 * DKIM onto `cf-bounce.` hostnames of their own, so the apex SPF record that
 * authorises Microsoft 365, and the apex MX, are both untouched. (An earlier
 * version of this note claimed otherwise. It was wrong.)
 *
 * What onboarding DOES write at the root is `_dmarc.<domain>`, and this zone
 * already carries one: `v=DMARC1; p=reject; adkim=r; aspf=r; rua=…`. One
 * DMARC record per domain, so onboarding the apex overwrites the policy that
 * governs the group's real mail. The subdomain gets `_dmarc.send.…`
 * instead, leaves the apex alone, and still aligns because `adkim=r` is
 * relaxed.
 */

/* Minimal local types. The real ones live in @cloudflare/workers-types, and
   that package is a large dependency to add for four field names in a file
   the Next build only ever type-checks — it never bundles or runs it. */

/* The platform's rate-limit binding, which is a single method. `success` is
   false once the key has spent its allowance for the current period. */
type RateLimit = { limit(input: { key: string }): Promise<{ success: boolean }> };

/* The platform's email-sending binding, declared as `[[send_email]]` in
   wrangler.toml. Only the fields this file actually sets are typed — the
   binding accepts cc, bcc, attachments and headers too. `send` REJECTS on
   failure (it does not return a status), which is why the call sits in a
   try/catch rather than an `if (!ok)`. */
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
  /* OPTIONAL so that a deployment missing the binding answers with the 503
     below rather than a TypeError on `.send` — see the config check. */
  EMAIL?: EmailSender;
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
  const { EMAIL: mailer, CONTACT_TO, CONTACT_FROM } = env;
  if (!mailer || !CONTACT_TO || !CONTACT_FROM) {
    return json(503, {
      error:
        "The contact form is not configured on this deployment. CONTACT_TO, CONTACT_FROM and the [[send_email]] binding all ship in wrangler.toml — a 503 here means the deploy did not pick them up.",
      retry: true,
    });
  }

  /* ── THE THROTTLE, AND IT SITS AHEAD OF EVERY OTHER CHECK ──
     The honeypot and the three-second timer below stop the laziest bots and
     nothing else: both are one line of work to defeat, and neither costs an
     attacker anything to retry. Until this, the only ceiling on how many
     times a stranger could make us send mail was how fast they could type
     `curl` — which is our daily sending quota, our domain's reputation under
     a `p=reject` DMARC policy, and the inbox a real enquiry has to be found
     in.

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
     Unlike the sending binding above, this is not answered with a 503. A
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
     `from` has to be a domain the platform has verified for us, so it cannot
     be the diner's address. `replyTo` is what makes hitting reply in the
     inbox go to the person who actually wrote — without it, every reply
     would come back to our own sending mailbox.

     ⚠️ IT IS `replyTo`, CAMEL-CASE. This was `reply_to` under Resend's REST
     API, and the binding silently ignores an unknown key rather than
     rejecting it — so the snake_case spelling does not fail, it just
     delivers mail nobody can reply to. */
  try {
    await mailer.send({
      from: CONTACT_FROM,
      to: CONTACT_TO,
      replyTo: email,
      subject: `Website enquiry — ${name}`,
      /* PLAIN TEXT, DELIBERATELY, AND `html` IS LEFT UNSET. The body is
         whatever a stranger typed; interpolating it into HTML is how a
         contact form becomes an injection vector against the person reading
         the inbox. Nothing here is parsed as markup. */
      text: [
        `From: ${name} <${email}>`,
        `Sent: ${new Date().toISOString()}`,
        "",
        message,
        "",
        "— sent from the enquiry form on maginhawagroup.co.uk",
      ].join("\n"),
    });
  } catch (err) {
    /* Read the platform's reason into OUR log, never into the response: it
       can quote configuration back at us (an unverified sender domain, a
       destination that is not allowed) and none of that belongs in a
       stranger's browser.

       The `code` is the useful half — E_SENDER_NOT_VERIFIED means the DNS
       for the sending domain is not in place, which is the failure this is
       most likely to hit and is not fixable from here. */
    const code = (err as { code?: string })?.code ?? "unknown";
    console.error(`email send failed [${code}]: ${String(err).slice(0, 500)}`);
    return json(502, {
      error: "We could not send that just now.",
      retry: true,
    });
  }

  return json(200, { ok: true });
}

/* ONE EXPORT, SWITCHING ON THE METHOD. This was written against the Pages
   convention, where `onRequestPost` beside an `onRequest` would also have
   worked because Pages resolves method-specific handlers ahead of the
   catch-all. Under the Workers entry that now routes this file
   (worker/index.ts), no such resolution exists at all — the entry imports
   this ONE name and calls it, so the method switch below is the only thing
   distinguishing a GET from a POST, and the single entry point is now
   required rather than merely tidier.

   The 405 matters: without it a GET to /api/contact falls through to the
   static site and answers with the 404 page, which reads as "the endpoint was
   never deployed" to whoever is checking whether it was. */
export const onRequest = async (ctx: Ctx): Promise<Response> =>
  ctx.request.method === "POST"
    ? handlePost(ctx)
    : json(405, { error: "Send this form with POST.", retry: false });
