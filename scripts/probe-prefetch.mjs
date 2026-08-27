/* WHAT DOES <Link> PREFETCHING COST, AND WHAT DOES IT BUY HERE?

   Under `output: "export"` Next writes each route's RSC payload beside its
   HTML as `<route>.txt`, and <Link> fetches those payloads for every link
   that scrolls into view. The byte census found `/privacy.txt` — 38.7KB —
   on routes that merely link to it from the footer.

   The buy side is a faster client navigation. On THIS site a navigation is
   covered by PageTransition's curtain: 640ms cover, 250ms hold, 720ms
   reveal — about 1.6s of deliberate animation the reader waits behind
   regardless. A payload that arrives during the cover is indistinguishable
   from one prefetched an hour earlier.

   usage: node scripts/probe-prefetch.mjs [port] [w] [h]                  */
import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3120";
const W = +(process.argv[3] || 390), H = +(process.argv[4] || 844);
const ROUTES = ["/", "/about", "/restaurants", "/blog", "/careers", "/contact", "/menus/belly"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({
  executablePath: CHROME, headless: "new", protocolTimeout: 600000,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1",
         "--autoplay-policy=no-user-gesture-required"],
});
console.log(`\nRSC PREFETCH COST — ${W}x${H}, whole-page scroll\n`);
console.log("route            payloads    bytes   files");
let grand = 0;
for (const route of ROUTES) {
  const page = await b.newPage();
  await page.setViewport({ width: W, height: H });
  await page.evaluateOnNewDocument(() => { try { sessionStorage.setItem("mgnhw:introSeen", "1"); } catch {} });
  const cdp = await page.target().createCDPSession();
  await cdp.send("Network.enable");
  const urlOf = new Map(), got = new Map();
  cdp.on("Network.requestWillBeSent", (e) => urlOf.set(e.requestId, e.request.url));
  cdp.on("Network.dataReceived", (e) =>
    got.set(e.requestId, (got.get(e.requestId) || 0) +
      (e.encodedDataLength > 0 ? e.encodedDataLength : e.dataLength)));

  await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: "networkidle2", timeout: 90000 });
  await page.waitForFunction(() => !document.querySelector('[class*="Loader_overlay__"]'),
    { timeout: 45000, polling: "raf" }).catch(() => {});
  /* links prefetch when they enter the viewport, so the footer's only count
     if the page is actually walked to the bottom */
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += innerHeight * 0.8) {
      if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true });
      else scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 320));
    }
  });
  await sleep(2000);

  let bytes = 0; const files = [];
  for (const [id, n] of got) {
    const u = urlOf.get(id) || "";
    if (/\.txt(\?|$)/.test(u) && !/llms\.txt|robots\.txt/.test(u)) {
      bytes += n; files.push(u.split("/").pop().replace(".txt", "") + ` ${(n / 1024).toFixed(0)}k`);
    }
  }
  grand += bytes;
  console.log(route.padEnd(16) + String(files.length).padStart(8) +
    (" " + (bytes / 1024).toFixed(0) + "KB").padStart(9) + "   " + files.join(", "));
  await page.close();
}
console.log(`\n${(grand / 1024).toFixed(0)}KB across ${ROUTES.length} routes — paid again on every route a reader visits.`);
await b.close();
