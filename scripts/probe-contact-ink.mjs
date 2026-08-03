/* Is the ReviewUs section invisible because it is drawn in its own ground's
   colour? Reads each element's computed colour and walks up for the first
   painted background behind it, then computes contrast.
   usage: node scripts/probe-contact-ink.mjs [port] */
import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3000";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-sandbox","--hide-scrollbars","--force-device-scale-factor=1","--enable-gpu"] });
const page = await b.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(`http://localhost:${PORT}/contact`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 }).catch(()=>{});
await page.evaluate(() => document.fonts.ready);
await sleep(1800);
const r = await page.evaluate(() => {
  const parse = (c) => (c.match(/[\d.]+/g) || []).map(Number);
  const L = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const cr = (a, c) => { const [x, y] = [L(a), L(c)]; const [hi, lo] = [Math.max(x, y), Math.min(x, y)];
    return +((hi + 0.05) / (lo + 0.05)).toFixed(2); };
  const groundOf = (el) => { let e = el; while (e && e !== document.documentElement) {
      const bg = parse(getComputedStyle(e).backgroundColor);
      if (bg.length >= 3 && (bg[3] === undefined || bg[3] > 0.5)) return bg.slice(0, 3); e = e.parentElement; }
    return [255, 255, 255]; };
  const out = [];
  document.querySelectorAll("[class*='ReviewUs'], [class*='eyebrow'], [class*='faq'], [class*='Faq']").forEach((e) => {
    const t = (e.textContent || "").trim(); if (!t || e.children.length > 1) return;
    const s = getComputedStyle(e); const ink = parse(s.color).slice(0, 3);
    const g = groundOf(e); const rect = e.getBoundingClientRect();
    out.push({ cls: String(e.className).slice(0, 26), txt: t.slice(0, 26),
      ink: `rgb(${ink.join(",")})`, ground: `rgb(${g.join(",")})`,
      op: s.opacity, contrast: cr(ink, g), y: Math.round(rect.top + scrollY) });
  });
  return out;
});
console.log("\n  element                    ink               ground            op    contrast   y");
r.forEach((x) => console.log(`  ${x.cls.padEnd(26)} ${x.ink.padEnd(17)} ${x.ground.padEnd(17)} ${String(x.op).padEnd(5)} ${String(x.contrast).padStart(6)}   ${x.y}   ${x.txt}`));
const t = setTimeout(() => process.exit(0), 3000);
await b.close().catch(() => {}); clearTimeout(t); process.exit(0);
