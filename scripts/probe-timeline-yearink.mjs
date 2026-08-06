/* Metric verification for the year's head seat and the title mask, against
   the face --font-display-small ACTUALLY resolves to (repointed to a serif
   in app/globals.css — Contralto's metrics no longer apply, so nothing here
   is assumed from the token name).

   The primary instrument is CANVAS GLYPH ARITHMETIC, not pixels: an earlier
   pixel-diff cut of this probe produced saturated bounding boxes (full-clip
   diffs from scroll/settle noise) and mis-read the ink band by 2x. Canvas
   actualBoundingBox metrics are exact and immune to rig noise; one pixel
   spot-check remains, gated on a zero-diff control pair.

   1  numeral ink band in em -> is --tl-year-tuck hiding 20-35% of DIGIT ink?
   2  rendered tuck at two scroll positions — the shared MotionValue must
      hold it constant through the parallax;
   3  parked-title hiding margin, per item, in px — travel * innerH puts the
      ascender ink HOW far below the mask window's bottom bleed?
   4  revealed-title fit — ascender and descender ink vs the mask window
      (AC3.5, incl. "Guanabana arrives" and "Café Mama & Sons");
   5  pixel spot-check of 3: control diff must be 0, then hiding .titleInner
      at rest must change ~nothing.

   usage: node scripts/probe-timeline-yearink.mjs [port]                    */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const PAGE = `http://localhost:${PORT}/about`;
const LI = '[class*="timeline"] > li';

