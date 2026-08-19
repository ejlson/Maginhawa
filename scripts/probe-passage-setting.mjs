/* THE FOUR-ROW PASSAGE SETTING — MEASURED.
 *
 * Independent verification of the re-set <Passage> (four authored nowrap
 * rows, stepped seats closing on the centre, scrub-drawn ring):
 *   1. every row's ink clears the content width at 1920/1440/1280/1024/768/390
 *      with no horizontal overflow (the rows are `nowrap` and CANNOT wrap,
 *      so an overflow would clip invisibly, not break visibly)
 *   2. the seats: A flush right, B pushed in 5.4% left, C pulled in 18%
 *      right, D centred on the same axis as Reservations' heading
 *   3. the ring: radii in px and em, clearance to the caps/descenders/the
 *      word before, against the marked span's measured ink box
 *   4. the scrub: path bbox grows with progress across [MARK_IN, MARK_END],
 *      empty below, full and stable above (verified via getBBox(), which is
 *      reliable where headless rasterisation of a mutated svg is NOT)
 *   5. MARK_IN's derivation: the progress at which "standard."'s topmost ink
 *      clears its mask's clip top (downward entrance — the top arrives
 *      LAST), by bisection, against the analytic u from the measured ascent
 *   6. the per-frame cost of regenerating the outline
 *   7. reduced motion renders the ring complete and still
 *
 * ⚠️ LENIS OVERRIDES window.scrollTo — drive it through window.__lenis.
 * ⚠️ Headless capture does not re-raster an svg mutated after first paint —
 *    measure partials with getBBox(), never with screenshots.
 * usage: node scripts/probe-passage-setting.mjs [port] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "53711";

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  protocolTimeout: 240000,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});

const HELPERS = () => {
  window.__pp = {
    sec: () => document.querySelector('[class*="Passage_section"]'),
    row: (k) => document.querySelector(`[class*="Passage_row${k}"]`),
    path: () => document.querySelector('[class*="Passage_ink__"] path'),
    band() {
      const r = this.sec().getBoundingClientRect();
      return { top: r.top + scrollY, h: r.height, vh: innerHeight };
    },
    yFor(p) {
      const { top, h, vh } = this.band();
      return top - vh + p * (h + vh / 2);
    },
  };
};

const boot = async (page, w, h) => {
  await page.setViewport({ width: w, height: h });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 90000 });
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 900));
};

const seat = async (page, y) => {
  await page.evaluate((v) => {
    const l = window.__lenis;
    if (l) l.scrollTo(v, { immediate: true, force: true });
    else window.scrollTo(0, v);
  }, y);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await new Promise((r) => setTimeout(r, 60));
};
const seatP = async (page, p) => seat(page, await page.evaluate((q) => window.__pp.yFor(q), p));

/* ───────────── 1+2. ROWS AND SEATS AT SIX WIDTHS ───────────── */
const page = await b.newPage();
await page.evaluateOnNewDocument(HELPERS);

const widths = [
  [1920, 1000],
  [1440, 900],
  [1280, 800],
  [1024, 768],
  [768, 900],
  [390, 844],
];

const perWidth = [];
for (const [w, h] of widths) {
  await boot(page, w, h);
  await seatP(page, 1);
  await new Promise((r) => setTimeout(r, 400));
  const m = await page.evaluate(() => {
    const P = window.__pp;
    const sec = P.sec();
    const cs = getComputedStyle(sec);
    const padL = parseFloat(cs.paddingLeft);
    const padR = parseFloat(cs.paddingRight);
    const sr = sec.getBoundingClientRect();
    const content = sr.width - padL - padR;
    const rows = {};
    for (const k of ["A", "B", "C", "D"]) {
      const el = P.row(k);
      const r = el.getBoundingClientRect();
      rows[k] = {
        w: +r.width.toFixed(1),
        left: +(r.left - sr.left).toFixed(1),
        right: +(sr.right - r.right).toFixed(1),
        cx: +((r.left + r.right) / 2 - (sr.left + sr.right) / 2).toFixed(1),
      };
    }
    const resH = document.querySelector('[class*="Reservations"] h2');
    const rh = resH ? resH.getBoundingClientRect() : null;
    return {
      padL, content: +content.toFixed(1),
      fs: parseFloat(getComputedStyle(P.row("C")).fontSize),
      rows,
      overflowX: document.documentElement.scrollWidth - innerWidth,
      resCx: rh ? +((rh.left + rh.right) / 2 - innerWidth / 2).toFixed(1) : null,
      secH: +sr.height.toFixed(1),
    };
  });
  perWidth.push({ w, h, ...m });
}

