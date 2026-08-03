import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";
const PORT = process.argv[2] || "3100";
const OUT = "/tmp/mgnhw_joinshot"; mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new", args: ["--no-sandbox","--hide-scrollbars","--force-device-scale-factor=1","--enable-gpu"] });
for (const [w,h,tag] of [[1440,900,"desk"],[390,844,"phone"]]) {
  const page = await b.newPage();
  await page.setViewport({ width: w, height: h });
  await page.goto(`http://localhost:${PORT}/careers`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 40000 }).catch(()=>{});
  await page.evaluate(() => document.fonts.ready);
  await sleep(3200);                       // let the three hero beats finish
  await page.screenshot({ path: `${OUT}/${tag}-hero.png` });
  /* walk down like a reader — fullPage never fires whileInView */
  await page.evaluate(async () => { const H = document.documentElement.scrollHeight;
    for (let y = 0; y <= H; y += 260) { window.__lenis?.scrollTo(y,{immediate:true}) ?? scrollTo(0,y); await new Promise(r=>setTimeout(r,70)); } });
  const formY = await page.evaluate(() => {
    const f = document.querySelector("form"); return f ? f.getBoundingClientRect().top + scrollY - 120 : 0; });
  await page.evaluate((y) => window.__lenis?.scrollTo(y,{immediate:true}) ?? scrollTo(0,y), formY);
  await sleep(1400);
  await page.screenshot({ path: `${OUT}/${tag}-form.png` });
  await page.close();
}
console.log(`shots -> ${OUT}`);
setTimeout(() => process.exit(0), 2500); await b.close().catch(()=>{}); process.exit(0);
