/* ── WHAT THIS PROTECTS: /blog HAS TO BE IN THE HTML *AND* STILL WORK ──
 *
 * The archive reads its filter and page out of the query string. Doing that
 * with useSearchParams cost the page its HTML twice over: Next skipped
 * prerendering the list entirely (out/blog.html had the nav, the heading, the
 * footer and NOT ONE CARD), and the Suspense boundary the hook requires then
 * parked the whole page in a streamed `<div hidden>`. It now reads the address
 * bar through a useSyncExternalStore store instead — see the banner above
 * BlogIndexInner — so nothing suspends and the file that ships is the page.
 *
 * That rewrite replaced the router, the history handling and the source of
 * every value on screen, which is what these five rows exist to hold down:
 * the default view, paging, filtering, the back button, and a filtered deep
 * link loaded cold. Row 5 is the one that used to throw React #418.
 *
 * Its companion is scripts/probe-nojs.mjs, which checks the same page still
 * READS with scripts off.
 *
 * ⚠️ DO NOT TEST THIS THROUGH THE IN-APP PREVIEW PANE. A hidden pane starves
 * the scheduler, so `router.push` never commits and every one of these rows
 * reads as a dead control — a phantom failure that cost an hour once already.
 * A real headless browser is the only reliable witness.
 *
 *   node scripts/probe-blog-index.mjs                    # dev server on :3000
 *   node scripts/probe-blog-index.mjs http://localhost:3100
 *                                     # ↑ a production export: npm run build
 *                                     #   && npx serve out -l 3100 (clean URLs,
 *                                     #   which python's http.server cannot do)
 */
import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.argv[2] || "http://localhost:3000";

const b = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
const p = await b.newPage();
const errors = [];
p.on("console", m => { if (m.type() === "error") errors.push(m.text().slice(0, 120)); });
p.on("pageerror", e => errors.push("pageerror: " + String(e).slice(0, 120)));
await p.setViewport({ width: 1280, height: 900 });

const read = () => p.evaluate(() => ({
  url: location.pathname + location.search,
  cards: document.querySelectorAll('a[class*=BlogIndex_card]').length,
  featured: !!document.querySelector('[class*=BlogIndex_featured]'),
  active: document.querySelector('[aria-current="page"]')?.textContent.trim() ?? null,
  filter: document.querySelector('button[aria-haspopup]')?.textContent.trim() ?? null,
}));

// 1 — the default view, as served
await p.goto(`${BASE}/blog`, { waitUntil: "domcontentloaded" });
const rawHtml = await p.evaluate(() => document.documentElement.outerHTML.length);
await new Promise(r => setTimeout(r, 2500));
console.log("1 default        ", JSON.stringify(await read()));

// 2 — paginate
await p.evaluate(() => [...document.querySelectorAll('[class*=pagination] button')]
  .find(x => x.textContent.trim() === "02")?.click());
await new Promise(r => setTimeout(r, 2500));
console.log("2 after page 02  ", JSON.stringify(await read()));

// 3 — filter to a room
await p.evaluate(() => document.querySelector('button[aria-haspopup]')?.click());
await new Promise(r => setTimeout(r, 600));
await p.evaluate(() => [...document.querySelectorAll('[role="menuitemradio"]')]
  .find(x => /Belly/.test(x.textContent))?.click());
await new Promise(r => setTimeout(r, 2500));
console.log("3 after filter   ", JSON.stringify(await read()));

// 4 — browser back
await p.goBack({ waitUntil: "domcontentloaded" });
await new Promise(r => setTimeout(r, 2000));
console.log("4 after back     ", JSON.stringify(await read()));

// 5 — a deep link, loaded cold
await p.goto(`${BASE}/blog?restaurant=belly&page=2`, { waitUntil: "domcontentloaded" });
await new Promise(r => setTimeout(r, 2500));
console.log("5 deep link      ", JSON.stringify(await read()));

console.log("console errors   ", errors.length ? errors : "none");
await b.close();
