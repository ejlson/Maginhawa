/* About story DECK — geometry measurement, screenshots and frame timings.
   Replaces scripts/compare-unveil.mjs, whose unveil.fr half is dead: the
   reference for this section is no longer unveil's diagonal ribbon but a
   vertical stacked deck, and there is no live site to diff against.

   What went in its place is better than a side-by-side anyway. The deck's
   geometry is DERIVED (see the header in About.module.css), so it can be
   checked rather than eyeballed: getBoundingClientRect() on a card returns
   the axis-aligned box of its PROJECTED quad, which for a rotateX card is
   exactly the width of its widest scanline (the top edge) and its full
   projected height. Comparing consecutive cards' rect.top gives the strip
   series directly. So this script prints the same four numbers that were
   measured off the reference image, read back off the rendered page.

   The frame-timing half is carried over from compare-unveil.mjs verbatim —
   that part was always the useful half.

   usage: node scripts/deck-check.mjs [port] [width] [height]
          (defaults 3100 1440 900; try 1280 860 for the small card) */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const OUT = "/tmp/mgnhw_deck";
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/* The viewport is an argument because the deck has TWO card sizes: 440x560
   above 1320px and 370x471 below it. The mat is a ratio of the card while the
   strip series is not (Sy and Sz do not change at that breakpoint), so clause
   D has much less slack on the small card — 8.5px by derivation against 23.1 —
   and 1440 alone cannot see it. */
const VW = +(process.argv[3] || 1440);
const VH = +(process.argv[4] || 900);

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: [
    "--no-sandbox",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--enable-gpu",
    "--use-gl=angle",
  ],
});

/* Wheel-driven scrub, sampled on rAF. A synthetic scrollTo would miss the
   whole cost being measured — Lenis interpolates toward a target and the
   per-frame work is what that interpolation drives. */
