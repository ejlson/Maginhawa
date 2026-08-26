/* DO THE TWO PICTURE PANELS OPEN WITH THE SAME GESTURE?

   probe-panel-parity.mjs answers WHERE they start. This answers WHAT they
   do once they have — the other half of "the same intro animation", and the
   half a source diff cannot settle, because the two panels are driven by
   different runtimes. About's film is framer writing `--sweep` into an
   inline style every frame from a JS cubic-bezier; the journal's plate is a
   CSS @keyframes interpolating a registered custom property. Identical
   declared numbers do not guarantee identical rendered curves — that is
   exactly the kind of claim that has to be measured on the render.

   So: latch one panel, hold the page still, and sample all three of its
   layers every frame for three seconds. Then do the other, and put the two
   traces side by side.

   THE THREE LAYERS, and each is a separate claim:
     · sweep    the mask's reveal edge, 0 → 100%      (950ms, --ease-state)
     · drift    the counter-scale under it, 1.1 → 1   (1700ms, --ease-drawer)
     · shadow   the card mount, 0 → 1 opacity         (700ms, from 1700ms)

   ⚠️ THE SCROLL IS HELD STILL DURING THE SAMPLE, deliberately. This is not
   how a reader sees it, and it is not meant to be: the arrival probe already
   covers the moving case, and holding still is what isolates the animation
   from the parallax and the drift-away that are also writing transforms on
   these boxes while the page moves.

   usage: node scripts/probe-panel-shape.mjs [port]                       */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || 3100;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* where to report the traces, in ms after the panel first moved. Chosen to
   straddle the three finish lines — 950, 1700, 2400 — so a layer that ran
   long or short shows up as a value that has not arrived or arrived early. */
const MARKS = [0, 150, 300, 475, 700, 950, 1200, 1700, 2100, 2400, 2900];

const PANELS = [
  {
    key: "about",
    sweep: '[class*="AboutSplit_mediaFrame__"]',
    drift: '[class*="AboutSplit_mediaDrift__"]',
    shadow: '[class*="AboutSplit_mediaShadow__"]',
  },
  {
    key: "blog",
    sweep: '[class*="Blog_frontFrame__"]',
    drift: '[class*="Blog_frontPhotoImg__"]',
    shadow: '[class*="Blog_frontShadow__"]',
  },
];

const trace = async (page, panel) =>
  page.evaluate(async (panel, MARKS) => {
    const $ = (s) => document.querySelector(s);
    const sweepEl = $(panel.sweep);
    const driftEl = $(panel.drift);
    const shadowEl = $(panel.shadow);
    if (!sweepEl || !driftEl || !shadowEl) {
      return { error: `sweep:${!!sweepEl} drift:${!!driftEl} shadow:${!!shadowEl}` };
    }

    const readSweep = () =>
      getComputedStyle(sweepEl).getPropertyValue("--sweep").trim();
    /* the drift writes translateY + scale into one transform; the matrix's
       `a` is the horizontal scale and `f` the vertical translate in px */
    const readDrift = () => {
      const m = new DOMMatrixReadOnly(getComputedStyle(driftEl).transform);
      return { scale: +m.a.toFixed(4), y: +m.f.toFixed(1) };
    };
    const readShadow = () => +getComputedStyle(shadowEl).opacity;

    const scrollTo = (y) => {
      const l = window.__lenis;
      if (l) l.scrollTo(y, { immediate: true });
      else window.scrollTo(0, y);
    };

    scrollTo(0);
    await new Promise((r) => setTimeout(r, 900));
    const parked = readSweep();

    /* creep down at a slow, honest speed until this panel's mask moves */
    const end = document.documentElement.scrollHeight - innerHeight;
    const t0 = performance.now();
    let started = 0;
    await new Promise((done) => {
      const step = () => {
        const y = Math.min(end, 500 * ((performance.now() - t0) / 1000));
        scrollTo(y);
        if (readSweep() !== parked) {
          started = performance.now();
          return done();
        }
        if (y >= end) return done();
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    if (!started) return { error: "the mask never moved" };

    /* hold the page and sample every frame */
    const log = [];
    await new Promise((done) => {
      const step = () => {
        const t = performance.now() - started;
        log.push({ t, sweep: readSweep(), ...readDrift(), shadow: readShadow() });
        if (t >= MARKS[MARKS.length - 1] + 120) return done();
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });

    /* nearest sample to each mark */
    return {
      rows: MARKS.map((m) => {
        const s = log.reduce((best, r) =>
          Math.abs(r.t - m) < Math.abs(best.t - m) ? r : best,
        );
        return { mark: m, ...s, t: Math.round(s.t) };
      }),
    };
  }, panel, MARKS);

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  protocolTimeout: 600000,
  args: [
    "--no-sandbox",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--autoplay-policy=no-user-gesture-required",
  ],
});

const got = {};
for (const panel of PANELS) {
  /* ⚠️ A FRESH CONTEXT PER PANEL. Both chapters park themselves finished off
     a sessionStorage key once their picture has opened, so a second pass in
     one context would sample an animation that never ran. */
  const page = await b.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.evaluateOnNewDocument(() => {
    try {
      sessionStorage.clear();
    } catch {}
  });
  await page.goto(`http://localhost:${PORT}/`, {
    waitUntil: "networkidle2",
    timeout: 90000,
  });
  await page
    .waitForFunction(
      () =>
        !document.body.classList.contains("is-loading") &&
        !document.querySelector('[class*="Loader_overlay__"]'),
      { timeout: 45000 },
    )
    .catch(() => console.warn("! loader gate timed out"));
  await sleep(1200);
  got[panel.key] = await trace(page, panel);
  await page.close();
}
await b.close();

const bad = Object.entries(got).filter(([, v]) => v.error);
if (bad.length) {
  bad.forEach(([k, v]) => console.log(`✗ ${k}: ${v.error}`));
  process.exit(1);
}

const pct = (s) => parseFloat(s);
console.log("\n  t(ms)      sweep %            scale             shadow α");
console.log("            about   blog      about    blog      about   blog");
let worstSweep = 0;
let worstScale = 0;
let worstShadow = 0;
for (let i = 0; i < MARKS.length; i++) {
  const a = got.about.rows[i];
  const g = got.blog.rows[i];
  const dS = Math.abs(pct(a.sweep) - pct(g.sweep));
  const dC = Math.abs(a.scale - g.scale);
  const dA = Math.abs(a.shadow - g.shadow);
  worstSweep = Math.max(worstSweep, dS);
  worstScale = Math.max(worstScale, dC);
  worstShadow = Math.max(worstShadow, dA);
  console.log(
    `  ${String(MARKS[i]).padStart(5)}   ` +
      `${pct(a.sweep).toFixed(1).padStart(6)} ${pct(g.sweep).toFixed(1).padStart(6)}   ` +
      `${a.scale.toFixed(3).padStart(7)} ${g.scale.toFixed(3).padStart(7)}   ` +
      `${a.shadow.toFixed(2).padStart(6)} ${g.shadow.toFixed(2).padStart(6)}`,
  );
}
console.log(
  `\n  worst disagreement:  sweep ${worstSweep.toFixed(1)} pts` +
    `   scale ${worstScale.toFixed(4)}   shadow ${worstShadow.toFixed(2)} α`,
);