console.log("═══ ROWS / SEATS, per width ═══");
for (const r of perWidth) {
  console.log(`\n${r.w}×${r.h}  pad-x ${r.padL}  content ${r.content}  fs ${r.fs}  overflowX ${r.overflowX}  sectionH ${r.secH}`);
  for (const k of ["A", "B", "C", "D"]) {
    const q = r.rows[k];
    console.log(`  row${k}  ink ${String(q.w).padStart(6)}  left ${String(q.left).padStart(7)}  right ${String(q.right).padStart(7)}  cx ${String(q.cx).padStart(6)}`);
  }
  console.log(`  Reservations-heading cx offset ${r.resCx}`);
}

/* ───────────── 3+4. THE RING AND ITS SCRUB (1440×900) ───────────── */
await boot(page, 1440, 900);
await seatP(page, 0.9); // past MARK_END: ring complete
await new Promise((r) => setTimeout(r, 300));
const ring = await page.evaluate(() => {
  const P = window.__pp;
  const line = P.row("C");
  const lr = line.getBoundingClientRect();
  const cs = getComputedStyle(line);
  const fs = parseFloat(cs.fontSize);
  const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const marks = [...line.querySelectorAll("[data-passage-mark]")];
  let x0 = Infinity, x1 = -Infinity;
  for (const n of marks) {
    const r = n.getBoundingClientRect();
    const ns = getComputedStyle(n);
    x0 = Math.min(x0, r.left + (parseFloat(ns.paddingLeft) || 0) - lr.left);
    x1 = Math.max(x1, r.right - (parseFloat(ns.paddingRight) || 0) - lr.left);
  }
  /* the word before the marked span ("only"): its ink's right edge */
  const all = [...line.querySelectorAll('[class*="Passage_mask"]')];
  const prev = all[1]; // "only"
  const pr = prev.getBoundingClientRect();
  const prevRight = pr.right - (parseFloat(getComputedStyle(prev).paddingRight) || 0) - lr.left;
  /* strut baseline + canvas ink metrics, same as the component */
  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;top:0;left:0;visibility:hidden;white-space:nowrap";
  const strut = document.createElement("span");
  strut.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline";
  probe.append("x", strut);
  line.appendChild(probe);
  const yb = strut.getBoundingClientRect().top - probe.getBoundingClientRect().top;
  probe.remove();
  const ctx = document.createElement("canvas").getContext("2d");
  ctx.font = font;
  const tm = ctx.measureText("one standard.");
  const inkTop = yb - tm.actualBoundingBoxAscent;
  const inkBot = yb + Math.max(0, tm.actualBoundingBoxDescent);
  /* the word BOX the ring is actually derived from */
  const lh = parseFloat(cs.lineHeight) || 1.04 * fs;
  const boxTop = Math.min(...marks.map((n) => n.getBoundingClientRect().top + (parseFloat(getComputedStyle(n).paddingTop) || 0))) - lr.top;
  const bb = P.path().getBBox();
  return {
    fs,
    span: { x0: +x0.toFixed(1), x1: +x1.toFixed(1), px: +(x1 - x0).toFixed(1), em: +((x1 - x0) / fs).toFixed(3) },
    ink: { top: +inkTop.toFixed(1), bot: +inkBot.toFixed(1), asc: +(tm.actualBoundingBoxAscent / fs).toFixed(3), desc: +(tm.actualBoundingBoxDescent / fs).toFixed(3) },
    wordGapBefore: +(x0 - prevRight).toFixed(1),
    box: { top: +boxTop.toFixed(1), bot: +(boxTop + lh).toFixed(1) },
    bbox: { x: +bb.x.toFixed(1), y: +bb.y.toFixed(1), w: +bb.width.toFixed(1), h: +bb.height.toFixed(1) },
    clr: {
      left: +(x0 - bb.x).toFixed(1),
      right: +(bb.x + bb.width - x1).toFixed(1),
      top: +(inkTop - bb.y).toFixed(1),
      bottom: +(bb.y + bb.height - inkBot).toFixed(1),
    },
  };
});
console.log("\n═══ RING at 1440×900 (p = 0.9, complete) ═══");
console.log(`  marked span ${ring.span.px}px = ${ring.span.em}em  (x ${ring.span.x0} → ${ring.span.x1})`);
console.log(`  ink box: top ${ring.ink.top} bottom ${ring.ink.bot}  ascent ${ring.ink.asc}em descent ${ring.ink.desc}em`);
console.log(`  path bbox ${ring.bbox.w} × ${ring.bbox.h} at (${ring.bbox.x}, ${ring.bbox.y})`);
console.log(`  reach past ink: left ${ring.clr.left} right ${ring.clr.right} top ${ring.clr.top} bottom ${ring.clr.bottom}`);
console.log(`  ink gap "only"→"one": ${ring.wordGapBefore}px  (ring's left reach ${ring.clr.left}px eats into it)`);

