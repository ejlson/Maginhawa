/* AC3.6 (centred hairline spine, 8px diamond markers seated on it) and the
   §6.3 seat geometry as RENDERED, neither of which any existing probe checks.
   Also drops reference screenshots for Agent 4's crop review (R1).

   usage: node scripts/probe-timeline-geometry.mjs [port] [outDir]          */
import puppeteer from "puppeteer-core";
import { mkdir } from "node:fs/promises";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const OUT = process.argv[3] || "/tmp/timeline-shots";
const PAGE = `http://localhost:${PORT}/about`;
const LI = '[class*="timeline"] > li';
await mkdir(OUT, { recursive: true });

const b = await puppeteer.launch({
  executablePath: CHROME, headless: "new", protocolTimeout: 240000,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const page = await b.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(PAGE, { waitUntil: "networkidle2" });
await page.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 }).catch(() => {});
await new Promise((r) => setTimeout(r, 800));
for (let i = 0; i < 120; i++) { await page.evaluate(() => window.scrollBy(0, 180)); await new Promise((r) => setTimeout(r, 18)); }
await new Promise((r) => setTimeout(r, 1500));
for (let i = 0; i < 40; i++) { await page.evaluate(() => window.scrollBy(0, -180)); await new Promise((r) => setTimeout(r, 18)); }
await new Promise((r) => setTimeout(r, 1500));

const geo = await page.evaluate(`(() => {
  const ol = document.querySelector('[class*="timeline"]');
  const olR = ol.getBoundingClientRect();
  const spine = getComputedStyle(ol, '::before');
  const items = [...document.querySelectorAll('${LI}')];
  return {
    olWidth: Math.round(olR.width), olLeft: Math.round(olR.x),
    spineCentre: olR.x + olR.width / 2,
    spine: { w: spine.width, bg: spine.backgroundColor, pos: spine.position, left: spine.left, tr: spine.transform },
    markers: items.map(li => {
      const m = li.querySelector('[class*="marker"]');
      const cs = getComputedStyle(m); const r = m.getBoundingClientRect(); const lr = li.getBoundingClientRect();
      return { w: cs.width, h: cs.height, bg: cs.backgroundColor, tr: cs.transform, origin: cs.transformOrigin,
               cx: +(r.x + r.width/2).toFixed(1), footGap: +(lr.bottom - (r.y + r.height/2)).toFixed(1) };
    }),
    seats: items.map(li => {
      const bd = li.querySelector('[class*="itemBody"]').getBoundingClientRect();
      const f = li.querySelector('[class*="frame"]').getBoundingClientRect();
      return { left: +((bd.x - olR.x) / olR.width).toFixed(3), right: +((bd.right - olR.x) / olR.width).toFixed(3),
               span: +(bd.width / olR.width).toFixed(3), ratio: +(f.width / f.height).toFixed(3) };
    }),
    years: items.map(li => { const t = li.querySelector('time'); const r = t.getBoundingClientRect();
      return { cx: +(r.x + r.width/2).toFixed(1), text: t.textContent, z: getComputedStyle(t).zIndex,
               frameZ: getComputedStyle(li.querySelector('[class*="frame"]')).zIndex }; }),
  };
})()`);

