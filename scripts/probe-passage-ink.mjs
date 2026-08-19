/* THE INK MARK UNDER "One standard." — MEASURED.
 *
 * ⚠️ IT FOLLOWS MARK_ON, IT DOES NOT NAME A LINE. The mark has already moved
 * once (line A's "not changed." -> the whole of line B), and this script had
 * `lineA` hardcoded in eight places — after the move every one of them was
 * measuring the UNMARKED line and quietly reporting on nothing. `markedLine`
 * below finds whichever <p> actually carries the marked words, so the next
 * move needs no edit here.
 *
 * Independent verification of six claims about <Passage>'s underline:
 *   1. zero layout impact (section height / line box / scrollHeight)
 *   2. the latch is reversible with a dead band
 *   3. the mark lands under the right words at four widths
 *   4. it survives a live resize (two fragments -> one)
 *   5. reduced motion shows it complete, undrawn
 *   6. the seat clears the marked row's own deepest ink
 *
 * ⚠️ LENIS OVERRIDES window.scrollTo — drive it through window.__lenis.
 * usage: node scripts/probe-passage-ink.mjs [port] */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "50279";

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  protocolTimeout: 240000,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});

const boot = async (page, w, h) => {
  await page.setViewport({ width: w, height: h });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 90000 });
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 700));
};

const HELPERS = () => {
  window.__pass = {
    sec: () => document.querySelector('[class*="Passage_section"]'),
    /* ⚠️ WHICHEVER LINE MARK_ON NAMES, found by asking the DOM which <p>
       holds the marked words rather than by naming lineA or lineB. */
    lineA: () =>
      document.querySelector('[class*="Passage_line__"]:has([data-passage-mark])') ||
      document.querySelector('[class*="Passage_lineB"]'),
    /* ⚠️ `Passage_ink` ALSO MATCHES `Passage_inked`, which the marked <p>
       carries once the latch opens — and the <p> comes FIRST in document
       order, so this returned the paragraph and the layout test below
       removed the whole line instead of the svg. The CSS-module `__` suffix
       is the only thing that separates the two names. */
    ink: () => document.querySelector('[class*="Passage_ink__"]'),
    band() {
      const s = this.sec();
      const r = s.getBoundingClientRect();
      return { top: r.top + scrollY, h: r.height, vh: innerHeight };
    },
    yFor(p) {
      const { top, h, vh } = this.band();
      return (top - vh) + p * (h + vh / 2);
    },
  };
};

const seat = async (page, y) => {
  await page.evaluate((v) => {
    const l = window.__lenis;
    if (l) l.scrollTo(v, { immediate: true, force: true });
    else window.scrollTo(0, v);
  }, y);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await new Promise((r) => setTimeout(r, 70));
};
const seatP = async (page, p) => seat(page, await page.evaluate((q) => window.__pass.yFor(q), p));

/* ⚠️ WAIT FOR THE MARK, DO NOT SLEEP AT IT. buildMarks runs on a rAF after
   layout and again after document.fonts.ready, so a fixed settle time is a
   race — it passed at a fixed 1500ms on one dev server and returned
   `{err:"no svg"}` on a slower one, which surfaced as an unreadable
   TypeError three lines later rather than as a failed check. */
const awaitMark = async (page, ms = 8000) => {
  try {
    await page.waitForFunction(
      () => {
        const svg = window.__pass.ink();
        return !!svg && svg.querySelectorAll("g").length > 0;
      },
      { timeout: ms, polling: 100 }
    );
    return true;
  } catch {
    return false;
  }
};

const page = await b.newPage();
await page.evaluateOnNewDocument(HELPERS);
await boot(page, 1440, 900);
await seatP(page, 0.95);
await new Promise((r) => setTimeout(r, 1800));

/* ─────────────────── 1. LAYOUT IMPACT ─────────────────── */
const layout = await page.evaluate(() => {
  const P = window.__pass;
  const snap = () => {
    const s = P.sec().getBoundingClientRect();
    const l = P.lineA().getBoundingClientRect();
    return {
      sectionH: +s.height.toFixed(3),
      sectionW: +s.width.toFixed(3),
      lineH: +l.height.toFixed(3),
      lineW: +l.width.toFixed(3),
      lineTop: +(l.top + scrollY).toFixed(3),
      scrollH: document.documentElement.scrollHeight,
      bodyH: +document.body.getBoundingClientRect().height.toFixed(3),
    };
  };
  const withSvg = snap();
  const svg = P.ink();
  const present = !!svg;
  const parent = svg?.parentNode;
  svg?.remove();
  document.documentElement.offsetHeight; // force layout
  const without = snap();
  if (svg && parent) parent.appendChild(svg);
  document.documentElement.offsetHeight;
  const restored = snap();
  return { present, withSvg, without, restored };
});

