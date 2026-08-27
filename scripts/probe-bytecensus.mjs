/* WHICH FILES, EXACTLY, DOES A ROUTE PULL BEFORE THE READER SCROLLS?

   probe-routeload.mjs put `/` at 22.9MB on a 390px viewport with NO SCROLL
   AT ALL — 18.8MB of it video — and `/about` at 16.0MB / 11.7MB. Both pages
   gate their films behind IntersectionObservers with a 150% root margin
   (components/ui/useVisiblePlayback.ts), so either the gate is not covering
   every element or something upstream of it is fetching anyway.

   This lists the bytes by URL so the answer is a filename rather than a
   theory. Bytes are CDP `Network.dataReceived` — see
   [[reference-video-byte-accounting]] for why content-length is useless here.

   usage: node scripts/probe-bytecensus.mjs [port] [path] [w] [h] [waitMs] */
import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3120";
const PATH_ = process.argv[3] || "/";
const W = +(process.argv[4] || 390), H = +(process.argv[5] || 844);
const WAIT = +(process.argv[6] || 3500);
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
const urlOf = new Map(), got = new Map();
cdp.on("Network.requestWillBeSent", (e) => urlOf.set(e.requestId, e.request.url));
cdp.on("Network.dataReceived", (e) =>
  got.set(e.requestId, (got.get(e.requestId) || 0) +
    (e.encodedDataLength > 0 ? e.encodedDataLength : e.dataLength)));

await page.goto(`http://localhost:${PORT}${PATH_}`, { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForFunction(() => !document.querySelector('[class*="Loader_overlay__"]'),
  { timeout: 45000, polling: "raf" }).catch(() => {});
await sleep(WAIT);

/* what the page THINKS it is doing, beside what it actually pulled */
const media = await page.evaluate(() => [...document.querySelectorAll("video")].map((v) => ({
  src: (v.currentSrc || v.src || "").split("/").pop(),
  preload: v.preload,
  paused: v.paused,
  buffered: v.buffered.length ? +v.buffered.end(v.buffered.length - 1).toFixed(2) : 0,
  duration: +(v.duration || 0).toFixed(2),
  top: Math.round(v.getBoundingClientRect().top),
})));

const per = new Map();
for (const [id, n] of got) {
  const u = (urlOf.get(id) || "?").replace(/^https?:\/\/[^/]+/, "").split("?")[0];
  per.set(u, (per.get(u) || 0) + n);
}
const rows = [...per].sort((a, b) => b[1] - a[1]);
const total = rows.reduce((a, r) => a + r[1], 0);
console.log(`\nBYTE CENSUS — ${PATH_} @ ${W}x${H}, no scroll, ${WAIT}ms after the loader left`);
console.log(`total ${(total / 1048576).toFixed(2)}MB across ${rows.length} URLs\n`);
for (const [u, n] of rows.slice(0, 24))
  console.log(`${(n / 1048576).toFixed(2).padStart(7)}MB  ${u.length > 92 ? u.slice(0, 92) + "…" : u}`);

console.log(`\n<video> elements on the page (${media.length}):`);
console.log("  preload   paused  buffered/dur   top     src");
for (const m of media)
  console.log(`  ${(m.preload || "-").padEnd(9)} ${String(m.paused).padEnd(7)} ` +
    `${(m.buffered + "/" + m.duration).padEnd(14)} ${String(m.top).padStart(6)}  ${m.src}`);
await b.close();
