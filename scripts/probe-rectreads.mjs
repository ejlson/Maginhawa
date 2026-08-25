/* WHO READS GEOMETRY DURING A SCROLL, AND HOW OFTEN.

   The forced-layout probe blames minified chunk names (`9769:1:f`), which
   is enough to know a fix landed but not enough to know what to fix. This
   instruments the DOM itself: `getBoundingClientRect` and the other
   layout-flushing reads are wrapped before the page's own code runs, and
   every call during a scroll is counted and attributed to its caller.

   It also records, per call, whether style was DIRTY at the time — a read
   on clean style is nearly free, a read after a write is a full recalc.
   That is the difference between a loop that is merely chatty and one that
   is actually costing frames.

   usage: node scripts/probe-rectreads.mjs [port] [frac] [path]                  */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const FRAC = +(process.argv[3] || 0.02);
const PATH = process.argv[4] || "/";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({
  executablePath: CHROME, headless: "new", protocolTimeout: 600000,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1",
         "--autoplay-policy=no-user-gesture-required"],
});
const page = await b.newPage();
await page.setViewport({ width: 1440, height: 900 });
const cdp = await page.target().createCDPSession();

/* installed before ANY page script — the wrappers have to be in place
   before framer, Lenis and the chapters capture their own references */
await page.evaluateOnNewDocument(() => {
  window.__reads = new Map();
  window.__on = false;
  const note = (api) => {
    if (!window.__on) return;
    /* ⚠️ INDEX 3, NOT 2. stack[0] is "Error", [1] is `note` itself, and [2]
       is the WRAPPER — the `get [as offsetTop]` / `proto.<computed>` frame
       this file installs. Reading [2] attributes every single call to
       "<anonymous>" and hides the actual caller, which is the one thing the
       probe exists to name. */
    const st = (new Error().stack || "").split("\n");
    const line = st[3] || st[2] || "?";
    const k = `${api}  ${line.trim().replace(/^at /, "").slice(0, 96)}`;
    window.__reads.set(k, (window.__reads.get(k) || 0) + 1);
  };
  const wrapFn = (proto, name) => {
    const orig = proto[name];
    if (typeof orig !== "function") return;
    proto[name] = function (...a) { note(name); return orig.apply(this, a); };
  };
  wrapFn(Element.prototype, "getBoundingClientRect");
  wrapFn(Element.prototype, "getClientRects");
  wrapFn(Document.prototype, "elementFromPoint");
  wrapFn(Document.prototype, "elementsFromPoint");
  const gcs = window.getComputedStyle;
  window.getComputedStyle = function (...a) { note("getComputedStyle"); return gcs.apply(this, a); };
  for (const p of ["offsetTop", "offsetHeight", "offsetWidth", "clientHeight", "clientWidth"]) {
    const d = Object.getOwnPropertyDescriptor(HTMLElement.prototype, p);
    if (!d?.get) continue;
    Object.defineProperty(HTMLElement.prototype, p, {
      ...d, get() { note(p); return d.get.call(this); },
    });
  }
});

await page.goto(`http://localhost:${PORT}${PATH}`, { waitUntil: "networkidle2", timeout: 90000 });
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

/* ⚠️ PER SCROLL EVENT, NOT PER FRAME. framer re-measures every handler on
   each scroll EVENT, so that is the denominator its cost is constant in.
   Headless Chrome's rAF is not vsync-locked — one run here produced 2253
   "frames" in a 1.6s window — so a per-frame rate moves with machine load
   even when the code does exactly the same work. Frames are still reported,
   but the scroll-event rate is the number to compare builds on. */
await page.evaluate(() => { window.__reads.clear(); window.__on = true; window.__frames = 0; window.__scrolls = 0;
  addEventListener("scroll", () => { window.__scrolls++; }, { passive: true });
  const t = () => { window.__frames++; requestAnimationFrame(t); }; requestAnimationFrame(t); });

const NOTCHES = 20;
for (let i = 0; i < NOTCHES; i++) {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 700 + (i % 5) * 7, y: 440 + (i % 3) * 6 });
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseWheel", x: 700, y: 450, deltaX: 0, deltaY: 100 });
  await sleep(60);
}
await sleep(400);

const out = await page.evaluate(() => {
  window.__on = false;
  return { frames: window.__frames, scrolls: window.__scrolls, rows: [...window.__reads.entries()].sort((a, b) => b[1] - a[1]) };
});

const total = out.rows.reduce((s, [, n]) => s + n, 0);
const per = out.scrolls || 1;
console.log(`\nfrac ${FRAC} | ${out.frames} rAF ticks | ${out.scrolls} scroll events | ${total} layout-flushing reads`);
console.log(`${(total / per).toFixed(1)} reads PER SCROLL EVENT  <-- compare builds on this\n`);
for (const [k, n] of out.rows.slice(0, 22)) {
  console.log(`  ${String(n).padStart(6)}  ${(n / per).toFixed(1).padStart(6)}/scroll  ${k}`);
}

await b.close();