const partials = [];
for (const p of [0.70, 0.775, 0.79, 0.80, 0.81, 0.82, 0.9]) {
  await seatP(page, p);
  partials.push(await page.evaluate((q) => {
    const path = window.__pp.path();
    const d = path.getAttribute("d") || "";
    const bb = d ? path.getBBox() : { width: 0, height: 0 };
    return { p: q, dLen: d.length, w: +bb.width.toFixed(1), h: +bb.height.toFixed(1) };
  }, p));
}
console.log("\n═══ SCRUB (path bbox by progress) ═══");
for (const s of partials) console.log(`  p ${s.p.toFixed(3)}  d ${String(s.dLen).padStart(6)} chars  bbox ${s.w} × ${s.h}`);

/* ───────────── 5. MARK_IN BY BISECTION ───────────── */
const meta = await page.evaluate(() => {
  const P = window.__pp;
  const line = P.row("C");
  const cs = getComputedStyle(line);
  const fs = parseFloat(cs.fontSize);
  const ctx = document.createElement("canvas").getContext("2d");
  ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const asc = ctx.measureText("standard.").actualBoundingBoxAscent;
  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;top:0;left:0;visibility:hidden;white-space:nowrap";
  const strut = document.createElement("span");
  strut.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline";
  probe.append("x", strut);
  line.appendChild(probe);
  const baseOff = strut.getBoundingClientRect().top - probe.getBoundingClientRect().top;
  probe.remove();
  const { h: sh, vh } = P.band();
  return { fs, asc: +asc.toFixed(2), ascEm: +(asc / fs).toFixed(4), baseOff: +baseOff.toFixed(2), band: sh + vh / 2, secH: sh };
});
const gapAt = async (p) => {
  await seatP(page, p);
  return page.evaluate((mm) => {
    const marks = [...document.querySelectorAll("[data-passage-mark]")];
    const mask = marks[marks.length - 1];
    const word = mask.firstElementChild || mask;
    return +(word.getBoundingClientRect().top + mm.baseOff - mm.asc - mask.getBoundingClientRect().top).toFixed(2);
  }, meta);
};
let lo = 0.68, hi = 0.79;
for (let i = 0; i < 14; i++) {
  const mid = (lo + hi) / 2;
  if ((await gapAt(mid)) < 0) lo = mid; else hi = mid;
}
const pStar = (lo + hi) / 2;
const analyticU = 1 - (0.06 + meta.baseOff / meta.fs - meta.ascEm) / (1.3 * 1.04);
console.log("\n═══ MARK_IN derivation (1440×900) ═══");
console.log(`  ascent("standard.") ${meta.asc}px = ${meta.ascEm}em   baseline ${meta.baseOff}px = ${(meta.baseOff / meta.fs).toFixed(4)}em`);
console.log(`  ink whole at p* = ${pStar.toFixed(4)}  (u = ${((pStar - 0.67) / 0.11).toFixed(3)};  analytic u = ${analyticU.toFixed(3)})`);
console.log(`  gap at 0.760: ${await gapAt(0.76)}px   0.765: ${await gapAt(0.765)}px   0.770: ${await gapAt(0.77)}px`);
console.log(`  section ${meta.secH.toFixed(1)}px  scrub band ${meta.band.toFixed(1)}px  →  ring band [0.77, 0.82] = ${(0.05 * meta.band).toFixed(1)}px, beat [0.82, 0.89] = ${(0.07 * meta.band).toFixed(1)}px of scroll`);

