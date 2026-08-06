/* AC6.3 — "the per-item year is VISIBLY RENDERED at 375px and 1920px".

   Both the Builder's probe and my first audit tested this with
   getBoundingClientRect().width > 0, which only proves the box exists. The
   year sits at z-index 0 behind a z-index 1 frame, so at any width where the
   frame covers the column centre the box is present, the accessibility tree
   is correct, and the reader sees nothing.

   This measures the occlusion two ways: the geometric overlap of the year's
   box with its own frame, and a pixel diff (hide every <time>, re-shoot,
   count what changed).

   usage: node scripts/probe-timeline-yearvis.mjs [port]                     */
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
await page.bringToFront();

async function pixelDiff(clip, css) {
  const A = await page.screenshot({ clip, captureBeyondViewport: false, encoding: "base64" });
  await page.addStyleTag({ content: css });
  await new Promise((r) => setTimeout(r, 250));
  const B = await page.screenshot({ clip, captureBeyondViewport: false, encoding: "base64" });
  await page.evaluate((c) => document.querySelectorAll("style").forEach((s) => { if (s.textContent === c) s.remove(); }), css);
  await new Promise((r) => setTimeout(r, 250));
  const out = await scratch.evaluate(async (a, bb) => {
    const draw = async (b64) => { const i = new Image(); i.src = "data:image/png;base64," + b64; await i.decode();
      const c = document.createElement("canvas"); c.width = i.width; c.height = i.height;
      const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(i, 0, 0);
      return g.getImageData(0, 0, i.width, i.height).data; };
    const A = await draw(a), B = await draw(bb);
    let n = 0;
    for (let i = 0; i < A.length; i += 4)
      if (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) > 14) n++;
    return { changed: n, total: A.length / 4 };
  }, A, B);
  await page.bringToFront();
  return out;
}

for (const [W, H] of [[375, 812], [768, 1024], [1440, 900], [1920, 1080]]) {
  await page.setViewport({ width: W, height: H });
  await page.goto(PAGE, { waitUntil: "networkidle2" });
  await page.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 700));
  // THE FILM MUST BE STILL. Diffing two shots of a playing video changes
  // nearly every pixel and would drown the few hundred the year contributes.
  await page.waitForFunction(() => { const v = document.querySelector("video"); return v && v.readyState >= 2; }, { timeout: 45000 }).catch(() => {});
  await page.evaluate(`(() => { const v = document.querySelector('video'); if (!v) return; v.pause(); v.currentTime = 3;
    return new Promise(r => { const d = () => r(1); v.addEventListener('seeked', d, {once:true}); setTimeout(d, 2500); }); })()`);
  await new Promise((r) => setTimeout(r, 600));

  const geo = await page.evaluate(`[...document.querySelectorAll('${LI}')].map((li, i) => {
    const t = li.querySelector('time'), f = li.querySelector('[class*="frame"]');
    const tr = t.getBoundingClientRect(), fr = f.getBoundingClientRect();
    const ox = Math.max(0, Math.min(tr.right, fr.right) - Math.max(tr.left, fr.left));
    const oy = Math.max(0, Math.min(tr.bottom, fr.bottom) - Math.max(tr.top, fr.top));
    return { i: i + 1, year: t.textContent, covered: +((ox * oy) / (tr.width * tr.height)).toFixed(3),
             tw: Math.round(tr.width), th: Math.round(tr.height), fs: getComputedStyle(t).fontSize, col: getComputedStyle(t).color };
  })`);
  const fully = geo.filter((g) => g.covered >= 0.995).length;
  const mostly = geo.filter((g) => g.covered >= 0.9).length;
  console.log(`\n=== ${W}×${H} — year box vs its own frame (z 0 behind z 1) ===`);
  console.log(`  ${geo.map((g) => `#${g.i} ${g.year} ${(g.covered * 100).toFixed(0)}%`).join("  ")}`);
  console.log(`  fully occluded: ${fully}/9 · >=90% occluded: ${mostly}/9 · size ${geo[0].fs} · ink ${geo[0].col}`);

  // pixel-check ALL NINE, with the film held still
  const seen = [];
  for (let idx = 0; idx < 9; idx++) {
    const to = await page.evaluate(`(() => { const r = document.querySelectorAll('${LI}')[${idx}].querySelector('time').getBoundingClientRect(); return Math.max(0, Math.round(scrollY + r.top + r.height/2 - innerHeight/2)); })()`);
    let cur = await page.evaluate("Math.round(scrollY)"); const dir = to > cur ? 1 : -1; let g2 = 0;
    while (Math.abs(cur - to) > 160 && g2++ < 600) { await page.evaluate((d) => window.scrollBy(0, d), dir * 160); await new Promise((r) => setTimeout(r, 18)); const n = await page.evaluate("Math.round(scrollY)"); if (n === cur && g2 > 4) break; cur = n; }
    let p = -1; for (let i = 0; i < 18 && p !== cur; i++) { p = cur; await new Promise((r) => setTimeout(r, 110)); cur = await page.evaluate("Math.round(scrollY)"); }
    await new Promise((r) => setTimeout(r, 700));
    const clip = await page.evaluate(`(() => { const r = document.querySelectorAll('${LI}')[${idx}].querySelector('time').getBoundingClientRect();
      if (r.top < 0 || r.bottom > innerHeight) return null;
      return { x: Math.round(r.x + scrollX), y: Math.round(r.y + scrollY), width: Math.round(r.width), height: Math.round(r.height) }; })()`);
    if (!clip) { seen.push(`#${idx + 1} off-screen`); continue; }
    const d = await pixelDiff(clip, `[class*="timeline"] time { visibility: hidden !important }`);
    seen.push(`#${idx + 1}:${d.changed > 60 ? "SEEN " + d.changed + "px" : "HIDDEN"}`);
  }
  const visible = seen.filter((s) => /SEEN/.test(s)).length;
  console.log(`  PIXELS (film paused): ${seen.join("  ")}`);
  console.log(`  ${visible === 9 ? "PASS" : "FAIL"}  AC6.3 at ${W}px — ${visible}/9 years actually visible to a reader`);
}
await b.close();
await sb.close();
