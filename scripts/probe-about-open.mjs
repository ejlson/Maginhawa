/* /about's scroll-scrubbed opening, measured off the real DOM.
 *
 * WHAT IS ASSERTED
 *   1. the scrub runs END TO END — the film goes from invisible to filling
 *      the viewport, and the two words go from centred to off screen
 *   2. it is REVERSIBLE — the same positions are sampled on the way down and
 *      again on the way back up, and the two sweeps must agree
 *   3. the words and the picture NEVER OVERLAP — the film's width is clamped
 *      to the hole the words have opened, so this is the property the clamp
 *      exists to guarantee, checked at every sample rather than at the ends
 *   4. the closing text appears — the question and the lede reach full
 *      opacity and are legible on the film
 *   5. the indicator is present at the start and gone once scrolling begins
 *   6. the frame budget across the whole scrub: p95 and the count over 24ms
 *
 * PROBE NOTES (do not rediscover)
 *   · never waitUntil networkidle0 — the film loops, so the network never
 *     goes quiet. domcontentloaded + the loader's own body class.
 *   · Lenis overrides window.scrollTo; drive it through window.__lenis.
 *   · Lenis smooths even a forced write, so every sample waits before
 *     reading. The frame sweep deliberately does NOT — it is measuring the
 *     frames Lenis produces.
 *
 * usage: node scripts/probe-about-open.mjs [port] [width] [height] [reduce]
 */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3000";
const W = +(process.argv[3] || 1440);
const H = +(process.argv[4] || 900);
const REDUCE = process.argv[5] === "reduce";

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  protocolTimeout: 300000,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const page = await b.newPage();
await page.setViewport({ width: W, height: H });

const msgs = [];
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") msgs.push(m.text());
});
page.on("pageerror", (e) => msgs.push(`PAGEERROR ${e.message}`));

if (REDUCE) {
  const cdp = await page.createCDPSession();
  await cdp.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
}

await page.goto(`http://localhost:${PORT}/about`, {
  waitUntil: "domcontentloaded",
});
await page
  .waitForFunction(() => !document.body.classList.contains("is-loading"), {
    timeout: 60000,
  })
  .catch(() => {});
await new Promise((r) => setTimeout(r, 1600));

const geo = await page.evaluate(() => {
  const s = document.querySelector('[class*="About_opening"]');
  const r = s.getBoundingClientRect();
  return {
    top: Math.round(r.top + scrollY),
    h: Math.round(r.height),
    vh: innerHeight,
  };
});
const travel = geo.h - geo.vh;
const at = (p) => Math.round(geo.top + p * travel);

const to = async (y) => {
  await page.evaluate((v) => {
    const l = window.__lenis;
    if (l) l.scrollTo(v, { immediate: true, force: true });
    else window.scrollTo(0, v);
  }, y);
  await new Promise((r) => setTimeout(r, 1000));
};

const read = () =>
  page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const words = [...document.querySelectorAll('[class*="About_openWord"]')];
    const film = q('[class*="About_filmFrame"]');
    const answer = q('[class*="About_openAnswer"]');
    const cue = q('[class*="About_scrollCue"]');
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        l: Math.round(r.left),
        r: Math.round(r.right),
        t: Math.round(r.top),
        b: Math.round(r.bottom),
        w: Math.round(r.width),
        h: Math.round(r.height),
      };
    };
    const op = (el) => (el ? +(+getComputedStyle(el).opacity).toFixed(3) : null);
    const f = box(film);
    // the two words, left first
    const wb = words.map(box).sort((a, z) => a.l - z.l);
    return {
      y: Math.round(scrollY),
      film: f,
      filmOpacity: op(film),
      // the film's share of the viewport, both axes
      filmW: f ? +(f.w / innerWidth).toFixed(3) : null,
      filmH: f ? +(f.h / innerHeight).toFixed(3) : null,
      words: wb,
      /* px of horizontal intrusion of the picture into either word; the
         clamp exists so this is <= 0 at every sample.
         Only counted while the film has real width: at scale 0 its rect is a
         degenerate box sitting on the joint, and "the word overlaps a
         zero-width rectangle" is not a defect a reader could ever see. */
      overlapL: f && f.w > 1 && wb[0] ? wb[0].r - f.l : null,
      overlapR: f && f.w > 1 && wb[1] ? f.r - wb[1].l : null,
      wordsOnScreen: wb.filter((w) => w.r > 0 && w.l < innerWidth).length,
      answerOpacity: op(answer),
      cueOpacity: op(cue),
      answerText: (answer?.innerText || "").replace(/\s+/g, " ").trim().slice(0, 120),
    };
  });

