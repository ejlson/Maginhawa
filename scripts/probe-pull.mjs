/* Does the plate read as PULLED OPEN by the words?

   The claim under test is arithmetic, not aesthetic: the plate's scale is a
   pure function of the split's progress, so the two can never drift. So the
   probe reads BOTH off the real DOM every frame — the words' actual
   translateX (progress = x / clearance) and the pull layer's actual matrix
   scale — and checks three things:

     1. they START on the same frame (no plate before the words move, no
        words moving with no plate)
     2. they LAND on the same frame, at exactly the resting size
     3. the scale at every sampled frame equals the curve the code claims,
        seed + (1 - seed) * progress^bias, to within a rounding error
     4. THE PLATE NEVER TOUCHES A WORD. Box against box, every frame of the
        split, both sides. This is the check that should have existed from
        the start: the ratio test above passed at 0.70 of the gap on a frame
        where the plate was drawn straight across the "R", because a width
        ratio cannot see position. The gap between two words of very
        different widths does not open around the screen's centre — it opens
        around its own, which migrates. Only the boxes know.

   …and it records the rAF deltas across the whole beat, because a pull that
   reads beautifully at 40fps is not a pull that ships.

   The viewport is an argument because the defect this assertion exists to
   catch is a GEOMETRY one: the words' clearances are lopsided by a
   different amount at every width, so a pull that clears the letters at
   1440 proves very little about 1024.

   usage: node scripts/probe-pull.mjs [port] [width] [height] */
import puppeteer from "puppeteer-core";
import { ready, arm, sleep } from "./lib-intro.mjs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3210";
const VW = Number(process.argv[3] || 1440);
const VH = Number(process.argv[4] || 900);

// must track components/Discover.tsx
const PLATE_SEED = 0.12;
const PULL_BIAS = 1.15;
const PLATE_LIT = 0.3;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const page = await browser.newPage();
await page.setViewport({ width: VW, height: VH });

await ready(page, PORT);