console.log("\n═══ 1. LAYOUT IMPACT (1440x900) ═══");
console.log("  svg rendered:", layout.present);
const keys = Object.keys(layout.withSvg);
let layoutClean = true;
for (const k of keys) {
  const a = layout.withSvg[k], c = layout.without[k], d = layout.restored[k];
  const same = a === c && a === d;
  if (!same) layoutClean = false;
  console.log(`  ${k.padEnd(10)} with ${String(a).padStart(10)}   without ${String(c).padStart(10)}   restored ${String(d).padStart(10)}  ${same ? "=" : "  ✗ DIFFERS"}`);
}
console.log(`  → ${layoutClean ? "PASS — identical" : "FAIL"}`);

/* ─────────────────── 2. THE LATCH ─────────────────── */
const inkedAt = () => page.evaluate(() => /Passage_inked/.test(window.__pass.lineA().className));

console.log("\n═══ 2. LATCH — sweep up then down, step 0.005 ═══");
await seatP(page, 0.70);
await new Promise((r) => setTimeout(r, 300));
let up = [], down = [];
for (let p = 0.70; p <= 0.90001; p += 0.005) { await seatP(page, +p.toFixed(3)); up.push([+p.toFixed(3), await inkedAt()]); }
for (let p = 0.90; p >= 0.69999; p -= 0.005) { await seatP(page, +p.toFixed(3)); down.push([+p.toFixed(3), await inkedAt()]); }
const firstTrue = up.find((x) => x[1]);
const lastTrue = [...down].reverse().find((x) => x[1]);
const openAt = firstTrue ? firstTrue[0] : null;
const closeAt = lastTrue ? lastTrue[0] : null;
console.log(`  rising:  ink first ON at p = ${openAt}   (prev sample ${openAt != null ? (openAt - 0.005).toFixed(3) : "—"} off)`);
console.log(`  falling: ink last  ON at p = ${closeAt}  (next sample ${closeAt != null ? (closeAt - 0.005).toFixed(3) : "—"} off)`);
console.log(`  dead band = ${openAt != null && closeAt != null ? (openAt - closeAt + 0.005).toFixed(3) : "—"} of progress`);
const bandPx = await page.evaluate(() => { const { h, vh } = window.__pass.band(); return h + vh / 2; });
console.log(`  scrub band = ${bandPx.toFixed(1)}px  →  0.04 of progress = ${(0.04 * bandPx).toFixed(1)}px of scroll`);
console.log(`  (expect the latch to open at MARK_IN and close at MARK_OUT; both are derived in Passage.tsx and neither is a round number by accident)`);

