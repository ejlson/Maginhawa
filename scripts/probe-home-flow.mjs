/* THE WHOLE HOME PAGE, AS ONE CONTINUOUS SCROLL.

   Two passes down the page in one run:

   PASS A — MOTION CONTINUITY. Steps the document in fixed increments and,
   at every step, records the visual state of every element the page
   animates (transform, opacity, filter, clip-path) plus the section
   attributes that gate them. From that it derives, per step, a "motion
   energy": how much of the visible composition changed since the previous
   step. Long runs of ZERO energy are the page's dead stretches — scroll
   that buys the reader nothing. Spikes are snaps.

   PASS B — FRAME COST UNDER REAL SCROLL. Drives the page with wheel
   events at a constant rate so Lenis runs its own easing, and records
   every rAF delta against the scroll position it happened at. Long frames
   are bucketed by scrollY so jank can be attributed to a section.

   usage: node scripts/probe-home-flow.mjs [port] [width] [height]        */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3000";
const W = +(process.argv[3] || 1440);
const H = +(process.argv[4] || 900);
const STEP = 40;

const b = await puppeteer.launch({
  executablePath: CHROME, headless: "new", protocolTimeout: 300000,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1",
         "--autoplay-policy=no-user-gesture-required"],
});
const p = await b.newPage();
await p.setViewport({ width: W, height: H });
await p.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle2", timeout: 90000 });
await p.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 40000 }).catch(() => {});
await new Promise(r => setTimeout(r, 1500));

const jump = async (y) => {
  await p.evaluate((to) => {
    const l = window.__lenis;
    if (l) l.scrollTo(to, { immediate: true }); else window.scrollTo(0, to);
  }, y);
  await new Promise(r => setTimeout(r, 110));
};

/* the map of the page, once */
const map = await p.evaluate(() => {
  const after = document.querySelector("main .afterHero");
  const rows = [];
  const add = (el, name) => {
    const r = el.getBoundingClientRect();
    rows.push({ name, top: Math.round(r.top + scrollY), h: Math.round(r.height) });
  };
  const hero = document.querySelector("main > section");
  if (hero) add(hero, "Hero");
  [...(after?.children || [])].forEach((el) => {
    const m = (el.className || "").toString().match(/([A-Za-z]+)_/);
    add(el, m ? m[1] : el.tagName.toLowerCase());
  });
  return { docH: document.documentElement.scrollHeight, vh: innerHeight, rows };
});

/* PASS A ─────────────────────────────────────────────────────────── */
await p.evaluate(() => {
  /* the stamp is the identity; the class name is only for reading the report.
     ⚠️ EVERY ELEMENT IS STAMPED ONCE, BEFORE ANY SAMPLING. The first version
     built each sample's keys positionally — `Discover.cell`,
     `Discover.cell#2`, ... in DOM order AMONG THE ELEMENTS CURRENTLY ON
     SCREEN. The moment one of them scrolled out of the sampled band every
     key after it shifted by one, so consecutive samples compared DIFFERENT
     ELEMENTS and reported the difference between them as motion. It produced
     a signature that is easy to recognise once seen: a constant value (one
     cell's full height) rotating backwards through the cells, scored as the
     four largest "snaps" on the page. None of them existed. */
  let n = 0;
  document.querySelectorAll("main *").forEach((el) => {
    el.setAttribute("data-probe-id", String(n++));
  });
  window.__snap = () => {
    const out = {};
    document.querySelectorAll("main *").forEach((el) => {
      const cs = getComputedStyle(el);
      const t = cs.transform, o = cs.opacity, f = cs.filter, cp = cs.clipPath;
      const moving = (t && t !== "none") || (+o < 0.999) ||
                     (f && f !== "none") || (cp && cp !== "none");
      if (!moving) return;
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > innerHeight + 200) return;   // off screen
      if (r.width < 2 || r.height < 2) return;
      const cls = (el.className || "").toString();
      const m = cls.match(/([A-Za-z]+)_([A-Za-z0-9]+)__/);
      const label = m ? m[1] + "." + m[2] : el.tagName.toLowerCase();
      const key = label + "@" + el.getAttribute("data-probe-id");
      out[key] = { t, o: +(+o).toFixed(3), f, cp, label,
                   x: Math.round(r.left), y: Math.round(r.top),
                   w: Math.round(r.width), hh: Math.round(r.height) };
    });
    const attrs = {};
    document.querySelectorAll("main [data-in],main [data-plate],main [data-phase],main [data-stage],main [data-open],main [data-armed]").forEach((el) => {
      const cls = (el.className || "").toString();
      const m = cls.match(/([A-Za-z]+)_([A-Za-z0-9]+)__/);
      const key = (m ? m[1] + "." + m[2] : el.tagName.toLowerCase()) + (el.id ? "#" + el.id : "");
      attrs[key] = [...el.attributes].filter(a => a.name.startsWith("data-"))
        .map(a => a.name + "=" + a.value).join(",");
    });
    return { m: out, a: attrs };
  };
});