const P = (n, ok, d = "") => console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d ? "\n           └─ " + d : ""}`);
console.log("=== AC3.6 SPINE & MARKERS @1440 ===");
P("spine is a 1px centred hairline", geo.spine.w === "1px" && geo.spine.left === "50%" && /translateX|matrix\(1, 0, 0, 1, -0.5, 0\)|matrix/.test(geo.spine.tr), `width=${geo.spine.w} left=${geo.spine.left} transform=${geo.spine.tr} bg=${geo.spine.bg}`);
P("spine ink is cream, not white/black", /250, 247, 241/.test(geo.spine.bg), geo.spine.bg);
P("marker is an 8px square rotated 45deg from its centre", geo.markers.every(m => m.w === "8px" && m.h === "8px" && /rotate|matrix\(0\.7071/.test(m.tr) && m.origin.startsWith("4px 4px")), `${geo.markers[0].w}×${geo.markers[0].h} ${geo.markers[0].tr} origin ${geo.markers[0].origin}`);
P("marker ink is cream", geo.markers.every(m => /250, 247, 241/.test(m.bg)), geo.markers[0].bg);
P("every marker centre sits on the spine (±1px)", geo.markers.every(m => Math.abs(m.cx - geo.spineCentre) <= 1), `spine x=${geo.spineCentre.toFixed(1)} markers=${geo.markers.map(m => m.cx).join(",")}`);
P("marker centred on the item's foot boundary (-4px pull)", geo.markers.every(m => Math.abs(m.footGap) <= 1), geo.markers.map(m => m.footGap).join(","));
P("every year is centred on the spine (±1px)", geo.years.every(y => Math.abs(y.cx - geo.spineCentre) <= 1), geo.years.map(y => `${y.text}@${y.cx}`).join(" "));
P("year z-index 0 below frame z-index 1 (photo occludes)", geo.years.every(y => y.z === "0" && y.frameZ === "1"), `${geo.years[0].z} / ${geo.years[0].frameZ}`);

console.log("\n=== §6.3 SEATS AS RENDERED (column " + geo.olWidth + "px) ===");
const want = [
  [0.15, 0.41, 0.26, 1.5], [0.35, 0.69, 0.34, 0.5625], [0.08, 0.3, 0.22, 1.25],
  [0.21, 0.63, 0.42, 0.75], [0.41, 0.69, 0.28, 2.0], [0.12, 0.36, 0.24, 0.667],
  [0.09, 0.55, 0.46, 1.35], [0.38, 0.68, 0.3, 0.8], [0.19, 0.55, 0.36, 2.4],
];
let seatOk = true;
geo.seats.forEach((s, i) => {
  const [L, Rr, sp, ra] = want[i];
  const good = Math.abs(s.left - L) < 0.006 && Math.abs(s.right - Rr) < 0.006 && Math.abs(s.span - sp) < 0.006 && Math.abs(s.ratio - ra) < 0.02;
  if (!good) seatOk = false;
  console.log(`  ${good ? "ok  " : "BAD "} #${i + 1} left ${s.left} (want ${L})  right ${s.right} (want ${Rr})  span ${s.span} (want ${sp})  ratio ${s.ratio} (want ${ra})`);
});
P("AC1.4/§6.3 rendered seats match the authored table", seatOk);
P("AC1.4 every rendered right edge <= 0.70", geo.seats.every(s => s.right <= 0.705), geo.seats.map(s => s.right).join(","));
P("AC1.4 every rendered left edge >= 0.05", geo.seats.every(s => s.left >= 0.049), geo.seats.map(s => s.left).join(","));

/* ---- reference screenshots for Agent 4 (R1 crop review) ---- */
const shot = async (name, i, hover) => {
  const to = await page.evaluate(`(() => { const r = document.querySelectorAll('${LI}')[${i}].getBoundingClientRect();
     return Math.max(0, Math.round(scrollY + r.top + r.height/2 - innerHeight/2)); })()`);
  let cur = await page.evaluate("Math.round(scrollY)"); const dir = to > cur ? 1 : -1; let g = 0;
  while (Math.abs(cur - to) > 170 && g++ < 500) { await page.evaluate(d => window.scrollBy(0, d), dir * 170); await new Promise(r => setTimeout(r, 20)); cur = await page.evaluate("Math.round(scrollY)"); }
  await new Promise(r => setTimeout(r, 1600));
  if (hover) {
    const p = await page.evaluate(`(() => { const r = document.querySelectorAll('${LI}')[${i}].querySelector('[class*="frame"]').getBoundingClientRect();
      return { x: Math.round(r.x + r.width/2), y: Math.round(Math.min(Math.max(r.y + 30, 40), innerHeight - 40)) }; })()`);
    await page.mouse.move(p.x, p.y); await new Promise(r => setTimeout(r, 1500));
  } else { await page.mouse.move(4, 4); await new Promise(r => setTimeout(r, 1200)); }
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`  wrote ${OUT}/${name}.png`);
};
console.log("\n=== SCREENSHOTS ===");
await shot("1440-rest-items-1-2", 1, false);
await shot("1440-hover-item-4", 3, true);
await shot("1440-rest-items-7-8", 7, false);
await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2 });
await page.goto(PAGE, { waitUntil: "networkidle2" });
await new Promise(r => setTimeout(r, 900));
for (let i = 0; i < 150; i++) { await page.evaluate(() => window.scrollBy(0, 150)); await new Promise(r => setTimeout(r, 16)); }
await new Promise(r => setTimeout(r, 1200));
await shot("375-narrow-column", 2, false);
await b.close();
