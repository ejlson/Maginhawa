/* DOES A NAVIGATION STILL LAND INSIDE THE CURTAIN WITHOUT PREFETCH?

   scripts/probe-prefetch.mjs argues that <Link prefetch={false}> is free on
   this site because PageTransition's curtain covers the fetch — 640ms of
   cover before the new page needs to exist. That is the claim the change
   rests on, so it has to be measured rather than asserted.

   This clicks a Menu control and records how long the curtain is up, whether
   the slow-navigation indicator ever appeared, and that the destination
   actually rendered.

   usage: node scripts/probe-navtiming.mjs [port] [w] [h] [throttle]      */
import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3120";
const W = +(process.argv[3] || 390), H = +(process.argv[4] || 844);
const THROTTLE = +(process.argv[5] || 4);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({
  executablePath: CHROME, headless: "new", protocolTimeout: 600000,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1",
         "--autoplay-policy=no-user-gesture-required"],
});
const page = await b.newPage();
await page.setViewport({ width: W, height: H });
await page.evaluateOnNewDocument(() => { try { sessionStorage.setItem("mgnhw:introSeen", "1"); } catch {} });
const cdp = await page.target().createCDPSession();
if (THROTTLE > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: THROTTLE });

await page.goto(`http://localhost:${PORT}/restaurants`, { waitUntil: "networkidle2", timeout: 90000 });
await page.waitForFunction(() => !document.querySelector('[class*="Loader_overlay__"]'),
  { timeout: 45000, polling: "raf" }).catch(() => {});
await sleep(1500);

const link = await page.evaluateHandle(() =>
  [...document.querySelectorAll('a[href^="/menus/"]')].find((a) => a.offsetParent !== null) || null);
const href = await page.evaluate((el) => (el ? el.getAttribute("href") : null), link);
if (!href) { console.log("no visible /menus/ link found"); await b.close(); process.exit(0); }

await page.evaluate(() => {
  window.__nav = { start: 0, slowSeen: false };
  new MutationObserver(() => {
    if (document.querySelector('[class*="PageTransition_spinner"], [class*="PageTransition_slow"]'))
      window.__nav.slowSeen = true;
  }).observe(document.documentElement, { childList: true, subtree: true, attributes: true });
});

const t0 = Date.now();
await page.evaluate((el) => el.click(), link);
await page.waitForFunction(() => location.pathname.startsWith("/menus/"),
  { timeout: 30000, polling: "raf" }).catch(() => {});
const tRoute = Date.now() - t0;
await page.waitForFunction(() => {
  const c = document.querySelector('[class*="PageTransition_curtain"]');
  return !c || getComputedStyle(c).opacity === "0" || c.getBoundingClientRect().height === 0 ||
         !!document.querySelector("h1");
}, { timeout: 30000, polling: "raf" }).catch(() => {});
await sleep(1200);
const out = await page.evaluate(() => ({
  path: location.pathname,
  h1: document.querySelector("h1")?.textContent?.trim().slice(0, 40) || "(none)",
  sheets: document.querySelectorAll('[class*="MenuPage_sheet"]').length,
  slowSeen: window.__nav.slowSeen,
}));
console.log(`\nNAVIGATION WITHOUT PREFETCH — ${W}x${H}, CPU ${THROTTLE}x`);
console.log(`  clicked            ${href}`);
console.log(`  route changed at   ${tRoute}ms   (curtain cover is 640ms)`);
console.log(`  landed on          ${out.path}`);
console.log(`  <h1>               ${out.h1}`);
console.log(`  menu sheets        ${out.sheets}`);
console.log(`  slow indicator     ${out.slowSeen ? "SHOWN — the fetch outran the cover" : "never shown"}`);
await b.close();