const steps = [];
for (let y = 0; y <= map.docH - map.vh; y += STEP) {
  await jump(y);
  const s = await p.evaluate(() => window.__snap());
  steps.push({ y, ...s });
}
await jump(map.docH);
steps.push({ y: map.docH - map.vh, ...(await p.evaluate(() => window.__snap())) });

/* motion energy: sum of |Δ| over transform matrix translate + opacity + blur */
const parse = (t) => {
  if (!t || t === "none") return [0, 0, 1];
  const n = t.match(/matrix(3d)?\(([^)]+)\)/);
  if (!n) return [0, 0, 1];
  const v = n[2].split(",").map(Number);
  return n[1] ? [v[12], v[13], v[0]] : [v[4], v[5], v[0]];
};
const blur = (f) => { const m = /blur\(([\d.]+)px\)/.exec(f || ""); return m ? +m[1] : 0; };

/* ⚠️ CLIP-PATH COUNTS, AND LEAVING IT OUT MADE THIS PROBE LIE. The reveal
   this page reaches for most often is an `inset()` window opening — every
   sweep in Blog.module.css, every plate in Discover, every print in
   AboutSplit — and none of it touches a transform or an opacity. A version
   of this file that scored only translate/scale/opacity/blur reported a
   chapter as motionless while eight cards were visibly wiping open across
   it. The insets are read as percentages of the element and scaled by its
   own size, so a 10% wipe on a 400px plate counts as the 40px of edge
   travel a reader actually sees. */
const inset = (cp, w, h) => {
  if (!cp || cp === "none") return null;
  const m = /inset\(([^)]+)\)/.exec(cp);
  if (!m) return null;
  const parts = m[1].trim().split(/\s+/).filter((t) => !/^round$/.test(t)).slice(0, 4);
  const num = (t) => {
    const v = parseFloat(t);
    if (!isFinite(v)) return 0;
    return /%$/.test(t) ? v : v;                   // px and % both, see below
  };
  const pct = (t) => /%$/.test(t);
  const vals = parts.map((t) => ({ v: num(t), p: pct(t) }));
  while (vals.length < 4) vals.push(vals[vals.length - 1] ?? { v: 0, p: false });
  /* top, right, bottom, left → px against the element's own box */
  return [
    vals[0].p ? vals[0].v * h / 100 : vals[0].v,
    vals[1].p ? vals[1].v * w / 100 : vals[1].v,
    vals[2].p ? vals[2].v * h / 100 : vals[2].v,
    vals[3].p ? vals[3].v * w / 100 : vals[3].v,
  ];
};

const energy = [];
for (let i = 1; i < steps.length; i++) {
  const A = steps[i - 1].m, B = steps[i].m;
  let e = 0; const who = {};
  for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) {
    const a = A[k], c = B[k];
    if (!a || !c) continue;
    const [ax, ay, as] = parse(a.t), [cx, cy, cs] = parse(c.t);
    /* the element's own travel, net of the page scrolling under it */
    /* ⚠️ AND THE LAYOUT BOX COUNTS TOO, for the same reason the clip does.
       Reservations' film does not transform as it settles — it resolves
       from a full-bleed rectangle into an inset plate by changing its own
       margins, so its width fell 1440 → 1360 and its height 1287 → 1046
       across 300px of scroll while this probe scored the band at 1.4. A
       reveal that moves an element's BOX is still a reveal.

       ⚠️ NO VERTICAL TERM, AND THAT IS NOT AN OVERSIGHT. A version of this
       took Δy in document coordinates as well, on the reasoning that the
       page's own scroll would cancel — it does not, because the hero, the
       handover's stage and the film are all `position: sticky`, so their
       document position changes by a whole step every step BY DESIGN. That
       version scored `Hero.zoom` as a top mover in every band on the page
       and buried the real signal under it. Width, height and horizontal
       offset are enough: a plate resolving out of full bleed changes all
       three, and a sticky element changes none of them.

       ⚠️ AND IT IS FOR PLATES ONLY — 120px in BOTH dimensions or it is not
       counted. Type reflows: a word mask re-measures as its face settles, a
       pill's goo cells resize on hover, and both produce box deltas that
       have nothing to do with a reveal. Unfiltered, one such mask scored
       12,388 against a page mean of 300 and buried everything real. A
       reveal worth measuring here is a picture-sized object. */
    const plate = Math.min(a.w, c.w) >= 120 && Math.min(a.hh, c.hh) >= 120;
    const geo = plate
      ? Math.abs(c.x - a.x) + Math.abs(c.w - a.w) + Math.abs(c.hh - a.hh)
      : 0;
    const ia = inset(a.cp, a.w, a.hh), ic = inset(c.cp, c.w, c.hh);
    let clip = 0;
    if (ia && ic) for (let q = 0; q < 4; q++) clip += Math.abs(ic[q] - ia[q]);
    const d = Math.abs((cx - ax)) + Math.abs((cy - ay))
            + Math.abs(cs - as) * 400
            + Math.abs(c.o - a.o) * 220
            + Math.abs(blur(c.f) - blur(a.f)) * 26
            + clip + geo;
    if (d > 0.4) { e += d; who[c.label || k] = +d.toFixed(1); }
  }
  const top = Object.entries(who).sort((x, y) => y[1] - x[1]).slice(0, 4);
  energy.push({ y: steps[i].y, e: +e.toFixed(1), top });
}