const b = await puppeteer.launch({ executablePath: CHROME, headless: "new", protocolTimeout: 240000,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"] });
const sb = await puppeteer.launch({ executablePath: CHROME, headless: "new", protocolTimeout: 240000, args: ["--no-sandbox"] });
const scratch = await sb.newPage();
await scratch.setContent("<canvas id=c></canvas>");
const page = await b.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.bringToFront();
const P = (n, ok, d = "") => console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d ? "\n           └─ " + d : ""}`);

const count = async (a, bb) => scratch.evaluate(async (A64, B64) => {
  const draw = async (b64) => { const i = new Image(); i.src = "data:image/png;base64," + b64; await i.decode();
    const c = document.createElement("canvas"); c.width = i.width; c.height = i.height;
    const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(i, 0, 0);
    return g.getImageData(0, 0, i.width, i.height).data; };
  const A = await draw(A64), B = await draw(B64);
  let n = 0;
  for (let i = 0; i < A.length; i += 4)
    if (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) > 14) n++;
  return n;
}, a, bb);

async function travelTo(y) {
  let cur = await page.evaluate("Math.round(scrollY)");
  const dir = y > cur ? 1 : -1; let g = 0;
  while (Math.abs(cur - y) > 170 && g++ < 600) { await page.evaluate((d) => window.scrollBy(0, d), dir * 170); await new Promise((r) => setTimeout(r, 20)); const n = await page.evaluate("Math.round(scrollY)"); if (n === cur && g > 4) break; cur = n; }
  let p = -1; for (let i = 0; i < 25 && p !== cur; i++) { p = cur; await new Promise((r) => setTimeout(r, 120)); cur = await page.evaluate("Math.round(scrollY)"); }
  await new Promise((r) => setTimeout(r, 800));
}
const centreYear = async (i) => travelTo(await page.evaluate(`(() => { const r = document.querySelectorAll('${LI}')[${i}].querySelector('time').getBoundingClientRect(); return Math.max(0, Math.round(scrollY + r.top + r.height/2 - innerHeight/2)); })()`));

await page.goto(PAGE, { waitUntil: "networkidle2" });
await page.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 }).catch(() => {});
await page.waitForFunction(() => { const v = document.querySelector("video"); return v && v.readyState >= 2; }, { timeout: 45000 }).catch(() => {});
await page.evaluate(`(() => { const v = document.querySelector('video'); if (!v) return; v.pause(); v.currentTime = 3;
  return new Promise(r => { const d = () => r(1); v.addEventListener('seeked', d, {once:true}); setTimeout(d, 2500); }); })()`);
await new Promise((r) => setTimeout(r, 600));

/* ---- 1. numeral ink band (canvas) vs the authored tuck ------------------ */
await centreYear(1);
const yr = await page.evaluate(`(() => {
  const t = document.querySelectorAll('${LI}')[1].querySelector('time');
  const cs = getComputedStyle(t);
  const c = document.createElement('canvas').getContext('2d');
  c.font = cs.fontWeight + ' ' + cs.fontSize + '/' + cs.lineHeight + ' ' + cs.fontFamily;
  const m = c.measureText(t.textContent);
  const fs = parseFloat(cs.fontSize), lh = parseFloat(cs.lineHeight);
  const baseline = (lh - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent;
  const tuck = parseFloat(getComputedStyle(document.querySelector('[class*="timeline"]')).getPropertyValue('--tl-year-tuck')) * fs;
  return { fs, lh, baseline, inkAsc: m.actualBoundingBoxAscent, inkDesc: m.actualBoundingBoxDescent, tuck,
           family: cs.fontFamily.split(',')[0] };
})()`);
const inkTop = yr.baseline - yr.inkAsc, inkBottom = yr.baseline + yr.inkDesc, inkH = inkBottom - inkTop;
const hidden = Math.max(0, (inkBottom - (yr.lh - yr.tuck)) / inkH);
console.log(`=== 1. YEAR INK BAND (canvas, ${yr.family} ${yr.fs}px / line box ${yr.lh}px) ===`);
console.log(`  ink ${(inkTop / yr.fs).toFixed(3)}em -> ${(inkBottom / yr.fs).toFixed(3)}em of the box (height ${(inkH / yr.fs).toFixed(3)}em)`);
console.log(`  authored tuck ${(yr.tuck / yr.fs).toFixed(3)}em -> hides ${(hidden * 100).toFixed(1)}% of digit ink where a frame straddles (visible ${(100 - hidden * 100).toFixed(1)}%)`);
P("tuck bites 20-35% of ink (motif present, >=65% visible)", hidden >= 0.2 && hidden <= 0.35, `${(hidden * 100).toFixed(1)}%`);

/* ---- 2. rendered tuck, constant through the parallax -------------------- */
const tuckAt = async () => page.evaluate(`(() => { const li = document.querySelectorAll('${LI}')[1];
  const t = li.querySelector('time').getBoundingClientRect(), f = li.querySelector('[class*="frame"]').getBoundingClientRect();
  return +(t.bottom - f.top).toFixed(2); })()`);
const tA = await tuckAt();
await page.evaluate("window.scrollBy(0, 320)");
await new Promise((r) => setTimeout(r, 900));
const tB = await tuckAt();
console.log(`\n=== 2. RENDERED TUCK (frame top over year box bottom) ===`);
console.log(`  at item centre ${tA}px · 320px of scroll later ${tB}px`);
P("tuck is drift-proof (year rides the frame's MotionValue)", Math.abs(tA - tB) < 1.5, `delta ${(tA - tB).toFixed(2)}px`);

/* ---- 3+4. title mask arithmetic, every item ----------------------------- */
console.log(`\n=== 3. PARKED-TITLE HIDING MARGIN and 4. REVEALED FIT (canvas em arithmetic) ===`);
const rows = await page.evaluate(`(() => {
  const out = [];
  document.querySelectorAll('${LI}').forEach((li, i) => {
    const h3 = li.querySelector('h3'), inner = li.querySelector('[class*="titleInner"]');
    const cs = getComputedStyle(h3);
    const c = document.createElement('canvas').getContext('2d');
    c.font = cs.fontWeight + ' ' + cs.fontSize + '/' + cs.lineHeight + ' ' + cs.fontFamily;
    const m = c.measureText((inner.textContent || '').replace('(Coming soon)', ''));
    const fs = parseFloat(cs.fontSize), lineH = parseFloat(cs.lineHeight);
    const baseline = (lineH - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent;
    const bleed = Math.abs(parseFloat((cs.clipPath.match(/-?[\\d.]+/) || [0])[0]));
    const h3H = h3.getBoundingClientRect().height, innerH = inner.getBoundingClientRect().height;
    // the parked translate, read from the LIVE computed transform (rest state)
    const ty = new DOMMatrixReadOnly(getComputedStyle(inner).transform === 'none' ? '' : getComputedStyle(inner).transform).m42;
    const parkedInkTop = ty + baseline - m.actualBoundingBoxAscent;
    out.push({ i: i + 1, t: (inner.textContent || '').trim().slice(0, 20), fs, bleed, ty: +ty.toFixed(1),
      travelPct: +((ty / innerH) * 100).toFixed(0),
      parkMargin: +(parkedInkTop - (h3H + bleed)).toFixed(1),
      revealTopRoom: +(baseline - m.actualBoundingBoxAscent + bleed).toFixed(1),
      revealBottomRoom: +((h3H + bleed) - (baseline + m.actualBoundingBoxDescent)).toFixed(1) });
  });
  return out;
})()`);
for (const r of rows)
  console.log(`  #${r.i} ${r.t.padEnd(20)} travel ${r.ty}px (${r.travelPct}%) · parked ink starts ${r.parkMargin}px BELOW the mask window · revealed room top ${r.revealTopRoom}px / bottom ${r.revealBottomRoom}px`);
P("3. every parked title hides with >=4px of margin", rows.every((r) => r.parkMargin >= 4), `min ${Math.min(...rows.map((r) => r.parkMargin))}px`);
P("4. AC3.5 revealed ascenders/descenders never clipped (all nine)", rows.every((r) => r.revealTopRoom >= 1 && r.revealBottomRoom >= 1), `min top ${Math.min(...rows.map((r) => r.revealTopRoom))}px, min bottom ${Math.min(...rows.map((r) => r.revealBottomRoom))}px`);
const named = rows.filter((r) => /Guanabana|Caf/.test(r.t));
P("4. the two named cases specifically", named.length === 2 && named.every((r) => r.revealTopRoom >= 1 && r.revealBottomRoom >= 1), named.map((r) => `${r.t}: top ${r.revealTopRoom} bottom ${r.revealBottomRoom}`).join(" | "));

/* ---- 5. pixel spot-check of the parked mask, control-gated -------------- */
console.log(`\n=== 5. PIXEL SPOT-CHECK (item 1 at rest, zero-diff control first) ===`);
await centreYear(0);
await page.mouse.move(4, 4);
await new Promise((r) => setTimeout(r, 1500));
// re-pause: the app's deferred play() beats a load-time pause (see yearvis2)
await page.evaluate(`(() => { const v = document.querySelector('video'); if (!v) return; v.pause(); v.currentTime = 3;
  return new Promise(r => { const d = () => r(1); v.addEventListener('seeked', d, {once:true}); setTimeout(d, 2000); }); })()`);
await new Promise((r) => setTimeout(r, 400));
const clip = await page.evaluate(`(() => { const r = document.querySelectorAll('${LI}')[0].querySelector('h3').getBoundingClientRect();
  return { x: Math.round(r.x + scrollX) - 12, y: Math.round(r.y + scrollY) - 12, width: Math.round(r.width) + 24, height: Math.round(r.height) + 40 }; })()`);
let control = -1;
for (let tries = 0; tries < 5; tries++) {
  const A = await page.screenshot({ clip, captureBeyondViewport: false, encoding: "base64" });
  await new Promise((r) => setTimeout(r, 350));
  const B = await page.screenshot({ clip, captureBeyondViewport: false, encoding: "base64" });
  control = await count(A, B);
  if (control === 0) break;
  console.log(`  control diff ${control}px — rig not still, retrying`);
  await new Promise((r) => setTimeout(r, 1400));
}
if (control !== 0) { P("control pair is byte-still", false, `${control}px after retries — pixel check unreliable, trust the arithmetic above`); }
else {
  const A = await page.screenshot({ clip, captureBeyondViewport: false, encoding: "base64" });
  const css = `[class*="timeline"] [class*="titleInner"] { visibility: hidden !important }`;
  await page.addStyleTag({ content: css });
  await new Promise((r) => setTimeout(r, 350));
  const B = await page.screenshot({ clip, captureBeyondViewport: false, encoding: "base64" });
  await page.evaluate((c) => document.querySelectorAll("style").forEach((s) => { if (s.textContent === c) s.remove(); }), css);
  const n = await count(A, B);
  P("control pair is byte-still", true, "0px");
  P("5. no parked title ink visible at rest (pixels)", n <= 8, `${n}px changed when the parked title was hidden`);
}

await b.close();
await sb.close();
