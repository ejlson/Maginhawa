/* /contact, captured and measured. The question is alignment: do the section
   left edges agree, do the form fields share a grid, and is the eyebrow
   recipe carrying its weight.
   usage: node scripts/shoot-contact.mjs [port] */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3000";
const OUT = "/tmp/mgnhw_contact";
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-sandbox","--hide-scrollbars","--force-device-scale-factor=1","--enable-gpu"] });

for (const [w, h] of [[1440, 900], [390, 844]]) {
  const page = await b.newPage();
  await page.setViewport({ width: w, height: h });
  await page.goto(`http://localhost:${PORT}/contact`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 }).catch(()=>{});
  await page.evaluate(() => document.fonts.ready);
  await sleep(2200);

  const m = await page.evaluate(() => {
    const px = (n) => Math.round(n);
    const rows = [];
    /* every block-level thing with visible text, so mismatched left edges show
       up as a column of numbers rather than as a feeling */
    document.querySelectorAll("section, h1, h2, h3, p, label, input, textarea, select, button, a, span[class*='eyebrow']").forEach((e) => {
      const r = e.getBoundingClientRect();
      if (r.width < 8 || r.height < 6) return;
      const t = (e.textContent || "").trim().replace(/\s+/g, " ").slice(0, 34);
      if (!t && e.tagName !== "INPUT" && e.tagName !== "TEXTAREA") return;
      rows.push({ tag: e.tagName, cls: String(e.className).slice(0, 26),
        l: px(r.left), r: px(r.right), w: px(r.width), t });
    });
    const lefts = {};
    rows.forEach((x) => { lefts[x.l] = (lefts[x.l] || 0) + 1; });
    return {
      docH: document.documentElement.scrollHeight,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      eyebrows: [...document.querySelectorAll("[class*='eyebrow']")].map((e) => (e.textContent || "").trim()),
      dots: [...document.querySelectorAll("[class*='eyebrow']")].map((e) => getComputedStyle(e, "::before").backgroundColor),
      /* the distinct left edges, most-used first — a well-aligned page has few */
      leftEdges: Object.entries(lefts).sort((a, c) => c[1] - a[1]).slice(0, 12),
      rows: rows.slice(0, 40),
    };
  });
  console.log(`\n=== ${w}x${h} ===  doc ${m.docH}px  overflow ${m.overflow}`);
  console.log(`  eyebrows: ${JSON.stringify(m.eyebrows)}`);
  console.log(`  eyebrow dot colours: ${JSON.stringify(m.dots)}`);
  console.log(`  distinct left edges (px: count): ${m.leftEdges.map(([k, v]) => `${k}:${v}`).join("  ")}`);
  await page.screenshot({ path: `${OUT}/contact-${w}.png`, fullPage: w === 1440 });
  await page.close();
}
console.log(`\n shots -> ${OUT}`);
const t = setTimeout(() => process.exit(0), 3000);
await b.close().catch(() => {});
clearTimeout(t);
process.exit(0);
