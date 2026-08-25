/* WHO DIRTIES STYLE DURING A SCROLL — and how much of it changes nothing.

   The companion to probe-rectreads.mjs. Reads are only expensive because
   something dirtied style before them, so this counts the WRITES: every
   inline style mutation during a scroll, attributed to its caller, and
   split into writes that changed the value and writes that re-set the value
   the element already had.

   A REDUNDANT WRITE IS A FREE FIX. It invalidates the element's subtree and
   forces the next read to flush, in exchange for no visual change at all —
   the pan loop in Discover.tsx was doing exactly this on eight cards a
   frame. Anything with a high `same` count here is the same bug again.

   usage: node scripts/probe-stylewrites.mjs [port] [frac]                */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const FRAC = +(process.argv[3] || 0.02);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({
  executablePath: CHROME, headless: "new", protocolTimeout: 600000,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1",
         "--autoplay-policy=no-user-gesture-required"],
});
const page = await b.newPage();
await page.setViewport({ width: 1440, height: 900 });
const cdp = await page.target().createCDPSession();

await page.evaluateOnNewDocument(() => {
  window.__w = new Map();
  window.__on = false;
  const prev = new WeakMap();
  const note = (el, prop, val) => {
    if (!window.__on) return;
    const line = (new Error().stack || "").split("\n")[3] || "?";
    let m = prev.get(el);
    if (!m) { m = new Map(); prev.set(el, m); }
    const same = m.get(prop) === val;
    m.set(prop, val);
    const cls = (el.className || "").toString().slice(0, 30) || el.tagName || "?";
    const k = `${prop.slice(0, 22).padEnd(22)} ${cls.padEnd(30)} ${line.trim().replace(/^at /, "").slice(0, 46)}`;
    const r = window.__w.get(k) || { n: 0, same: 0 };
    r.n++; if (same) r.same++;
    window.__w.set(k, r);
  };
  const sp = CSSStyleDeclaration.prototype.setProperty;
  CSSStyleDeclaration.prototype.setProperty = function (p, v, pr) {
    if (this.parentRule === null && this.__el) note(this.__el, p, String(v));
    return sp.call(this, p, v, pr);
  };
  // CSSStyleDeclaration has no back-pointer to its element; add one lazily
  const styleDesc = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "style");
  Object.defineProperty(HTMLElement.prototype, "style", {
    ...styleDesc,
    get() { const s = styleDesc.get.call(this); try { s.__el = this; } catch {} return s; },
  });
  // direct assignments: el.style.transform = "..."
  for (const p of ["transform", "opacity", "translate", "scale", "clipPath", "filter", "top", "left", "width", "height"]) {
    const d = Object.getOwnPropertyDescriptor(CSSStyleDeclaration.prototype, p);
    if (!d?.set) continue;
    Object.defineProperty(CSSStyleDeclaration.prototype, p, {
      ...d,
      set(v) { if (this.__el) note(this.__el, p, String(v)); return d.set.call(this, v); },
    });
  }
});

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

await page.evaluate(() => { window.__w.clear(); window.__on = true; window.__frames = 0;
  const t = () => { window.__frames++; requestAnimationFrame(t); }; requestAnimationFrame(t); });

for (let i = 0; i < 20; i++) {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 700 + (i % 5) * 7, y: 440 + (i % 3) * 6 });
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseWheel", x: 700, y: 450, deltaX: 0, deltaY: 100 });
  await sleep(60);
}
await sleep(400);

const out = await page.evaluate(() => {
  window.__on = false;
  return { frames: window.__frames, rows: [...window.__w.entries()].sort((a, b) => b[1].n - a[1].n) };
});

const total = out.rows.reduce((s, [, r]) => s + r.n, 0);
const same = out.rows.reduce((s, [, r]) => s + r.same, 0);
console.log(`\nfrac ${FRAC} | ${out.frames} frames | ${total} inline style writes (${(total / out.frames).toFixed(1)}/frame)`);
console.log(`redundant (value unchanged): ${same}  — ${Math.round((same / Math.max(1, total)) * 100)}% of all writes\n`);
console.log(`${"writes".padStart(7)} ${"same".padStart(6)}  ${"/frame".padStart(7)}  property               element                        caller`);
for (const [k, r] of out.rows.slice(0, 22)) {
  console.log(`${String(r.n).padStart(7)} ${String(r.same).padStart(6)}  ${(r.n / out.frames).toFixed(1).padStart(7)}  ${k}`);
}

await b.close();
