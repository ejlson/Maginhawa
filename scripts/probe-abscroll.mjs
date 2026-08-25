/* COMPACT A/B: two builds, alternating runs, one region.

   probe-scrollcost.mjs sweeps five regions and six suspects, which is the
   right instrument for FINDING a cost and the wrong one for CONFIRMING a
   fix — it takes minutes per build, so before and after end up minutes and
   one thermal state apart. This alternates two ports run-by-run and prints
   every sample, so the spread is visible rather than hidden in a mean.

   ⚠️ READ THE SPREAD, NOT THE PAIR. Frame-drop ratios on this page move
   several points between identical runs (see [[reference-probe-run-variance]]).
   A difference smaller than the within-build spread is not a result.

   usage: node scripts/probe-abscroll.mjs <portA> <portB> [reps] [throttle] [frac] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const A = process.argv[2], B = process.argv[3];
const REPS = +(process.argv[4] || 3);
const THROTTLE = +(process.argv[5] || 4);
const FRAC = +(process.argv[6] || 0.02);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const sample = async (port) => {
  const b = await puppeteer.launch({
    executablePath: CHROME, headless: "new", protocolTimeout: 600000,
    args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1",
           "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await b.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const cdp = await page.target().createCDPSession();
  await page.goto(`http://localhost:${port}/`, { waitUntil: "networkidle2", timeout: 90000 });
  await page.waitForFunction(
    () => !document.body.classList.contains("is-loading") &&
          !document.querySelector('[class*="Loader_overlay__"]'),
    { timeout: 45000 },
  ).catch(() => {});
  await sleep(1000);
  await page.evaluate(() => window.__lenis?.scrollTo(document.body.scrollHeight, { immediate: true }));
  await sleep(1400);
  await page.evaluate((f) => window.__lenis?.scrollTo(document.body.scrollHeight * f, { immediate: true }), FRAC);
  await sleep(1000);
  if (THROTTLE > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: THROTTLE });
  await sleep(500);

  await page.evaluate(() => {
    window.__f = []; let l = performance.now();
    const t = (x) => { window.__f.push(x - l); l = x; window.__raf = requestAnimationFrame(t); };
    window.__raf = requestAnimationFrame(t);
  });
  for (let i = 0; i < 22; i++) {
    await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 700 + (i % 5) * 7, y: 440 + (i % 3) * 6 });
    await cdp.send("Input.dispatchMouseEvent", { type: "mouseWheel", x: 700, y: 450, deltaX: 0, deltaY: 100 });
    await sleep(60);
  }
  await sleep(400);
  const f = await page.evaluate(() => { cancelAnimationFrame(window.__raf); return window.__f.slice(1); });
  await b.close();
  const s = [...f].sort((x, y) => x - y);
  return {
    frames: f.length,
    p50: s[Math.floor(f.length * 0.5)] || 0,
    p95: s[Math.floor(f.length * 0.95)] || 0,
    pct: Math.round((f.filter((d) => d > 16.7).length / f.length) * 100),
  };
};

const res = { A: [], B: [] };
for (let i = 0; i < REPS; i++) {
  for (const [k, port] of [["A", A], ["B", B]]) {
    const r = await sample(port);
    res[k].push(r);
    console.log(`${k}(${port}) run${i + 1}  frames ${String(r.frames).padStart(4)}  p50 ${r.p50.toFixed(1).padStart(5)}ms  p95 ${r.p95.toFixed(1).padStart(6)}ms  >16.7ms ${String(r.pct).padStart(3)}%`);
  }
}
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
console.log(`\n${"".padEnd(10)} frames(med)  p50(med)  drop%(med)   drop% spread`);
for (const k of ["A", "B"]) {
  const pcts = res[k].map((r) => r.pct);
  console.log(`${k}(${k === "A" ? A : B})   ${String(med(res[k].map((r) => r.frames))).padStart(7)}  ${med(res[k].map((r) => r.p50)).toFixed(1).padStart(7)}ms  ${String(med(pcts)).padStart(8)}%   ${Math.min(...pcts)}–${Math.max(...pcts)}%`);
}
