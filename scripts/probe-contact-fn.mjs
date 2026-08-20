/* ── WHAT THIS PROTECTS: THE ONE PIECE OF THIS SITE THAT RUNS AT REQUEST TIME ──
 *
 * functions/api/contact.ts is a Cloudflare Pages Function, so `npm run build`
 * never executes it and no page renders it — it type-checks and is otherwise
 * invisible until a real enquiry hits production. This exercises it the only
 * way that is honest without deploying: import the handler, hand it a Request,
 * and stub `fetch` so nothing reaches Resend and no key is needed.
 *
 * What it holds down is every branch a reader can land in — an unconfigured
 * deployment, a bot, a half-filled form, a provider outage — plus the two
 * details that matter in the delivered mail: reply_to is the sender's address,
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

let sentPayload = null;
let stubStatus = 200;
globalThis.fetch = async (_url, init) => {
  sentPayload = JSON.parse(init.body);
  return { ok: stubStatus < 400, status: stubStatus, text: async () => "stub" };
};

const { onRequest } = await import(pathToFileURL(join(out, "contact.js")).href);
rmSync(out, { recursive: true, force: true });

const ENV = {
  RESEND_API_KEY: "re_test",
  CONTACT_TO: "info@mgnhw.com",
  CONTACT_FROM: "Maginhawa Group <website@mgnhw.com>",
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
check("reply_to is the sender, not us", sentPayload?.reply_to === good.email, JSON.stringify(sentPayload?.reply_to));
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

// 9 — the provider falls over
stubStatus = 422;
const bad = await post(good);
const badBody = await bad.json();
check("provider failure → 502 retry:true", bad.status === 502 && badBody.retry === true);
check("provider's reason is not leaked to the browser", !JSON.stringify(badBody).includes("stub"));
stubStatus = 200;

// 10 — an oversized message is truncated, not rejected
sentPayload = null;
await post({ ...good, message: "x".repeat(9000) });
/* the longest run, not the first: "ada@example.com" sits above the message in
   the body and contains an x of its own, which the first match would find */
const longestX = Math.max(...(sentPayload?.text.match(/x+/g) ?? [""]).map((m) => m.length));
check("9000-char message is clamped to 5000", longestX === 5000, `longest run ${longestX}`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