/* ───────────── 6. PER-FRAME COST ───────────── */
const cost = await page.evaluate(() => {
  /* the component's own math, re-stated: the tilted, wobbling, drifting
     ring sampled by central difference, 260 stations at full arc, then
     written into the real path element */
  const fs = 46.08, cx = 256.8, cy = 24, rx = 118.4, ry = 39.6;
  const turn = 1.13 * 2 * Math.PI, ct = Math.cos(-0.05), st = Math.sin(-0.05);
  const at = (t) => {
    const a = 0.82 * Math.PI + turn * t;
    const wob = 1 + 0.055 * Math.sin(a + 0.9) + 0.032 * Math.sin(2 * a + 2.3) + 0.018 * Math.sin(3 * a + 0.4);
    const grow = 1 + 0.055 * t;
    const Rx = rx * wob * grow, Ry = ry * wob * grow;
    const x = Math.cos(a) * Rx + 0.02 * rx * Math.sin(turn * t * 0.5 + 0.7);
    const y = Math.sin(a) * Ry + 0.03 * ry * Math.sin(turn * t * 0.37 + 1.9);
    return [cx + x * ct - y * st, cy + x * st + y * ct];
  };
  const sample = (t) => {
    const h = 2e-4;
    const c = at(t), a = at(Math.max(0, t - h)), b = at(Math.min(1, t + h));
    return { x: c[0], y: c[1], dx: b[0] - a[0], dy: b[1] - a[1] };
  };
  const gen = (u) => {
    const N = Math.max(6, Math.round(260 * u));
    const base = fs * 0.052;
    const top = [], bot = [];
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * u;
      const c = sample(t);
      const len = Math.sqrt(c.dx * c.dx + c.dy * c.dy) || 1;
      const nx = -c.dy / len, ny = c.dx / len;
      const drift = 0.55 * fs * 0.011 * (0.62 * Math.sin(t * 8.9 + 0.7) + 0.38 * Math.sin(t * 19.3 + 2.4));
      const entry = Math.pow(Math.min(1, t / 0.05), 0.55);
      const exit = Math.pow(Math.min(1, (1 - t) / 0.18), 0.7);
      const swell = 0.86 + 0.26 * Math.sin(Math.PI * Math.pow(t, 0.9));
      const h2 = (base * swell * entry * exit) / 2;
      const ox = c.x + nx * drift, oy = c.y + ny * drift;
      top.push([ox + nx * h2, oy + ny * h2]);
      bot.push([ox - nx * h2, oy - ny * h2]);
    }
    let d = `M ${top[0][0].toFixed(2)} ${top[0][1].toFixed(2)}`;
    for (let i = 1; i <= N; i++) d += ` L ${top[i][0].toFixed(2)} ${top[i][1].toFixed(2)}`;
    for (let i = N; i >= 0; i--) d += ` L ${bot[i][0].toFixed(2)} ${bot[i][1].toFixed(2)}`;
    return d + " Z";
  };
  const path = window.__pp.path();
  const keep = path.getAttribute("d");
  const R = 400;
  const t0 = performance.now();
  for (let i = 0; i < R; i++) gen(1);
  const tGen = (performance.now() - t0) / R;
  const t1 = performance.now();
  for (let i = 0; i < R; i++) path.setAttribute("d", gen(0.2 + 0.8 * (i / R)));
  const tFull = (performance.now() - t1) / R;
  if (keep !== null) path.setAttribute("d", keep);
  return { genMs: +tGen.toFixed(4), genPlusWriteMs: +tFull.toFixed(4) };
});
console.log("\n═══ PER-FRAME COST (1440, full ring N=240) ═══");
console.log(`  generate: ${cost.genMs}ms   generate+setAttribute (mixed arcs): ${cost.genPlusWriteMs}ms`);

