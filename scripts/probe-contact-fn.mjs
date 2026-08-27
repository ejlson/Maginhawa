/* ── WHAT THIS PROTECTS: THE ONE PIECE OF THIS SITE THAT RUNS AT REQUEST TIME ──
 *
 * functions/api/contact.ts runs on the host, not in the Next build, so
 * `npm run build` never executes it and no page renders it — it type-checks
 * and is otherwise invisible until a real enquiry hits production. (It is
 * routed by worker/index.ts, named by `main` in wrangler.toml; the
 * functions/ path is a leftover of the Pages convention and routes nothing
 * by itself. Move this file and the compile path below must move too.) This exercises it the only
 * way that is honest without deploying: import the handler, hand it a Request,
 * and stub the EMAIL binding so nothing is actually sent.
 *
 * What it holds down is every branch a reader can land in — an unconfigured
 * deployment, a bot, a half-filled form, a provider outage — plus the two
 * details that matter in the delivered mail: replyTo is the sender's address,
 * and the body is plain text with no markup built from what they typed.
 *
 *   node scripts/probe-contact-fn.mjs
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

/* The source is TypeScript and Node will not import it, so it is compiled by
   the SAME compiler the project type-checks with rather than by a regex that
   strips type annotations. A hand-rolled transform is a second implementation
   of TypeScript that is wrong in ways nobody notices until a test passes
   against code the platform would never have run. */
const out = mkdtempSync(join(tmpdir(), "contact-fn-"));
execFileSync("npx", ["--yes", "tsc", "functions/api/contact.ts",
  "--outDir", out, "--module", "esnext", "--target", "es2022",
  "--moduleResolution", "bundler", "--skipLibCheck"], { stdio: "inherit" });

/* ── THE MAILER IS A BINDING NOW, SO IT IS STUBBED LIKE ONE ──
   This used to override `globalThis.fetch`, because the handler POSTed to
   Resend's REST API. It sends through `env.EMAIL.send()` instead, which is
   a binding the platform injects — so the stub is an object on the env,
   exactly like CONTACT_RATELIMIT below.

   ⚠️ `send` REJECTS ON FAILURE rather than returning a status. That is why
   `stubThrows` throws instead of setting a status code: a stub that resolved
   with an error-shaped object would pass while the real binding threw. */
let sentPayload = null;
let stubThrows = null;
const mailer = {
  send: async (message) => {
    if (stubThrows) throw stubThrows;
    sentPayload = message;
    return { messageId: "stub-message-id" };
  },
};

const { onRequest } = await import(pathToFileURL(join(out, "contact.js")).href);
rmSync(out, { recursive: true, force: true });

const ENV = {
  EMAIL: mailer,
  CONTACT_TO: "info@mgnhw.com",
  CONTACT_FROM: "Maginhawa Group <website@send.maginhawagroup.co.uk>",
};
const OLD = Date.now() - 60_000;
const post = (body, env = ENV) =>
  onRequest({
    env,
    request: new Request("https://x/api/contact", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  });

const good = {
  firstName: "Ada",
  lastName: "Reyes",
  email: "ada@example.com",
  message: "Do you take a table of eight on a Sunday?",
  startedAt: OLD,
};

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  (ok ? pass++ : fail++);
  console.log(`${ok ? "  ok  " : "FAIL  "}${name}${ok || !detail ? "" : "  → " + detail}`);
};

// 1 — a wrong method
const g = await onRequest({ env: ENV, request: new Request("https://x/api/contact") });
check("GET is refused with 405", g.status === 405);

// 2 — an unconfigured deployment blames itself, and invites a retry
const un = await post(good, {});
check("missing config → 503 retry:true", un.status === 503 && (await un.json()).retry === true);

// 3 — the happy path
sentPayload = null;
const okRes = await post(good);
const okBody = await okRes.json();
check("valid enquiry → 200 ok:true", okRes.status === 200 && okBody.ok === true);
check("replyTo is the sender, not us", sentPayload?.replyTo === good.email, JSON.stringify(sentPayload?.replyTo));
check("to is the configured destination", sentPayload?.to === ENV.CONTACT_TO, JSON.stringify(sentPayload?.to));
check("from is the verified sender", sentPayload?.from === ENV.CONTACT_FROM);
check("body is plain text only", !!sentPayload?.text && sentPayload.html === undefined);
check("the message survives intact", sentPayload?.text.includes(good.message));

// 4 — the honeypot: accepted to the caller, never delivered
sentPayload = null;
const bot = await post({ ...good, company: "Acme SEO" });
check("honeypot → 200 and nothing sent", bot.status === 200 && sentPayload === null);

// 5 — too fast to have been typed
sentPayload = null;
const fast = await post({ ...good, startedAt: Date.now() });
check("sub-3s submission → dropped silently", fast.status === 200 && sentPayload === null);

// 6 — a missing stamp must NOT cost a real enquiry
sentPayload = null;
const nostamp = await post({ ...good, startedAt: undefined });
check("no timestamp → still delivered", sentPayload !== null);

