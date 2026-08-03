/* The "Leave us a Google review" table on /contact, and the two elements on
   the home page's closing frame that moved off the mono voice.

   The review section had to satisfy two things at once that were previously
   treated as a choice: a continuous bordered table AND the dark zone's shared
   rail. So this measures BOTH — where the type starts (must be the rail's
   40 / 503 / 929, the same edges the Footer below it uses) and where the
   hairlines fall (must join into continuous rows, with the verticals in the
   gaps rather than on the type).

   Run against a PRODUCTION build; never `npm run build` while `next dev` is
   up — both write `.next` and the loser's assets 404 mid-run.

     NEXT_DIST_DIR=.next-nav npx next build
     NEXT_DIST_DIR=.next-nav npx next start -p 3120
     node scripts/probe-review-table.mjs 3120

   usage: node scripts/probe-review-table.mjs [port] */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3120";
const OUT = process.env.OUT || "/tmp/mgnhw_review";
const s = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(OUT, { recursive: true });

const b = await puppeteer.launch({
  executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1", "--enable-gpu"],
});
const page = await b.newPage();
let fails = 0;
const near = (a, target, tol, what) => {
  const ok = Math.abs(a - target) <= tol;
  if (!ok) fails++;
  return `${ok ? "ok  " : "FAIL"} ${what}: ${a.toFixed(1)} (want ${target}±${tol})`;
};

/* ---------- desktop ---------- */
await page.setViewport({ width: 1440, height: 900 });
await page.goto(`http://localhost:${PORT}/contact`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 }).catch(() => {});
await s(1200);
await page.evaluate(() => {
  const el = document.getElementById("leave-a-review");
  window.__lenis?.scrollTo(el.offsetTop, { immediate: true }) ?? el.scrollIntoView();
});
await s(1400);

const m = await page.evaluate(() => {
  const grid = document.querySelector('[class*="ReviewUs"][class*="grid"]')
    || document.querySelector('#leave-a-review ul');
  const items = [...grid.querySelectorAll('a')];
  const names = [...grid.querySelectorAll('span')].filter((e) => e.className.includes("itemName"));
  const cs = (e) => getComputedStyle(e);
  const box = (e) => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; };
  // where the TYPE starts — the rail's business
  const typeX = names.slice(0, 3).map((n) => n.getBoundingClientRect().left);
  // where the RULES fall — the table's business
  const cells = items.slice(0, 3).map((a) => ({
    box: box(a),
    borderL: parseFloat(cs(a).borderLeftWidth),
    borderB: parseFloat(cs(a).borderBottomWidth),
    padL: parseFloat(cs(a).paddingLeft),
    padR: parseFloat(cs(a).paddingRight),
  }));
  const g = box(grid);
  // the Footer's own rails, one section down — the edges this must match
  const foot = document.querySelector('footer');
  const footCols = foot
    ? [...foot.children].flatMap((c) => [...c.children]).map((e) => e.getBoundingClientRect().left)
    : [];
  return {
    typeX, cells, grid: g, gridClip: cs(grid).overflow,
    gridBorderTop: parseFloat(cs(grid).borderTopWidth),
    footCols: [...new Set(footCols.map((x) => Math.round(x)))].sort((a, b) => a - b),
    lastFullWidth: (() => {
      const li = [...grid.children];
      const last = li[li.length - 1];
      return { l: last.getBoundingClientRect().left, r: last.getBoundingClientRect().right };
    })(),
  };
});

console.log("\n=== /contact — the review table at 1440x900 ===");
console.log("  TYPE on the rail (the whole point of the exercise):");
console.log("    " + near(m.typeX[0], 40, 1, "column 1 text edge"));
console.log("    " + near(m.typeX[1], 503, 1.5, "column 2 text edge"));
console.log("    " + near(m.typeX[2], 929, 1.5, "column 3 text edge"));
console.log(`  Footer's own rails one section down: ${JSON.stringify(m.footCols.filter((x) => x > 0 && x < 1400))}`);
console.log("  RULES — the table:");
console.log(`    grid top rule ${m.gridBorderTop}px, spans x ${m.grid.l.toFixed(0)}..${m.grid.r.toFixed(0)}, overflow "${m.gridClip}"`);
m.cells.forEach((c, i) => {
  console.log(`    cell ${i + 1}: box ${c.box.l.toFixed(1)}..${c.box.r.toFixed(1)}  border-left ${c.borderL}  border-bottom ${c.borderB}  padding ${c.padL.toFixed(1)}/${c.padR.toFixed(1)}`);
});
const joins = [
  Math.abs(m.cells[0].box.r - m.cells[1].box.l),
  Math.abs(m.cells[1].box.r - m.cells[2].box.l),
];
console.log("    " + near(joins[0], 0, 0.6, "cells 1|2 meet (continuous row rule)"));
console.log("    " + near(joins[1], 0, 0.6, "cells 2|3 meet (continuous row rule)"));
console.log("    " + near(m.cells[0].box.l, 40 - 21.6, 1.5, "cell 1 overhangs left, to be clipped at 40"));
console.log("    " + near(m.grid.l, 40, 1, "clip box left"));
console.log("    " + near(m.grid.r, 1400, 1, "clip box right"));
console.log(`  last row (the orphan) spans ${m.lastFullWidth.l.toFixed(0)}..${m.lastFullWidth.r.toFixed(0)}`);
if (m.gridClip !== "clip") { console.log("    FAIL grid overflow is not clip — the overhang will show"); fails++; }

