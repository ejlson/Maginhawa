/* AC8.5 / §9.5 — the year's and the title's contrast against the background
   film, measured on the GLYPH CORE.

   Averaging every pixel that changes when the type is hidden includes the
   anti-aliased rim, which is a blend of ink and ground and drags the ratio
   down. The bar is about the stroke a reader actually reads, so this takes
   only the pixels whose change is in the top decile — full glyph coverage —
   and reports the AA-inclusive figure alongside for honesty.

   The film is stepped through its own duration so the darkest and the worst
   frame are both found, rather than assumed.

   usage: node scripts/probe-timeline-contrast.mjs [port]                   */
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

const lum = (r, g, bl) => { const f = (v) => ((v /= 255), v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)); return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(bl); };
const ratio = (a, c) => { const [h, l] = a > c ? [a, c] : [c, a]; return (h + 0.05) / (l + 0.05); };

async function sample(clip, css) {
  const A = await page.screenshot({ clip, captureBeyondViewport: false, encoding: "base64" });
  await page.addStyleTag({ content: css });
  await new Promise((r) => setTimeout(r, 220));
  const B = await page.screenshot({ clip, captureBeyondViewport: false, encoding: "base64" });
  await page.evaluate((c) => document.querySelectorAll("style").forEach((s) => { if (s.textContent === c) s.remove(); }), css);
  await new Promise((r) => setTimeout(r, 220));
  const out = await scratch.evaluate(async (a, bb) => {
    const draw = async (b64) => { const i = new Image(); i.src = "data:image/png;base64," + b64; await i.decode();
      const c = document.createElement("canvas"); c.width = i.width; c.height = i.height;
      const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(i, 0, 0);
      return g.getImageData(0, 0, i.width, i.height).data; };
    const A = await draw(a), B = await draw(bb);
    const px = [];
    for (let i = 0; i < A.length; i += 4) {
      const d = Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]);
      if (d > 14) px.push([d, A[i], A[i + 1], A[i + 2], B[i], B[i + 1], B[i + 2]]);
    }
    if (!px.length) return null;
    px.sort((x, y) => y[0] - x[0]);
    const core = px.slice(0, Math.max(1, Math.round(px.length * 0.1)));
    const mean = (rows, o) => rows.reduce((s, r) => s + r[o], 0) / rows.length;
    return {
      n: px.length,
      coreInk: [mean(core, 1), mean(core, 2), mean(core, 3)].map(Math.round),
      coreGnd: [mean(core, 4), mean(core, 5), mean(core, 6)].map(Math.round),
      allInk: [mean(px, 1), mean(px, 2), mean(px, 3)].map(Math.round),
      allGnd: [mean(px, 4), mean(px, 5), mean(px, 6)].map(Math.round),
    };
  }, A, B);
  await page.bringToFront();
  return out;
}
async function travelTo(y) {
  let cur = await page.evaluate("Math.round(scrollY)");
  const dir = y > cur ? 1 : -1; let g = 0;
  while (Math.abs(cur - y) > 170 && g++ < 600) {
    await page.evaluate((d) => window.scrollBy(0, d), dir * 170);
    await new Promise((r) => setTimeout(r, 20));
    const n = await page.evaluate("Math.round(scrollY)"); if (n === cur && g > 4) break; cur = n;
  }
  let p = -1; for (let i = 0; i < 25 && p !== cur; i++) { p = cur; await new Promise((r) => setTimeout(r, 120)); cur = await page.evaluate("Math.round(scrollY)"); }
  await new Promise((r) => setTimeout(r, 900));
}

await page.goto(PAGE, { waitUntil: "networkidle2" });
await page.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 }).catch(() => {});
await page.waitForFunction(() => { const v = document.querySelector("video"); return v && v.readyState >= 2 && isFinite(v.duration); }, { timeout: 45000 }).catch(() => {});
const dur = await page.evaluate("document.querySelector('video').duration");
const TIMES = [0.02, 0.12, 0.25, 0.38, 0.5, 0.62, 0.75, 0.88, 0.97].map((f) => +(f * dur).toFixed(2));
console.log(`film duration ${dur.toFixed(2)}s, sampling ${TIMES.length} frames\n`);