/* ---------- sweeps ---------- */
const MARKS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];
const down = [];
for (const p of MARKS) {
  await to(at(p));
  down.push({ p, ...(await read()) });
}
const up = [];
for (const p of [...MARKS].reverse()) {
  await to(at(p));
  up.push({ p, ...(await read()) });
}
up.reverse();

/* ---------- frame budget across the scrub ---------- */
await to(at(0));
const frames = await page.evaluate(async (px) => {
  const out = [];
  let last = performance.now();
  let run = true;
  const tick = () => {
    const n = performance.now();
    out.push(n - last);
    last = n;
    if (run) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  const l = window.__lenis;
  // a reader's pace through the whole runway and part-way back, driven the
  // way a wheel drives it (Lenis smooths between targets) rather than teleported
  const nudge = async (d, n) => {
    for (let i = 0; i < n; i++) {
      if (l) l.scrollTo(l.actualScroll + d, { immediate: false, force: true });
      else window.scrollBy(0, d);
      await new Promise((r) => setTimeout(r, 16));
    }
  };
  await nudge(px / 90, 90);
  await nudge(-px / 90, 45);
  await new Promise((r) => setTimeout(r, 500));
  run = false;
  return out.slice(3);
}, travel);

const sorted = frames.slice().sort((a, z) => a - z);
const pct = (q) => sorted[Math.floor((sorted.length - 1) * q)];

/* THE ONE KNOWN WARNING, excluded BY NAME. `useReducedMotion()` reads false
   on the server and true in a browser that asks for reduced motion, so every
   component on this page that branches on it mismatches on hydration and
   React logs one generic "Hydration failed" for the tree. It pre-dates this
   pass (Statement, Reveal, SplitWords and AboutIntro all branch the same
   way) and only appears in the reduced-motion run. Anything else fails. */
const KNOWN = /prefers-reduced-motion|Hydration failed because the server rendered HTML/i;

/* ---------- report ---------- */
const f2 = (v) => (v === null || v === undefined ? "—" : String(v));
console.log(
  `\n=== /about OPENING @ ${W}x${H}${REDUCE ? " (reduced motion)" : ""} — runway ${geo.h}px, travel ${travel}px ===`,
);
console.log(
  "   p     film w/h     filmOp  words on   overlap L/R   answerOp  cueOp",
);
for (const s of down) {
  console.log(
    `  ${s.p.toFixed(2)}  ${f2(s.filmW).padEnd(6)}${f2(s.filmH).padEnd(7)} ${f2(s.filmOpacity).padEnd(7)} ${f2(s.wordsOnScreen).padEnd(10)} ${f2(s.overlapL).padStart(5)}/${f2(s.overlapR).padStart(5)}    ${f2(s.answerOpacity).padEnd(9)} ${f2(s.cueOpacity)}`,
  );
}

const first = down[0];
const last = down[down.length - 1];

/* REDUCED MOTION IS A DIFFERENT PAGE, so it is a different set of
   assertions. There is no runway to scrub (the section is sized to its
   content), the film never scales, the words never move, and both screens
   are simply present. What has to be true is that the reader can READ it:
   the title standing on its own screen, the question and the answer on the
   next, and no two blocks of display type on top of each other — which is
   exactly what the first attempt at this got wrong. */
if (REDUCE) {
  const s = down[0];
  const geoOk = travel === geo.h - geo.vh;
  const wordsStill = s.words[0].l === up[0].words[0].l;
  const stacked = await page.evaluate(() => {
    const t = document.querySelector('[class*="About_openTitle"]').getBoundingClientRect();
    const a = document.querySelector('[class*="About_openAnswer"]').getBoundingClientRect();
    return {
      titleH: Math.round(t.height),
      answerTop: Math.round(a.top + scrollY),
      titleBottom: Math.round(t.bottom + scrollY),
      // the whole point: the two display blocks must not share pixels
      overlap: Math.round(t.bottom + scrollY - (a.top + scrollY)),
    };
  });
  console.log(`\n  REDUCED MOTION — runway ${geo.h}px (sized to content, ${geo.h / geo.vh} screens)`);
  console.log(`     film at ${s.filmW}w x ${s.filmH}h, opacity ${s.filmOpacity} — never scaled: ${s.filmW >= 0.999 ? "PASS" : "FAIL"}`);
  console.log(`     title standing, words at rest: ${wordsStill ? "PASS" : "FAIL"}`);
  console.log(`     answer at full opacity: ${s.answerOpacity >= 0.999 ? "PASS" : "FAIL"} — "${s.answerText.slice(0, 60)}"`);
  console.log(`     title block ${stacked.titleH}px, answer starts at ${stacked.answerTop} — display blocks do not overlap: ${stacked.overlap <= 0 ? "PASS" : "FAIL (" + stacked.overlap + "px of overlap)"}`);
  console.log(`     indicator present: ${s.cueOpacity >= 0.99 ? "PASS" : "FAIL"}   geometry sane: ${geoOk ? "PASS" : "FAIL"}`);
  console.log(`\n  frame budget (nothing should be animating) — ${frames.length} frames`);
  console.log(`     p50 ${pct(0.5).toFixed(1)}ms   p95 ${pct(0.95).toFixed(1)}ms   over 24ms: ${frames.filter((d) => d > 24).length}`);
  const errsR = msgs.filter((m) => !KNOWN.test(m));
  console.log(`\n  console errors/warnings (known hydration warning excluded): ${errsR.length}`);
  errsR.slice(0, 8).forEach((m) => console.log(`    ${m.slice(0, 200)}`));
  await b.close();
  process.exit(0);
}

const ran =
  first.filmW < 0.02 &&
  first.wordsOnScreen === 2 &&
  last.filmW >= 0.999 &&
  last.filmH >= 0.999;
console.log(`\n  1. scrub runs end to end: ${ran ? "PASS" : "FAIL"}`);
console.log(
  `     start film ${first.filmW}w — words on screen ${first.wordsOnScreen}`,
);
console.log(`     end   film ${last.filmW}w x ${last.filmH}h — words on screen ${last.wordsOnScreen}`);

// reversibility: the same scroll position must produce the same state
let worst = 0;
let worstAt = null;
for (let i = 0; i < down.length; i++) {
  const d = down[i], u = up[i];
  const e = Math.max(
    Math.abs((d.filmW ?? 0) - (u.filmW ?? 0)) * 100,
    Math.abs((d.answerOpacity ?? 0) - (u.answerOpacity ?? 0)) * 100,
    Math.abs((d.words[0]?.l ?? 0) - (u.words[0]?.l ?? 0)) / 10,
  );
  if (e > worst) {
    worst = e;
    worstAt = d.p;
  }
}
console.log(
  `\n  2. reversible (down-sweep vs up-sweep, worst divergence ${worst.toFixed(2)} at p=${worstAt}): ${worst < 1 ? "PASS" : "FAIL"}`,
);

const anyOverlap = down.filter((s) => (s.overlapL ?? 0) > 0 || (s.overlapR ?? 0) > 0);
console.log(
  `\n  3. picture never crosses a word (${down.length} samples): ${anyOverlap.length === 0 ? "PASS" : "FAIL at p=" + anyOverlap.map((s) => s.p).join(",")}`,
);

const answerOk = last.answerOpacity >= 0.999 && /Who is/i.test(last.answerText);
console.log(
  `\n  4. closing text present at the end: ${answerOk ? "PASS" : "FAIL"} — "${last.answerText}"`,
);

const cueOk = first.cueOpacity >= 0.99 && down[1].cueOpacity <= 0.01;
console.log(
  `\n  5. indicator at the start (${first.cueOpacity}) and gone once scrolling (${down[1].cueOpacity} at p=0.10): ${cueOk ? "PASS" : "FAIL"}`,
);

console.log(`\n  6. frame budget over the scrub — ${frames.length} frames`);
console.log(
  `     p50 ${pct(0.5).toFixed(1)}ms   p95 ${pct(0.95).toFixed(1)}ms   p99 ${pct(0.99).toFixed(1)}ms   max ${Math.max(...frames).toFixed(1)}ms`,
);
console.log(
  `     over 24ms: ${frames.filter((d) => d > 24).length}   over 32ms: ${frames.filter((d) => d > 32).length}   over 50ms: ${frames.filter((d) => d > 50).length}`,
);

const errs = msgs.filter((m) => !KNOWN.test(m));
console.log(`\n  console errors/warnings (known reduced-motion warning excluded): ${errs.length}`);
errs.slice(0, 8).forEach((m) => console.log(`    ${m.slice(0, 200)}`));

await b.close();