const sectionAt = (y) => {
  let s = map.rows[0].name;
  for (const r of map.rows) if (y + map.vh * 0.5 >= r.top) s = r.name;
  return s;
};

console.log(`\n══ HOME FLOW ${W}×${H} — doc ${map.docH}px (${(map.docH / map.vh).toFixed(1)} screens) ══`);
console.log("\nSECTIONS");
map.rows.forEach(r => console.log(`  ${r.name.padEnd(14)} top ${String(r.top).padStart(5)}  h ${String(r.h).padStart(5)}  (${(r.h / map.vh).toFixed(2)} screens)`));

console.log("\nDEAD STRETCHES  (runs where nothing on screen moves at all)");
let run = null; const dead = [];
for (const s of energy) {
  if (s.e < 1.5) { run = run || { from: s.y }; run.to = s.y; }
  else if (run) { dead.push(run); run = null; }
}
if (run) dead.push(run);
dead.filter(d => d.to - d.from >= 160).forEach(d =>
  console.log(`  ${String(d.from).padStart(5)} → ${String(d.to).padStart(5)}  ${String(d.to - d.from).padStart(5)}px  (${((d.to - d.from) / map.vh).toFixed(2)} screens)  in ${sectionAt(d.from)}`));
if (!dead.filter(d => d.to - d.from >= 160).length) console.log("  none ≥160px");

console.log("\nENERGY PROFILE  (per 200px band: mean energy, and what moved)");
for (let y = 0; y < map.docH - map.vh; y += 200) {
  const band = energy.filter(s => s.y >= y && s.y < y + 200);
  if (!band.length) continue;
  const mean = band.reduce((a, s) => a + s.e, 0) / band.length;
  const peak = Math.max(...band.map(s => s.e));
  const movers = {};
  band.forEach(s => s.top.forEach(([k, v]) => { movers[k] = (movers[k] || 0) + v; }));
  const names = Object.entries(movers).sort((a, c) => c[1] - a[1]).slice(0, 3).map(x => x[0]);
  const bar = "█".repeat(Math.min(28, Math.round(mean / 6)));
  console.log(`  ${String(y).padStart(5)} ${sectionAt(y).padEnd(12)} ${bar.padEnd(28)} mean ${mean.toFixed(1).padStart(6)} peak ${peak.toFixed(0).padStart(5)}  ${names.join(" ")}`);
}

console.log("\nSNAPS  (single 40px step moving >90px of composition)");
energy.filter(s => s.e > 90).sort((a, c) => c.e - a.e).slice(0, 14).forEach(s =>
  console.log(`  y=${String(s.y).padStart(5)} ${sectionAt(s.y).padEnd(12)} e=${s.e.toFixed(0).padStart(5)}  ${s.top.map(([k, v]) => k + ":" + v).join("  ")}`));

/* PASS B ─────────────────────────────────────────────────────────── */
await jump(0);
await new Promise(r => setTimeout(r, 700));
await p.evaluate(() => {
  window.__fr = [];
  let last = performance.now();
  const tick = (t) => { window.__fr.push([Math.round(scrollY), +(t - last).toFixed(1)]); last = t; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
});
const client = await p.target().createCDPSession();
let y = 0;
while (y < map.docH - map.vh) {
  await client.send("Input.dispatchMouseEvent", {
    type: "mouseWheel", x: W / 2, y: H / 2, deltaX: 0, deltaY: 100,
  });
  await new Promise(r => setTimeout(r, 16));
  y = await p.evaluate(() => scrollY);
}
await new Promise(r => setTimeout(r, 600));
const frames = await p.evaluate(() => window.__fr);

console.log("\nFRAME COST UNDER CONTINUOUS WHEEL SCROLL");
const long = frames.filter(f => f[1] > 22);
console.log(`  ${frames.length} frames · ${long.length} over 22ms (${(100 * long.length / frames.length).toFixed(1)}%) · worst ${Math.max(...frames.map(f => f[1]))}ms`);
const buckets = {};
frames.forEach(([sy, dt]) => {
  const k = Math.floor(sy / 400) * 400;
  (buckets[k] = buckets[k] || []).push(dt);
});
Object.keys(buckets).map(Number).sort((a, c) => a - c).forEach(k => {
  const v = buckets[k].sort((a, c) => a - c);
  const p95 = v[Math.floor(v.length * 0.95)] || 0;
  const bad = v.filter(d => d > 22).length;
  const bar = "▓".repeat(Math.min(30, Math.round(p95)));
  console.log(`  ${String(k).padStart(5)} ${sectionAt(k).padEnd(12)} n=${String(v.length).padStart(4)} p50 ${String(v[Math.floor(v.length / 2)]).padStart(5)} p95 ${String(p95).padStart(5)} worst ${String(v[v.length - 1]).padStart(6)}  long:${String(bad).padStart(3)} ${bar}`);
});

await b.close();