const sampleFrames = async (page, steps, dy, g) => {
  await page.evaluate(() => {
    window.__ts = [];
    window.__stop = false;
    /* the SCROLL POSITION is recorded alongside the timestamp so a long frame
       can be placed. Without it an over-32 is just a number and the obvious
       suspect is whatever was changed last; with it, an outlier landing at
       pin-fraction 0.4 is provably not the entrance (which is finished before
       the pin engages) and one landing above the pin provably is. */
    const tick = (t) => {
      window.__ts.push([t, scrollY]);
      if (!window.__stop) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.mouse.move(VW / 2, VH / 2);
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel({ deltaY: dy });
    /* jiggle the pointer — a still cursor hides the cost of any
       pointermove-driven work, and this page has some */
    await page.mouse.move(VW / 2 + (i % 7) * 12, VH / 2 + (i % 5) * 9);
    await sleep(28);
  }
  return page.evaluate((g) => {
    window.__stop = true;
    const raw = window.__ts;
    /* drop the first handful — the CDP round-trip on the first wheel is not
       the animation's cost */
    const d = [];
    for (let i = 9; i < raw.length; i++)
      d.push({ ms: raw[i][0] - raw[i - 1][0], y: raw[i][1] });
    const s = d.map((x) => x.ms).sort((a, b) => a - b);
    const q = (p) => +s[Math.floor(s.length * p)].toFixed(1);
    return {
      frames: s.length,
      median: q(0.5),
      p90: q(0.9),
      p99: q(0.99),
      worst: +s[s.length - 1].toFixed(1),
      over20: s.filter((x) => x > 20).length,
      over32: s.filter((x) => x > 32).length,
      where: d
        .filter((x) => x.ms > 32)
        .map(
          (x) =>
            `${x.ms.toFixed(0)}ms@pin${((x.y - g.top) / g.travel).toFixed(2)}`,
        ),
    };
  }, g);
};

const o = await b.newPage();
await o.setViewport({ width: VW, height: VH });
await o.goto(`http://localhost:${PORT}/about`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await o
  .waitForFunction(() => !document.body.classList.contains("is-loading"), {
    timeout: 60000,
  })
  .catch(() => {});
await o.evaluate(() => document.fonts.ready);
await sleep(2500);

const geom = await o.evaluate(() => {
  const w = document.querySelector('[class*="railPinWrap"]');
  if (!w) return null;
  const r = w.getBoundingClientRect();
  return { top: r.top + scrollY, height: r.height, vh: innerHeight };
});

if (!geom) {
  console.log("NO DECK IN THE DOM — viewport >= 861x640 and motion allowed?");
  /* the same guarded close as the foot of the file — an `await b.close()` that
     never resolves would hang here too, and this branch never even reaches its
     own process.exit(1) */
  await Promise.race([b.close().catch(() => {}), sleep(3000)]);
  try {
    b.process()?.kill("SIGKILL");
  } catch {}
  process.exit(1);
}

const travel = geom.height - geom.vh;
console.log(
  `railPinWrap top=${Math.round(geom.top)} height=${Math.round(geom.height)} (${(geom.height / geom.vh).toFixed(1)} screens)`,
);

const park = (p) =>
  o.evaluate(
    (y) => window.__lenis?.scrollTo(y, { immediate: true }) ?? scrollTo(0, y),
    geom.top + travel * p,
  );

/* WAIT FOR THE SPRING, don't guess at it. `t` is sprung (RAIL_SPRING), so a
   fixed sleep after parking samples the deck mid-flight and every geometry
   number comes out wrong in a way that looks like a tuning error rather than
   a timing one. Poll until the deck stops moving.

   EVERY CARD, not just the seat one. Watching only cards[0] was a blind spot
   the assembly walked straight into: the entrance is a scalar on each card's
   own j·Sy/j·Sz step, so card 0 — where j = 0 — is stationary for the whole
   of it. A `park()` inside the pin is a TELEPORT, which leaves the entrance
   spring racing 0 -> 1 with nothing for a card-0 watcher to see, and the
   geometry read-out came back mid-assembly (strips 48.6, 44.4, 39.5, 31.2,
   22, ... instead of the true series). Concatenating all nine rects settles on
   whatever is actually still in flight. */
const settle = (timeout = 2500) =>
  o.evaluate(async (ms) => {
    const cards = [...document.querySelectorAll('[class*="railCard"]')];
    const rect = () =>
      cards
        .map((c) => {
          const r = c.getBoundingClientRect();
          return `${r.top.toFixed(2)},${r.left.toFixed(2)},${r.width.toFixed(2)},${r.height.toFixed(2)}`;
        })
        .join("|");
    const t0 = performance.now();
    let last = rect();
    let stable = 0;
    let frames = 0;
    while (performance.now() - t0 < ms) {
      await new Promise((r) => requestAnimationFrame(r));
      frames++;
      const now = rect();
      stable = now === last ? stable + 1 : 0;
      last = now;
      /* WARM-UP BEFORE STABILITY COUNTS. park() returns as soon as Lenis has
         written the scroll position; the scroll event, Motion's re-measure and
         the spring's first frame all land AFTER that. Without the warm-up this
         loop could see four identical frames of a deck that had not started
         moving yet and report it settled — which is exactly how a deck frozen
         mid-assembly was read out as its resting geometry. */
      if (frames >= 8 && stable >= 4) return true;
    }
    return false;
  }, timeout);

/* ---- geometry, read back off the rendered deck at t = 0 ---- */
await park(0.02);
await settle();
await sleep(200);

const measured = await o.evaluate(() => {
  const cards = [...document.querySelectorAll('[class*="railCard"]')];
  const rects = cards.map((c) => c.getBoundingClientRect());
  /* rect for a rotateX quad: width = widest scanline (the top edge, since the
     top leans toward the camera), height = full projected height. */
  const rows = rects.map((r, i) => ({
    i,
    topW: +r.width.toFixed(1),
    projH: +r.height.toFixed(1),
    top: +r.top.toFixed(1),
    op: +getComputedStyle(cards[i]).opacity,
  }));
  const strips = rows
    .slice(1)
    .map((r, i) => +(rows[i].top - r.top).toFixed(1));
  /* The bottom-edge width is not in the rect (the rect is the axis-aligned
     box, i.e. the WIDEST scanline), so project the four corners by hand.

     The full chain is track x item x card and every factor matters. The
     CARD's matrix carries +--rail-z0 (480px), which the track cancels with an
     equal and opposite z — reading the card alone reports the deck as if it
     were 480px nearer the camera, a 1.52x error that still produces a
     plausible-looking trapezoid. The ITEM now carries the upright drop and
     the fly-forward, so leaving it out misplaces every departing card and the
     seat card's own 23.3px. (.railList still carries no transform.)

     THE TAPER IS READ OFF CARD 2, NOT CARD 0. The seat card is upright by
     design now, so its projection is a plain 440x560 rectangle with no taper
     at all — comparing it to the reference trapezoid would report a
     regression that is actually the requested feature. Card 2 is fully
     leaned, so it is where the 36.09 degrees is still checkable. */
  const track = document.querySelector('[class*="railTrack"]');
  const stage = document.querySelector('[class*="railStage"]');
  const P = parseFloat(getComputedStyle(stage).perspective);
  const M = (el) => new DOMMatrix(getComputedStyle(el).transform);
  const quad = (i) => {
    const c = cards[i];
    const m = M(track).multiply(M(c.parentElement)).multiply(M(c));
    const w = c.offsetWidth,
      h = c.offsetHeight;
    const proj = (x, y) => {
      const p = m.transformPoint(new DOMPoint(x, y, 0, 1));
      const s = P / (P - p.z);
      return { x: p.x * s, y: p.y * s };
    };
    const tl = proj(-w / 2, -h / 2),
      tr = proj(w / 2, -h / 2);
    const bl = proj(-w / 2, h / 2),
      br = proj(w / 2, h / 2);
    return {
      topEdge: +(tr.x - tl.x).toFixed(1),
      botEdge: +(br.x - bl.x).toFixed(1),
      projH: +(bl.y - tl.y).toFixed(1),
    };
  };
  return {
    rows,
    strips,
    seat: quad(0),
    leaned: quad(2),
    /* the rake actually applied at each depth, straight off the computed
       custom property — this is what proves the seat is upright and the rest
       are not, rather than inferring it from a projection */
    tilts: cards.map(
      (c) =>
        +parseFloat(
          getComputedStyle(c.parentElement).getPropertyValue("--rail-tilt"),
        ).toFixed(1) || 0,
    ),
    perspective: P,
  };
});

const REF = { topEdge: 513, botEdge: 402, projH: 473, strips: [48, 44, 41, 38] };
console.log("\n=== seat card (upright by design — expect NO taper) ===");
console.log(
  `  top ${measured.seat.topEdge}  bottom ${measured.seat.botEdge}  height ${measured.seat.projH}  taper ${(measured.seat.botEdge / measured.seat.topEdge).toFixed(3)}`,
);

console.log("\n=== card 2, fully leaned (where the reference is checkable) ===");
console.log(
  `  top edge   ${measured.leaned.topEdge}px   bottom ${measured.leaned.botEdge}px   taper ${(measured.leaned.botEdge / measured.leaned.topEdge).toFixed(3)} vs ref ${(REF.botEdge / REF.topEdge).toFixed(3)}`,
);
console.log(`  camera     ${measured.perspective}px`);

console.log("\n=== rake applied per depth (deg) ===");
console.log(`  ${measured.tilts.join(", ")}`);

console.log("\n=== strips above the seat card's top edge ===");
console.log(`  measured  ${measured.strips.join(", ")}`);
console.log(`  reference ${REF.strips.join(", ")}, ...`);

console.log("\n=== per-card projected width / opacity at t=0 ===");
measured.rows.forEach((r) =>
  console.log(
    `  ${r.i}  topW ${String(r.topW).padStart(6)}  projH ${String(r.projH).padStart(6)}  op ${r.op}`,
  ),
);

/* ---- THE CONTRACT, in three halves now.

     A. no card in front of the subject OVERLAPS it on screen;
     B. the subject's own card is OPAQUE;
     C. no card's own plane ever reaches z = perspective, and the subject is
        actually hit-testable.

   (A) IS AN OVERLAP TEST, NOT AN OPACITY TEST, and that change is the whole
   point of the fly-forward. The old build could only satisfy "not in the way"
   by making departed cards invisible, so the check was "is anything in front
   still visible". Now they physically leave, so a departed card is allowed to
   be fully opaque as long as its projected rect has cleared the subject's.
   Testing opacity would now fail a card that is doing exactly the right
   thing. Intersection area is the honest formulation of "in the way".

   (B) was added after (A) passed 61/61 on a build where the subject itself
   was at 53% with two chapters reading through it. A check of a crossfade has
   to assert what the reader is looking AT, not only what is in front of it.

   (C) is here because a forward push is precisely the move that puts an
   element's plane past the camera, at which point Chrome's inverse projection
   collapses and everything behind it silently stops being clickable while
   still rendering perfectly. Rendering cannot catch this; only hit-testing
   can. ---- */
console.log("\n=== contract ===");
let overlapFail = 0;
let dim = 0;
let worstDim = 1;
let worstOverlap = 0;
let maxZ = 0;
let matFail = 0;
let worstMat = Infinity;
const N = 60;
for (let s = 0; s <= N; s++) {
  const p = 0.02 + (s / N) * 0.96;
  await park(p);
  await settle();
  const v = await o.evaluate(() => {
    const cards = [...document.querySelectorAll('[class*="railCard"]')];
    const items = cards.map((c) => c.parentElement);
    const track = document.querySelector('[class*="railTrack"]');
    const stage = document.querySelector('[class*="railStage"]');
    const P = parseFloat(getComputedStyle(stage).perspective);
    const M = (el) => new DOMMatrix(getComputedStyle(el).transform);
    const tm = M(track);

    /* deepest z any corner of any card reaches, in camera space. The full
       chain is track x item x card; .railList carries no transform. */
    let zmax = -Infinity;
    cards.forEach((c, i) => {
      const m = tm.multiply(M(items[i])).multiply(M(c));
      const w = c.offsetWidth,
        h = c.offsetHeight;
      for (const [x, y] of [
        [-w / 2, -h / 2],
        [w / 2, -h / 2],
        [-w / 2, h / 2],
        [w / 2, h / 2],
      ]) {
        const q = m.transformPoint(new DOMPoint(x, y, 0, 1));
        if (q.z > zmax) zmax = q.z;
      }
    });

    const ops = cards.map((c) => +getComputedStyle(c).opacity);
    const rects = cards.map((c) => c.getBoundingClientRect());
    const act = [
      ...document.querySelectorAll("article[class*=railPanel]"),
    ].findIndex((a) => !a.hasAttribute("inert"));

    /* cards with a LOWER index than the subject are nearer the camera */
    const sr = rects[act];
    const area = sr.width * sr.height;
    let worst = 0;
    for (let i = 0; i < act; i++) {
      if (ops[i] <= 0.01) continue;
      const r = rects[i];
      const ow = Math.max(0, Math.min(sr.right, r.right) - Math.max(sr.left, r.left));
      const oh = Math.max(0, Math.min(sr.bottom, r.bottom) - Math.max(sr.top, r.top));
      worst = Math.max(worst, (ow * oh) / area);
    }
    /* (D) THE MAT COVERS. For every card BEHIND the subject, the strip of it
       showing above the card in front must be mat and nothing else — that is
       the entire reason the mat exists, and it is not something the geometry
       header can promise on its own because the mat's height is absolute px
       while the strip series is a function of Sy and Sz.

       THE FOOT IS PROJECTED, NOT READ OFF THE ELEMENT'S RECT, and that change
       is not cosmetic. .railMat is now taller than --rail-mat-h: the first
       76px are the covering requirement and everything below is a masked
       fall-off that fades to nothing. Taking `matEl.getBoundingClientRect()
       .bottom` would therefore report the bottom of a region that is 0%
       opaque there and inflate the slack by ~100px — a check that passes
       because it is measuring the wrong edge is worse than no check.

       So the card-local point (0, -h/2 + matH) is pushed through the same
       track x item x card chain the geometry read-out uses and projected by
       hand. Both edges are still horizontal lines (rotateX only, so a
       constant-y edge sits at a constant z and therefore a constant scale),
       so rect.top remains the honest number for the card in front. */
    /* `t` read straight off the track rather than inferred from `act`: the
       track carries translate3d(0, -t*Sy, t*Sz - Z0), so its z gives the
       fractional seat index exactly. `act` is Math.round(t) and rounding is
       what made the first version of this check wrong — at t = 0.25 it still
       calls card 0 the subject while card 0 is already a quarter of the way
       into its fly-forward. */
    const tNow = (tm.m43 + 480) / 60;
    const matH = parseFloat(
      getComputedStyle(stage).getPropertyValue("--rail-mat-h"),
    );
    /* Projected screen Y of a card-local y, in the STAGE's own projected
       frame (origin at the perspective origin, which is the stage's centre).
       Both operands below are computed this way, so the frame cancels and no
       stage rect is needed — mixing this with a viewport-space rect.top is
       one bug that would make the check silently meaningless.

       THE LAYOUT OFFSET IS ADDED BY HAND, which is the other one. A computed
       `transform` matrix is expressed about the element's transform ORIGIN
       and carries nothing about where `left`/`top` put the element. Inside a
       single card that cancels — which is why the quad() read-out above can
       ignore it — but .railCard's `top` is per-variant (it is what gives the
       size variants a shared projected top edge), so comparing two cards
       without it compares two different origins. It read -3.1px where the
       derivation says +24, and the sign is what gave it away. */
    const projY = (i, yLocal) => {
      const c = cards[i];
      const local = M(c).transformPoint(new DOMPoint(0, yLocal, 0, 1));
      const p = tm.multiply(M(c.parentElement)).transformPoint(
        new DOMPoint(
          c.offsetLeft + c.offsetWidth / 2 + local.x,
          c.offsetTop + c.offsetHeight / 2 + local.y,
          local.z,
          1,
        ),
      );
      return p.y * (P / (P - p.z));
    };
    let matSlack = Infinity;
    for (let i = 1; i < cards.length; i++) {
      /* ONLY where the card in front is still AT OR BEHIND the seat. Once it
         is past (k < 0) it is leaving on purpose and the card behind it is
         being revealed on purpose — that is the swap, not a mat that failed to
         cover. */
      if (i - 1 - tNow < 0) continue;
      const foot = projY(i, -cards[i].offsetHeight / 2 + matH);
      const frontTop = projY(i - 1, -cards[i - 1].offsetHeight / 2);
      matSlack = Math.min(matSlack, foot - frontTop);
    }
    return { act, worst, self: ops[act], zmax, P, matSlack };
  });
  maxZ = Math.max(maxZ, v.zmax);
  if (Number.isFinite(v.matSlack)) {
    worstMat = Math.min(worstMat, v.matSlack);
    if (v.matSlack < 0) {
      matFail++;
      console.log(
        `  D FAIL p=${p.toFixed(3)} photograph showing ${(-v.matSlack).toFixed(1)}px above the card in front`,
      );
    }
  }
  worstOverlap = Math.max(worstOverlap, v.worst);
  /* 1% of the subject's area — below that it is an antialiased edge touching,
     not a card standing in the way. */
  if (v.worst > 0.01) {
    overlapFail++;
    console.log(
      `  A FAIL p=${p.toFixed(3)} subject=${v.act} covered ${(v.worst * 100).toFixed(1)}%`,
    );
  }
  if (v.self < 0.995) {
    dim++;
    worstDim = Math.min(worstDim, v.self);
  }
}
console.log(
  `  A  nothing overlapping the subject  ${overlapFail ? `${overlapFail}/${N + 1} FAIL` : `${N + 1}/${N + 1} clean`}  (worst cover ${(worstOverlap * 100).toFixed(1)}%)`,
);
console.log(
  `  B  subject card opaque              ${dim ? `${dim}/${N + 1} samples dim, worst ${worstDim.toFixed(2)}` : `${N + 1}/${N + 1} clean`}`,
);

/* HIT — the camera-plane assertion, plus a real elementsFromPoint sweep over
   the seat card. z is measured above across the whole scrub INCLUDING the
   exit, which is where the forward push could put it. */
await park(0.02);
await settle();
const hit = await o.evaluate(() => {
  const cards = [...document.querySelectorAll('[class*="railCard"]')];
  const r = cards[0].getBoundingClientRect();
  let ok = 0,
    n = 0;
  for (let i = 1; i <= 9; i++)
    for (let j = 1; j <= 9; j++) {
      const x = r.left + (r.width * i) / 10;
      const y = r.top + (r.height * j) / 10;
      n++;
      if (document.elementsFromPoint(x, y).includes(cards[0])) ok++;
    }
  return { ok, n };
});
const P = 1400;
console.log(
  `  C  camera plane                     max z ${maxZ.toFixed(0)} of ${P}  ${maxZ < P ? "PASS" : "FAIL"}   seat hit-test ${hit.ok}/${hit.n}  ${hit.ok === hit.n ? "PASS" : "FAIL"}`,
);
console.log(
  `  D  every exposed strip is MAT        ${matFail ? `${matFail}/${N + 1} FAIL` : `${N + 1}/${N + 1} clean`}  (tightest slack ${worstMat.toFixed(1)}px)`,
);

/* ---- screenshots ---- */
for (const [n, p] of [
  [0, 0.02],
  [1, 0.16],
  [2, 0.3],
  [3, 0.46],
  [4, 0.52],
  [5, 0.72],
  [6, 0.98],
]) {
  await park(p);
  await settle();
  await sleep(260);
  await o.screenshot({ path: `${OUT}/deck-0${n}.png` });
}

/* ---- frame timings ----
   ENTERED FROM ABOVE, not teleported back to the top of the pin, and the
   difference is not cosmetic. Parking at t=8 (which the screenshot pass ends
   on) and then jumping to t=0 flips NINE cards from opacity 0 to 1 on one
   frame, and Chrome re-rasters nine 440x560 layers to service it: measured,
   that produced a single 33-75ms frame in 3 of 5 runs while the median sat at
   8.3. No reader can do that — the deck is a 7.5-screen pin, so it is always
   entered by scrolling into it from the section above with every card already
   at full opacity and already rasterised. Starting a viewport ABOVE the pin
   measures the scrub instead of measuring a teleport.

   Both directions are sampled. Scrolling back UP is the one real case where
   cards do fade from 0 to 1 under a reader's hand, so if that flip has a cost
   it shows in the second row rather than being hidden by the harness. */
const timings = {};
for (const [label, from, dy] of [
  ["down", geom.top - Math.round(VH * 0.6), 90],
  ["up", geom.top + travel * 0.75, -90],
]) {
  await o.evaluate(
    (y) => window.__lenis?.scrollTo(y, { immediate: true }) ?? scrollTo(0, y),
    from,
  );
  await sleep(1600);
  timings[label] = await sampleFrames(o, 70, dy, { top: geom.top, travel });
}
console.log("\n=== frame timings (prod build, wheel scrub) ===");
for (const [k, v] of Object.entries(timings))
  console.log(`  ${k.padEnd(5)} ${JSON.stringify(v)}`);
const p99 = Math.max(timings.down.p99, timings.up.p99);
const o32 = timings.down.over32 + timings.up.over32;
console.log(
  `\n  AC-6: p99 ${p99} < 20  ${p99 < 20 ? "PASS" : "FAIL"}   over32 ${o32} == 0  ${o32 === 0 ? "PASS" : "FAIL"}`,
);
console.log(`\n  shots -> ${OUT}`);
/* CLOSE, THEN MAKE SURE — the same shutdown probe-frames.mjs carries, and for
   the same reason: `b.close()` waits on the browser process's exit event, and
   a GPU-backed headless Chrome still holding a live rAF loop and a playing
   <video> does not always emit it. This script printed its whole report and
   then hung. Every number is already in this process by now, so a hard kill
   after a short grace period costs nothing. */
const shutdown = async () => {
  const proc = b.process();
  await Promise.race([b.close().catch(() => {}), sleep(3000)]);
  try {
    proc?.kill("SIGKILL");
  } catch {}
  process.exit(0);
};
await shutdown();