// sample the split off the DOM, every frame, for the whole sequence
await page.evaluate(() => {
  const sec = document.querySelector("#restaurants");
  const tx = (el) => {
    const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
    return { x: m.m41, s: m.m11 };
  };
  window.__pull = [];
  let last = performance.now();
  const tick = (t) => {
    const words = [...document.querySelectorAll("[data-intro-word]")];
    const pull = document.querySelector("[data-deck-pull]");
    if (words.length === 2 && pull) {
      const a = tx(words[0]);
      const b = tx(words[1]);
      const p = tx(pull);
      window.__pull.push({
        t: Math.round(t),
        dt: Math.round((t - last) * 100) / 100,
        step: Number(sec?.getAttribute("data-assembly-step") ?? -1),
        // the words' own travel, in px
        lx: Math.round(a.x * 100) / 100,
        rx: Math.round(b.x * 100) / 100,
        // the pull layer's scale and fade
        ps: Math.round(p.s * 10000) / 10000,
        po: Math.round(parseFloat(getComputedStyle(pull).opacity) * 1000) / 1000,
        // what the reader actually sees: the gap the words have opened and
        // the plate's drawn width inside it
        gap: Math.round(
          words[1].getBoundingClientRect().left -
            words[0].getBoundingClientRect().right,
        ),
        pw: Math.round(pull.getBoundingClientRect().width),
        // THE ASSERTION. Positive = the plate is inside a word's box by
        // that many pixels; negative = clear air on both sides.
        intr: (() => {
          const b = pull.getBoundingClientRect();
          const l = words[0].getBoundingClientRect();
          const r = words[1].getBoundingClientRect();
          return Math.round(Math.max(l.right - b.left, b.right - r.left) * 10) / 10;
        })(),
        // THE COUNTERFACTUAL. The same plate, the same size, on the seat's
        // own centre — i.e. exactly what shipped before the pull started
        // riding the gap. Reconstructed by undoing the layer's translate,
        // so it is measured rather than modelled.
        was: (() => {
          const b = pull.getBoundingClientRect();
          const l = words[0].getBoundingClientRect();
          const r = words[1].getBoundingClientRect();
          const dx = p.x;
          return (
            Math.round(
              Math.max(l.right - (b.left - dx), b.right - dx - r.left) * 10,
            ) / 10
          );
        })(),
        // …and which side, so a failure names itself
        side: (() => {
          const b = pull.getBoundingClientRect();
          const l = words[0].getBoundingClientRect();
          const r = words[1].getBoundingClientRect();
          return l.right - b.left > b.right - r.left ? "Our" : "Restaurants.";
        })(),
      });
    } else {
      window.__pull.push({
        t: Math.round(t),
        dt: Math.round((t - last) * 100) / 100,
        step: Number(sec?.getAttribute("data-assembly-step") ?? -1),
      });
    }
    last = t;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

const armed = await arm(page);
console.log(armed ? "armed" : "NEVER ARMED");
await sleep(11000);

const out = await page.evaluate(
  ({ SEED, BIAS, LIT }) => {
    const f = window.__pull.filter((s) => s.lx !== undefined);
    // the parting leg only: from the first frame either word has moved to
    // the frame before the exit begins
    const split = f.filter((s) => s.step >= 0 && s.step <= 2);
    const moved = split.filter((s) => Math.abs(s.lx) > 0.01);
    const firstMove = moved[0];
    const firstGrow = split.find((s) => s.ps > SEED + 0.0005);
    const firstVisible = split.find((s) => s.po > 0.01);
    const last = split[split.length - 1];
    // the clearances, taken from where the words actually came to rest
    const apartL = Math.min(...split.map((s) => s.lx));
    const apartR = Math.max(...split.map((s) => s.rx));
    /* Does the curve hold? Progress from the words, scale from the plate.
       Checked from PLATE_LIT on: below that the clearance CEILING is
       legitimately binding (the hole is still only the word gap), and the
       plate is meant to be under its curve there — that is the whole point
       of the ceiling. Above it the ceiling provably never binds, so any
       deviation would be real drift. */
    const err = [];
    for (const s of moved) {
      const p = Math.min(1, Math.max(0, s.lx / apartL));
      if (p < LIT) continue;
      const want = SEED + (1 - SEED) * Math.pow(p, BIAS);
      err.push({ p: +p.toFixed(4), got: s.ps, want: +want.toFixed(4), d: +(s.ps - want).toFixed(4) });
    }
    // …and how much of the beat the ceiling actually governs
    const capped = moved.filter((s) => {
      const p = Math.min(1, Math.max(0, s.lx / apartL));
      return s.ps < SEED + (1 - SEED) * Math.pow(p, BIAS) - 0.002;
    });
    // a readable strip: the split sampled at even progress
    const strip = [];
    for (const q of [0, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.97, 1]) {
      let best = null;
      for (const s of moved) {
        const p = Math.min(1, Math.max(0, s.lx / apartL));
        if (!best || Math.abs(p - q) < Math.abs(best.p - q)) best = { ...s, p };
      }
      if (best) strip.push({ q, ...best });
    }
    // …and the same beat sampled by the CLOCK, which is how a reader
    // experiences it: the question a progress strip cannot answer is
    // whether the plate is still visibly growing after the words have
    // stopped looking like they are moving.
    const tSplit = moved[0]?.t ?? 0;
    const timed = [];
    for (let ms = 0; ms <= 1700; ms += 100) {
      let best = null;
      for (const s of split) {
        if (!best || Math.abs(s.t - tSplit - ms) < Math.abs(best.t - tSplit - ms))
          best = s;
      }
      if (best) timed.push({ ms, ...best, p: Math.min(1, Math.max(0, best.lx / apartL)) });
    }
    // when does each of them effectively stop? (last frame moving by more
    // than a perceptible amount per 100ms)
    const rate = (key, eps) => {
      let lastMove = 0;
      for (let i = 1; i < split.length; i++) {
        const dtm = split[i].t - split[i - 1].t;
        if (dtm <= 0) continue;
        if ((Math.abs(split[i][key] - split[i - 1][key]) / dtm) * 100 > eps)
          lastMove = split[i].t - tSplit;
      }
      return lastMove;
    };
    const t0 = f[0].t;
    const dts = f.filter((s) => s.step >= 1).map((s) => s.dt).sort((a, b) => a - b);
    const pct = (q) => dts[Math.min(dts.length - 1, Math.floor(dts.length * q))];
    return {
      frames: dts.length,
      p50: pct(0.5),
      p95: pct(0.95),
      p99: pct(0.99),
      max: dts[dts.length - 1],
      over32: dts.filter((d) => d > 32).length,
      over20: dts.filter((d) => d > 20).length,
      firstMoveAt: firstMove ? firstMove.t - t0 : null,
      firstGrowAt: firstGrow ? firstGrow.t - t0 : null,
      firstVisibleAt: firstVisible ? firstVisible.t - t0 : null,
      apartL: +apartL.toFixed(2),
      apartR: +apartR.toFixed(2),
      restScale: last?.ps,
      restOpacity: last?.po,
      restGap: last?.gap,
      restPlateW: last?.pw,
      worstErr: err.reduce((m, e) => (Math.abs(e.d) > Math.abs(m.d) ? e : m), { d: 0 }),
      errFrames: err.length,
      cappedFrames: capped.length,
      cappedTo: capped.length
        ? +Math.max(...capped.map((c) => Math.min(1, Math.max(0, c.lx / apartL)))).toFixed(3)
        : null,
      cappedVisible: capped.filter((c) => c.po > 0.01).length,
      strip,
      // the overlap assertion, over EVERY frame of the split — and again
      // over only the frames the reader can actually see, since a plate at
      // opacity 0 cannot clip anything
      overlap: (() => {
        const worst = (rows) =>
          rows.reduce(
            (m, s) => (s.intr > m.intr ? s : m),
            { intr: -Infinity, p: null, side: null },
          );
        const lit = split.filter((s) => s.po > 0.01);
        const wAll = worst(split);
        const wLit = worst(lit);
        return {
          frames: split.length,
          litFrames: lit.length,
          worstAll: +wAll.intr.toFixed(1),
          worstAllSide: wAll.side,
          worstAllAt: +(wAll.lx / apartL).toFixed(3),
          worstLit: +wLit.intr.toFixed(1),
          worstLitSide: wLit.side,
          worstLitAt: +(wLit.lx / apartL).toFixed(3),
          breaches: split.filter((s) => s.intr > 0).length,
          litBreaches: lit.filter((s) => s.intr > 0).length,
          // the same frames, with the plate back on the seat's centre
          wasWorst: +Math.max(...split.map((s) => s.was)).toFixed(1),
          wasBreaches: split.filter((s) => s.was > 0).length,
          wasLitBreaches: lit.filter((s) => s.was > 0).length,
          wasClearsAt: (() => {
            const bad = split.filter((s) => s.was > 0);
            const lastBad = bad[bad.length - 1];
            return lastBad ? +(lastBad.lx / apartL).toFixed(3) : null;
          })(),
        };
      })(),
      timed,
      // 1px/100ms of word travel and 1px/100ms of plate width — the same
      // perceptual threshold applied to both, so the two numbers compare
      wordsStopAt: rate("rx", 1),
      plateStopsAt: rate("pw", 1),
    };
  },
  { SEED: PLATE_SEED, BIAS: PULL_BIAS, LIT: PLATE_LIT },
);

console.log(`\n══ ${VW}×${VH} ══`);
console.log("\n── the pull, sampled by the split's own progress ──");
console.log(" progress   words x   gap px   plate scale   drawn w   plate/gap   opacity   intrusion");
for (const s of out.strip) {
  console.log(
    `   ${s.p.toFixed(3)}   ${String(s.lx.toFixed(1)).padStart(7)}   ${String(s.gap).padStart(6)}   ${String(s.ps.toFixed(4)).padStart(11)}   ${String(s.pw).padStart(7)}   ${(s.pw / Math.max(1, s.gap)).toFixed(3).padStart(9)}   ${String(s.po.toFixed(3)).padStart(7)}   ${String(s.intr.toFixed(1)).padStart(9)}`,
  );
}

const o = out.overlap;
console.log("\n── OVERLAP, box against box, every frame of the split ──");
console.log(
  `  AFTER,  every frame the reader sees (${o.litFrames}):   worst ${o.worstLit > 0 ? "+" : ""}${o.worstLit}px  (${o.worstLitSide}, at progress ${o.worstLitAt})  breaches ${o.litBreaches}`,
);
console.log(
  `  BEFORE, the same plate on the seat's centre:    worst +${o.wasWorst}px  breaches ${o.wasLitBreaches} visible of ${o.wasBreaches} total, clear only past progress ${o.wasClearsAt}`,
);
/* The all-frames figure includes the PRE-ARM frames: until the line has
   been fitted there is no measured hole to sit in, so the plate parks on
   its seat. Those frames are not merely dark — `pullFade` is identically 0
   while `split` is 0, because PLATE_DAWN is above 0 — so the assertion is
   that no breaching frame is a visible one, which is stronger than a claim
   about opacity numbers that happened to come out small. */
console.log(
  `  (all ${o.frames} frames incl. pre-arm: worst ${o.worstAll > 0 ? "+" : ""}${o.worstAll}px at progress ${o.worstAllAt}, ${o.breaches} breaching frames, ${o.litBreaches} of them visible)`,
);
console.log(
  o.worstLit <= 0 && o.litBreaches === 0
    ? "  PASS — on every frame the reader can see, the plate never reaches either word"
    : `  FAIL — the plate is inside ${o.worstLitSide} by ${o.worstLit}px while visible`,
);
console.log("\n── the same beat on the clock ──");
console.log("   t+ms   progress   gap px   plate drawn   plate/gap");
for (const s of out.timed) {
  console.log(
    `  ${String(s.ms).padStart(5)}      ${s.p.toFixed(3)}   ${String(s.gap).padStart(6)}   ${String(s.pw).padStart(11)}   ${(s.pw / Math.max(1, s.gap)).toFixed(3)}`,
  );
}
console.log(
  "words visibly stop at +" + out.wordsStopAt + "ms | plate visibly stops at +" + out.plateStopsAt + "ms (both at 1px/100ms)",
);

console.log("\nstart together:  words move at +" + out.firstMoveAt + "ms | plate grows at +" + out.firstGrowAt + "ms | plate visible at +" + out.firstVisibleAt + "ms");
console.log("rest:            splitL " + out.apartL + "px, splitR " + out.apartR + "px | plate scale " + out.restScale + ", opacity " + out.restOpacity);
console.log("resting geometry: gap " + out.restGap + "px, plate drawn " + out.restPlateW + "px");
console.log(
  "curve error (measured scale vs seed+(1-seed)·p^bias, over the " +
    out.errFrames +
    " frames past PLATE_LIT where the ceiling provably cannot bind): worst " +
    JSON.stringify(out.worstErr),
);
console.log(
  "clearance ceiling governed " +
    out.cappedFrames +
    " frames, up to progress " +
    out.cappedTo +
    " — " +
    out.cappedVisible +
    " of them visible",
);
console.log("\nframes " + out.frames + " | p50 " + out.p50 + "ms  p95 " + out.p95 + "ms  p99 " + out.p99 + "ms  max " + out.max + "ms | >20ms " + out.over20 + " | >32ms " + out.over32);

await browser.close();
