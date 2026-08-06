/* Defect 1's acceptance, measured quantitatively: at 375/768/1440/1920, at
   least 7 of 9 years >= 60% VISIBLE INK and all 9 legible.

   probe-timeline-yearvis.mjs answers "does hiding the year change any
   pixels" (existence). This measures the FRACTION: per item,
     visible ink = px changed by hiding the times, occluders in place
     total ink   = px changed by hiding the times with every frame hidden
   both with the film paused, each year centred in the viewport (mid-pass,
   the parallax position a reader actually holds it in).

   Saves zoomed clips of straddled years for the legibility record.

   usage: node scripts/probe-timeline-yearvis2.mjs [port] [outDir]          */
import puppeteer from "puppeteer-core";
import { mkdir } from "node:fs/promises";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const OUT = process.argv[3] || "/tmp/yearvis2";
const PAGE = `http://localhost:${PORT}/about`;
const LI = '[class*="timeline"] > li';
await mkdir(OUT, { recursive: true });

const b = await puppeteer.launch({ executablePath: CHROME, headless: "new", protocolTimeout: 240000,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"] });
const sb = await puppeteer.launch({ executablePath: CHROME, headless: "new", protocolTimeout: 240000, args: ["--no-sandbox"] });
const scratch = await sb.newPage();
await scratch.setContent("<canvas id=c></canvas>");
const page = await b.newPage();
await page.bringToFront();

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

async function inkPx(clip, preCss) {
  if (preCss) { await page.addStyleTag({ content: preCss }); await new Promise((r) => setTimeout(r, 300)); }
  const A = await page.screenshot({ clip, captureBeyondViewport: false, encoding: "base64" });
  const toggle = `[class*="timeline"] time { visibility: hidden !important }`;
  await page.addStyleTag({ content: toggle });
  await new Promise((r) => setTimeout(r, 300));
  const B = await page.screenshot({ clip, captureBeyondViewport: false, encoding: "base64" });
  await page.evaluate((cs) => document.querySelectorAll("style").forEach((s) => { if (cs.includes(s.textContent)) s.remove(); }), [preCss || "", toggle]);
  await new Promise((r) => setTimeout(r, 300));
  const n = await count(A, B);
  await page.bringToFront();
  return n;
}

for (const [W, H] of [[375, 812], [768, 1024], [1440, 900], [1920, 1080]]) {
  await page.setViewport({ width: W, height: H });
  await page.goto(PAGE, { waitUntil: "networkidle2" });
  await page.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 700));
  await page.waitForFunction(() => { const v = document.querySelector("video"); return v && v.readyState >= 2; }, { timeout: 45000 }).catch(() => {});
  await page.evaluate(`(() => { const v = document.querySelector('video'); if (!v) return; v.pause(); v.currentTime = 3;
    return new Promise(r => { const d = () => r(1); v.addEventListener('seeked', d, {once:true}); setTimeout(d, 2500); }); })()`);
  await new Promise((r) => setTimeout(r, 600));

  const rows = [];
  for (let idx = 0; idx < 9; idx++) {
    const to = await page.evaluate(`(() => { const r = document.querySelectorAll('${LI}')[${idx}].querySelector('time').getBoundingClientRect(); return Math.max(0, Math.round(scrollY + r.top + r.height/2 - innerHeight/2)); })()`);
    let cur = await page.evaluate("Math.round(scrollY)"); const dir = to > cur ? 1 : -1; let g = 0;
    while (Math.abs(cur - to) > 160 && g++ < 600) { await page.evaluate((d) => window.scrollBy(0, d), dir * 160); await new Promise((r) => setTimeout(r, 18)); const n = await page.evaluate("Math.round(scrollY)"); if (n === cur && g > 4) break; cur = n; }
    let p = -1; for (let i = 0; i < 18 && p !== cur; i++) { p = cur; await new Promise((r) => setTimeout(r, 110)); cur = await page.evaluate("Math.round(scrollY)"); }
    await new Promise((r) => setTimeout(r, 650));
    const clip = await page.evaluate(`(() => { const r = document.querySelectorAll('${LI}')[${idx}].querySelector('time').getBoundingClientRect();
      if (r.top < 8 || r.bottom > innerHeight - 8) return null;
      return { x: Math.max(0, Math.round(r.x + scrollX) - 6), y: Math.round(r.y + scrollY) - 6, width: Math.round(r.width) + 12, height: Math.round(r.height) + 12 }; })()`);
    if (!clip) { rows.push({ idx, note: "off-screen" }); continue; }
    // RE-PAUSE THE FILM AT EVERY SEAT. The app defers video.play() until
    // after hydration, so one pause at page load loses the race and the
    // film resumes under the diff — re-seeking immediately before sampling
    // is how probe-timeline-contrast.mjs stays byte-stable.
    await page.evaluate(`(() => { const v = document.querySelector('video'); if (!v) return; v.pause(); v.currentTime = 3;
      return new Promise(r => { const d = () => r(1); v.addEventListener('seeked', d, {once:true}); setTimeout(d, 2000); }); })()`);
    await new Promise((r) => setTimeout(r, 350));
    // STILLNESS GATE — a control pair (no style change) must diff to zero,
    // or scroll settle / film noise would masquerade as year ink
    let still = false;
    for (let tries = 0; tries < 4 && !still; tries++) {
      const A = await page.screenshot({ clip, captureBeyondViewport: false, encoding: "base64" });
      await new Promise((r) => setTimeout(r, 320));
      const B = await page.screenshot({ clip, captureBeyondViewport: false, encoding: "base64" });
      still = (await count(A, B)) === 0;
      if (!still) await new Promise((r) => setTimeout(r, 1300));
    }
    if (!still) { rows.push({ idx, note: "rig-unstable" }); continue; }
    const visible = await inkPx(clip, null);
    const total = await inkPx(clip, `[class*="timeline"] [class*="frame"] { visibility: hidden !important }`);
    rows.push({ idx, visible, total, frac: total ? visible / total : 0 });
    if ((W === 1440 || W === 768) && [1, 3, 7].includes(idx))
      await page.screenshot({ clip, path: `${OUT}/${W}-item${idx + 1}.png` });
  }
  const ok60 = rows.filter((r) => r.frac >= 0.6).length;
  const legible = rows.filter((r) => r.frac >= 0.35).length;
  console.log(`\n=== ${W}×${H} — visible-ink fraction per year (film paused, year centred) ===`);
  console.log("  " + rows.map((r) => r.note ? `#${r.idx + 1} ${r.note}` : `#${r.idx + 1} ${(r.frac * 100).toFixed(0)}% (${r.visible}/${r.total})`).join("  "));
  console.log(`  ${ok60 >= 7 ? "PASS" : "FAIL"}  >=7 of 9 years >=60% visible: ${ok60}/9 · >=35% (legibility floor): ${legible}/9`);
}
await b.close();
await sb.close();