await seatP(page, 0.99);
const landing = await page.evaluate(() => {
  const d = window.__pp.row("D").getBoundingClientRect();
  return { top: +d.top.toFixed(1), vhMid: innerHeight / 2 };
});
const gaps = await page.evaluate(() => {
  const P = window.__pp;
  const a = P.row("A").getBoundingClientRect();
  const bb = P.row("B").getBoundingClientRect();
  const c = P.row("C").getBoundingClientRect();
  const d = P.row("D").getBoundingClientRect();
  return {
    pairGap: +(bb.top - a.bottom).toFixed(1),
    beat: +(c.top - bb.bottom).toFixed(1),
    cToD: +(d.top - c.bottom).toFixed(1),
  };
});
console.log("\n═══ VERTICAL AIR + LANDING (1440×900) ═══");
console.log(`  A→B ${gaps.pairGap}px   pair→C ${gaps.beat}px   C→D ${gaps.cToD}px`);
console.log(`  row D at p = 0.99: line box top ${landing.top} — ${(landing.vhMid - landing.top).toFixed(1)}px above the ${landing.vhMid} centre`);
/* ───────────── DRIFT: TRAVEL, FEEDBACK LOOP, RING RIDES ───────────── */
const d0 = await (async () => {
  const read = async (p) => {
    await seatP(page, p);
    return page.evaluate(() => {
      const w = document.querySelector('[class*="Passage_drift"]');
      const m = new DOMMatrixReadOnly(getComputedStyle(w).transform);
      return +m.m42.toFixed(2);
    });
  };
  return { at0: await read(0.001), at1: await read(0.999) };
})();
const fb = await (async () => {
  await seatP(page, 0.5);
  return page.evaluate(() => {
    const sec = document.querySelector('[class*="Passage_section"]');
    const w = document.querySelector('[class*="Passage_drift"]');
    const line = document.querySelector('[class*="Passage_rowC"]');
    const path = document.querySelector('[class*="Passage_ink__"] path');
    const snap = () => {
      const r = sec.getBoundingClientRect();
      return { top: +r.top.toFixed(2), h: +r.height.toFixed(2), sh: document.documentElement.scrollHeight };
    };
    const withDrift = snap();
    const lr = line.getBoundingClientRect();
    const bb = path && path.getAttribute("d") ? path.getBoundingClientRect() : null;
    const prev = w.style.transform;
    w.style.transform = "none";
    document.documentElement.offsetHeight;
    const without = snap();
    w.style.transform = prev;
    return { withDrift, without, ringVsSpan: bb ? +((bb.left + bb.right) / 2 - (lr.left + lr.right) / 2).toFixed(1) : null };
  });
})();
console.log("\n═══ AMBIENT DRIFT (1440×900) ═══");
console.log(`  wrapper translateY at p≈0: ${d0.at0}px   at p≈1: ${d0.at1}px   travel ${(d0.at0 - d0.at1).toFixed(2)}px`);
console.log(`  section rect with drift: top ${fb.withDrift.top} h ${fb.withDrift.h} scrollH ${fb.withDrift.sh}`);
console.log(`  section rect drift=none: top ${fb.without.top} h ${fb.without.h} scrollH ${fb.without.sh}`);
console.log(`  identical: ${fb.withDrift.top === fb.without.top && fb.withDrift.h === fb.without.h && fb.withDrift.sh === fb.without.sh}`);
console.log(`  ring centre − span centre (viewport x, mid-scrub): ${fb.ringVsSpan}px`);
await page.close();

/* ───────────── 7. REDUCED MOTION ───────────── */
const page2 = await b.newPage();
await page2.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
await page2.evaluateOnNewDocument(HELPERS);
await boot(page2, 1440, 900);
await seatP(page2, 0.3); // BELOW the scrub band: ring must still be complete
const rm = await page2.evaluate(() => {
  const path = window.__pp.path();
  const bb = path && path.getAttribute("d") ? path.getBBox() : null;
  return {
    masks: document.querySelectorAll('[class*="Passage_mask"]').length,
    words: document.querySelectorAll('[class*="Passage_word"]').length,
    ringBBox: bb ? `${bb.width.toFixed(1)} × ${bb.height.toFixed(1)}` : "MISSING",
  };
});
console.log("\n═══ REDUCED MOTION (p = 0.3) ═══");
console.log(`  masks ${rm.masks} (expect 0)  words ${rm.words}  ring bbox ${rm.ringBBox}`);

await b.close();
console.log("\ndone");