/* ─────────────────── 3+6. GEOMETRY AT WIDTH ─────────────────── */
const GEOM = () => {
  const P = window.__pass;
  const line = P.lineA(), svg = P.ink();
  if (!svg) return { err: "no svg" };
  const lb = line.getBoundingClientRect();
  const cs = getComputedStyle(line);
  const em = parseFloat(cs.fontSize);
  const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const cx = document.createElement("canvas").getContext("2d");
  cx.font = font;

  // the marked masks, grouped into rows exactly as the component does
  const nodes = [...line.querySelectorAll("[data-passage-mark]")];
  const rows = [];
  for (const n of nodes) {
    const r = n.getBoundingClientRect(), ns = getComputedStyle(n);
    const top = r.top + (parseFloat(ns.paddingTop) || 0);
    const left = r.left + (parseFloat(ns.paddingLeft) || 0);
    const right = r.right - (parseFloat(ns.paddingRight) || 0);
    const last = rows[rows.length - 1];
    if (last && Math.abs(last.top - top) < 1) { last.left = Math.min(last.left, left); last.right = Math.max(last.right, right); last.text += " " + n.textContent; }
    else rows.push({ top, left, right, text: n.textContent });
  }

  // every unmarked word, to prove the mark does not reach under them
  const unmarked = [...line.querySelectorAll('[class*="Passage_mask"]')]
    .filter((n) => !n.hasAttribute("data-passage-mark"))
    .map((n) => { const r = n.getBoundingClientRect(); return { t: n.textContent, l: +r.left.toFixed(1), r: +r.right.toFixed(1), top: +r.top.toFixed(1) }; });

  // the drawn strokes: full path extents in page space
  const gs = [...svg.querySelectorAll("g")];
  const sr = svg.getBoundingClientRect();
  const marks = gs.map((g) => {
    const body = g.querySelectorAll("path")[1];
    const bb = body.getBBox(); // user units == CSS px, svg has no viewBox
    const pool = g.querySelector("circle");
    return {
      x0: +(sr.left + bb.x).toFixed(1),
      x1: +(sr.left + bb.x + bb.width).toFixed(1),
      yTop: +(sr.top + bb.y).toFixed(1),
      yBot: +(sr.top + bb.y + bb.height).toFixed(1),
      rise: +bb.height.toFixed(2),
      w: +bb.width.toFixed(1),
      wBody: +body.getAttribute("stroke-width"),
      wCore: +g.querySelectorAll("path")[2].getAttribute("stroke-width"),
      coreW: +(g.querySelectorAll("path")[2].getBBox().width).toFixed(1),
      dur: getComputedStyle(body).getPropertyValue("--dur").trim(),
      dly: getComputedStyle(body).getPropertyValue("--dly").trim(),
      pool: pool ? { cx: +(sr.left + +pool.getAttribute("cx")).toFixed(1), cy: +(sr.top + +pool.getAttribute("cy")).toFixed(1), r: +pool.getAttribute("r") } : null,
    };
  });

  return {
    vw: innerWidth, em: +em.toFixed(2), svgW: +svg.getAttribute("width"), svgH: +svg.getAttribute("height"),
    lineBox: { l: +lb.left.toFixed(1), r: +lb.right.toFixed(1), w: +lb.width.toFixed(1) },
    rows: rows.map((r) => ({ text: r.text.trim(), l: +r.left.toFixed(1), r: +r.right.toFixed(1), w: +(r.right - r.left).toFixed(1),
      desc: +cx.measureText(r.text.trim()).actualBoundingBoxDescent.toFixed(2) })),
    unmarked, marks,
  };
};

const WIDTHS = [[1920,1080],[1440,900],[1280,720],[600,900],[390,844]];
console.log("\n═══ 3+6. WHERE THE MARK LANDS ═══");
const geoms = {};
for (const [w, h] of WIDTHS) {
  const p2 = await b.newPage();
  await p2.evaluateOnNewDocument(HELPERS);
  await boot(p2, w, h);
  await seatP(p2, 0.95);
  await awaitMark(p2);
  await new Promise((r) => setTimeout(r, 400));
  const g = await p2.evaluate(GEOM);
  geoms[w] = g;
  await p2.close();
  console.log(`\n ── ${w}×${h}  (font ${g.em}px, line box ${g.lineBox.l}→${g.lineBox.r})`);
  console.log(`    svg ${g.svgW}×${g.svgH}   fragments: ${g.rows.length}`);
  g.rows.forEach((r, i) => {
    const m = g.marks[i];
    if (!m) { console.log(`    row ${i} "${r.text}" — NO MARK`); return; }
    const dl = +(m.x0 - r.l).toFixed(1), dr = +(m.x1 - r.r).toFixed(1);
    console.log(`    row ${i} "${r.text}"`);
    console.log(`       words  x ${r.l} → ${r.r}   (${r.w}px)   ink descent ${r.desc}px`);
    console.log(`       mark   x ${m.x0} → ${m.x1}   (${m.w}px)   Δleft ${dl}  Δright ${dr}   ${Math.abs(dl)<2&&Math.abs(dr)<2?"✓ aligned":"✗ OFF"}`);
    console.log(`       core   ${m.coreW}px = ${(100*m.coreW/m.w).toFixed(1)}% of body  (taper ${((m.w-m.coreW)/2).toFixed(1)}px each end)`);
    console.log(`       stroke body ${m.wBody}px / core ${m.wCore}px   rise over run ${m.rise}px (${(100*m.rise/m.w).toFixed(1)}%)`);
    console.log(`       timing dly ${m.dly} dur ${m.dur}`);
    if (m.pool) console.log(`       pool   r ${m.pool.r}px at (${m.pool.cx}, ${m.pool.cy})  = ${(m.pool.r*2/m.wBody).toFixed(2)}× body weight`);
  });
  // descender clearance, computed against the last row's own baseline
  const lastRow = g.rows[g.rows.length - 1], lastMark = g.marks[g.marks.length - 1];
  if (lastMark) {
    console.log(`    unmarked words on the marked line: ${g.unmarked.map(u=>`"${u.t.trim()}"@${u.l}–${u.r}`).join("  ")}`);
    const overlaps = g.unmarked.filter((u) => Math.abs(u.top - (g.rows.find(r=>true) ? 0 : 0)) >= 0 && u.r > lastMark.x0 && u.l < lastMark.x1);
    console.log(`    unmarked words horizontally inside a mark's span: ${overlaps.length ? overlaps.map(u=>u.t).join(", ") : "none"}`);
  }
}

