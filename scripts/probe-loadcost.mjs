/* WHAT THE FIRST SCREEN COSTS — bytes, time, and who spends them.

   The scroll probes measure the page once it is running. This measures
   getting there: how long the reader waits before the site is theirs, and
   what came down the wire to make that happen.

   ⚠️ BYTES COME FROM CDP `dataReceived`, NOT content-length. Media is
   fetched in ranges and the response headers over-count it by roughly 2x —
   see [[reference-video-byte-accounting]]. `preload="metadata"` costs about
   0.4MB of a file, not all of it, and only this accounting shows that.

   usage: node scripts/probe-loadcost.mjs [port] [w] [h]                  */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const W = +(process.argv[3] || 1440), H = +(process.argv[4] || 900);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({
  executablePath: CHROME, headless: "new", protocolTimeout: 600000,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1",
         "--autoplay-policy=no-user-gesture-required"],
});
const page = await b.newPage();
await page.setViewport({ width: W, height: H });
const cdp = await page.target().createCDPSession();
await cdp.send("Network.enable");

const bytes = new Map();   // requestId -> total encoded bytes actually received
const urlOf = new Map();
cdp.on("Network.requestWillBeSent", (e) => urlOf.set(e.requestId, e.request.url));
cdp.on("Network.dataReceived", (e) =>
  bytes.set(e.requestId, (bytes.get(e.requestId) || 0) + e.encodedDataLength));

const t0 = Date.now();
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded", timeout: 90000 });
const tDom = Date.now() - t0;

/* the loader owns the viewport until its overlay leaves the DOM — that,
   not DOMContentLoaded, is when the reader gets the site */
await page.waitForFunction(
  () => !document.querySelector('[class*="Loader_overlay__"]'),
  { timeout: 45000, polling: "raf" },
).catch(() => console.warn("! loader never left"));
const tLoader = Date.now() - t0;

await sleep(2500); // let the first screen finish settling
const tSettled = Date.now() - t0;

const vitals = await page.evaluate(() => new Promise((res) => {
  const out = { lcp: 0, cls: 0 };
  try {
    new PerformanceObserver((l) => {
      const e = l.getEntries();
      out.lcp = Math.round(e[e.length - 1].startTime);
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) if (!e.hadRecentInput) out.cls += e.value;
    }).observe({ type: "layout-shift", buffered: true });
  } catch {}
  const nav = performance.getEntriesByType("navigation")[0];
  out.fcp = Math.round(performance.getEntriesByName("first-contentful-paint")[0]?.startTime || 0);
  out.domInteractive = Math.round(nav?.domInteractive || 0);
  setTimeout(() => res(out), 300);
}));

const rows = [...bytes.entries()].map(([id, n]) => ({ url: urlOf.get(id) || "?", n }));
const total = rows.reduce((s, r) => s + r.n, 0);
const kind = (u) =>
  /\.(mp4|mov|webm)/i.test(u) ? "video" :
  /\.(jpg|jpeg|png|webp|avif|svg|JPG)/i.test(u) ? "image" :
  /\.(js|mjs)/i.test(u) ? "script" :
  /\.css/i.test(u) ? "css" :
  /\.(woff2?|ttf|otf)/i.test(u) ? "font" : "other";

const byKind = new Map();
for (const r of rows) byKind.set(kind(r.url), (byKind.get(kind(r.url)) || 0) + r.n);

const mb = (n) => (n / 1048576).toFixed(2).padStart(7) + " MB";
console.log(`\n─ first screen @ ${W}x${H} ─`);
console.log(`  DOMContentLoaded        ${String(tDom).padStart(6)}ms`);
console.log(`  first contentful paint  ${String(vitals.fcp).padStart(6)}ms`);
console.log(`  LCP                     ${String(vitals.lcp).padStart(6)}ms`);
console.log(`  CLS                     ${vitals.cls.toFixed(3).padStart(6)}`);
console.log(`  LOADER GONE (usable)    ${String(tLoader).padStart(6)}ms   <-- what the reader waits`);
console.log(`\n─ bytes actually received by ${(tSettled / 1000).toFixed(1)}s ─`);
console.log(`  TOTAL                  ${mb(total)}`);
for (const [k, n] of [...byKind.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`    ${k.padEnd(8)}             ${mb(n)}   ${Math.round((n / total) * 100)}%`);
}
console.log(`\n─ heaviest single requests ─`);
for (const r of rows.sort((a, b) => b.n - a.n).slice(0, 12)) {
  console.log(`  ${mb(r.n)}  ${r.url.replace(/^https?:\/\/[^/]+/, "").slice(0, 78)}`);
}

await b.close();
