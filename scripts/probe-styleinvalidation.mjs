/* WHO IS INVALIDATING STYLE ON EVERY SCROLL FRAME.

   probe-scrolltrace.mjs shows `UpdateLayoutTree` dominating the main
   thread; this names the code that causes it. Chrome's invalidation
   tracking category records, per style recalc, WHICH nodes were dirtied and
   WHY — the changed attribute or property, and the JS stack that changed it.

   Read the `reason` + `nodeName` columns: a selector-part like `style` or
   `class` on `HTML` means a ROOT-LEVEL write, which invalidates every
   element that inherits from it — the whole document, every frame.

   usage: node scripts/probe-styleinvalidation.mjs [port] [throttle] [frac] */
import puppeteer from "puppeteer-core";
import { readFileSync, unlinkSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const THROTTLE = +(process.argv[3] || 4);
const FRAC = +(process.argv[4] || 0.02);
const TRACE = "/tmp/maginhawa-invalidation.json";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({
  executablePath: CHROME, headless: "new", protocolTimeout: 600000,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1",
         "--autoplay-policy=no-user-gesture-required"],
});
const page = await b.newPage();
await page.setViewport({ width: 1440, height: 900 });
const cdp = await page.target().createCDPSession();
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle2", timeout: 90000 });
await page.waitForFunction(
  () => !document.body.classList.contains("is-loading") &&
        !document.querySelector('[class*="Loader_overlay__"]'),
  { timeout: 45000 },
).catch(() => console.warn("! loader gate timed out"));
await sleep(1200);
await page.evaluate(() => window.__lenis?.scrollTo(document.body.scrollHeight, { immediate: true }));
await sleep(1500);
await page.evaluate((f) => window.__lenis?.scrollTo(document.body.scrollHeight * f, { immediate: true }), FRAC);
await sleep(1200);

if (THROTTLE > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: THROTTLE });
await sleep(600);

await page.tracing.start({
  path: TRACE,
  categories: [
    "devtools.timeline",
    "disabled-by-default-devtools.timeline",
    "disabled-by-default-devtools.timeline.invalidationTracking",
    "disabled-by-default-devtools.timeline.stack",
  ],
});

for (let i = 0; i < 20; i++) {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 700 + (i % 5) * 7, y: 440 + (i % 3) * 6 });
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseWheel", x: 700, y: 450, deltaX: 0, deltaY: 100 });
  await sleep(60);
}
await sleep(500);
await page.tracing.stop();

const ev = JSON.parse(readFileSync(TRACE, "utf8")).traceEvents;

const inval = ev.filter((e) =>
  e.name === "ScheduleStyleInvalidationTracking" ||
  e.name === "StyleRecalcInvalidationTracking" ||
  e.name === "StyleInvalidatorInvalidationTracking",
);

console.log(`\nfrac ${FRAC} | throttle ${THROTTLE}x | invalidation records: ${inval.length}\n`);

const key = new Map();
for (const e of inval) {
  const d = e.args?.data || {};
  const k = `${d.nodeName || "?"} · ${d.reason || d.invalidatedSelectorId || e.name} · ${d.changedAttribute || d.changedClass || d.changedId || ""}`;
  if (!key.has(k)) key.set(k, { n: 0, stacks: new Map() });
  const rec = key.get(k);
  rec.n++;
  const f = d.stackTrace?.[0];
  if (f) {
    const s = `${(f.url || "").split("/").pop()}:${f.lineNumber}:${f.functionName || "(anon)"}`;
    rec.stacks.set(s, (rec.stacks.get(s) || 0) + 1);
  }
}

console.log("style invalidations, most frequent first:");
[...key.entries()]
  .sort((a, b) => b[1].n - a[1].n)
  .slice(0, 20)
  .forEach(([k, rec]) => {
    console.log(`\n  ${String(rec.n).padStart(5)}x  ${k}`);
    [...rec.stacks.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
      .forEach(([s, n]) => console.log(`          from ${s}  (${n}x)`));
  });

/* How wide is each recalc? A recalc that touches thousands of elements is a
   root-level invalidation; one that touches a handful is scoped and fine. */
const recalcs = ev.filter((e) => e.name === "UpdateLayoutTree" && e.ph === "X");
const counts = recalcs.map((e) => e.args?.elementCount || 0).filter((n) => n > 0);
if (counts.length) {
  counts.sort((a, b) => a - b);
  const sum = counts.reduce((s, n) => s + n, 0);
  console.log(`\nUpdateLayoutTree: ${recalcs.length} recalcs, ${sum} elements styled total`);
  console.log(`  elements per recalc — median ${counts[Math.floor(counts.length / 2)]}, max ${counts[counts.length - 1]}`);
}

try { unlinkSync(TRACE); } catch {}
await b.close();
