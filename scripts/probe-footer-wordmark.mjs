/* THE FOOTER WORDMARK'S ENTRANCE, GRADED ON THE THREE THINGS THAT CAN GO
 * WRONG WITH IT.
 *
 *   1. DOES IT FIRE AT ALL. The last version of this element was a <Reveal>,
 *      and Reveal's viewport box excludes the bottom 16% of the screen — the
 *      wordmark lives permanently inside that band, so it never fired and the
 *      mark simply stayed invisible. Nothing in a frame counter shows that;
 *      only reading the clip back at the bottom of the page does. This probe
 *      seats the page at its true end and watches the mask open.
 *   2. IS THE RISE ACTUALLY SHORTER THAN THE MASK. The entrance is a
 *      differential: the window opens across the full height while the type
 *      travels only 30% of it. If both ran the same distance the letters would
 *      sit still under a sliding window — a curtain, not a rise. The probe
 *      reports the two travels separately so the gap between them is a number.
 *   3. DOES IT STAY PUT. `once: true` means leaving and returning must not
 *      replay it. The probe scrolls away, comes back, and re-reads.
 *
 * The reduced-motion pass checks the fade path takes NEITHER the clip nor the
 * transform — a clip opening is still an edge crossing the screen.
 *
 * ⚠️ LENIS OVERRIDES window.scrollTo — drive it through window.__lenis.
 *
 * Usage: node scripts/probe-footer-wordmark.mjs --port 3200
 */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : d;
};
const PORT = arg("port", "3200");
const W = +arg("w", 1440);
const H = +arg("h", 900);
const WATCH = +arg("watch", 1700);

const SEL = 'footer svg[aria-label="Maginhawa"]';

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: false,
  args: ["--no-sandbox", `--window-size=${W},${H + 120}`],
  defaultViewport: null,
});

async function openPage({ reduce = false } = {}) {
  const page = await b.newPage();
  await page.setViewport({ width: W, height: H });
  if (reduce) {
    await page.emulateMediaFeatures([
      { name: "prefers-reduced-motion", value: "reduce" },
    ]);
  }
  /* never networkidle0 — the hero film loops, so the network never goes
     quiet. The loader's body class is the signal. */
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !document.body.classList.contains("is-loading"), {
    timeout: 60000,
  });
  await new Promise((r) => setTimeout(r, 600));
  return page;
}

const seatTo = async (page, y) => {
  await page.evaluate((v) => {
    const l = window.__lenis;
    if (l) l.scrollTo(v, { immediate: true, force: true });
    else window.scrollTo(0, v);
  }, y);
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
};

/* one reading of the entrance, in the units it is authored in: the mask as a
   percentage of the wrapper's own height, the rise as a percentage of the
   svg's. */
