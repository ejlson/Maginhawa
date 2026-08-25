/* WHAT IS ACTUALLY ON THE MAIN THREAD DURING A SCROLL.

   probe-scrollcost.mjs says WHETHER frames are late; this says WHY. It
   records a real Chrome trace across a wheel scroll and adds up main-thread
   time by event name, so the answer is read off a measurement rather than
   inferred by elimination.

   Runs at a CPU throttle by default. The dev machine is a 120Hz Apple
   laptop that hides costs a visitor's machine will not — an unthrottled
   run flatters every suspect equally and changes their ORDER.

   usage: node scripts/probe-scrolltrace.mjs [port] [throttle] [frac]     */
import puppeteer from "puppeteer-core";
import { readFileSync, unlinkSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const THROTTLE = +(process.argv[3] || 4);
const FRAC = +(process.argv[4] || 0.02);
const TRACE = "/tmp/maginhawa-scroll-trace.json";

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
  categories: ["devtools.timeline", "blink.user_timing", "disabled-by-default-devtools.timeline"],
});

for (let i = 0; i < 26; i++) {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 700 + (i % 5) * 7, y: 440 + (i % 3) * 6 });
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseWheel", x: 700, y: 450, deltaX: 0, deltaY: 100 });
  await sleep(60);
}
await sleep(600);
await page.tracing.stop();

const ev = JSON.parse(readFileSync(TRACE, "utf8")).traceEvents;

/* Self time by event name on the renderer main thread. Complete ("X")
   events nest, so subtract each event's direct children to avoid counting
   a parent's duration again inside every child. */
const main = ev
  .filter((e) => e.ph === "X" && e.dur > 0 && e.tid !== undefined)
  .sort((a, b) => a.ts - b.ts || b.dur - a.dur);

const byTid = new Map();
for (const e of main) {
  if (!byTid.has(e.tid)) byTid.set(e.tid, []);
  byTid.get(e.tid).push(e);
}
// the busiest thread across these categories is the renderer main thread
let best = null;
for (const [tid, list] of byTid) {
  const total = list.reduce((s, e) => s + e.dur, 0);
  if (!best || total > best.total) best = { tid, list, total };
}

const self = new Map();
const stack = [];
for (const e of best.list) {
  while (stack.length && stack[stack.length - 1].end <= e.ts) stack.pop();
  const end = e.ts + e.dur;
  if (stack.length) stack[stack.length - 1].childDur += e.dur;
  stack.push({ end, childDur: 0, name: e.name, dur: e.dur });
}
// re-walk to collect, since the stack pops lose entries
const nodes = [];
const st2 = [];
for (const e of best.list) {
  while (st2.length && st2[st2.length - 1].end <= e.ts) nodes.push(st2.pop());
  const n = { end: e.ts + e.dur, childDur: 0, name: e.name, dur: e.dur };
  if (st2.length) st2[st2.length - 1].childDur += e.dur;
  st2.push(n);
}
while (st2.length) nodes.push(st2.pop());
for (const n of nodes) {
  const s = Math.max(0, n.dur - n.childDur);
  self.set(n.name, (self.get(n.name) || 0) + s);
}

const span = (best.list[best.list.length - 1].ts + best.list[best.list.length - 1].dur - best.list[0].ts) / 1000;
console.log(`\nfrac ${FRAC} | CPU throttle ${THROTTLE}x | window ${span.toFixed(0)}ms\n`);
console.log("main-thread SELF time by event:");
[...self.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 18)
  .forEach(([name, us]) => {
    const ms = us / 1000;
    console.log(`  ${name.padEnd(34)} ${ms.toFixed(1).padStart(8)}ms  ${((ms / span) * 100).toFixed(1).padStart(5)}% of window`);
  });

/* Long frames, and what dominated each one. */
const longTasks = nodes.filter((n) => n.name === "RunTask" && n.dur > 16700);
console.log(`\nRunTasks over 16.7ms: ${longTasks.length}`);

try { unlinkSync(TRACE); } catch {}
await b.close();