// 7 — validation, server-side
for (const [name, body] of [
  ["no name", { ...good, firstName: "" }],
  ["no message", { ...good, message: "" }],
  ["malformed email", { ...good, email: "ada@" }],
]) {
  const r = await post(body);
  check(`${name} → 400 retry:false`, r.status === 400 && (await r.json()).retry === false);
}

// 8 — a mononym is a name
sentPayload = null;
await post({ ...good, lastName: "" });
check("mononym is accepted", sentPayload !== null && sentPayload.subject.endsWith("Ada"));

// 9 — the sending binding falls over. E_SENDER_NOT_VERIFIED is the real one
//     this will hit: it is what an un-onboarded sending domain throws.
stubThrows = Object.assign(new Error("Please verify your sender domain first"), {
  code: "E_SENDER_NOT_VERIFIED",
});
const bad = await post(good);
const badBody = await bad.json();
check("send failure → 502 retry:true", bad.status === 502 && badBody.retry === true);
check("the platform's reason is not leaked to the browser",
  !JSON.stringify(badBody).includes("verify") && !JSON.stringify(badBody).includes("E_SENDER"));
stubThrows = null;

// 10 — an oversized message is truncated, not rejected
sentPayload = null;
await post({ ...good, message: "x".repeat(9000) });
/* the longest run, not the first: "ada@example.com" sits above the message in
   the body and contains an x of its own, which the first match would find */
const longestX = Math.max(...(sentPayload?.text.match(/x+/g) ?? [""]).map((m) => m.length));
check("9000-char message is clamped to 5000", longestX === 5000, `longest run ${longestX}`);

/* ── 11-16, THE THROTTLE ───────────────────────────────────────────────────
   The limiter is a binding, so it is stubbed the same way the mailer is: the
   handler cannot tell this from the platform's, which is what makes these
   cases worth anything. `asked` records the key so the IP-header case can
   assert on WHICH identity was counted, not merely that counting happened. */
let asked = null;
const limiter = (verdict) => ({
  limit: async ({ key }) => {
    asked = key;
    if (verdict === "throw") throw new Error("limiter unavailable");
    return { success: verdict };
  },
});
const withIp = (env, ip, body = good) =>
  onRequest({
    env,
    request: new Request("https://x/api/contact", {
      method: "POST",
      body: JSON.stringify(body),
      headers: ip ? { "CF-Connecting-IP": ip } : {},
    }),
  });

// 11 — over the limit: refused, and nothing reaches the provider
sentPayload = null;
asked = null;
const over = await withIp({ ...ENV, CONTACT_RATELIMIT: limiter(false) }, "203.0.113.9");
const overBody = await over.json();
check("over the limit → 429", over.status === 429, `got ${over.status}`);
check("429 carries retry:true (client shows the email fallback)", overBody.retry === true);
check("429 sets Retry-After", over.headers.get("retry-after") === "60", over.headers.get("retry-after"));
check("nothing is sent when throttled", sentPayload === null);

// 12 — the key is the address Cloudflare sets, and it is per-caller
check("keyed on CF-Connecting-IP", asked === "contact:203.0.113.9", String(asked));

// 13 — ⚠️ the forgeable header must NOT be what we count. A limiter keyed on
//      X-Forwarded-For is defeated by typing a different one each request.
asked = null;
await onRequest({
  env: { ...ENV, CONTACT_RATELIMIT: limiter(true) },
  request: new Request("https://x/api/contact", {
    method: "POST",
    body: JSON.stringify(good),
    headers: { "X-Forwarded-For": "198.51.100.7" },
  }),
});
check("X-Forwarded-For is ignored", asked === "contact:unknown", String(asked));

// 14 — under the limit: business as usual
sentPayload = null;
const under = await withIp({ ...ENV, CONTACT_RATELIMIT: limiter(true) }, "203.0.113.9");
check("under the limit → delivered", under.status === 200 && sentPayload !== null);

// 15 — NO BINDING IS NOT AN OUTAGE. A deployment that cannot throttle still
//      sends every real enquiry; only a deployment that cannot SEND says 503.
sentPayload = null;
const unbound = await withIp(ENV, "203.0.113.9");
check("no binding → still delivered (fails open)", unbound.status === 200 && sentPayload !== null);

// 16 — and neither is a limiter that falls over
sentPayload = null;
const broken = await withIp({ ...ENV, CONTACT_RATELIMIT: limiter("throw") }, "203.0.113.9");
check("limiter throwing → still delivered", broken.status === 200 && sentPayload !== null);

// 17 — ⚠️ THE ORDERING CLAIM, ASSERTED. The throttle is documented as running
//      ahead of request.json(); an unparseable body proves it. If the parse
//      came first this would be 400 ("could not be read"), and a flood would
//      still be buying our JSON parser.
const garbage = await onRequest({
  env: { ...ENV, CONTACT_RATELIMIT: limiter(false) },
  request: new Request("https://x/api/contact", {
    method: "POST",
    body: "{not json",
    headers: { "CF-Connecting-IP": "203.0.113.9" },
  }),
});
check("throttle precedes the body parse", garbage.status === 429, `got ${garbage.status}`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