const read = (page) =>
  page.evaluate((sel) => {
    const svg = document.querySelector(sel);
    if (!svg) return null;
    const wrap = svg.parentElement;
    const inline = wrap.style.clipPath || "";
    /* COMPUTED, not inline. framer runs clip-path through WAAPI, which moves
       the value off the main thread and leaves element.style holding the
       start value until the animation commits — read inline and every frame
       looks frozen, then snaps. */
    const m = /inset\(\s*([\d.]+)%/.exec(getComputedStyle(wrap).clipPath);
    const h = svg.getBoundingClientRect().height;
    const mat = new DOMMatrixReadOnly(getComputedStyle(svg).transform);
    return {
      maskTop: m ? +m[1] : null, // 100 = shut, 0 = open
      inlineClip: inline || null,
      risePct: h ? (mat.m42 / h) * 100 : null,
      risePx: Math.round(mat.m42 * 10) / 10,
      opacity: +getComputedStyle(wrap).opacity,
      h: Math.round(h),
      top: Math.round(svg.getBoundingClientRect().top),
    };
  }, SEL);

/* sample every frame across the entrance */
const film = (page, ms) =>
  page.evaluate(
    (sel, dur) =>
      new Promise((done) => {
        const svg = document.querySelector(sel);
        const wrap = svg.parentElement;
        const t0 = performance.now();
        const out = [];
        const tick = () => {
          const t = performance.now() - t0;
          const cp = getComputedStyle(wrap).clipPath;
          const m = /inset\(\s*([\d.]+)%/.exec(cp);
          const h = svg.getBoundingClientRect().height;
          const mat = new DOMMatrixReadOnly(getComputedStyle(svg).transform);
          out.push({
            t: Math.round(t),
            mask: m ? +m[1] : cp === "none" ? 0 : null,
            rise: h ? +((mat.m42 / h) * 100).toFixed(2) : null,
            op: +getComputedStyle(wrap).opacity,
          });
          if (t < dur) requestAnimationFrame(tick);
          else done(out);
        };
        requestAnimationFrame(tick);
      }),
    SEL,
    ms,
  );

const pct = (n) => (n === null || n === undefined ? "—" : `${n.toFixed(1)}%`);

// ── ORDINARY MOTION ────────────────────────────────────────────────────────
const page = await openPage();
const docH = await page.evaluate(() => document.documentElement.scrollHeight);

await seatTo(page, 0);
const atTop = await read(page);
console.log("\n── AT THE TOP OF THE PAGE (never seen) ──");
console.log(`  mask ${pct(atTop.maskTop)} shut   rise ${pct(atTop.risePct)}   svg ${atTop.h}px tall`);

/* seat at the true end of the page — where a reader who has scrolled to the
   bottom actually stands */
const filmP = film(page, WATCH);
await seatTo(page, docH);
const frames = await filmP;

const moved = frames.filter((f) => f.mask !== null && f.mask < 99.9);
const settled = frames.find((f) => f.mask !== null && f.mask <= 0.05);
const first = moved[0];
const maxRise = Math.max(...frames.map((f) => f.rise ?? 0));
/* only across the animating window — the still frames either side of it
   would drag the average to nothing, and the frame the latch flips on is a
   trigger, not a jump in the motion */
const steps = [];
const from = frames.indexOf(first);
const to = settled ? frames.indexOf(settled) : frames.length - 1;
for (let i = from + 1; i <= to; i++) {
  if (frames[i].mask !== null && frames[i - 1].mask !== null)
    steps.push(Math.abs(frames[i].mask - frames[i - 1].mask));
}

console.log("\n── THE ENTRANCE ──");
console.log(`  frames sampled     ${frames.length} over ${WATCH}ms`);
console.log(`  fired              ${first ? `yes, at ${first.t}ms` : "NO — mask never opened"}`);
console.log(`  settled            ${settled ? `${settled.t}ms` : "never reached 0%"}`);
console.log(`  mask travel        ${pct(100)} → ${pct(frames.at(-1).mask ?? 0)}`);
console.log(`  rise travel        ${pct(maxRise)} → ${pct(frames.at(-1).rise ?? 0)}  (of the svg's own height)`);
console.log(`  largest frame step ${Math.max(...steps).toFixed(2)}% of the mask`);

console.log("\n  t(ms)   mask open   letters low");
for (const f of frames.filter((_, i) => i % 6 === 0 || i === frames.length - 1)) {
  const open = f.mask === null ? null : 100 - f.mask;
  console.log(
    `  ${String(f.t).padStart(5)}   ${String(open === null ? "—" : open.toFixed(1) + "%").padStart(9)}   ${String(
      f.rise === null ? "—" : f.rise.toFixed(1) + "%",
    ).padStart(11)}`,
  );
}

// ── ONCE ───────────────────────────────────────────────────────────────────
await seatTo(page, Math.round(docH * 0.4));
await new Promise((r) => setTimeout(r, 400));
const away = await read(page);
await seatTo(page, docH);
await new Promise((r) => setTimeout(r, 400));
const back = await read(page);

console.log("\n── LEAVING AND COMING BACK (once: true) ──");
console.log(`  scrolled away   mask ${pct(away.maskTop ?? 0)} shut   rise ${pct(away.risePct)}`);
console.log(`  came back       mask ${pct(back.maskTop ?? 0)} shut   rise ${pct(back.risePct)}`);
console.log(
  `  verdict         ${
    (back.maskTop ?? 0) <= 0.05 && Math.abs(back.risePct ?? 0) < 0.05
      ? "held — no replay"
      : "REPLAYED"
  }`,
);
await page.close();

// ── REDUCED MOTION ─────────────────────────────────────────────────────────
const rPage = await openPage({ reduce: true });
const rDocH = await rPage.evaluate(() => document.documentElement.scrollHeight);
await seatTo(rPage, 0);
const rTop = await read(rPage);
await seatTo(rPage, rDocH);
await new Promise((r) => setTimeout(r, 900));
const rEnd = await read(rPage);

console.log("\n── REDUCED MOTION ──");
console.log(`  at top    opacity ${rTop.opacity}   clip ${rTop.inlineClip ?? "none"}   rise ${rEnd.risePx}px`);
console.log(`  at end    opacity ${rEnd.opacity}   clip ${rEnd.inlineClip ?? "none"}   rise ${rEnd.risePx}px`);
console.log(
  `  verdict   ${
    rEnd.opacity > 0.99 && !rEnd.inlineClip && Math.abs(rEnd.risePx) < 0.5
      ? "fade only — no clip, no travel"
      : "CARRIES MOTION IT SHOULD NOT"
  }\n`,
);
await rPage.close();

await b.close();
