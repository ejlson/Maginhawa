/* FORCED SYNCHRONOUS STYLE/LAYOUT — the read-after-write tax.

   `UpdateLayoutTree` dominating the main thread does not by itself say
   whether the work is NORMAL (one recalc at the end of a frame, which every
   page pays) or FORCED (JS read a geometry property after dirtying style, so
   the engine had to recalc mid-frame, once per read).

   The trace tells them apart by NESTING: a forced recalc happens INSIDE a
   `FunctionCall`/`EvaluateScript`; a normal one is a sibling of it, under
   the frame's own task. This adds both up and prints the ratio, with the JS
   stack that triggered the forced ones.

   Anything above a few percent forced is a read/write interleave worth
   fixing — see the pan loop in components/Discover.tsx.

   usage: node scripts/probe-forcedlayout.mjs [port] [throttle] [frac]    */
import puppeteer from "puppeteer-core";
import { readFileSync, unlinkSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const THROTTLE = +(process.argv[3] || 4);
const FRAC = +(process.argv[4] || 0.02);
const TRACE = "/tmp/maginhawa-forced.json";

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
  categories: ["devtools.timeline", "disabled-by-default-devtools.timeline",
               "disabled-by-default-devtools.timeline.stack"],
});
for (let i = 0; i < 22; i++) {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 700 + (i % 5) * 7, y: 440 + (i % 3) * 6 });
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseWheel", x: 700, y: 450, deltaX: 0, deltaY: 100 });
  await sleep(60);
}
await sleep(500);
await page.tracing.stop();

const ev = JSON.parse(readFileSync(TRACE, "utf8")).traceEvents;
const X = ev.filter((e) => e.ph === "X" && e.dur > 0).sort((a, b) => a.ts - b.ts || b.dur - a.dur);

const JS = new Set(["FunctionCall", "EvaluateScript", "v8.callFunction", "V8.CallFunction", "RunMicrotasks"]);
const RECALC = new Set(["UpdateLayoutTree", "Layout"]);

let forced = 0, normal = 0;
const blame = new Map();
const stack = [];
for (const e of X) {
  while (stack.length && stack[stack.length - 1].end <= e.ts) stack.pop();
  if (RECALC.has(e.name)) {
    const jsAncestor = [...stack].reverse().find((n) => JS.has(n.name));
    if (jsAncestor) {
      forced += e.dur;
      const f = jsAncestor.frame;
      const k = f ? `${(f.url || "?").split("/").pop()}:${f.lineNumber}:${f.functionName || "(anon)"}` : "(no stack)";
      blame.set(k, (blame.get(k) || 0) + e.dur);
    } else {
      normal += e.dur;
    }
  }
  stack.push({
    end: e.ts + e.dur, name: e.name,
    frame: e.args?.data?.stackTrace?.[0] || e.args?.data,
  });
}

const tot = forced + normal;
console.log(`\nfrac ${FRAC} | throttle ${THROTTLE}x`);
console.log(`\nstyle/layout recalc time:`);
console.log(`  FORCED (inside JS, read-after-write) ${(forced / 1000).toFixed(1).padStart(9)}ms   ${((forced / tot) * 100).toFixed(1)}%`);
console.log(`  normal (end of frame)                ${(normal / 1000).toFixed(1).padStart(9)}ms   ${((normal / tot) * 100).toFixed(1)}%`);
console.log(`\nforced recalcs blamed on:`);
[...blame.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)
  .forEach(([k, us]) => console.log(`  ${(us / 1000).toFixed(1).padStart(8)}ms  ${k}`));

try { unlinkSync(TRACE); } catch {}
await b.close();
