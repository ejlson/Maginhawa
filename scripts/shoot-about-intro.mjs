/* The first three screens of /about, so the intro can be judged as a
   sequence rather than as one frame.
   usage: node scripts/shoot-about-intro.mjs [port] */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const OUT = "/tmp/mgnhw_intro";
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-sandbox","--hide-scrollbars","--force-device-scale-factor=1","--enable-gpu"] });
const page = await b.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(`http://localhost:${PORT}/about`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 }).catch(()=>{});
await page.evaluate(() => document.fonts.ready);
/* the hero's own entrance is ~1.2s of staggered rises — let it finish */
await sleep(3000);

const map = await page.evaluate(() => {
  const pick = (sel) => {
    const e = document.querySelector(sel);
    if (!e) return null;
    const r = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return { box: `${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`,
             size: s.fontSize, blend: s.mixBlendMode, text: (e.textContent||"").trim().slice(0,60) };
  };
  return {
    heroH: Math.round(document.querySelector('[class*="About_hero"]')?.getBoundingClientRect().height || 0),
    kicker: pick('[class*="heroKicker"]'),
    top: pick('[class*="heroLineTop"]'),
    lede: pick('[class*="heroLede"]'),
    bottom: pick('[class*="heroLineBottom"]'),
    statement: pick('[class*="statementText"]'),
    docH: document.documentElement.scrollHeight,
  };
});
console.log(JSON.stringify(map, null, 1));

for (const [n, y] of [[0,0],[1,900],[2,1800],[3,2700]]) {
  await page.evaluate((v) => window.__lenis?.scrollTo(v, { immediate: true }) ?? scrollTo(0, v), y);
  await sleep(1400);
  await page.screenshot({ path: `${OUT}/intro-${n}.png` });
}
console.log(`\n shots -> ${OUT}`);
await b.close();