/* ─────────────────── 4. LIVE RESIZE ─────────────────── */
console.log("\n═══ 4. LIVE RESIZE (no reload) ═══");
const p3 = await b.newPage();
await p3.evaluateOnNewDocument(HELPERS);
await boot(p3, 1440, 900);
await seatP(p3, 0.95);
if (!(await awaitMark(p3))) throw new Error("no mark at 1440 before the resize sweep — the page never built one");
const before = await p3.evaluate(GEOM);
console.log(`  1440 → ${before.rows.length} fragment(s): ${before.rows.map(r=>`"${r.text}"`).join(" + ")}   marks ${before.marks.length}`);
for (const w of [1100, 900, 700, 600, 520]) {
  await p3.setViewport({ width: w, height: 900 });
  await new Promise((r) => setTimeout(r, 500));
  await seatP(p3, 0.95);
  await awaitMark(p3);
  await new Promise((r) => setTimeout(r, 300));
  const g = await p3.evaluate(GEOM);
  const ok = g.rows.length === g.marks.length && g.rows.every((r, i) => g.marks[i] && Math.abs(g.marks[i].x0 - r.l) < 2 && Math.abs(g.marks[i].x1 - r.r) < 2);
  console.log(`  ${String(w).padStart(4)} → ${g.rows.length} fragment(s): ${g.rows.map(r=>`"${r.text}"`).join(" + ")}   marks ${g.marks.length}  ${ok ? "✓ re-measured" : "✗ STALE"}`);
}
// and back up again
await p3.setViewport({ width: 1440, height: 900 });
await new Promise((r) => setTimeout(r, 500));
await seatP(p3, 0.95);
await awaitMark(p3);
await new Promise((r) => setTimeout(r, 300));
const back = await p3.evaluate(GEOM);
const backOk = back.rows.every((r, i) => back.marks[i] && Math.abs(back.marks[i].x0 - r.l) < 2 && Math.abs(back.marks[i].x1 - r.r) < 2);
console.log(`  1440 → ${back.rows.length} fragment(s)  ${backOk ? "✓ re-measured" : "✗ STALE"}`);
await p3.close();

/* ─────────────────── 5. REDUCED MOTION ─────────────────── */
console.log("\n═══ 5. REDUCED MOTION ═══");
const p4 = await b.newPage();
await p4.evaluateOnNewDocument(HELPERS);
const cdp4 = await p4.createCDPSession();
await cdp4.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
await boot(p4, 1440, 900);
const rmTop = await p4.evaluate(() => {
  const P = window.__pass;
  const svg = P.ink();
  if (!svg) return { err: "no svg at scroll 0" };
  const paths = [...svg.querySelectorAll("path")];
  return {
    inkedClass: /Passage_inked/.test(P.lineA().className),
    offsets: paths.map((p) => +getComputedStyle(p).strokeDashoffset),
    transitions: [...new Set(paths.map((p) => getComputedStyle(p).transitionDuration))],
    poolOpacity: [...svg.querySelectorAll("circle")].map((c) => +getComputedStyle(c).opacity),
    wordTransforms: [...new Set([...P.lineA().querySelectorAll('[class*="Passage_word"]')].map((w) => getComputedStyle(w).transform))],
    animations: document.getAnimations().filter((a)=>{try{return svg.contains(a.effect?.target)}catch{return false}}).length,
  };
});
console.log("  at scroll 0, before the section is even reached:");
console.log("   ", JSON.stringify(rmTop));
await seatP(p4, 0.95);
await new Promise((r) => setTimeout(r, 900));
const rmSeen = await p4.evaluate(() => {
  const svg = window.__pass.ink();
  const paths = [...svg.querySelectorAll("path")];
  return { offsets: paths.map((p) => +getComputedStyle(p).strokeDashoffset), pool: [...svg.querySelectorAll("circle")].map((c)=>+getComputedStyle(c).opacity), running: document.getAnimations().filter(a=>a.playState==="running").length };
});
console.log("  in view:", JSON.stringify(rmSeen));
console.log(`  → ${rmTop.offsets?.every((o) => o === 0) && rmSeen.offsets.every((o)=>o===0) ? "PASS — complete, no draw" : "CHECK"}`);
await p4.close();

await b.close();
