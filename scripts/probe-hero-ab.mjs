/* CONTROLLED HERO-REGION SCROLL COST.
   One FRESH PAGE LOAD per sample, variants interleaved round-robin, and the
   control ("none") sampled twice per round at both ends — so warm-up drift
   shows up as a gap between the two controls instead of masquerading as a
   variant's effect. probe-scrollcost.mjs runs every suspect in ONE session
   and its hero numbers fall 41→24→16→11% monotonically, which is the machine
   warming, not five fixes working.

   usage: node probe-hero-ab.mjs [port] [w] [h] [rounds] [throttle]        */
import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3120";
const W = +(process.argv[3] || 1440), H = +(process.argv[4] || 900);
const ROUNDS = +(process.argv[5] || 3);
const THROTTLE = +(process.argv[6] || 1);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CSS = {
  none: "",
  "blur-1band": ".scrollBlur::before, .scrollBlur::after { display: none !important; }",
  "blur-none": ".scrollBlur, .scrollBlur::before, .scrollBlur::after { display: none !important; }",
  "cv-auto": "main .afterHero > * { content-visibility: auto; contain-intrinsic-size: auto 900px; }",
  "below-fold-gone": "main .afterHero { display: none !important; }",
  "video-paused": "",
  none2: "",
};
const VARIANTS = Object.keys(CSS);
const PAUSE_VIDEO = new Set(["video-paused"]);

const b = await puppeteer.launch({
  executablePath: CHROME, headless: "new", protocolTimeout: 600000,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1",
         "--autoplay-policy=no-user-gesture-required"],
});

const sample = async (variant) => {
  const page = await b.newPage();
  await page.setViewport({ width: W, height: H });
  /* short loader path — the intro choreography is 8s of variance that has
     nothing to do with what is being measured after it */
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
  await sleep(1800); // let video decode + lazy media reach steady state

  if (CSS[variant]) await page.evaluate((css) => {
    const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s);
  }, CSS[variant]);
  if (PAUSE_VIDEO.has(variant))
    await page.evaluate(() => document.querySelectorAll("video").forEach((v) => v.pause()));
  await sleep(600);

  await page.evaluate(() => window.__lenis?.scrollTo(0, { immediate: true }));
  await sleep(500);
  await page.evaluate(() => {
    window.__f = []; let l = performance.now();
    const t = (x) => { window.__f.push(x - l); l = x; window.__raf = requestAnimationFrame(t); };
    window.__raf = requestAnimationFrame(t);
  });
  for (let i = 0; i < 26; i++) {
    await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 700 + (i % 5) * 7, y: 440 + (i % 3) * 6 });
    await cdp.send("Input.dispatchMouseEvent", { type: "mouseWheel", x: 700, y: 450, deltaX: 0, deltaY: 100 });
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
  for (const v of VARIANTS) { acc[v].push(await sample(v)); process.stderr.write("."); }
}
process.stderr.write("\n");
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
console.log(`\nHERO REGION — ${W}x${H}, throttle ${THROTTLE}x, ${ROUNDS} fresh loads per variant (median)\n`);
console.log("variant            frames    p50    p95   worst   >16.7ms   >32ms");
for (const v of VARIANTS) {
  const a = acc[v];
  console.log(
    v.padEnd(18) +
    String(med(a.map((x) => x.n))).padStart(6) +
    med(a.map((x) => x.p50)).toFixed(1).padStart(7) +
    med(a.map((x) => x.p95)).toFixed(1).padStart(7) +
    (med(a.map((x) => x.worst)).toFixed(0) + "ms").padStart(8) +
    (med(a.map((x) => x.pct16)).toFixed(0) + "%").padStart(10) +
    (med(a.map((x) => x.pct32)).toFixed(0) + "%").padStart(8));
}
console.log("\n^ 'none' vs 'none2' is the null-change control: their gap is the run-to-run floor.");
await b.close();
