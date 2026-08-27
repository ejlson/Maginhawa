/* WHAT EVERY ROUTE COSTS TO ARRIVE ON — bytes, FCP, LCP, long tasks.

   probe-loadcost.mjs answers this for the home page in detail. This answers
   it for the WHOLE SITE in one table, at a chosen viewport and CPU throttle,
   which is the shape the question "is the site fast on a phone" actually has.

   ⚠️ BYTES COME FROM CDP `dataReceived`, NOT content-length — media is
   fetched in ranges and the headers over-count it by ~2x. See
   [[reference-video-byte-accounting]].

   ⚠️ THE LOADER OWNS THE HOME VIEWPORT FOR SECONDS. LCP is reported by the
   browser against the real paint, so it is measured honestly either way, but
   the byte total has to keep counting until the page has actually settled —
   hence the wait on the overlay leaving the DOM before the idle window.

   usage: node scripts/probe-routeload.mjs [port] [w] [h] [throttle]      */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3120";
const W = +(process.argv[3] || 390), H = +(process.argv[4] || 844);
const THROTTLE = +(process.argv[5] || 4);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ROUTES = ["/", "/about", "/restaurants", "/blog", "/careers", "/contact",
                "/menus/belly", "/menus/cafemama", "/blog/a-note-on-service", "/privacy"];

const b = await puppeteer.launch({
  executablePath: CHROME, headless: "new", protocolTimeout: 600000,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1",
         "--autoplay-policy=no-user-gesture-required"],
});

const KIND = (u) =>
  /\.(mp4|mov|webm)(\?|$)/i.test(u) ? "video" :
  /res\.cloudinary\.com|\.(jpe?g|png|webp|avif|svg|JPG)(\?|$)/i.test(u) ? "image" :
  /\.js(\?|$)/i.test(u) ? "js" :
  /\.css(\?|$)/i.test(u) ? "css" :
  /typekit|\.woff2?(\?|$)/i.test(u) ? "font" : "other";

const rows = [];
for (const route of ROUTES) {
  const page = await b.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  const cdp = await page.target().createCDPSession();
  await cdp.send("Network.enable");
  if (THROTTLE > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: THROTTLE });

  const urlOf = new Map(), got = new Map();
  cdp.on("Network.requestWillBeSent", (e) => urlOf.set(e.requestId, e.request.url));
  cdp.on("Network.dataReceived", (e) =>
    got.set(e.requestId, (got.get(e.requestId) || 0) +
      (e.encodedDataLength > 0 ? e.encodedDataLength : e.dataLength)));

  await page.evaluateOnNewDocument(() => {
    window.__long = 0; window.__longN = 0;
    try {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) { window.__long += e.duration; window.__longN++; }
      }).observe({ type: "longtask", buffered: true });
    } catch {}
  });

  await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForFunction(
    () => !document.querySelector('[class*="Loader_overlay__"]'),
    { timeout: 45000, polling: "raf" }).catch(() => {});
  await sleep(3500); // let the first screen finish fetching and settling

  const v = await page.evaluate(() => {
    const out = { fcp: 0, lcp: 0, cls: 0, long: window.__long || 0, longN: window.__longN || 0 };
    const fcp = performance.getEntriesByName("first-contentful-paint")[0];
    if (fcp) out.fcp = Math.round(fcp.startTime);
    return new Promise((res) => {
      try {
        new PerformanceObserver((l) => {
          const e = l.getEntries(); out.lcp = Math.round(e[e.length - 1].startTime);
        }).observe({ type: "largest-contentful-paint", buffered: true });
        new PerformanceObserver((l) => {
          for (const e of l.getEntries()) if (!e.hadRecentInput) out.cls += e.value;
        }).observe({ type: "layout-shift", buffered: true });
      } catch {}
      setTimeout(() => res(out), 350);
    });
  });

  const by = { video: 0, image: 0, js: 0, css: 0, font: 0, other: 0 };
  let total = 0;
  for (const [id, n] of got) { by[KIND(urlOf.get(id) || "")] += n; total += n; }
  rows.push({ route, total, ...by, ...v });
  await page.close();
  process.stderr.write(".");
}
process.stderr.write("\n");
await b.close();

const mb = (n) => (n / 1048576).toFixed(2);
console.log(`\nROUTE LOAD COST — ${W}x${H}, CPU ${THROTTLE}x, bytes via CDP dataReceived\n`);
console.log("route                   total    video    image      js     css    FCP     LCP     CLS   longtask");
for (const r of rows)
  console.log(
    r.route.padEnd(22) +
    (mb(r.total) + "MB").padStart(8) + (mb(r.video) + "MB").padStart(9) +
    (mb(r.image) + "MB").padStart(9) + (mb(r.js) + "MB").padStart(8) +
    (mb(r.css) + "MB").padStart(8) +
    (r.fcp + "ms").padStart(8) + (r.lcp + "ms").padStart(8) +
    r.cls.toFixed(3).padStart(8) + (Math.round(r.long) + "ms/" + r.longN).padStart(11));
