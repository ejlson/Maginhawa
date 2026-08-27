/* WHICH KIND OF WORK DOES THE BELOW-FOLD PAGE COST WHILE THE READER IS ON
   THE HERO?

   Both controlled A/B runs agree on one thing and only one thing: removing
   everything below the first screen takes the hero from ~10% (desktop, 1x)
   / ~20% (390px, 4x) of frames over 16.7ms to ZERO, with p95 collapsing
   17.5 -> 9.2ms. Nothing else measured — the blur bands, the video decode,
   `content-visibility` — cleared its own run-to-run floor.

   `display: none` is a diagnostic, not a fix. To turn it into one you have
   to know WHICH of the three costs it removed:

     paint/composite   the engine drawing chapters nobody can see
     style/layout      the engine recalculating them
     script            framer-motion re-measuring their scroll targets

   Each variant below removes exactly one and leaves the others standing:

     bf-visibility     `visibility: hidden` — layout stays, paint goes. Every
                       offsetTop still answers the same number, so framer is
                       untouched and the DOM box tree is unchanged.
     bf-no-anim        CSS animations and transitions off — the engine still
                       lays the chapters out and still paints them, but
                       nothing below the fold is ticking.
     bf-cached-offset  `offsetTop`/`offsetLeft` memoised on the prototype, so
                       framer's per-scroll-event walk of every registered
                       target's offsetParent chain (~96 reads/scroll event on
                       this page — see probe-rectreads.mjs) costs one read
                       each and forces no layout flush. WRONG for a page that
                       reflows; correct for a 1.6s window that only scrolls.

   Read it as: the variant that lands nearest `below-fold-gone` names the
   cost, and therefore names the fix.

   usage: node scripts/probe-belowfold-mechanism.mjs [port] [w] [h] [rounds] [throttle] */
import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3120";
const W = +(process.argv[3] || 1440), H = +(process.argv[4] || 900);
const ROUNDS = +(process.argv[5] || 3);
const THROTTLE = +(process.argv[6] || 1);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CSS = {
  none: "",
  "bf-visibility": "main .afterHero { visibility: hidden !important; }",
  "bf-no-anim": "main .afterHero *, main .afterHero *::before, main .afterHero *::after " +
                "{ animation: none !important; transition: none !important; }",
  "bf-cached-offset": "",
  "below-fold-gone": "main .afterHero { display: none !important; }",
  none2: "",
};
const VARIANTS = Object.keys(CSS);

const CACHE_OFFSETS = () => {
  const proto = HTMLElement.prototype;
  for (const prop of ["offsetTop", "offsetLeft"]) {
    const d = Object.getOwnPropertyDescriptor(proto, prop);
    const cache = new WeakMap();
    Object.defineProperty(proto, prop, {
      configurable: true,
      get() {
        let v = cache.get(this);
        if (v === undefined) { v = d.get.call(this); cache.set(this, v); }
        return v;
      },
    });
  }
};

const b = await puppeteer.launch({
  executablePath: CHROME, headless: "new", protocolTimeout: 600000,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1",
         "--autoplay-policy=no-user-gesture-required"],
});

const sample = async (variant) => {
  const page = await b.newPage();
  await page.setViewport({ width: W, height: H });
  await page.evaluateOnNewDocument(() => {
    try { sessionStorage.setItem("mgnhw:introSeen", "1"); } catch {}
  });
  const cdp = await page.target().createCDPSession();
  if (THROTTLE > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: THROTTLE });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle2", timeout: 90000 });
  await page.waitForFunction(
    () => !document.body.classList.contains("is-loading") &&
          !document.querySelector('[class*="Loader_overlay__"]'),
    { timeout: 45000, polling: "raf" }).catch(() => {});
  await sleep(1800);

  if (CSS[variant]) await page.evaluate((css) => {
    const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s);
  }, CSS[variant]);
  if (variant === "bf-cached-offset") await page.evaluate(CACHE_OFFSETS);
  await sleep(600);

  await page.evaluate(() => window.__lenis?.scrollTo(0, { immediate: true }));
  await sleep(500);
  await page.evaluate(() => {
    window.__f = []; let l = performance.now();
    const t = (x) => { window.__f.push(x - l); l = x; window.__raf = requestAnimationFrame(t); };
    window.__raf = requestAnimationFrame(t);
  });
  for (let i = 0; i < 26; i++) {
    await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: W * 0.5 + (i % 5) * 7, y: H * 0.5 + (i % 3) * 6 });
    await cdp.send("Input.dispatchMouseEvent", { type: "mouseWheel", x: W * 0.5, y: H * 0.5, deltaX: 0, deltaY: 100 });
    await sleep(60);
  }
  await sleep(500);
  const f = await page.evaluate(() => { cancelAnimationFrame(window.__raf); return window.__f.slice(1); });
  await page.close();
  const s = [...f].sort((a, b) => a - b);
  return { n: f.length, p50: s[Math.floor(f.length * 0.5)] || 0, p95: s[Math.floor(f.length * 0.95)] || 0,
           worst: Math.max(...f), pct16: (f.filter((d) => d > 16.7).length / f.length) * 100,
           pct32: (f.filter((d) => d > 32).length / f.length) * 100 };
};

const acc = Object.fromEntries(VARIANTS.map((v) => [v, []]));
for (let r = 0; r < ROUNDS; r++) {
  /* ⚠️ ORDER REVERSES EVERY OTHER ROUND. At 4x throttle the machine
     degrades measurably WITHIN a round — the mobile run put the two
     identical controls 15 points apart with the later one worse — so a
     fixed order bakes that drift into whichever variant sits late in it. */
  const order = r % 2 ? [...VARIANTS].reverse() : VARIANTS;
  for (const v of order) { acc[v].push(await sample(v)); process.stderr.write("."); }
}
process.stderr.write("\n");
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
console.log(`\nBELOW-FOLD COST MECHANISM — ${W}x${H}, throttle ${THROTTLE}x, ${ROUNDS} fresh loads each (median)\n`);
console.log("variant            frames    p50    p95   worst   >16.7ms   >32ms");
for (const v of VARIANTS) {
  const a = acc[v];
  console.log(v.padEnd(18) + String(med(a.map((x) => x.n))).padStart(6) +
    med(a.map((x) => x.p50)).toFixed(1).padStart(7) + med(a.map((x) => x.p95)).toFixed(1).padStart(7) +
    (med(a.map((x) => x.worst)).toFixed(0) + "ms").padStart(8) +
    (med(a.map((x) => x.pct16)).toFixed(0) + "%").padStart(10) +
    (med(a.map((x) => x.pct32)).toFixed(0) + "%").padStart(8));
}
console.log("\n^ 'none' vs 'none2' is the null-change control: their gap is the run-to-run floor.");
await b.close();
