/* Is ReviewUs actually invisible to a reader, or was the fullPage capture
   lying? fullPage screenshots never fire IntersectionObserver, and Reveal
   uses whileInView — so an unscrolled capture shows opacity-0 wrappers as
   empty page. Scroll to it like a reader and shoot the viewport. */
import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new", args: ["--no-sandbox","--hide-scrollbars","--force-device-scale-factor=1"] });
const page = await b.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(`http://localhost:${process.argv[2] || "3000"}/contact`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => !document.body.classList.contains("is-loading"), { timeout: 60000 }).catch(()=>{});
await new Promise(r => setTimeout(r, 1500));
/* walk down the way a reader does, so every observer gets its chance */
await page.evaluate(async () => { for (let y = 0; y <= 2200; y += 250) {
  window.__lenis?.scrollTo(y, { immediate: true }) ?? window.scrollTo(0, y);
  await new Promise(r => setTimeout(r, 120)); } });
await page.evaluate(() => window.__lenis?.scrollTo(1450, { immediate: true }) ?? window.scrollTo(0, 1450));
await new Promise(r => setTimeout(r, 1600));
const r = await page.evaluate(() => {
  const wrap = document.querySelector("[class*='ReviewUs_item__']")?.closest("[style*='opacity'], [class*='Reveal']");
  const item = document.querySelector("[class*='ReviewUs_item__']");
  const g = (e) => e ? { cls: String(e.className).slice(0,30), op: getComputedStyle(e).opacity, tf: getComputedStyle(e).transform.slice(0,26) } : null;
  return { wrapper: g(wrap), item: g(item), lede: g(document.querySelector("[class*='ReviewUs_lede']")) };
});
console.log(JSON.stringify(r, null, 1));
await page.screenshot({ path: "/tmp/mgnhw_contact/reviewus-scrolled.png" });
setTimeout(() => process.exit(0), 2500); await b.close().catch(()=>{}); process.exit(0);