const rows = [];
for (const item of [0, 2, 5]) {           // the three seats that sit clear of the spine
  await travelTo(await page.evaluate(`(() => { const r = document.querySelectorAll('${LI}')[${item}].getBoundingClientRect(); return Math.max(0, Math.round(scrollY + r.top + r.height/2 - innerHeight/2)); })()`));
  await page.evaluate(`document.querySelectorAll('${LI}')[${item}].querySelector('a').focus()`);   // reveal the title
  await new Promise((r) => setTimeout(r, 1400));
  for (const t of TIMES) {
    await page.evaluate(`(() => { const v=document.querySelector('video'); v.pause(); v.currentTime=${t};
      return new Promise(r => { const d=()=>r(1); v.addEventListener('seeked', d, {once:true}); setTimeout(d, 2500); }); })()`);
    await new Promise((r) => setTimeout(r, 400));
    for (const [label, sel, css] of [
      ["year", "time", `[class*="timeline"] time { visibility: hidden !important }`],
      ["title", "h3", `[class*="timeline"] h3 { visibility: hidden !important }`],
    ]) {
      const r = await page.evaluate(`(() => { const e = document.querySelectorAll('${LI}')[${item}].querySelector('${sel}'); const b = e.getBoundingClientRect();
        if (b.top < 0 || b.bottom > innerHeight || b.left < 0 || b.right > innerWidth || b.width < 8 || b.height < 8) return null;
        return { x: Math.round(b.x + scrollX), y: Math.round(b.y + scrollY), width: Math.round(b.width), height: Math.round(b.height) }; })()`);
      if (!r) continue;
      const s = await sample(r, css);
      if (!s) continue;
      rows.push({ item: item + 1, t, label,
        core: ratio(lum(...s.coreInk), lum(...s.coreGnd)), all: ratio(lum(...s.allInk), lum(...s.allGnd)),
        ink: s.coreInk, gnd: s.coreGnd, gl: lum(...s.coreGnd), n: s.n });
    }
  }
}
await page.evaluate("document.querySelector('video').play().catch(()=>{})");

const report = (label, bar) => {
  const R = rows.filter((r) => r.label === label);
  if (!R.length) { console.log(`\n${label}: no samples`); return; }
  console.log(`\n=== ${label.toUpperCase()} — ${R.length} samples across ${new Set(R.map((r) => r.item)).size} items × ${TIMES.length} film frames ===`);
  R.slice().sort((a, c) => a.core - c.core).slice(0, 6).forEach((r) =>
    console.log(`  item ${r.item} t=${r.t}s  core ${r.core.toFixed(2)}:1  (AA-inclusive ${r.all.toFixed(2)}:1)  ink rgb(${r.ink}) on rgb(${r.gnd})`));
  const worst = R.slice().sort((a, c) => a.core - c.core)[0];
  const darkest = R.slice().sort((a, c) => a.gl - c.gl)[0];
  const brightest = R.slice().sort((a, c) => c.gl - a.gl)[0];
  console.log(`  darkest film frame:   ${darkest.core.toFixed(2)}:1 on rgb(${darkest.gnd})  (luminance ${darkest.gl.toFixed(4)})`);
  console.log(`  brightest film frame: ${brightest.core.toFixed(2)}:1 on rgb(${brightest.gnd})  (luminance ${brightest.gl.toFixed(4)})`);
  console.log(`  WORST OVERALL:        ${worst.core.toFixed(2)}:1  — bar is ${bar}:1`);
  console.log(`  ${worst.core >= bar ? "PASS" : "FAIL"}  ${label} meets ${bar}:1`);
};
report("year", 3);
report("title", 4.5);

await b.close();
await sb.close();