await page.screenshot({ path: `${OUT}/desk_table.png` });
/* hover: the fill must reach its own rules, not stop short in the gutter */
const hb = await page.evaluate(() => {
  const a = document.querySelectorAll('#leave-a-review a')[1];
  const r = a.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
await page.mouse.move(hb.x, hb.y);
await s(500);
await page.screenshot({ path: `${OUT}/desk_table_hover.png` });
await page.mouse.move(10, 10);

/* ---------- the closing frame's two Helvetica elements ---------- */
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 }).catch(() => {});
await s(1500);
await page.evaluate(() => {
  const el = document.getElementById("book");
  window.__lenis?.scrollTo(el.offsetTop + window.innerHeight * 0.12, { immediate: true }) ?? el.scrollIntoView();
});
await s(1800);
const type = await page.evaluate(() => {
  const clock = document.querySelector('#book p[class*="clock"]');
  const btn = document.querySelector('#book a[class*="action"]');
  const f = (e) => getComputedStyle(e);
  const r = btn.getBoundingClientRect();
  return {
    clock: { family: f(clock).fontFamily, track: f(clock).letterSpacing, size: f(clock).fontSize, text: clock.textContent },
    btn: { family: f(btn).fontFamily, track: f(btn).letterSpacing, size: f(btn).fontSize, w: r.width, h: r.height, text: btn.textContent.trim() },
    fits: r.right <= window.innerWidth && r.left >= 0,
  };
});
console.log("\n=== home #book — the two elements moved to Helvetica ===");
const helv = (s) => /helvetica/i.test(s);
console.log(`  ${helv(type.clock.family) ? "ok  " : "FAIL"} clock  "${type.clock.text}"  ${type.clock.family} @ ${type.clock.size} / ${type.clock.track}`);
console.log(`  ${helv(type.btn.family) ? "ok  " : "FAIL"} button "${type.btn.text}"  ${type.btn.family} @ ${type.btn.size} / ${type.btn.track}  measures ${type.btn.w.toFixed(0)}x${type.btn.h.toFixed(0)}`);
if (!helv(type.clock.family) || !helv(type.btn.family)) fails++;
await page.screenshot({ path: `${OUT}/desk_book.png` });

/* ---------- 390x844 ---------- */
await page.setViewport({ width: 390, height: 844 });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 }).catch(() => {});
await s(1500);
await page.evaluate(() => {
  const el = document.getElementById("book");
  window.__lenis?.scrollTo(el.offsetTop + window.innerHeight * 0.1, { immediate: true }) ?? el.scrollIntoView();
});
await s(1800);
const phone = await page.evaluate(() => {
  const btn = document.querySelector('#book a[class*="action"]');
  const r = btn.getBoundingClientRect();
  return { w: r.width, l: r.left, r: r.right, vw: window.innerWidth, overflow: document.documentElement.scrollWidth > window.innerWidth };
});
console.log("\n=== home #book at 390x844 ===");
const btnFits = phone.l >= 0 && phone.r <= phone.vw && !phone.overflow;
if (!btnFits) fails++;
console.log(`  ${btnFits ? "ok  " : "FAIL"} pill ${phone.w.toFixed(0)}px wide, x ${phone.l.toFixed(0)}..${phone.r.toFixed(0)} in ${phone.vw}  (doc overflow: ${phone.overflow})`);
await page.screenshot({ path: `${OUT}/phone_book.png` });

await page.goto(`http://localhost:${PORT}/contact`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 }).catch(() => {});
await s(1200);
await page.evaluate(() => {
  const el = document.getElementById("leave-a-review");
  window.__lenis?.scrollTo(el.offsetTop, { immediate: true }) ?? el.scrollIntoView();
});
await s(1400);
const ph = await page.evaluate(() => {
  const grid = document.querySelector('#leave-a-review ul');
  const a = grid.querySelector('a');
  const n = grid.querySelector('span[class*="itemName"]');
  return {
    typeL: n.getBoundingClientRect().left,
    gridL: grid.getBoundingClientRect().left,
    gridR: grid.getBoundingClientRect().right,
    cellL: a.getBoundingClientRect().left,
    overflow: document.documentElement.scrollWidth > window.innerWidth,
  };
});
console.log("\n=== /contact — the review table at 390x844 ===");
console.log("  " + near(ph.typeL, 16, 1, "text edge (=--grid-margin at 390)"));
console.log(`  clip box ${ph.gridL.toFixed(0)}..${ph.gridR.toFixed(0)}, cell box starts ${ph.cellL.toFixed(1)} (overhang clipped), doc overflow: ${ph.overflow}`);
if (ph.overflow) { console.log("  FAIL horizontal overflow"); fails++; }
await page.screenshot({ path: `${OUT}/phone_table.png` });

console.log(`\n  ${fails ? `${fails} FAILURE(S)` : "all measurements on target"}   shots in ${OUT}`);
await b.close();
process.exit(fails ? 1 : 0);
